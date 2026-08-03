import { describe, expect, it } from 'vitest';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter';

describe('parseFrontmatter', () => {
  it('parses title, entryDate, and a flow-list of tags', () => {
    const raw = ['---', 'title: Wanderung zum Gipfel', 'entryDate: 2026-07-04', 'tags: [berge, sport]', '---', '# Body', 'Text.'].join(
      '\n',
    );
    const result = parseFrontmatter(raw);
    expect(result.data).toEqual({ title: 'Wanderung zum Gipfel', entryDate: '2026-07-04', tags: ['berge', 'sport'] });
    expect(result.content).toBe('# Body\nText.');
  });

  it('returns the whole file as content when there is no frontmatter block', () => {
    const raw = '# Just a heading\nNo frontmatter here.';
    expect(parseFrontmatter(raw)).toEqual({ data: {}, content: raw });
  });

  it('handles an empty tags list', () => {
    const raw = ['---', 'title: X', 'entryDate: 2026-01-01', 'tags: []', '---', 'Body'].join('\n');
    expect(parseFrontmatter(raw).data.tags).toEqual([]);
  });

  it('unquotes a JSON-quoted title', () => {
    const raw = ['---', 'title: "Reisebericht: Tag 5"', 'entryDate: 2026-01-01', '---', 'Body'].join('\n');
    expect(parseFrontmatter(raw).data.title).toBe('Reisebericht: Tag 5');
  });
});

describe('serializeFrontmatter', () => {
  it('round-trips title/entryDate/tags through parseFrontmatter', () => {
    const original = { title: 'Ankunft: in Lissabon', entryDate: '2026-06-10', tags: ['reise', 'portugal'] };
    const serialized = serializeFrontmatter(original) + 'Body text.';
    const parsed = parseFrontmatter(serialized);
    expect(parsed.data).toEqual(original);
    expect(parsed.content).toBe('Body text.');
  });

  it('round-trips an empty tag list', () => {
    const original = { title: 'X', entryDate: '2026-01-01', tags: [] };
    const parsed = parseFrontmatter(serializeFrontmatter(original) + 'Body');
    expect(parsed.data.tags).toEqual([]);
  });
});
