import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./webdavClient', () => {
  class PreconditionFailedError extends Error {
    constructor(id: string) {
      super(`412 Precondition Failed for note ${id}`);
      this.name = 'PreconditionFailedError';
    }
  }

  let notes = new Map<string, { content: string; etag: string }>();
  let tombstones = new Map<string, { deletedAt: string }>();
  let etagCounter = 0;
  let failNextPutNoteFile: Error | undefined;

  return {
    PreconditionFailedError,
    ensureRemoteLayout: vi.fn(async () => {}),
    listNoteFiles: vi.fn(async () =>
      [...notes.entries()].map(([id, f]) => ({ basename: `${id}.json`, etag: f.etag, lastmod: '' })),
    ),
    listTombstoneFiles: vi.fn(async () =>
      [...tombstones.keys()].map((id) => ({ basename: `${id}.json`, etag: null, lastmod: '' })),
    ),
    getNoteFile: vi.fn(async (_config: unknown, id: string) => {
      const f = notes.get(id);
      if (!f) throw new Error(`fake remote: note ${id} not found`);
      return f.content;
    }),
    putNoteFile: vi.fn(async (_config: unknown, id: string, body: string, ifMatchEtag?: string | null) => {
      if (failNextPutNoteFile) {
        const err = failNextPutNoteFile;
        failNextPutNoteFile = undefined;
        throw err;
      }
      const existing = notes.get(id);
      if (ifMatchEtag && existing && existing.etag !== ifMatchEtag) {
        throw new PreconditionFailedError(id);
      }
      etagCounter += 1;
      notes.set(id, { content: body, etag: `etag-${etagCounter}` });
    }),
    deleteNoteFile: vi.fn(async (_config: unknown, id: string) => {
      notes.delete(id);
    }),
    putTombstoneFile: vi.fn(async (_config: unknown, id: string, deletedAt: string) => {
      tombstones.set(id, { deletedAt });
    }),
    getTombstoneFile: vi.fn(async (_config: unknown, id: string) => {
      const t = tombstones.get(id);
      if (!t) throw new Error(`fake remote: tombstone ${id} not found`);
      return { id, deletedAt: t.deletedAt };
    }),
    putVaultDescriptor: vi.fn(async () => {}),
    getVaultDescriptor: vi.fn(async () => undefined),
    testConnection: vi.fn(async () => {}),
    __reset: () => {
      notes = new Map();
      tombstones = new Map();
      etagCounter = 0;
      failNextPutNoteFile = undefined;
    },
    __setRemoteNote: (id: string, content: string) => {
      etagCounter += 1;
      notes.set(id, { content, etag: `etag-${etagCounter}` });
    },
    __getRemoteNoteRaw: (id: string) => notes.get(id)?.content,
    __getRemoteEtag: (id: string) => notes.get(id)?.etag,
    __hasRemoteNote: (id: string) => notes.has(id),
    __hasTombstone: (id: string) => tombstones.has(id),
    __failNextPutNoteFile: (err: Error) => {
      failNextPutNoteFile = err;
    },
  };
});

import { db } from '../db/schema';
import { createNote, deleteNote } from '../db/repository';
import type { Note } from '../types/note';
import * as fakeWebdav from './webdavClient';
import { runSync, saveWebDavConfig } from './syncEngine';

const fake = fakeWebdav as unknown as {
  __reset: () => void;
  __setRemoteNote: (id: string, content: string) => void;
  __getRemoteNoteRaw: (id: string) => string | undefined;
  __hasRemoteNote: (id: string) => boolean;
  __hasTombstone: (id: string) => boolean;
  __failNextPutNoteFile: (err: Error) => void;
  __getRemoteEtag: (id: string) => string | undefined;
};

const CONFIG = { url: 'https://nas.example.test/dav', username: 'u', password: 'p' };

beforeEach(async () => {
  fake.__reset();
  await db.notes.clear();
  await db.syncQueue.clear();
  await db.settings.clear();
  await db.tags.clear();
  await saveWebDavConfig(CONFIG);
});

afterEach(async () => {
  await db.notes.clear();
  await db.syncQueue.clear();
  await db.settings.clear();
  await db.tags.clear();
});

describe('runSync', () => {
  it('pushes a new local note cleanly to the remote store', async () => {
    const note = await createNote({ title: 'Tag 1', bodyMarkdown: 'Hallo', entryDate: '2026-01-01', tags: [] });

    const summary = await runSync();

    expect(summary.pushed).toBe(1);
    expect(summary.errors).toEqual([]);
    expect(fake.__hasRemoteNote(note.id)).toBe(true);
    expect(await db.syncQueue.count()).toBe(0);
    expect((await db.notes.get(note.id))?.syncState).toBe('synced');
  });

  it('pulls a note that only exists on the remote', async () => {
    const remoteNote: Note = {
      id: 'remote-1',
      title: 'Von einem anderen Gerät',
      bodyMarkdown: 'Inhalt',
      entryDate: '2026-02-01',
      tags: ['reise'],
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
      version: 1,
      encrypted: false,
      deleted: false,
      syncState: 'synced',
    };
    fake.__setRemoteNote(remoteNote.id, JSON.stringify(remoteNote));

    const summary = await runSync();

    expect(summary.pulled).toBe(1);
    const local = await db.notes.get(remoteNote.id);
    expect(local?.title).toBe(remoteNote.title);
    expect(local?.syncState).toBe('synced');
  });

  it('flags a push conflict when the remote copy moved on since the local edit was queued (simultaneous two-device edit)', async () => {
    const note = await createNote({ title: 'Original', bodyMarkdown: 'v1', entryDate: '2026-01-01', tags: [] });
    await runSync();
    // This device last knew the remote at the etag its own push produced.
    await db.notes.update(note.id, { remoteEtag: fake.__getRemoteEtag(note.id) });

    // Simulate a second device pushing a newer version behind our back (different etag).
    fake.__setRemoteNote(note.id, JSON.stringify({ ...note, version: 2, bodyMarkdown: 'from other device' }));

    await db.notes.update(note.id, { bodyMarkdown: 'local edit', version: 2, syncState: 'pending' });
    await db.syncQueue.add({ noteId: note.id, op: 'put', createdAt: new Date().toISOString(), attemptCount: 0 });

    const summary = await runSync();

    expect(summary.conflicts).toBe(1);
    expect(summary.errors.some((e) => e.includes('Konflikt'))).toBe(true);
    expect((await db.notes.get(note.id))?.syncState).toBe('conflict');
  });

  it('keeps a note pending and retries after a transient push failure (offline queue + reconnect)', async () => {
    const note = await createNote({ title: 'Offline', bodyMarkdown: 'v1', entryDate: '2026-01-01', tags: [] });

    fake.__failNextPutNoteFile(new Error('network unreachable'));
    const firstSummary = await runSync();

    expect(firstSummary.pushed).toBe(0);
    expect(firstSummary.errors.length).toBeGreaterThan(0);
    expect(await db.syncQueue.count()).toBe(1);
    expect(fake.__hasRemoteNote(note.id)).toBe(false);

    // "Reconnect": the next sync succeeds because nothing fails this time.
    const secondSummary = await runSync();
    expect(secondSummary.pushed).toBe(1);
    expect(await db.syncQueue.count()).toBe(0);
    expect(fake.__hasRemoteNote(note.id)).toBe(true);
  });

  it('propagates a local delete as a remote tombstone', async () => {
    const note = await createNote({ title: 'Zu löschen', bodyMarkdown: 'v1', entryDate: '2026-01-01', tags: [] });
    await runSync();
    expect(fake.__hasRemoteNote(note.id)).toBe(true);

    await deleteNote(note.id);
    const summary = await runSync();

    expect(summary.deletedRemote).toBe(1);
    expect(fake.__hasTombstone(note.id)).toBe(true);
    expect(fake.__hasRemoteNote(note.id)).toBe(false);
  });

  it('applies a remote tombstone to a local note that has no pending edits', async () => {
    const remoteNote: Note = {
      id: 'remote-2',
      title: 'Woanders gelöscht',
      bodyMarkdown: 'Inhalt',
      entryDate: '2026-02-01',
      tags: [],
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
      version: 1,
      encrypted: false,
      deleted: false,
      syncState: 'synced',
    };
    await db.notes.put(remoteNote);

    fake.__setRemoteNote(remoteNote.id, JSON.stringify(remoteNote));
    await runSync();

    const { putTombstoneFile } = (await import('./webdavClient')) as unknown as {
      putTombstoneFile: (config: unknown, id: string, deletedAt: string) => Promise<void>;
    };
    await putTombstoneFile(CONFIG, remoteNote.id, '2026-03-01T00:00:00.000Z');

    const summary = await runSync();

    expect(summary.deletedLocal).toBe(1);
    expect((await db.notes.get(remoteNote.id))?.deleted).toBe(true);
  });
});
