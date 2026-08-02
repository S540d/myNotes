import { describe, expect, it } from 'vitest';
import { decryptString, encryptString } from './aesGcm';
import { defaultKdfParams, deriveKey, generateSalt } from './keyDerivation';

describe('keyDerivation', () => {
  it('generates a fresh random salt every time', () => {
    expect(generateSalt()).not.toBe(generateSalt());
  });

  it('defaultKdfParams meets the documented iteration floor', () => {
    const params = defaultKdfParams();
    expect(params.iterations).toBeGreaterThanOrEqual(210_000);
    expect(params.hash).toBe('SHA-256');
  });

  it('derives the same key from the same passphrase + params', async () => {
    const params = defaultKdfParams();
    const keyA = await deriveKey('correct horse battery staple', params);
    const keyB = await deriveKey('correct horse battery staple', params);

    const blob = await encryptString(keyA, 'probe');
    expect(await decryptString(keyB, blob)).toBe('probe');
  });

  it('derives a different key from a different passphrase', async () => {
    const params = defaultKdfParams();
    const keyA = await deriveKey('correct horse battery staple', params);
    const keyB = await deriveKey('wrong passphrase', params);

    const blob = await encryptString(keyA, 'probe');
    await expect(decryptString(keyB, blob)).rejects.toThrow();
  });

  it('derives a different key from the same passphrase with a different salt', async () => {
    const paramsA = defaultKdfParams();
    const paramsB = { ...paramsA, salt: generateSalt() };
    const keyA = await deriveKey('correct horse battery staple', paramsA);
    const keyB = await deriveKey('correct horse battery staple', paramsB);

    const blob = await encryptString(keyA, 'probe');
    await expect(decryptString(keyB, blob)).rejects.toThrow();
  });
});
