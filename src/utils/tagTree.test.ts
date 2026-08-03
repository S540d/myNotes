import { describe, expect, it } from 'vitest';
import { buildTagTree, descendantsOf, wouldCreateCycle } from './tagTree';

describe('buildTagTree', () => {
  it('nests children under their parent', () => {
    const tree = buildTagTree([
      { name: 'reise', noteCount: 5 },
      { name: 'portugal', noteCount: 2, parent: 'reise' },
      { name: 'lissabon', noteCount: 1, parent: 'portugal' },
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('reise');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].name).toBe('portugal');
    expect(tree[0].children[0].children[0].name).toBe('lissabon');
  });

  it('treats a tag with no parent as a root', () => {
    const tree = buildTagTree([
      { name: 'a', noteCount: 1 },
      { name: 'b', noteCount: 1 },
    ]);
    expect(tree.map((t) => t.name)).toEqual(['a', 'b']);
  });

  it('treats a tag whose parent does not exist as a root (defensive against dangling references)', () => {
    const tree = buildTagTree([{ name: 'orphan', noteCount: 1, parent: 'ghost' }]);
    expect(tree).toEqual([{ name: 'orphan', noteCount: 1, parent: 'ghost', children: [] }]);
  });

  it('sorts siblings alphabetically at every level', () => {
    const tree = buildTagTree([
      { name: 'zebra', noteCount: 1 },
      { name: 'apple', noteCount: 1 },
    ]);
    expect(tree.map((t) => t.name)).toEqual(['apple', 'zebra']);
  });
});

describe('wouldCreateCycle', () => {
  const tags = [
    { name: 'reise', noteCount: 1 },
    { name: 'portugal', noteCount: 1, parent: 'reise' },
    { name: 'lissabon', noteCount: 1, parent: 'portugal' },
  ];

  it('rejects a tag becoming its own parent', () => {
    expect(wouldCreateCycle(tags, 'reise', 'reise')).toBe(true);
  });

  it('rejects making a tag the parent of its own ancestor (would create a cycle)', () => {
    expect(wouldCreateCycle(tags, 'reise', 'lissabon')).toBe(true);
  });

  it('allows a valid reassignment that does not create a cycle', () => {
    expect(wouldCreateCycle(tags, 'lissabon', 'reise')).toBe(false);
  });

  it('allows attaching an unrelated tag', () => {
    expect(wouldCreateCycle(tags, 'sport', 'reise')).toBe(false);
  });
});

describe('descendantsOf', () => {
  const tags = [
    { name: 'reise', noteCount: 1 },
    { name: 'portugal', noteCount: 1, parent: 'reise' },
    { name: 'spanien', noteCount: 1, parent: 'reise' },
    { name: 'lissabon', noteCount: 1, parent: 'portugal' },
    { name: 'sport', noteCount: 1 },
  ];

  it('finds all nested descendants, not just direct children', () => {
    expect(descendantsOf(tags, 'reise').sort()).toEqual(['lissabon', 'portugal', 'spanien'].sort());
  });

  it('returns an empty list for a leaf tag', () => {
    expect(descendantsOf(tags, 'lissabon')).toEqual([]);
  });

  it('returns an empty list for a tag with no children', () => {
    expect(descendantsOf(tags, 'sport')).toEqual([]);
  });
});
