import { beforeEach, describe, expect, it } from 'vitest';
import { findSimilarNoteIds, resetIndex, searchNoteIds, syncIndex } from './indexManager';
import type { Note } from '../types/note';

function note(overrides: Partial<Note>): Note {
  return {
    id: 'n1',
    title: '',
    bodyMarkdown: '',
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

beforeEach(() => {
  resetIndex();
});

describe('searchNoteIds', () => {
  it('finds notes containing the query text', () => {
    syncIndex([
      note({ id: 'a', title: 'Ankunft in Lissabon', bodyMarkdown: '' }),
      note({ id: 'b', title: 'Ein Wandertag', bodyMarkdown: '' }),
    ]);
    expect(searchNoteIds('Lissabon')).toEqual(['a']);
  });
});

describe('findSimilarNoteIds', () => {
  it('finds another note sharing a word, even when neither shares most of the query', () => {
    const a = note({ id: 'a', title: 'Ankunft in Lissabon', bodyMarkdown: 'Heute in Lissabon angekommen. Die Berge waren toll.' });
    const b = note({ id: 'b', title: '', bodyMarkdown: 'Nochmal zurück in Lissabon, diesmal für ein Wochenende.' });
    syncIndex([a, b]);

    expect(findSimilarNoteIds(b)).toEqual(['a']);
  });

  it('excludes the note itself from its own results', () => {
    const a = note({ id: 'a', title: 'Ankunft in Lissabon', bodyMarkdown: 'Reisebericht' });
    syncIndex([a]);
    expect(findSimilarNoteIds(a)).toEqual([]);
  });

  it('returns nothing for an empty note', () => {
    const a = note({ id: 'a', title: '', bodyMarkdown: '' });
    syncIndex([a]);
    expect(findSimilarNoteIds(a)).toEqual([]);
  });

  it('respects the limit', () => {
    const target = note({ id: 'target', title: 'Berge', bodyMarkdown: 'Berge' });
    const others = Array.from({ length: 5 }, (_, i) => note({ id: `o${i}`, title: 'Berge', bodyMarkdown: 'Berge' }));
    syncIndex([target, ...others]);
    expect(findSimilarNoteIds(target, 3)).toHaveLength(3);
  });
});
