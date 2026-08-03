import JSZip from 'jszip';
import type { Note } from '../types/note';
import { serializeFrontmatter } from '../importers/frontmatter';

export const JSON_EXPORT_FORMAT = 'myNotes-json-v1';

export interface JsonExportPayload {
  exportedAt: string;
  format: typeof JSON_EXPORT_FORMAT;
  notes: Note[];
}

/** Lossless JSON backup of every (non-deleted) note — the exact shape jsonImporter reads back. */
export function exportAsJson(notes: Note[]): Blob {
  const payload: JsonExportPayload = {
    exportedAt: new Date().toISOString(),
    format: JSON_EXPORT_FORMAT,
    notes,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'ohne-titel';
}

/** One Markdown file (YAML frontmatter + body) per note, zipped — a portable, human-readable format. */
export async function exportAsMarkdownZip(notes: Note[]): Promise<Blob> {
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const note of notes) {
    const frontmatter = serializeFrontmatter({ title: note.title, entryDate: note.entryDate, tags: note.tags });
    let filename = `${note.entryDate}-${slugify(note.title)}.md`;
    if (usedNames.has(filename)) {
      filename = `${note.entryDate}-${slugify(note.title)}-${note.id.slice(0, 8)}.md`;
    }
    usedNames.add(filename);
    zip.file(filename, `${frontmatter}\n${note.bodyMarkdown}\n`);
  }

  return zip.generateAsync({ type: 'blob' });
}
