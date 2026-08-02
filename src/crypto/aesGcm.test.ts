import { describe, expect, it } from 'vitest';
import { decryptString, encryptString } from './aesGcm';

async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

describe('aesGcm', () => {
  it('round-trips plaintext through encrypt/decrypt', async () => {
    const key = await generateKey();
    const plaintext = 'Tagebucheintrag mit Umlauten: äöü 🎉';
    const blob = await encryptString(key, plaintext);
    expect(await decryptString(key, blob)).toBe(plaintext);
  });

  it('produces a fresh random iv on every call', async () => {
    const key = await generateKey();
    const a = await encryptString(key, 'same input');
    const b = await encryptString(key, 'same input');
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('throws (fail-closed) when decrypting with the wrong key', async () => {
    const key = await generateKey();
    const otherKey = await generateKey();
    const blob = await encryptString(key, 'secret');
    await expect(decryptString(otherKey, blob)).rejects.toThrow();
  });

  it('throws (fail-closed) when the ciphertext has been tampered with', async () => {
    const key = await generateKey();
    const blob = await encryptString(key, 'secret');
    const tampered = { ...blob, ciphertext: blob.ciphertext.slice(0, -4) + 'abcd' };
    await expect(decryptString(key, tampered)).rejects.toThrow();
  });
});
