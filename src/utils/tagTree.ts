export interface TagLike {
  name: string;
  noteCount: number;
  parent?: string;
}

export interface TagTreeNode extends TagLike {
  children: TagTreeNode[];
}

/** Builds a forest from a flat tag list; a tag whose parent doesn't exist (or points at itself) becomes a root. */
export function buildTagTree(tags: TagLike[]): TagTreeNode[] {
  const byName = new Map<string, TagTreeNode>(tags.map((tag) => [tag.name, { ...tag, children: [] }]));
  const roots: TagTreeNode[] = [];

  for (const tag of byName.values()) {
    const parent = tag.parent && tag.parent !== tag.name ? byName.get(tag.parent) : undefined;
    if (parent) parent.children.push(tag);
    else roots.push(tag);
  }

  const sortRec = (nodes: TagTreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) sortRec(node.children);
  };
  sortRec(roots);

  return roots;
}

/** Whether setting `newParent` as `name`'s parent would create a cycle (including `name === newParent`). */
export function wouldCreateCycle(tags: TagLike[], name: string, newParent: string): boolean {
  if (name === newParent) return true;
  const byName = new Map(tags.map((tag) => [tag.name, tag]));
  const seen = new Set<string>();
  let current: string | undefined = newParent;
  while (current) {
    if (current === name) return true;
    if (seen.has(current)) return false; // pre-existing cycle elsewhere; not this change's problem
    seen.add(current);
    current = byName.get(current)?.parent;
  }
  return false;
}

/** All descendants (children, grandchildren, ...) of `name`, in no particular order. */
export function descendantsOf(tags: TagLike[], name: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const tag of tags) {
    if (!tag.parent) continue;
    const siblings = childrenOf.get(tag.parent) ?? [];
    siblings.push(tag.name);
    childrenOf.set(tag.parent, siblings);
  }

  const result: string[] = [];
  const stack = [...(childrenOf.get(name) ?? [])];
  while (stack.length > 0) {
    const next = stack.pop() as string;
    result.push(next);
    stack.push(...(childrenOf.get(next) ?? []));
  }
  return result;
}
