import { v4 as uuidv4 } from 'uuid';
import { db } from './schema';
import type { Note, NoteDraft } from '../types/note';

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
  await Promise.all(
    tags.map(async (name) => {
      const existing = await db.tags.get(name);
      const noteCount = (existing?.noteCount ?? 0) + delta;
      if (noteCount <= 0) {
        await db.tags.delete(name);
      } else {
        await db.tags.put({ name, noteCount });
      }
    }),
  );
}

export async function createNote(draft: NoteDraft): Promise<Note> {
  const now = new Date().toISOString();
  const note: Note = {
    id: uuidv4(),
    title: draft.title,
    bodyMarkdown: draft.bodyMarkdown,
    entryDate: draft.entryDate,
    tags: normalizeTags(draft.tags),
    createdAt: now,
    updatedAt: now,
    version: 1,
    encrypted: false,
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
    await db.tags.clear();
    await db.tags.bulkPut([...counts.entries()].map(([name, noteCount]) => ({ name, noteCount })));
  });
}
