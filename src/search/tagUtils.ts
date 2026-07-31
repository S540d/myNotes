import type { Note } from '../types/note';

export function noteMatchesTags(note: Note, selectedTags: string[]): boolean {
  return selectedTags.every((tag) => note.tags.includes(tag));
}

/** Intersects a (possibly text-search-filtered) note list with the selected tags. */
export function filterByTags(notes: Note[], selectedTags: string[]): Note[] {
  if (selectedTags.length === 0) return notes;
  return notes.filter((note) => noteMatchesTags(note, selectedTags));
}
