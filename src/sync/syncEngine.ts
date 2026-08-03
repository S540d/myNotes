import { db } from '../db/schema';
import { rebuildTagRegistry } from '../db/repository';
import type { ConflictShadow, Note } from '../types/note';
import * as webdavClient from './webdavClient';
import type { WebDavConfig } from './webdavClient';
import { resolveLastWriteWins } from './conflictResolver';
import { bumpAttempts, clearQueueEntries, collapseQueue, hasExceededRetries } from './outbox';
import * as credentialVault from '../crypto/credentialVault';
import { getSessionKey } from '../crypto/session';
import { encryptNote, isEncryptedEnvelope, type EncryptedNoteEnvelope } from '../crypto/encryptNote';
import { decryptNote } from '../crypto/decryptNote';
import type { KdfParams } from '../crypto/keyDerivation';

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

/** Plaintext WebDAV settings, used only when no encryption vault exists yet (Phase 2 behavior). */
export async function getWebDavConfig(): Promise<WebDavConfig | undefined> {
  const record = await db.settings.get(SETTINGS_KEY);
  return record?.value as WebDavConfig | undefined;
}

export async function saveWebDavConfig(config: WebDavConfig): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEY, value: config });
}

/** Removes the plaintext credentials once they've been migrated into the encryption vault. */
export async function deletePlainWebDavConfig(): Promise<void> {
  await db.settings.delete(SETTINGS_KEY);
}

export async function isSyncConfigured(): Promise<boolean> {
  const vault = await credentialVault.getVaultRecord();
  if (vault) return vault.credentials !== undefined;
  return (await getWebDavConfig()) !== undefined;
}

export async function runSync(): Promise<SyncSummary> {
  const summary = emptySummary();

  const vault = await credentialVault.getVaultRecord();
  const sessionKey = getSessionKey();

  if (vault && !sessionKey) {
    summary.errors.push('Sync ist gesperrt. Bitte zuerst die Passphrase eingeben.');
    return summary;
  }

  const config = vault ? await credentialVault.getVaultCredentials(sessionKey as CryptoKey) : await getWebDavConfig();
  if (!config) throw new Error('WebDAV ist nicht konfiguriert');

  await webdavClient.ensureRemoteLayout(config);
  await pushOutbox(config, sessionKey, vault?.kdf, summary);
  await pullTombstones(config, summary);
  await pullNotes(config, sessionKey, summary);

  if (summary.pulled > 0 || summary.deletedLocal > 0) {
    await rebuildTagRegistry();
  }

  if (vault) {
    try {
      await webdavClient.putVaultDescriptor(config, JSON.stringify({ kdf: vault.kdf, verifier: vault.verifier }));
    } catch {
      // non-critical; the next sync retries publishing the descriptor
    }
  }

  return summary;
}

async function pushOutbox(
  config: WebDavConfig,
  sessionKey: CryptoKey | undefined,
  kdf: KdfParams | undefined,
  summary: SyncSummary,
): Promise<void> {
  const batch = await collapseQueue();
  for (const entry of batch) {
    const note = await db.notes.get(entry.noteId);
    if (!note) {
      await clearQueueEntries(entry.queueIds);
      continue;
    }

    if (note.encrypted && !note.deleted && (!sessionKey || !kdf)) {
      summary.errors.push(
        `„${note.title}“ ist verschlüsselt, der Tresor ist aber gesperrt – wird nach dem Entsperren übertragen.`,
      );
      continue;
    }

    try {
      if (note.deleted) {
        await webdavClient.putTombstoneFile(config, note.id, note.updatedAt);
        await webdavClient.deleteNoteFile(config, note.id);
        summary.deletedRemote += 1;
      } else {
        const body = note.encrypted
          ? JSON.stringify(await encryptNote(note, sessionKey as CryptoKey, kdf as KdfParams))
          // conflictShadow is a local-only resolution aid, never part of the synced note.
          : JSON.stringify({ ...note, conflictShadow: undefined });
        await webdavClient.putNoteFile(config, note.id, body, note.remoteEtag ?? null);
        await db.notes.update(note.id, { syncState: 'synced' });
        summary.pushed += 1;
      }
      await clearQueueEntries(entry.queueIds);
    } catch (err) {
      if (err instanceof webdavClient.PreconditionFailedError) {
        const shadow = await captureConflictShadow(config, note.id, sessionKey, summary);
        await db.notes.update(note.id, { syncState: 'conflict', conflictShadow: shadow });
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

/**
 * Best-effort fetch of the remote note that just won a push race, so the conflict UI can show
 * the user what it looks like. Returns undefined (not thrown) on any failure — the note still
 * gets flagged 'conflict' either way, just without a side-by-side comparison to offer.
 */
async function captureConflictShadow(
  config: WebDavConfig,
  id: string,
  sessionKey: CryptoKey | undefined,
  summary: SyncSummary,
): Promise<ConflictShadow | undefined> {
  try {
    const remoteNote = await downloadNote(config, id, sessionKey, summary);
    if (!remoteNote) return undefined;
    return {
      title: remoteNote.title,
      bodyMarkdown: remoteNote.bodyMarkdown,
      entryDate: remoteNote.entryDate,
      tags: remoteNote.tags,
      updatedAt: remoteNote.updatedAt,
      version: remoteNote.version,
    };
  } catch {
    return undefined;
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

/** Downloads and, if necessary, decrypts a remote note file into a plain local Note. Returns undefined if it's encrypted and the vault is locked. */
async function downloadNote(
  config: WebDavConfig,
  id: string,
  sessionKey: CryptoKey | undefined,
  summary: SyncSummary,
): Promise<Note | undefined> {
  const raw = await webdavClient.getNoteFile(config, id);
  const parsed: unknown = JSON.parse(raw);

  if (!isEncryptedEnvelope(parsed)) {
    return parsed as Note;
  }
  if (!sessionKey) {
    return undefined;
  }
  try {
    return await decryptNote(parsed as EncryptedNoteEnvelope, sessionKey);
  } catch (err) {
    summary.errors.push(err instanceof Error ? err.message : String(err));
    return undefined;
  }
}

async function pullNotes(config: WebDavConfig, sessionKey: CryptoKey | undefined, summary: SyncSummary): Promise<void> {
  const remoteFiles = await webdavClient.listNoteFiles(config);
  let skippedLocked = 0;

  for (const file of remoteFiles) {
    const id = idFromFilename(file.basename);
    const local = await db.notes.get(id);

    // A pending local tombstone or edit will be pushed this round (or the next);
    // don't let an in-flight pull clobber it before the push has had a chance to win.
    if (local?.deleted || local?.syncState === 'pending') continue;
    if (local && local.remoteEtag === file.etag) continue;

    const beforeErrorCount = summary.errors.length;
    const remoteNote = await downloadNote(config, id, sessionKey, summary);
    if (!remoteNote) {
      if (summary.errors.length === beforeErrorCount) skippedLocked += 1;
      continue;
    }

    if (!local) {
      await db.notes.put({ ...remoteNote, remoteEtag: file.etag ?? undefined, syncState: 'synced' });
      summary.pulled += 1;
      continue;
    }

    const decision = resolveLastWriteWins(local, remoteNote);
    if (decision.action === 'accept-remote') {
      await db.notes.put({ ...remoteNote, remoteEtag: file.etag ?? undefined, syncState: 'synced' });
      summary.pulled += 1;
    }
    // 'push-local' / 'up-to-date': local wins or already matches; the next push reconciles the etag.
  }

  if (skippedLocked > 0) {
    summary.errors.push(`${skippedLocked} verschlüsselte Notiz(en) übersprungen – bitte entsperren.`);
  }
}
