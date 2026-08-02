import { describe, expect, it } from 'vitest';
import type { Note } from '../types/note';
import { resolveLastWriteWins } from './conflictResolver';

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

describe('resolveLastWriteWins', () => {
  it('reports up-to-date when version and updatedAt are identical', () => {
    const local = note({ version: 2, updatedAt: '2026-01-02T00:00:00.000Z' });
    const remote = note({ version: 2, updatedAt: '2026-01-02T00:00:00.000Z' });
    expect(resolveLastWriteWins(local, remote)).toEqual({ action: 'up-to-date' });
  });

  it('prefers the higher version regardless of updatedAt', () => {
    const local = note({ version: 3, updatedAt: '2026-01-01T00:00:00.000Z' });
    const remote = note({ version: 2, updatedAt: '2026-01-05T00:00:00.000Z' });
    expect(resolveLastWriteWins(local, remote)).toEqual({ action: 'push-local' });
  });

  it('accepts remote when its version is higher', () => {
    const local = note({ version: 2 });
    const remote = note({ version: 5 });
    expect(resolveLastWriteWins(local, remote)).toEqual({ action: 'accept-remote' });
  });

  it('falls back to updatedAt when versions match but content diverged', () => {
    const local = note({ version: 4, updatedAt: '2026-01-05T00:00:00.000Z' });
    const remote = note({ version: 4, updatedAt: '2026-01-04T00:00:00.000Z' });
    expect(resolveLastWriteWins(local, remote)).toEqual({ action: 'push-local' });

    const remoteNewer = note({ version: 4, updatedAt: '2026-01-06T00:00:00.000Z' });
    expect(resolveLastWriteWins(local, remoteNewer)).toEqual({ action: 'accept-remote' });
  });
});
