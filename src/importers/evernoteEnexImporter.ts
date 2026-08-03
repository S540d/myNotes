import type { NoteDraft } from '../types/note';
import type { Importer } from './types';
import { extensionOf } from './types';
import { htmlToMarkdown } from './htmlToMarkdown';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function extractTag(block: string, tag: string): string | undefined {
  return block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1];
}

function extractAllTags(block: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  const results: string[] = [];
  for (const match of block.matchAll(re)) results.push(match[1]);
  return results;
}

function stripCdata(raw: string): string {
  return raw.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/)?.[1] ?? raw;
}

/** `20260701T110000Z` (ENML timestamp) → `2026-07-01`. */
function enexDateToIso(raw: string | undefined): string {
  if (!raw || raw.length < 8) return todayIso();
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function parseNoteBlock(block: string): NoteDraft {
  const title = extractTag(block, 'title') ?? '';
  const rawContent = extractTag(block, 'content') ?? '';
  const bodyMarkdown = htmlToMarkdown(stripCdata(rawContent));
  const entryDate = enexDateToIso(extractTag(block, 'created'));
  const tags = extractAllTags(block, 'tag');

  return { title, bodyMarkdown, entryDate, tags };
}

export const evernoteEnexImporter: Importer = {
  id: 'evernote-enex',
  label: 'Evernote (.enex)',
  acceptedExtensions: ['.enex'],

  async detect(file) {
    if (extensionOf(file.name) === '.enex') return true;
    const text = await file.text();
    return text.includes('<en-export');
  },

  async parse(file) {
    const text = await file.text();
    const notes = [...text.matchAll(/<note>([\s\S]*?)<\/note>/g)];
    return notes.map((match) => parseNoteBlock(match[1]));
  },
};
