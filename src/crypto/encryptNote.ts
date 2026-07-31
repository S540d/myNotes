import type { Note } from '../types/note';
import type { KdfParams } from './keyDerivation';
import { encryptString } from './aesGcm';

/** The wire format written to the NAS for an encrypted note: only user content is ciphertext, sync metadata stays readable so Phase 2's push/pull can work without decrypting. */
export interface EncryptedNoteEnvelope {
  id: string;
  updatedAt: string;
  version: number;
  encrypted: true;
  kdf: KdfParams;
  iv: string;
  ciphertext: string;
}

export type EncryptedNotePayload = Pick<Note, 'title' | 'bodyMarkdown' | 'entryDate' | 'tags' | 'createdAt'>;

export async function encryptNote(note: Note, key: CryptoKey, kdf: KdfParams): Promise<EncryptedNoteEnvelope> {
  const payload: EncryptedNotePayload = {
    title: note.title,
    bodyMarkdown: note.bodyMarkdown,
    entryDate: note.entryDate,
    tags: note.tags,
    createdAt: note.createdAt,
  };
  const blob = await encryptString(key, JSON.stringify(payload));
  return {
    id: note.id,
    updatedAt: note.updatedAt,
    version: note.version,
    encrypted: true,
    kdf,
    iv: blob.iv,
    ciphertext: blob.ciphertext,
  };
}

export function isEncryptedEnvelope(value: unknown): value is EncryptedNoteEnvelope {
  return typeof value === 'object' && value !== null && (value as { encrypted?: unknown }).encrypted === true;
}
