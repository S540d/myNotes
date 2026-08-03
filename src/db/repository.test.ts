import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './schema';
import {
  createNote,
  deleteNote,
  getTagTree,
  rebuildTagRegistry,
  resolveConflictKeepBoth,
  resolveConflictKeepLocal,
  resolveConflictKeepRemote,
  setTagParent,
  updateNote,
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

describe('setTagParent / getTagTree', () => {
  it('nests a tag under its parent, creating the parent tag if it does not exist yet', async () => {
    await createNote({ title: 'X', bodyMarkdown: '', entryDate: '2026-01-01', tags: ['lissabon'] });

    await setTagParent('lissabon', 'reise');

    const tree = await getTagTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('reise');
    expect(tree[0].noteCount).toBe(0);
    expect(tree[0].children[0].name).toBe('lissabon');
    expect(tree[0].children[0].noteCount).toBe(1);
  });

  it('rejects a change that would create a cycle', async () => {
    await setTagParent('portugal', 'reise');
    await setTagParent('lissabon', 'portugal');

    await expect(setTagParent('reise', 'lissabon')).rejects.toThrow(/cycle/);

    // Unchanged: rejection must not have partially applied.
    const tree = await getTagTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('reise');
  });

  it('clears a parent when set to undefined', async () => {
    await setTagParent('portugal', 'reise');
    await setTagParent('portugal', undefined);

    const tree = await getTagTree();
    expect(tree.map((t) => t.name).sort()).toEqual(['portugal', 'reise']);
  });

  it('keeps a hierarchy-linked tag alive across bumpTagCounts even at zero notes', async () => {
    const note = await createNote({ title: 'X', bodyMarkdown: '', entryDate: '2026-01-01', tags: ['lissabon'] });
    await setTagParent('lissabon', 'reise');

    // Removing the tag from its only note would normally delete it outright.
    await updateNote(note.id, { title: 'X', bodyMarkdown: '', entryDate: '2026-01-01', tags: [] });

    expect(await db.tags.get('lissabon')).toMatchObject({ noteCount: 0, parent: 'reise' });
    expect(await db.tags.get('reise')).toMatchObject({ noteCount: 0 });
  });

  it('keeps hierarchy-linked tags alive across rebuildTagRegistry even at zero notes', async () => {
    const note = await createNote({ title: 'X', bodyMarkdown: '', entryDate: '2026-01-01', tags: ['lissabon'] });
    await setTagParent('lissabon', 'reise');
    await deleteNote(note.id);
    await rebuildTagRegistry();

    expect(await db.tags.get('lissabon')).toMatchObject({ noteCount: 0, parent: 'reise' });
    expect(await db.tags.get('reise')).toMatchObject({ noteCount: 0 });
  });
});
