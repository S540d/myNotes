import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { evernoteEnexImporter } from './evernoteEnexImporter';

const FIXTURE = path.resolve(import.meta.dirname, '../../test/fixtures/evernote-export.enex');

async function loadFixture(): Promise<File> {
  const buffer = await readFile(FIXTURE);
  return new File([buffer], 'evernote-export.enex');
}

describe('evernoteEnexImporter', () => {
  it('detects an .enex file', async () => {
    expect(await evernoteEnexImporter.detect(await loadFixture())).toBe(true);
  });

  it('detects by content even with a different extension', async () => {
    const buffer = await readFile(FIXTURE);
    const file = new File([buffer], 'export.xml');
    expect(await evernoteEnexImporter.detect(file)).toBe(true);
  });

  it('parses title, tags, date, and converts ENML content to Markdown', async () => {
    const [draft] = await evernoteEnexImporter.parse(await loadFixture());
    expect(draft.title).toBe('Rezept: Kürbissuppe');
    expect(draft.entryDate).toBe('2026-07-01');
    expect(draft.tags).toEqual(['rezepte', 'herbst']);
    expect(draft.bodyMarkdown).toContain('Kürbis würfeln');
    expect(draft.bodyMarkdown).toContain('pürieren');
    expect(draft.bodyMarkdown).not.toContain('<div>');
  });
});
