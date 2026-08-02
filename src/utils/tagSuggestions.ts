/** Existing tags whose name starts with `partial`, excluding tags already on the note. Case-insensitive. */
export function suggestMatchingTags(partial: string, allTags: string[], excluding: string[]): string[] {
  const needle = partial.trim().toLowerCase();
  if (!needle) return [];
  const excludeSet = new Set(excluding.map((t) => t.toLowerCase()));
  return allTags.filter((tag) => !excludeSet.has(tag.toLowerCase()) && tag.toLowerCase().startsWith(needle));
}

/**
 * Existing tags that appear as whole words in the given text but aren't on the note yet —
 * a lightweight (no ML) way to surface tags the user probably forgot to add.
 */
export function suggestTagsFromText(text: string, allTags: string[], excluding: string[]): string[] {
  const excludeSet = new Set(excluding.map((t) => t.toLowerCase()));
  const lowerText = text.toLowerCase();
  return allTags.filter((tag) => {
    const lowerTag = tag.toLowerCase();
    if (excludeSet.has(lowerTag)) return false;
    const wordBoundary = new RegExp(`(?:^|\\W)${escapeRegExp(lowerTag)}(?:$|\\W)`, 'u');
    return wordBoundary.test(lowerText);
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
