/**
 * Minimal HTML→Markdown conversion for imported ENML (Evernote) and WordPress `content:encoded`
 * bodies, hand-rolled instead of pulling in `turndown` — which needs a DOM (jsdom) to run outside
 * a browser, an extra dependency this app's importers don't otherwise need. It covers the common
 * block/inline tags these two export formats actually produce, not arbitrary HTML.
 */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z0-9]+);/gi, (match, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      return String.fromCodePoint(parseInt(code.slice(2), 16));
    }
    if (code.startsWith('#')) {
      return String.fromCodePoint(parseInt(code.slice(1), 10));
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function inline(html: string): string {
  return html
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
}

export function htmlToMarkdown(html: string): string {
  let text = html;

  // Lists: turn each <li> into a "- " line before stripping the surrounding <ul>/<ol>.
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_match, item: string) => `- ${inline(item).trim()}\n`);
  text = text.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');

  for (let level = 1; level <= 6; level++) {
    const hashes = '#'.repeat(level);
    text = text.replace(new RegExp(`<h${level}[^>]*>([\\s\\S]*?)</h${level}>`, 'gi'), (_m, content: string) => `\n${hashes} ${inline(content).trim()}\n\n`);
  }

  // Block-level tags become paragraph breaks; everything else (divs, spans, en-note wrapper, etc.) is stripped.
  text = text.replace(/<\/(p|div)>/gi, '\n\n');
  text = text.replace(/<(p|div)[^>]*>/gi, '');
  text = inline(text);
  text = text.replace(/<[^>]+>/g, '');
  text = decodeEntities(text);

  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
