import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import type { Note } from '../types/note';
import { exportAsJson, exportAsMarkdownZip, JSON_EXPORT_FORMAT } from './exporters';

function note(overrides: Partial<Note>): Note {
  return {
    id: 'n1',
    title: 'Ankunft in Lissabon',
    bodyMarkdown: 'Heute angekommen.',
    entryDate: '2026-06-10',
    tags: ['reise'],
    createdAt: '2026-06-10T20:00:00.000Z',
    updatedAt: '2026-06-10T20:00:00.000Z',
    version: 1,
    encrypted: false,
    deleted: false,
    syncState: 'synced',
    ...overrides,
  };
}

describe('exportAsJson', () => {
  it('produces the documented backup shape with the notes verbatim', async () => {
    const notes = [note({ id: 'a' }), note({ id: 'b', title: 'Zweiter Eintrag' })];
    const blob = exportAsJson(notes);
    const payload = JSON.parse(await blob.text());

    expect(payload.format).toBe(JSON_EXPORT_FORMAT);
    expect(typeof payload.exportedAt).toBe('string');
    expect(payload.notes).toEqual(notes);
  });
});

describe('exportAsMarkdownZip', () => {
  it('writes one .md file per note with frontmatter and body', async () => {
    const notes = [note({ id: 'a' })];
    const blob = await exportAsMarkdownZip(notes);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    const filenames = Object.keys(zip.files);
    expect(filenames).toHaveLength(1);
    expect(filenames[0]).toBe('2026-06-10-ankunft-in-lissabon.md');

    const content = await zip.files[filenames[0]].async('text');
    expect(content).toContain('title: "Ankunft in Lissabon"');
    expect(content).toContain('entryDate: 2026-06-10');
    expect(content).toContain('tags: [reise]');
    expect(content).toContain('Heute angekommen.');
  });

  it('disambiguates notes that would otherwise produce the same filename', async () => {
    const notes = [
      note({ id: 'aaaaaaaa-1111', title: 'Gleicher Titel', entryDate: '2026-01-01' }),
      note({ id: 'bbbbbbbb-2222', title: 'Gleicher Titel', entryDate: '2026-01-01' }),
    ];
    const blob = await exportAsMarkdownZip(notes);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    expect(Object.keys(zip.files)).toEqual([
      '2026-01-01-gleicher-titel.md',
      '2026-01-01-gleicher-titel-bbbbbbbb.md',
    ]);
  });
});
