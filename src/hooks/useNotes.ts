import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import type { TagRecord } from '../db/schema';
import type { Note } from '../types/note';
import { buildTagTree, type TagTreeNode } from '../utils/tagTree';

export function useNotes(): Note[] | undefined {
  return useLiveQuery(async () => {
    const notes = await db.notes.filter((note) => !note.deleted).toArray();
    return notes.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  }, []);
}

export function useNote(id: string | undefined): Note | undefined {
  return useLiveQuery(async () => {
    if (!id) return undefined;
    return db.notes.get(id);
  }, [id]);
}

export function useTags(): TagRecord[] | undefined {
  return useLiveQuery(
    () => db.tags.orderBy('name').toArray(),
    [],
  );
}

export function useTagTree(): TagTreeNode[] | undefined {
  return useLiveQuery(async () => buildTagTree(await db.tags.toArray()), []);
}
