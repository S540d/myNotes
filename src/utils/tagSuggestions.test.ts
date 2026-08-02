import { describe, expect, it } from 'vitest';
import { suggestMatchingTags, suggestTagsFromText } from './tagSuggestions';

describe('suggestMatchingTags', () => {
  const allTags = ['reise', 'reisebericht', 'sport', 'berge'];

  it('matches by case-insensitive prefix', () => {
    expect(suggestMatchingTags('Rei', allTags, [])).toEqual(['reise', 'reisebericht']);
  });

  it('excludes tags already on the note', () => {
    expect(suggestMatchingTags('rei', allTags, ['reise'])).toEqual(['reisebericht']);
  });

  it('returns nothing for an empty query', () => {
    expect(suggestMatchingTags('', allTags, [])).toEqual([]);
  });

  it('returns nothing when no tag matches', () => {
    expect(suggestMatchingTags('xyz', allTags, [])).toEqual([]);
  });
});

describe('suggestTagsFromText', () => {
  const allTags = ['reise', 'berge', 'sport'];

  it('suggests tags that appear as whole words in the text', () => {
    const text = 'Heute ging es in die Berge zum Wandern.';
    expect(suggestTagsFromText(text, allTags, [])).toEqual(['berge']);
  });

  it('does not match a tag that is only a substring of another word', () => {
    const text = 'Wir haben Bergerezepte ausprobiert.';
    expect(suggestTagsFromText(text, allTags, [])).toEqual([]);
  });

  it('excludes tags already on the note', () => {
    const text = 'Reise in die Berge.';
    expect(suggestTagsFromText(text, allTags, ['berge'])).toEqual(['reise']);
  });
});
