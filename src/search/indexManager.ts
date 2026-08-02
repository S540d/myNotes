import { Document } from 'flexsearch';
import type { Note } from '../types/note';

interface IndexedNoteDoc {
  id: string;
  title: string;
  bodyMarkdown: string;
  [key: string]: string;
}

function createDocumentIndex(): Document<IndexedNoteDoc, false> {
  return new Document<IndexedNoteDoc, false>({
    document: { id: 'id', index: ['title', 'bodyMarkdown'] },
    // 'full' matches any substring, keeping the substring-search UX notes already had in Phase 1.
    tokenize: 'full',
    context: true,
  });
}

let index = createDocumentIndex();
/** Tracks each indexed note's last-seen `updatedAt` so `syncIndex` only touches what actually changed. */
let indexedRevisions = new Map<string, string>();

/**
 * Brings the in-memory index in line with `notes` (the current, decrypted, on-device list):
 * adds new notes, re-indexes changed ones, and drops any no longer present — all in one pass,
 * skipping notes whose `updatedAt` hasn't moved since the last sync.
 */
export function syncIndex(notes: Note[]): void {
  const seen = new Set<string>();
  for (const note of notes) {
    seen.add(note.id);
    if (indexedRevisions.get(note.id) === note.updatedAt) continue;
    index.update({ id: note.id, title: note.title, bodyMarkdown: note.bodyMarkdown });
    indexedRevisions.set(note.id, note.updatedAt);
  }
  for (const id of indexedRevisions.keys()) {
    if (!seen.has(id)) {
      index.remove(id);
      indexedRevisions.delete(id);
    }
  }
}

/** Discards the index entirely, e.g. between isolated test runs. */
export function resetIndex(): void {
  index = createDocumentIndex();
  indexedRevisions = new Map();
}

export function searchNoteIds(query: string, limit = 1000): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const results = index.search(trimmed, { merge: true, limit }) as Array<{ id: string | number }>;
  return results.map((result) => String(result.id));
}

/**
 * Finds notes whose title/body are most similar to the given one, by querying the same
 * FlexSearch index with the note's own content — no separate similarity model needed.
 */
export function findSimilarNoteIds(note: { id: string; title: string; bodyMarkdown: string }, limit = 5): string[] {
  const query = `${note.title} ${note.bodyMarkdown}`.trim();
  if (!query) return [];
  // `suggest: true` turns the query into an OR/partial match instead of requiring every one of
  // its (often many) words to hit — without it, this multi-word self-query only ever matches itself.
  const results = index.search(query, { merge: true, suggest: true, limit: limit + 1 }) as Array<{
    id: string | number;
  }>;
  return results.map((result) => String(result.id)).filter((id) => id !== note.id).slice(0, limit);
}
