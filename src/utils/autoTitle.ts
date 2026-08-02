const MAX_LENGTH = 60;

/** Strips the lightweight Markdown formatting NoteEditor supports from a single line. */
function stripMarkdown(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/[*_`~]/g, '')
    .trim();
}

/**
 * Suggests a title from the first non-empty line of a note body — the classic
 * "first line becomes the headline" behavior, without any NLP/summarization.
 */
export function suggestTitleFromBody(bodyMarkdown: string): string {
  const firstLine = bodyMarkdown
    .split('\n')
    .map((line) => stripMarkdown(line))
    .find((line) => line.length > 0);
  if (!firstLine) return '';
  return firstLine.length > MAX_LENGTH ? `${firstLine.slice(0, MAX_LENGTH).trimEnd()}…` : firstLine;
}
