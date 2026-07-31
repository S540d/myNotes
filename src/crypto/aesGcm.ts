import { bytesToBase64, base64ToBytes } from './base64';

export interface EncryptedBlob {
  iv: string;
  ciphertext: string;
}

export async function encryptString(key: CryptoKey, plaintext: string): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return { iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertextBuf)) };
}

/** Throws (AES-GCM auth tag mismatch) on a wrong key or corrupted ciphertext — never returns silently-garbled plaintext. */
export async function decryptString(key: CryptoKey, blob: EncryptedBlob): Promise<string> {
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(blob.iv) as BufferSource },
    key,
    base64ToBytes(blob.ciphertext) as BufferSource,
  );
  return new TextDecoder().decode(plainBuf);
}
