import { describe, expect, it } from 'vitest';
import { translations } from './translations';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value === 'function' || typeof value !== 'object' || value === null) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, nested]) => keyPaths(nested, prefix ? `${prefix}.${key}` : key));
}

describe('translations', () => {
  it('has the exact same key structure in every language', () => {
    const [first, ...rest] = Object.entries(translations);
    const [, firstDict] = first;
    const expectedKeys = keyPaths(firstDict).sort();

    for (const [language, dict] of rest) {
      expect(keyPaths(dict).sort(), `language "${language}" key mismatch`).toEqual(expectedKeys);
    }
  });

  it('has non-empty string values for every static (non-function) key', () => {
    for (const [language, dict] of Object.entries(translations)) {
      for (const path of keyPaths(dict)) {
        const value = path.split('.').reduce<unknown>((obj, key) => (obj as never)[key], dict);
        if (typeof value === 'function') continue;
        expect(typeof value, `${language}.${path} should be a string`).toBe('string');
        expect((value as string).length, `${language}.${path} should not be empty`).toBeGreaterThan(0);
      }
    }
  });
});
