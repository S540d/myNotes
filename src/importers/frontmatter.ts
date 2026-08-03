/**
 * Minimal YAML-frontmatter support, hand-rolled instead of pulling in a full YAML parser:
 * only handles the shape myNotes itself writes (`key: value` and `key: [a, b, c]` flow
 * lists), which is also what the Markdown importer needs to read back.
 */
export interface FrontmatterData {
  title?: string;
  entryDate?: string;
  tags?: string[];
}

export interface ParsedFrontmatter {
  data: FrontmatterData;
  content: string;
}

function parseScalar(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseValue(raw: string): string | string[] {
  const trimmed = raw.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((item) => parseScalar(item));
  }
  return parseScalar(trimmed);
}

const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Splits a Markdown file into its frontmatter fields (if any) and the remaining body. */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const match = raw.match(FRONTMATTER_BLOCK);
  if (!match) return { data: {}, content: raw };

  const data: FrontmatterData = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = parseValue(line.slice(separatorIndex + 1));

    if (key === 'title' && typeof value === 'string') data.title = value;
    else if (key === 'entryDate' && typeof value === 'string') data.entryDate = value;
    else if (key === 'tags') data.tags = Array.isArray(value) ? value : [value].filter(Boolean);
  }

  return { data, content: raw.slice(match[0].length) };
}

function yamlListLiteral(tags: string[]): string {
  return `[${tags.join(', ')}]`;
}

/**
 * Inverse of parseFrontmatter, for export — always writes all three fields for round-trip
 * stability. `title` is JSON-quoted so colons/quotes/unicode in it can't break the `key: value`
 * line format; parseScalar understands JSON-quoted strings.
 */
export function serializeFrontmatter(data: Required<FrontmatterData>): string {
  return [
    '---',
    `title: ${JSON.stringify(data.title)}`,
    `entryDate: ${data.entryDate}`,
    `tags: ${yamlListLiteral(data.tags)}`,
    '---',
    '',
  ].join('\n');
}
