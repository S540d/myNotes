import { describe, expect, it } from 'vitest';
import type { Note } from '../types/note';
import { decryptNote } from './decryptNote';
import { encryptNote, isEncryptedEnvelope } from './encryptNote';
import { WrongPassphraseError } from './errors';
import { defaultKdfParams, deriveKey } from './keyDerivation';

function sampleNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Reisebericht Tag 3',
    bodyMarkdown: '# Unterwegs\n\nHeute ging es weiter nach **Süden**.',
    entryDate: '2026-07-15',
    tags: ['reise', 'sommer'],
    createdAt: '2026-07-15T08:00:00.000Z',
    updatedAt: '2026-07-15T20:00:00.000Z',
    version: 3,
    encrypted: true,
    deleted: false,
    syncState: 'pending',
    ...overrides,
  };
}

describe('encryptNote / decryptNote', () => {
  it('round-trips a note through encrypt -> decrypt', async () => {
    const kdf = defaultKdfParams();
    const key = await deriveKey('passphrase', kdf);
    const note = sampleNote();

    const envelope = await encryptNote(note, key, kdf);
    expect(isEncryptedEnvelope(envelope)).toBe(true);

    const decrypted = await decryptNote(envelope, key);
    expect(decrypted).toEqual({
      id: note.id,
      updatedAt: note.updatedAt,
      version: note.version,
      encrypted: true,
      deleted: false,
      createdAt: note.createdAt,
      title: note.title,
      bodyMarkdown: note.bodyMarkdown,
      entryDate: note.entryDate,
      tags: note.tags,
      syncState: 'synced',
    });
  });

  it('keeps sync metadata unencrypted in the envelope (needed for push/pull without decrypting)', async () => {
    const kdf = defaultKdfParams();
    const key = await deriveKey('passphrase', kdf);
    const note = sampleNote();

    const envelope = await encryptNote(note, key, kdf);
    expect(envelope.id).toBe(note.id);
    expect(envelope.updatedAt).toBe(note.updatedAt);
    expect(envelope.version).toBe(note.version);
    expect(envelope.kdf).toEqual(kdf);

    // The user content must not leak in plaintext anywhere in the envelope's JSON.
    const serialized = JSON.stringify(envelope);
    expect(serialized).not.toContain(note.title);
    expect(serialized).not.toContain('Süden');
  });

  it('fails closed (throws WrongPassphraseError) on decrypt with the wrong key', async () => {
    const kdf = defaultKdfParams();
    const key = await deriveKey('passphrase', kdf);
    const wrongKey = await deriveKey('wrong-passphrase', kdf);
    const envelope = await encryptNote(sampleNote(), key, kdf);

    await expect(decryptNote(envelope, wrongKey)).rejects.toThrow(WrongPassphraseError);
  });

  it('keeps the envelope format stable so old ciphertext keeps decrypting after code changes', async () => {
    const kdf = { salt: 'AAAAAAAAAAAAAAAAAAAAAA==', iterations: 210_000, hash: 'SHA-256' } as const;
    const key = await deriveKey('fixed-passphrase-for-golden-test', kdf);
    const note = sampleNote({
      id: 'fixed-id',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      version: 1,
    });

    const envelope = await encryptNote(note, key, kdf);
    // iv/ciphertext are non-deterministic (random iv); the shape and metadata fields must stay stable.
    expect(Object.keys(envelope).sort()).toEqual(
      ['id', 'updatedAt', 'version', 'encrypted', 'kdf', 'iv', 'ciphertext'].sort(),
    );
    expect(envelope.encrypted).toBe(true);
    expect(envelope.kdf).toEqual(kdf);

    const decrypted = await decryptNote(envelope, key);
    expect(decrypted.title).toBe(note.title);
    expect(decrypted.bodyMarkdown).toBe(note.bodyMarkdown);
  });
});
