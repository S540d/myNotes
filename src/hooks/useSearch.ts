import { useMemo } from 'react';
import type { Note } from '../types/note';
import { findSimilarNoteIds, searchNoteIds, syncIndex } from '../search/indexManager';
import { filterByTags } from '../search/tagUtils';
import type { TagLike } from '../utils/tagTree';

/**
 * Combines full-text search (FlexSearch, over the on-device plaintext notes — unaffected by
 * Phase 3 encryption, which only applies to the NAS-side copy) with hierarchy-aware tag filtering.
 *
 * The index sync runs synchronously inside the memo (not a useEffect) so a note list change
 * and its search results land in the same render instead of one render behind.
 */
export function useSearch(
  notes: Note[] | undefined,
  query: string,
  selectedTags: string[],
  allTags: TagLike[],
): Note[] | undefined {
  return useMemo(() => {
    if (!notes) return undefined;

    syncIndex(notes);

    const trimmed = query.trim();
    const textMatched = trimmed
      ? (() => {
          const ids = new Set(searchNoteIds(trimmed));
          return notes.filter((note) => ids.has(note.id));
        })()
      : notes;

    return filterByTags(textMatched, selectedTags, allTags);
  }, [notes, query, selectedTags, allTags]);
}

/** Notes most similar in content to `note`, using the same FlexSearch index as full-text search. */
export function useSimilarNotes(note: Note | undefined, allNotes: Note[] | undefined, limit = 5): Note[] {
  return useMemo(() => {
    if (!note || !allNotes) return [];
    syncIndex(allNotes);
    const byId = new Map(allNotes.map((n) => [n.id, n]));
    return findSimilarNoteIds(note, limit)
      .map((id) => byId.get(id))
      .filter((n): n is Note => n !== undefined);
  }, [note, allNotes, limit]);
}
