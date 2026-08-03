import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectImporter, importers } from './index';

const fixture = (name: string) => path.resolve(import.meta.dirname, '../../test/fixtures', name);

async function loadFixture(name: string): Promise<File> {
  const buffer = await readFile(fixture(name));
  return new File([buffer], name);
}

describe('detectImporter', () => {
  it('picks the right importer for every fixture format', async () => {
    expect((await detectImporter(await loadFixture('myNotes-backup.json')))?.id).toBe('json');
    expect((await detectImporter(await loadFixture('note-with-frontmatter.md')))?.id).toBe('markdown');
    expect((await detectImporter(await loadFixture('plain-note.txt')))?.id).toBe('plaintext');
    expect((await detectImporter(await loadFixture('evernote-export.enex')))?.id).toBe('evernote-enex');
    expect((await detectImporter(await loadFixture('wordpress-export.xml')))?.id).toBe('wordpress-wxr');
  });

  it('returns undefined for an unrecognized format', async () => {
    const file = new File(['%PDF-1.4 binary junk'], 'file.pdf');
    expect(await detectImporter(file)).toBeUndefined();
  });

  it('registers exactly the five documented importers', () => {
    expect(importers.map((i) => i.id).sort()).toEqual(
      ['evernote-enex', 'json', 'markdown', 'plaintext', 'wordpress-wxr'].sort(),
    );
  });
});
