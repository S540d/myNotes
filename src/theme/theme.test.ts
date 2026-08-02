import { describe, expect, it } from 'vitest';
import { isThemePreference, resolveEffectiveTheme } from './theme';

describe('isThemePreference', () => {
  it('accepts the three valid preferences', () => {
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isThemePreference('auto')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
  });
});

describe('resolveEffectiveTheme', () => {
  it('follows the OS preference when set to system', () => {
    expect(resolveEffectiveTheme('system', true)).toBe('dark');
    expect(resolveEffectiveTheme('system', false)).toBe('light');
  });

  it('overrides the OS preference for an explicit choice', () => {
    expect(resolveEffectiveTheme('dark', false)).toBe('dark');
    expect(resolveEffectiveTheme('light', true)).toBe('light');
  });
});
