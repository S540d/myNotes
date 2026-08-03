import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { jsonImporter } from './jsonImporter';

const FIXTURE = path.resolve(import.meta.dirname, '../../test/fixtures/myNotes-backup.json');

async function loadFixture(): Promise<File> {
  const buffer = await readFile(FIXTURE);
  return new File([buffer], 'myNotes-backup.json', { type: 'application/json' });
}

describe('jsonImporter', () => {
  it('detects its own export format', async () => {
    expect(await jsonImporter.detect(await loadFixture())).toBe(true);
  });

  it('rejects a non-JSON file', async () => {
    const file = new File(['not json'], 'note.txt');
    expect(await jsonImporter.detect(file)).toBe(false);
  });

  it('parses every note in the backup, including one with an empty body', async () => {
    const drafts = await jsonImporter.parse(await loadFixture());
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toEqual({
      title: 'Ankunft in Lissabon',
      bodyMarkdown: expect.stringContaining('Lissabon') as unknown as string,
      entryDate: '2026-06-10',
      tags: ['reise', 'portugal'],
    });
    expect(drafts[1]).toEqual({ title: 'Leerer Eintrag', bodyMarkdown: '', entryDate: '2026-06-11', tags: [] });
  });

  it('accepts a bare array of note-like objects too', async () => {
    const file = new File([JSON.stringify([{ title: 'X', bodyMarkdown: 'Y', entryDate: '2026-01-01', tags: [] }])], 'x.json');
    expect(await jsonImporter.detect(file)).toBe(true);
    expect(await jsonImporter.parse(file)).toEqual([{ title: 'X', bodyMarkdown: 'Y', entryDate: '2026-01-01', tags: [] }]);
  });
});
