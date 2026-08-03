import type { Note } from '../types/note';
import type { TagTreeNode } from './tagTree';

export interface TagGroup {
  /** undefined marks the "no tag" bucket, always last. */
  tagName: string | undefined;
  depth: number;
  notes: Note[];
}

/**
 * Clusters notes by their own tags (not inherited from ancestors — a note only shows up under
 * tags it's actually tagged with), ordered depth-first through the tag tree so a parent's section
 * appears before its children's, with `depth` for indentation. Groups with no matching notes are
 * omitted. Notes untagged entirely land in one final "no tag" group.
 */
export function groupNotesByTag(notes: Note[], tree: TagTreeNode[]): TagGroup[] {
  const groups: TagGroup[] = [];

  const walk = (nodes: TagTreeNode[], depth: number) => {
    for (const node of nodes) {
      const matched = notes.filter((note) => note.tags.includes(node.name));
      if (matched.length > 0) groups.push({ tagName: node.name, depth, notes: matched });
      walk(node.children, depth + 1);
    }
  };
  walk(tree, 0);

  const untagged = notes.filter((note) => note.tags.length === 0);
  if (untagged.length > 0) groups.push({ tagName: undefined, depth: 0, notes: untagged });

  return groups;
}
