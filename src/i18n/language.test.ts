import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLanguage, saveLanguage } from './language';

describe('isLanguage', () => {
  it('accepts de and en', () => {
    expect(isLanguage('de')).toBe(true);
    expect(isLanguage('en')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage(null)).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });
});

describe('saveLanguage', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('persists the chosen language to localStorage', () => {
    saveLanguage('en');
    expect(localStorage.getItem('myNotes.language')).toBe('en');
  });
});
