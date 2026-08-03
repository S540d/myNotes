import { describe, expect, it } from 'vitest';
import { htmlToMarkdown } from './htmlToMarkdown';

describe('htmlToMarkdown', () => {
  it('turns <div> blocks (ENML-style) into separate paragraphs', () => {
    const html = '<en-note><div>Erster Absatz.</div><div>Zweiter Absatz.</div></en-note>';
    expect(htmlToMarkdown(html)).toBe('Erster Absatz.\n\nZweiter Absatz.');
  });

  it('converts bold and italic', () => {
    expect(htmlToMarkdown('<p>Ein <strong>wichtiges</strong> und <em>betontes</em> Wort.</p>')).toBe(
      'Ein **wichtiges** und *betontes* Wort.',
    );
  });

  it('converts headings', () => {
    expect(htmlToMarkdown('<h2>Überschrift</h2><p>Text.</p>')).toBe('## Überschrift\n\nText.');
  });

  it('converts an unordered list', () => {
    const html = '<ul><li>Erster Punkt</li><li>Zweiter Punkt</li></ul>';
    expect(htmlToMarkdown(html)).toBe('- Erster Punkt\n- Zweiter Punkt');
  });

  it('converts links', () => {
    expect(htmlToMarkdown('<p>Siehe <a href="https://example.com">hier</a>.</p>')).toBe(
      'Siehe [hier](https://example.com).',
    );
  });

  it('decodes HTML entities', () => {
    expect(htmlToMarkdown('<p>Tom &amp; Jerry &ndash; ein &quot;Klassiker&quot;.</p>'.replace('&ndash;', '&#8211;'))).toBe(
      'Tom & Jerry – ein "Klassiker".',
    );
  });

  it('collapses excessive blank lines', () => {
    expect(htmlToMarkdown('<p>A</p><div></div><div></div><p>B</p>')).toBe('A\n\nB');
  });
});
