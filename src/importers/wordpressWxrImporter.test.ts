import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { wordpressWxrImporter } from './wordpressWxrImporter';

const FIXTURE = path.resolve(import.meta.dirname, '../../test/fixtures/wordpress-export.xml');

async function loadFixture(): Promise<File> {
  const buffer = await readFile(FIXTURE);
  return new File([buffer], 'wordpress-export.xml');
}

describe('wordpressWxrImporter', () => {
  it('detects a WXR export', async () => {
    expect(await wordpressWxrImporter.detect(await loadFixture())).toBe(true);
  });

  it('rejects a plain, non-WXR .xml file', async () => {
    const file = new File(['<root><item>no wp namespace</item></root>'], 'other.xml');
    expect(await wordpressWxrImporter.detect(file)).toBe(false);
  });

  it('parses title, date, tags/categories, and converts content to Markdown', async () => {
    const [draft] = await wordpressWxrImporter.parse(await loadFixture());
    expect(draft.title).toBe('Ein Jahr Fernreise');
    expect(draft.entryDate).toBe('2026-07-15');
    expect(draft.tags).toEqual(['reise', 'rückblick']);
    expect(draft.bodyMarkdown).toContain('**Lissabon**');
    expect(draft.bodyMarkdown).not.toContain('<p>');
  });

  it('only imports items with post_type "post"', async () => {
    const xml = `<?xml version="1.0"?>
<rss xmlns:wp="http://wordpress.org/export/1.2/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<item>
<title>A page, not a post</title>
<content:encoded><![CDATA[<p>Ignored</p>]]></content:encoded>
<wp:post_date><![CDATA[2026-01-01 00:00:00]]></wp:post_date>
<wp:post_type><![CDATA[page]]></wp:post_type>
</item>
</channel>
</rss>`;
    const drafts = await wordpressWxrImporter.parse(new File([xml], 'x.xml'));
    expect(drafts).toEqual([]);
  });
});
