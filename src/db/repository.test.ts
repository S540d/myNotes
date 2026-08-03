import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './schema';
import {
  createNote,
  resolveConflictKeepBoth,
  resolveConflictKeepLocal,
  resolveConflictKeepRemote,
} from './repository';
import type { ConflictShadow } from '../types/note';

async function clearAll() {
  await db.notes.clear();
  await db.syncQueue.clear();
  await db.tags.clear();
}

beforeEach(clearAll);
afterEach(clearAll);

function shadow(overrides: Partial<ConflictShadow> = {}): ConflictShadow {
  return {
    title: 'Vom anderen Gerät',
    bodyMarkdown: 'Remote-Inhalt',
    entryDate: '2026-01-02',
    tags: ['reise'],
    updatedAt: '2026-01-02T00:00:00.000Z',
    version: 3,
    ...overrides,
  };
}

async function makeConflictedNote() {
  const note = await createNote({ title: 'Original', bodyMarkdown: 'lokaler Inhalt', entryDate: '2026-01-01', tags: ['alt'] });
  await db.notes.update(note.id, {
    syncState: 'conflict',
    remoteEtag: 'stale-etag',
    conflictShadow: shadow(),
  });
  await db.syncQueue.clear();
  return note.id;
}

describe('resolveConflictKeepLocal', () => {
  it('keeps the local content, clears the shadow/etag, and re-queues an unconditional push', async () => {
    const id = await makeConflictedNote();

    await resolveConflictKeepLocal(id);

    const note = await db.notes.get(id);
    expect(note?.title).toBe('Original');
    expect(note?.syncState).toBe('pending');
    expect(note?.conflictShadow).toBeUndefined();
    expect(note?.remoteEtag).toBeUndefined();
    expect(await db.syncQueue.where('noteId').equals(id).count()).toBe(1);
  });

  it('is a no-op for a note that is not in conflict', async () => {
    const note = await createNote({ title: 'Normal', bodyMarkdown: '', entryDate: '2026-01-01', tags: [] });
    await db.syncQueue.clear();

    await resolveConflictKeepLocal(note.id);

    expect(await db.syncQueue.count()).toBe(0);
  });
});

describe('resolveConflictKeepRemote', () => {
  it('adopts the shadow content and marks the note synced', async () => {
    const id = await makeConflictedNote();

    await resolveConflictKeepRemote(id);

    const note = await db.notes.get(id);
    expect(note?.title).toBe('Vom anderen Gerät');
    expect(note?.bodyMarkdown).toBe('Remote-Inhalt');
    expect(note?.tags).toEqual(['reise']);
    expect(note?.version).toBe(3);
    expect(note?.syncState).toBe('synced');
    expect(note?.conflictShadow).toBeUndefined();
    expect(note?.remoteEtag).toBeUndefined();
    expect(await db.syncQueue.where('noteId').equals(id).count()).toBe(0);
  });

  it('updates the tag registry to reflect the adopted tags', async () => {
    const id = await makeConflictedNote();
    await resolveConflictKeepRemote(id);

    expect(await db.tags.get('reise')).toMatchObject({ noteCount: 1 });
    expect(await db.tags.get('alt')).toBeUndefined();
  });

  it('is a no-op without a captured shadow', async () => {
    const note = await createNote({ title: 'Normal', bodyMarkdown: '', entryDate: '2026-01-01', tags: [] });
    await resolveConflictKeepRemote(note.id);
    expect((await db.notes.get(note.id))?.title).toBe('Normal');
  });
});

describe('resolveConflictKeepBoth', () => {
  it('creates a new note from the shadow and re-queues both notes', async () => {
    const id = await makeConflictedNote();

    await resolveConflictKeepBoth(id, ' (Konfliktkopie)');

    const original = await db.notes.get(id);
    expect(original?.title).toBe('Original');
    expect(original?.syncState).toBe('pending');
    expect(original?.conflictShadow).toBeUndefined();

    const all = await db.notes.toArray();
    const copy = all.find((n) => n.id !== id);
    expect(copy?.title).toBe('Vom anderen Gerät (Konfliktkopie)');
    expect(copy?.bodyMarkdown).toBe('Remote-Inhalt');
    expect(copy?.syncState).toBe('pending');

    expect(await db.syncQueue.count()).toBe(2);
  });
});
