import { v4 as uuidv4 } from 'uuid';
import { db } from './schema';
import type { TagRecord } from './schema';
import type { Note, NoteDraft } from '../types/note';
import { isEncryptionSetUp } from '../crypto/credentialVault';
import { buildTagTree, wouldCreateCycle, type TagTreeNode } from '../utils/tagTree';

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (tag) seen.add(tag);
  }
  return [...seen];
}

async function enqueueSync(noteId: string, op: 'put' | 'delete'): Promise<void> {
  await db.syncQueue.add({
    noteId,
    op,
    createdAt: new Date().toISOString(),
    attemptCount: 0,
  });
}

async function bumpTagCounts(tags: string[], delta: number): Promise<void> {
  if (tags.length === 0) return;
  // A tag at 0 notes is still kept around if it's part of the user-defined hierarchy (has a
  // parent, or is itself a parent of another tag) — only truly unused, un-hierarchied tags are dropped.
  const parentTags = new Set(
    (await db.tags.toArray()).map((tag) => tag.parent).filter((parent): parent is string => parent !== undefined),
  );

  await Promise.all(
    tags.map(async (name) => {
      const existing = await db.tags.get(name);
      const noteCount = Math.max((existing?.noteCount ?? 0) + delta, 0);
      const keepForHierarchy = existing?.parent !== undefined || parentTags.has(name);
      if (noteCount <= 0 && !keepForHierarchy) {
        await db.tags.delete(name);
      } else {
        await db.tags.put({ name, noteCount, parent: existing?.parent });
      }
    }),
  );
}

export async function createNote(draft: NoteDraft): Promise<Note> {
  const now = new Date().toISOString();
  // New notes default to encrypted once an encryption vault exists; existing notes need the explicit bulk action.
  const encrypted = await isEncryptionSetUp();
  const note: Note = {
    id: uuidv4(),
    title: draft.title,
    bodyMarkdown: draft.bodyMarkdown,
    entryDate: draft.entryDate,
    tags: normalizeTags(draft.tags),
    createdAt: now,
    updatedAt: now,
    version: 1,
    encrypted,
    deleted: false,
    syncState: 'pending',
  };
  await db.transaction('rw', db.notes, db.syncQueue, db.tags, async () => {
    await db.notes.add(note);
    await enqueueSync(note.id, 'put');
    await bumpTagCounts(note.tags, 1);
  });
  return note;
}

export async function updateNote(id: string, draft: NoteDraft): Promise<Note> {
  const existing = await db.notes.get(id);
  if (!existing) throw new Error(`Note ${id} not found`);

  const tags = normalizeTags(draft.tags);
  const updated: Note = {
    ...existing,
    title: draft.title,
    bodyMarkdown: draft.bodyMarkdown,
    entryDate: draft.entryDate,
    tags,
    updatedAt: new Date().toISOString(),
    version: existing.version + 1,
    syncState: 'pending',
  };

  await db.transaction('rw', db.notes, db.syncQueue, db.tags, async () => {
    await db.notes.put(updated);
    await enqueueSync(id, 'put');
    const removedTags = existing.tags.filter((t) => !tags.includes(t));
    const addedTags = tags.filter((t) => !existing.tags.includes(t));
    await bumpTagCounts(removedTags, -1);
    await bumpTagCounts(addedTags, 1);
  });

  return updated;
}

export async function deleteNote(id: string): Promise<void> {
  const existing = await db.notes.get(id);
  if (!existing) return;

  const now = new Date().toISOString();
  await db.transaction('rw', db.notes, db.syncQueue, db.tags, async () => {
    await db.notes.put({
      ...existing,
      deleted: true,
      deletedAt: now,
      updatedAt: now,
      version: existing.version + 1,
      syncState: 'pending',
    });
    await enqueueSync(id, 'delete');
    await bumpTagCounts(existing.tags, -1);
  });
}

export async function getNote(id: string): Promise<Note | undefined> {
  return db.notes.get(id);
}

export async function listNotes(): Promise<Note[]> {
  const notes = await db.notes.filter((note) => !note.deleted).toArray();
  return notes.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
}

/** Recomputes the tag registry from scratch. Needed after sync writes notes directly to `db.notes`, bypassing the incremental bumpTagCounts calls above. */
export async function rebuildTagRegistry(): Promise<void> {
  const notes = await db.notes.filter((note) => !note.deleted).toArray();
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  await db.transaction('rw', db.tags, async () => {
    const existingTags = await db.tags.toArray();
    const parentOf = new Map(existingTags.map((tag) => [tag.name, tag.parent]));
    const referencedAsParent = new Set(
      existingTags.map((tag) => tag.parent).filter((parent): parent is string => parent !== undefined),
    );

    // Keep hierarchy-relevant tags (has a parent, or is a parent) even if no note uses them directly.
    for (const tag of existingTags) {
      if (!counts.has(tag.name) && (tag.parent !== undefined || referencedAsParent.has(tag.name))) {
        counts.set(tag.name, 0);
      }
    }

    await db.tags.clear();
    await db.tags.bulkPut(
      [...counts.entries()].map(([name, noteCount]) => ({ name, noteCount, parent: parentOf.get(name) })),
    );
  });
}

/** All tags as a parent/child forest, for the tag-hierarchy UI. */
export async function getTagTree(): Promise<TagTreeNode[]> {
  return buildTagTree(await db.tags.toArray());
}

/**
 * Sets (or clears, with `parent: undefined`) a tag's parent. Creates the parent tag record
 * (at noteCount 0) if it doesn't exist yet, so users can build purely organizational tags.
 * Throws if the change would create a cycle.
 */
export async function setTagParent(name: string, parent: string | undefined): Promise<void> {
  await db.transaction('rw', db.tags, async () => {
    const allTags = await db.tags.toArray();

    if (parent !== undefined && wouldCreateCycle(allTags, name, parent)) {
      throw new Error(`Setting "${parent}" as the parent of "${name}" would create a cycle.`);
    }

    if (parent !== undefined && !allTags.some((tag) => tag.name === parent)) {
      await db.tags.add({ name: parent, noteCount: 0 });
    }

    const existing = allTags.find((tag) => tag.name === name);
    const record: TagRecord = { name, noteCount: existing?.noteCount ?? 0, parent };
    await db.tags.put(record);
  });
}

/** Flips a note's at-rest encryption flag and queues it for re-upload; no-op if it's already in the target state. */
export async function setNoteEncryption(id: string, encrypted: boolean): Promise<void> {
  const existing = await db.notes.get(id);
  if (!existing || existing.deleted || existing.encrypted === encrypted) return;

  const now = new Date().toISOString();
  await db.transaction('rw', db.notes, db.syncQueue, async () => {
    await db.notes.put({ ...existing, encrypted, updatedAt: now, version: existing.version + 1, syncState: 'pending' });
    await enqueueSync(id, 'put');
  });
}

/** Re-flags every non-deleted note to the target encryption state, reporting progress as it goes. Returns the number of notes touched. */
export async function bulkSetEncryption(
  encrypted: boolean,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const notes = await db.notes.filter((note) => !note.deleted && note.encrypted !== encrypted).toArray();
  let done = 0;
  for (const note of notes) {
    await setNoteEncryption(note.id, encrypted);
    done += 1;
    onProgress?.(done, notes.length);
  }
  return notes.length;
}

/**
 * Conflict resolution: a note lands in `syncState: 'conflict'` when a push loses a race against
 * a remote change (412 Precondition Failed) — the local edit is kept as-is and the losing remote
 * version is captured as `conflictShadow` for the user to compare against. Exactly one of the
 * three functions below resolves it; `remoteEtag` is always cleared so the next push is
 * unconditional (an explicit user decision, not a blind overwrite).
 */

/** Keeps the local edit and re-queues it for an unconditional push, discarding the shadow. */
export async function resolveConflictKeepLocal(id: string): Promise<void> {
  const existing = await db.notes.get(id);
  if (!existing || existing.syncState !== 'conflict') return;

  await db.transaction('rw', db.notes, db.syncQueue, async () => {
    await db.notes.update(id, { syncState: 'pending', conflictShadow: undefined, remoteEtag: undefined });
    await enqueueSync(id, 'put');
  });
}

/** Adopts the shadow (remote) version as the note's content, discarding the local edit. */
export async function resolveConflictKeepRemote(id: string): Promise<void> {
  const existing = await db.notes.get(id);
  if (!existing?.conflictShadow) return;
  const shadow = existing.conflictShadow;
  const tags = normalizeTags(shadow.tags);

  await db.transaction('rw', db.notes, db.tags, async () => {
    await db.notes.put({
      ...existing,
      title: shadow.title,
      bodyMarkdown: shadow.bodyMarkdown,
      entryDate: shadow.entryDate,
      tags,
      updatedAt: shadow.updatedAt,
      version: shadow.version,
      syncState: 'synced',
      conflictShadow: undefined,
      remoteEtag: undefined,
    });
    const removedTags = existing.tags.filter((t) => !tags.includes(t));
    const addedTags = tags.filter((t) => !existing.tags.includes(t));
    await bumpTagCounts(removedTags, -1);
    await bumpTagCounts(addedTags, 1);
  });
}

/**
 * Keeps both: the local edit stays on this note (re-queued for an unconditional push), and the
 * shadow becomes a new, separate note (also queued for push). `copyTitleSuffix` (e.g. " (conflict
 * copy)") is caller-supplied so this stays free of UI/i18n concerns.
 */
export async function resolveConflictKeepBoth(id: string, copyTitleSuffix: string): Promise<void> {
  const existing = await db.notes.get(id);
  if (!existing?.conflictShadow) return;
  const shadow = existing.conflictShadow;
  const now = new Date().toISOString();
  const tags = normalizeTags(shadow.tags);
  const copy: Note = {
    id: uuidv4(),
    title: `${shadow.title}${copyTitleSuffix}`,
    bodyMarkdown: shadow.bodyMarkdown,
    entryDate: shadow.entryDate,
    tags,
    createdAt: now,
    updatedAt: now,
    version: 1,
    encrypted: existing.encrypted,
    deleted: false,
    syncState: 'pending',
  };

  await db.transaction('rw', db.notes, db.syncQueue, db.tags, async () => {
    await db.notes.add(copy);
    await enqueueSync(copy.id, 'put');
    await bumpTagCounts(tags, 1);

    await db.notes.update(id, { syncState: 'pending', conflictShadow: undefined, remoteEtag: undefined });
    await enqueueSync(id, 'put');
  });
}
