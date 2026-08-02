import { describe, expect, it } from 'vitest';
import { suggestTitleFromBody } from './autoTitle';

describe('suggestTitleFromBody', () => {
  it('uses the first non-empty line', () => {
    expect(suggestTitleFromBody('\n\nAnkunft in Lissabon\n\nWeiterer Text.')).toBe('Ankunft in Lissabon');
  });

  it('strips a leading markdown heading marker', () => {
    expect(suggestTitleFromBody('# Ankunft in Lissabon\nText.')).toBe('Ankunft in Lissabon');
  });

  it('strips inline emphasis markers', () => {
    expect(suggestTitleFromBody('**Wichtiger** Tag mit `Code` und _Kursivem_')).toBe(
      'Wichtiger Tag mit Code und Kursivem',
    );
  });

  it('truncates long first lines with an ellipsis', () => {
    const longLine = 'x'.repeat(80);
    const result = suggestTitleFromBody(longLine);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBe(61);
  });

  it('returns an empty string for an empty body', () => {
    expect(suggestTitleFromBody('   \n  \n')).toBe('');
  });
});
