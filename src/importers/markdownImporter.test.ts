import { readFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { markdownImporter } from './markdownImporter';

const FIXTURE = path.resolve(import.meta.dirname, '../../test/fixtures/note-with-frontmatter.md');

async function loadFixture(): Promise<File> {
  const buffer = await readFile(FIXTURE);
  return new File([buffer], 'note-with-frontmatter.md', { type: 'text/markdown' });
}

describe('markdownImporter (single file)', () => {
  it('detects a .md file', async () => {
    expect(await markdownImporter.detect(await loadFixture())).toBe(true);
  });

  it('parses frontmatter and body from the fixture', async () => {
    const [draft] = await markdownImporter.parse(await loadFixture());
    expect(draft.title).toBe('Wanderung zum Gipfel');
    expect(draft.entryDate).toBe('2026-07-04');
    expect(draft.tags).toEqual(['berge', 'sport']);
    expect(draft.bodyMarkdown).toContain('# Wanderung zum Gipfel');
    expect(draft.bodyMarkdown).toContain('Wanderschuhe');
  });

  it('falls back to the filename as title when there is no frontmatter', async () => {
    const file = new File(['Nur Text, keine Frontmatter.'], 'mein-eintrag.md');
    const [draft] = await markdownImporter.parse(file);
    expect(draft.title).toBe('mein-eintrag');
    expect(draft.bodyMarkdown).toBe('Nur Text, keine Frontmatter.');
    expect(draft.tags).toEqual([]);
  });
});

describe('markdownImporter (zip)', () => {
  async function zipFile(entries: Record<string, string>): Promise<File> {
    const zip = new JSZip();
    for (const [name, content] of Object.entries(entries)) zip.file(name, content);
    const buffer = await zip.generateAsync({ type: 'arraybuffer' });
    return new File([buffer], 'export.zip', { type: 'application/zip' });
  }

  it('detects a zip containing at least one .md file', async () => {
    const file = await zipFile({ 'a.md': '# A' });
    expect(await markdownImporter.detect(file)).toBe(true);
  });

  it('rejects a zip with no markdown files', async () => {
    const file = await zipFile({ 'a.txt': 'not markdown' });
    expect(await markdownImporter.detect(file)).toBe(false);
  });

  it('parses every .md entry in the zip', async () => {
    const file = await zipFile({
      '2026-01-01-eins.md': '---\ntitle: Eins\nentryDate: 2026-01-01\ntags: [a]\n---\nErster Text.',
      '2026-01-02-zwei.md': '---\ntitle: Zwei\nentryDate: 2026-01-02\ntags: [b]\n---\nZweiter Text.',
      'readme.txt': 'ignored',
    });
    const drafts = await markdownImporter.parse(file);
    expect(drafts).toHaveLength(2);
    expect(drafts.map((d) => d.title).sort()).toEqual(['Eins', 'Zwei']);
  });
});
