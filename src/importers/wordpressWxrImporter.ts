import type { NoteDraft } from '../types/note';
import type { Importer } from './types';
import { extensionOf } from './types';
import { htmlToMarkdown } from './htmlToMarkdown';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function extractTag(block: string, tag: string): string | undefined {
  return block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1];
}

function stripCdata(raw: string): string {
  return raw.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/)?.[1] ?? raw;
}

function extractCategories(block: string): string[] {
  return [...block.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/g)].map((match) => stripCdata(match[1]).trim());
}

/** `2026-07-15 08:00:00` (wp:post_date) → `2026-07-15`. */
function wxrDateToIso(raw: string | undefined): string {
  const date = stripCdata(raw ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : todayIso();
}

function parseItemBlock(block: string): NoteDraft | undefined {
  const postType = stripCdata(extractTag(block, 'wp:post_type') ?? '').trim();
  if (postType !== 'post') return undefined;

  const title = stripCdata(extractTag(block, 'title') ?? '').trim();
  const rawContent = extractTag(block, 'content:encoded') ?? '';
  const bodyMarkdown = htmlToMarkdown(stripCdata(rawContent));
  const entryDate = wxrDateToIso(extractTag(block, 'wp:post_date'));
  const tags = extractCategories(block);

  return { title, bodyMarkdown, entryDate, tags };
}

export const wordpressWxrImporter: Importer = {
  id: 'wordpress-wxr',
  label: 'WordPress (WXR)',
  acceptedExtensions: ['.xml'],

  async detect(file) {
    if (extensionOf(file.name) !== '.xml') return false;
    const text = await file.text();
    return text.includes('xmlns:wp=') && text.includes('<item>');
  },

  async parse(file) {
    const text = await file.text();
    const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    const drafts: NoteDraft[] = [];
    for (const match of items) {
      const draft = parseItemBlock(match[1]);
      if (draft) drafts.push(draft);
    }
    return drafts;
  },
};
