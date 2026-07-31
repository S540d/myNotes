import { bytesToBase64, base64ToBytes } from './base64';

export interface KdfParams {
  salt: string;
  iterations: number;
  hash: 'SHA-256';
}

/** OWASP-recommended floor for PBKDF2-SHA256 as of 2023; native Web Crypto handles this cost identically on Android Chrome and iOS Safari. */
const DEFAULT_ITERATIONS = 210_000;

export function generateSalt(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export function defaultKdfParams(): KdfParams {
  return { salt: generateSalt(), iterations: DEFAULT_ITERATIONS, hash: 'SHA-256' };
}

/** Derives a non-extractable AES-256-GCM key from a passphrase; the key never leaves Web Crypto's internal storage. */
export async function deriveKey(passphrase: string, params: KdfParams): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(params.salt) as BufferSource,
      iterations: params.iterations,
      hash: params.hash,
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
