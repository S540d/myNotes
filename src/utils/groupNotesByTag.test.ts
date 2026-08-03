import { describe, expect, it } from 'vitest';
import type { Note } from '../types/note';
import type { TagTreeNode } from './tagTree';
import { groupNotesByTag } from './groupNotesByTag';

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

describe('groupNotesByTag', () => {
  it('groups notes under their own tags in tree order, with depth for indentation', () => {
    const tree: TagTreeNode[] = [
      {
        name: 'reise',
        noteCount: 2,
        children: [{ name: 'portugal', noteCount: 1, parent: 'reise', children: [] }],
      },
      { name: 'sport', noteCount: 1, children: [] },
    ];
    const notes = [
      note({ id: 'a', tags: ['reise'] }),
      note({ id: 'b', tags: ['portugal'] }),
      note({ id: 'c', tags: ['sport'] }),
    ];

    const groups = groupNotesByTag(notes, tree);
    expect(groups.map((g) => [g.tagName, g.depth, g.notes.map((n) => n.id)])).toEqual([
      ['reise', 0, ['a']],
      ['portugal', 1, ['b']],
      ['sport', 0, ['c']],
    ]);
  });

  it('does not inherit child-tagged notes into the parent group', () => {
    const tree: TagTreeNode[] = [
      { name: 'reise', noteCount: 1, children: [{ name: 'portugal', noteCount: 1, parent: 'reise', children: [] }] },
    ];
    const notes = [note({ id: 'a', tags: ['portugal'] })];

    const groups = groupNotesByTag(notes, tree);
    expect(groups).toEqual([{ tagName: 'portugal', depth: 1, notes: [notes[0]] }]);
  });

  it('omits groups with no matching notes', () => {
    const tree: TagTreeNode[] = [{ name: 'unused', noteCount: 0, children: [] }];
    expect(groupNotesByTag([], tree)).toEqual([]);
  });

  it('puts untagged notes in a final "no tag" group', () => {
    const tree: TagTreeNode[] = [{ name: 'sport', noteCount: 1, children: [] }];
    const notes = [note({ id: 'a', tags: ['sport'] }), note({ id: 'b', tags: [] })];

    const groups = groupNotesByTag(notes, tree);
    expect(groups[groups.length - 1]).toEqual({ tagName: undefined, depth: 0, notes: [notes[1]] });
  });

  it('lets a multi-tagged note appear in more than one group', () => {
    const tree: TagTreeNode[] = [
      { name: 'reise', noteCount: 1, children: [] },
      { name: 'sport', noteCount: 1, children: [] },
    ];
    const n = note({ id: 'a', tags: ['reise', 'sport'] });

    const groups = groupNotesByTag([n], tree);
    expect(groups.map((g) => g.tagName)).toEqual(['reise', 'sport']);
    expect(groups[0].notes).toEqual([n]);
    expect(groups[1].notes).toEqual([n]);
  });
});
