import type { Note } from '../types/note';
import { descendantsOf, type TagLike } from '../utils/tagTree';

/**
 * A note matches a selected tag if it has that exact tag, or any of its descendants — selecting a
 * broad tag (e.g. "reise") is meant to also surface notes tagged only with a narrower child
 * (e.g. "portugal"). Multiple selected tags are still AND'd together (every family must match).
 */
export function noteMatchesTags(note: Note, selectedTags: string[], allTags: TagLike[]): boolean {
  return selectedTags.every((tag) => {
    if (note.tags.includes(tag)) return true;
    return descendantsOf(allTags, tag).some((descendant) => note.tags.includes(descendant));
  });
}

/** Intersects a (possibly text-search-filtered) note list with the selected tags. */
export function filterByTags(notes: Note[], selectedTags: string[], allTags: TagLike[]): Note[] {
  if (selectedTags.length === 0) return notes;
  return notes.filter((note) => noteMatchesTags(note, selectedTags, allTags));
}
