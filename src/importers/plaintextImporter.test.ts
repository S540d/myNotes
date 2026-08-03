import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { plaintextImporter } from './plaintextImporter';

const FIXTURE = path.resolve(import.meta.dirname, '../../test/fixtures/plain-note.txt');

describe('plaintextImporter', () => {
  it('detects a .txt file', async () => {
    const file = new File(['Hallo'], 'note.txt');
    expect(await plaintextImporter.detect(file)).toBe(true);
    expect(await plaintextImporter.detect(new File(['Hallo'], 'note.md'))).toBe(false);
  });

  it('uses the first non-empty line as title and the rest as body', async () => {
    const buffer = await readFile(FIXTURE);
    const file = new File([buffer], 'plain-note.txt', { lastModified: new Date('2026-05-01').getTime() });
    const [draft] = await plaintextImporter.parse(file);

    expect(draft.title).toBe('Kurzer Gedanke vor dem Einschlafen');
    expect(draft.bodyMarkdown).toContain('Manchmal reicht ein Satz.');
    expect(draft.entryDate).toBe('2026-05-01');
    expect(draft.tags).toEqual([]);
  });

  it('falls back to the filename when the file is empty', async () => {
    const file = new File([''], 'leer.txt', { lastModified: new Date('2026-05-01').getTime() });
    const [draft] = await plaintextImporter.parse(file);
    expect(draft.title).toBe('leer');
    expect(draft.bodyMarkdown).toBe('');
  });

  it('falls back to today when the file has no lastModified', async () => {
    const file = new File(['Titel\nText'], 'x.txt', { lastModified: 0 });
    const [draft] = await plaintextImporter.parse(file);
    expect(draft.entryDate).toBe(new Date().toISOString().slice(0, 10));
  });
});
