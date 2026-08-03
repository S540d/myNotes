import JSZip from 'jszip';
import type { NoteDraft } from '../types/note';
import type { Importer } from './types';
import { extensionOf } from './types';
import { parseFrontmatter } from './frontmatter';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function draftFromMarkdown(raw: string, fallbackTitle: string): NoteDraft {
  const { data, content } = parseFrontmatter(raw);
  return {
    title: data.title ?? fallbackTitle,
    bodyMarkdown: content.trim(),
    entryDate: data.entryDate ?? todayIso(),
    tags: data.tags ?? [],
  };
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

async function parseZip(file: File): Promise<NoteDraft[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const drafts: NoteDraft[] = [];
  for (const [filename, entry] of Object.entries(zip.files)) {
    if (entry.dir || extensionOf(filename) !== '.md') continue;
    const raw = await entry.async('text');
    drafts.push(draftFromMarkdown(raw, titleFromFilename(filename.split('/').pop() ?? filename)));
  }
  return drafts;
}

export const markdownImporter: Importer = {
  id: 'markdown',
  label: 'Markdown (+ Frontmatter) / ZIP',
  acceptedExtensions: ['.md', '.zip'],

  async detect(file) {
    const ext = extensionOf(file.name);
    if (ext === '.md') return true;
    if (ext === '.zip') {
      try {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        return Object.keys(zip.files).some((name) => extensionOf(name) === '.md');
      } catch {
        return false;
      }
    }
    return false;
  },

  async parse(file) {
    if (extensionOf(file.name) === '.zip') return parseZip(file);
    const raw = await file.text();
    return [draftFromMarkdown(raw, titleFromFilename(file.name))];
  },
};
