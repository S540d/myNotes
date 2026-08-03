import type { NoteDraft } from '../types/note';
import type { Importer } from './types';
import { extensionOf } from './types';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateFromFile(file: File): string {
  if (!file.lastModified) return todayIso();
  const date = new Date(file.lastModified);
  return Number.isNaN(date.getTime()) ? todayIso() : date.toISOString().slice(0, 10);
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.txt$/i, '');
}

export const plaintextImporter: Importer = {
  id: 'plaintext',
  label: 'Plaintext (.txt)',
  acceptedExtensions: ['.txt'],

  async detect(file) {
    return extensionOf(file.name) === '.txt';
  },

  async parse(file) {
    const raw = await file.text();
    const lines = raw.split(/\r?\n/);
    const firstNonEmpty = lines.findIndex((line) => line.trim().length > 0);

    let title: string;
    let bodyMarkdown: string;
    if (firstNonEmpty === -1) {
      title = titleFromFilename(file.name);
      bodyMarkdown = '';
    } else {
      title = lines[firstNonEmpty].trim();
      bodyMarkdown = lines
        .slice(firstNonEmpty + 1)
        .join('\n')
        .trim();
    }

    const draft: NoteDraft = { title, bodyMarkdown, entryDate: dateFromFile(file), tags: [] };
    return [draft];
  },
};
