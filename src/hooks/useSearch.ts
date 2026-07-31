import { useMemo } from 'react';
import type { Note } from '../types/note';
import { searchNoteIds, syncIndex } from '../search/indexManager';
import { filterByTags } from '../search/tagUtils';

/**
 * Combines full-text search (FlexSearch, over the on-device plaintext notes — unaffected by
 * Phase 3 encryption, which only applies to the NAS-side copy) with tag filtering.
 *
 * The index sync runs synchronously inside the memo (not a useEffect) so a note list change
 * and its search results land in the same render instead of one render behind.
 */
export function useSearch(notes: Note[] | undefined, query: string, selectedTags: string[]): Note[] | undefined {
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

    return filterByTags(textMatched, selectedTags);
  }, [notes, query, selectedTags]);
}
