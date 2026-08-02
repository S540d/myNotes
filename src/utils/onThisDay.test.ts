import { describe, expect, it } from 'vitest';
import type { Note } from '../types/note';
import { findOnThisDay } from './onThisDay';

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

describe('findOnThisDay', () => {
  const today = new Date('2026-08-02T12:00:00.000Z');

  it('finds an entry from a previous year on the same month/day', () => {
    const a = note({ id: 'a', entryDate: '2024-08-02' });
    const result = findOnThisDay([a], today);
    expect(result).toEqual([{ note: a, yearsAgo: 2 }]);
  });

  it('ignores entries on a different day', () => {
    const a = note({ id: 'a', entryDate: '2024-08-03' });
    expect(findOnThisDay([a], today)).toEqual([]);
  });

  it('ignores entries from this year or the future', () => {
    const a = note({ id: 'a', entryDate: '2026-08-02' });
    const b = note({ id: 'b', entryDate: '2027-08-02' });
    expect(findOnThisDay([a, b], today)).toEqual([]);
  });

  it('ignores deleted entries', () => {
    const a = note({ id: 'a', entryDate: '2024-08-02', deleted: true });
    expect(findOnThisDay([a], today)).toEqual([]);
  });

  it('sorts multiple matching years most-recent-first', () => {
    const older = note({ id: 'older', entryDate: '2020-08-02' });
    const newer = note({ id: 'newer', entryDate: '2024-08-02' });
    expect(findOnThisDay([older, newer], today)).toEqual([
      { note: newer, yearsAgo: 2 },
      { note: older, yearsAgo: 6 },
    ]);
  });
});
