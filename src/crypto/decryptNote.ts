import type { Note } from '../types/note';
import { decryptString } from './aesGcm';
import { WrongPassphraseError } from './errors';
import type { EncryptedNoteEnvelope, EncryptedNotePayload } from './encryptNote';

export async function decryptNote(envelope: EncryptedNoteEnvelope, key: CryptoKey): Promise<Note> {
  let payload: EncryptedNotePayload;
  try {
    const json = await decryptString(key, { iv: envelope.iv, ciphertext: envelope.ciphertext });
    payload = JSON.parse(json) as EncryptedNotePayload;
  } catch {
    throw new WrongPassphraseError(
      `Notiz ${envelope.id} konnte nicht entschlüsselt werden (falscher Schlüssel oder beschädigte Daten).`,
    );
  }
  return {
    id: envelope.id,
    updatedAt: envelope.updatedAt,
    version: envelope.version,
    encrypted: true,
    deleted: false,
    createdAt: payload.createdAt,
    title: payload.title,
    bodyMarkdown: payload.bodyMarkdown,
    entryDate: payload.entryDate,
    tags: payload.tags,
    syncState: 'synced',
  };
}
