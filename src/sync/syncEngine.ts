import { db } from '../db/schema';
import { rebuildTagRegistry } from '../db/repository';
import type { Note } from '../types/note';
import * as webdavClient from './webdavClient';
import type { WebDavConfig } from './webdavClient';
import { resolveLastWriteWins } from './conflictResolver';
import { bumpAttempts, clearQueueEntries, collapseQueue, hasExceededRetries } from './outbox';

export type { WebDavConfig } from './webdavClient';

const SETTINGS_KEY = 'webdav';

export interface SyncSummary {
  pushed: number;
  pulled: number;
  deletedRemote: number;
  deletedLocal: number;
  conflicts: number;
  errors: string[];
}

function emptySummary(): SyncSummary {
  return { pushed: 0, pulled: 0, deletedRemote: 0, deletedLocal: 0, conflicts: 0, errors: [] };
}

export async function getWebDavConfig(): Promise<WebDavConfig | undefined> {
  const record = await db.settings.get(SETTINGS_KEY);
  return record?.value as WebDavConfig | undefined;
}

export async function saveWebDavConfig(config: WebDavConfig): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEY, value: config });
}

export async function isSyncConfigured(): Promise<boolean> {
  return (await getWebDavConfig()) !== undefined;
}

export async function runSync(): Promise<SyncSummary> {
  const config = await getWebDavConfig();
  if (!config) throw new Error('WebDAV ist nicht konfiguriert');

  const summary = emptySummary();

  await webdavClient.ensureRemoteLayout(config);
  await pushOutbox(config, summary);
  await pullTombstones(config, summary);
  await pullNotes(config, summary);

  if (summary.pulled > 0 || summary.deletedLocal > 0) {
    await rebuildTagRegistry();
  }

  return summary;
}

async function pushOutbox(config: WebDavConfig, summary: SyncSummary): Promise<void> {
  const batch = await collapseQueue();
  for (const entry of batch) {
    const note = await db.notes.get(entry.noteId);
    if (!note) {
      await clearQueueEntries(entry.queueIds);
      continue;
    }
    try {
      if (note.deleted) {
        await webdavClient.putTombstoneFile(config, note.id, note.updatedAt);
        await webdavClient.deleteNoteFile(config, note.id);
        summary.deletedRemote += 1;
      } else {
        await webdavClient.putNoteFile(config, note.id, JSON.stringify(note), note.remoteEtag ?? null);
        await db.notes.update(note.id, { syncState: 'synced' });
        summary.pushed += 1;
      }
      await clearQueueEntries(entry.queueIds);
    } catch (err) {
      if (err instanceof webdavClient.PreconditionFailedError) {
        await db.notes.update(note.id, { syncState: 'conflict' });
        await clearQueueEntries(entry.queueIds);
        summary.conflicts += 1;
        summary.errors.push(`Konflikt bei „${note.title}“: Remote wurde parallel geändert.`);
        continue;
      }
      const attemptCount = await bumpAttempts(entry.queueIds);
      if (hasExceededRetries(attemptCount)) {
        await clearQueueEntries(entry.queueIds);
        await db.notes.update(note.id, { syncState: 'conflict' });
        summary.errors.push(`Push für „${note.title}“ nach ${attemptCount} Versuchen aufgegeben.`);
      } else {
        summary.errors.push(`Push für „${note.title}“ fehlgeschlagen, wird beim nächsten Sync erneut versucht.`);
      }
    }
  }
}

function idFromFilename(basename: string): string {
  return basename.replace(/\.json$/, '');
}

async function pullTombstones(config: WebDavConfig, summary: SyncSummary): Promise<void> {
  const remoteTombstones = await webdavClient.listTombstoneFiles(config);
  for (const file of remoteTombstones) {
    const id = idFromFilename(file.basename);
    const local = await db.notes.get(id);
    if (!local || local.deleted) continue;

    const tombstone = await webdavClient.getTombstoneFile(config, id);
    if (tombstone.deletedAt >= local.updatedAt) {
      await db.notes.update(id, { deleted: true, deletedAt: tombstone.deletedAt, syncState: 'synced' });
      summary.deletedLocal += 1;
    }
  }
}

async function downloadNote(config: WebDavConfig, id: string): Promise<Note> {
  const raw = await webdavClient.getNoteFile(config, id);
  return JSON.parse(raw) as Note;
}

async function pullNotes(config: WebDavConfig, summary: SyncSummary): Promise<void> {
  const remoteFiles = await webdavClient.listNoteFiles(config);
  for (const file of remoteFiles) {
    const id = idFromFilename(file.basename);
    const local = await db.notes.get(id);

    if (!local) {
      const remoteNote = await downloadNote(config, id);
      await db.notes.put({ ...remoteNote, remoteEtag: file.etag ?? undefined, syncState: 'synced' });
      summary.pulled += 1;
      continue;
    }

    // A pending local tombstone or edit will be pushed this round (or the next);
    // don't let an in-flight pull clobber it before the push has had a chance to win.
    if (local.deleted || local.syncState === 'pending') continue;
    if (local.remoteEtag === file.etag) continue;

    const remoteNote = await downloadNote(config, id);
    const decision = resolveLastWriteWins(local, remoteNote);
    if (decision.action === 'accept-remote') {
      await db.notes.put({ ...remoteNote, remoteEtag: file.etag ?? undefined, syncState: 'synced' });
      summary.pulled += 1;
    }
    // 'push-local' / 'up-to-date': local wins or already matches; the next push reconciles the etag.
  }
}
