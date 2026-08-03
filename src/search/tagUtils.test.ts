import { describe, expect, it } from 'vitest';
import type { Note } from '../types/note';
import { filterByTags, noteMatchesTags } from './tagUtils';

function note(overrides: Partial<Note>): Note {
  return {
    id: 'n1',
    title: 't',
    bodyMarkdown: 'b',
    entryDate: '2026-01-01',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    encrypted: false,
    deleted: false,
    syncState: 'synced',
    ...overrides,
  };
}

const hierarchy = [
  { name: 'reise', noteCount: 1 },
  { name: 'portugal', noteCount: 1, parent: 'reise' },
  { name: 'lissabon', noteCount: 1, parent: 'portugal' },
  { name: 'sport', noteCount: 1 },
];

describe('noteMatchesTags', () => {
  it('matches an exact tag with no hierarchy involved', () => {
    expect(noteMatchesTags(note({ tags: ['sport'] }), ['sport'], hierarchy)).toBe(true);
  });

  it('matches a note tagged only with a descendant when the ancestor is selected', () => {
    expect(noteMatchesTags(note({ tags: ['lissabon'] }), ['reise'], hierarchy)).toBe(true);
  });

  it('does not match the other direction (selecting a child does not pull in the parent)', () => {
    expect(noteMatchesTags(note({ tags: ['reise'] }), ['lissabon'], hierarchy)).toBe(false);
  });

  it('AND-s multiple selected tag families', () => {
    const n = note({ tags: ['lissabon', 'sport'] });
    expect(noteMatchesTags(n, ['reise', 'sport'], hierarchy)).toBe(true);
    expect(noteMatchesTags(n, ['reise', 'unrelated'], hierarchy)).toBe(false);
  });
});

describe('filterByTags', () => {
  it('returns all notes when nothing is selected', () => {
    const notes = [note({ id: 'a' }), note({ id: 'b' })];
    expect(filterByTags(notes, [], hierarchy)).toBe(notes);
  });

  it('filters using hierarchy-aware matching', () => {
    const notes = [note({ id: 'a', tags: ['lissabon'] }), note({ id: 'b', tags: ['sport'] })];
    expect(filterByTags(notes, ['reise'], hierarchy).map((n) => n.id)).toEqual(['a']);
  });
});
