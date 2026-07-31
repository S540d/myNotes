import { db } from '../db/schema';
import { deriveKey, defaultKdfParams, type KdfParams } from './keyDerivation';
import { encryptString, decryptString, type EncryptedBlob } from './aesGcm';
import { WrongPassphraseError } from './errors';
import * as webdavClient from '../sync/webdavClient';
import type { WebDavConfig } from '../sync/webdavClient';

const SETTINGS_KEY = 'encryptionVault';
/** Ciphertext of this constant string is safe to store (and publish to the NAS) — it reveals nothing without the key, but lets unlock/adopt fail closed on a wrong passphrase instead of silently deriving a useless key. */
const VERIFIER_PLAINTEXT = 'myNotes-vault-check-v1';

/** The part of the vault that's safe to publish unencrypted to the NAS so a second device can find and adopt it. */
export interface VaultDescriptor {
  kdf: KdfParams;
  verifier: EncryptedBlob;
}

export interface EncryptionVaultRecord extends VaultDescriptor {
  /** Encrypted WebDavConfig JSON; absent until the user has saved NAS credentials while unlocked. */
  credentials?: EncryptedBlob;
}

export async function getVaultRecord(): Promise<EncryptionVaultRecord | undefined> {
  const record = await db.settings.get(SETTINGS_KEY);
  return record?.value as EncryptionVaultRecord | undefined;
}

export async function isEncryptionSetUp(): Promise<boolean> {
  return (await getVaultRecord()) !== undefined;
}

async function verifyAndDeriveKey(passphrase: string, descriptor: VaultDescriptor): Promise<CryptoKey> {
  const key = await deriveKey(passphrase, descriptor.kdf);
  try {
    const plain = await decryptString(key, descriptor.verifier);
    if (plain !== VERIFIER_PLAINTEXT) throw new Error('verifier mismatch');
  } catch {
    throw new WrongPassphraseError();
  }
  return key;
}

async function saveRecord(record: EncryptionVaultRecord): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEY, value: record });
}

/** First-time setup: creates a fresh vault with a new random salt and, if NAS credentials are given, seals them into it. */
export async function setUpVault(passphrase: string, webdav?: WebDavConfig): Promise<CryptoKey> {
  const kdf = defaultKdfParams();
  const key = await deriveKey(passphrase, kdf);
  const verifier = await encryptString(key, VERIFIER_PLAINTEXT);
  const record: EncryptionVaultRecord = { kdf, verifier };
  if (webdav) record.credentials = await encryptString(key, JSON.stringify(webdav));
  await saveRecord(record);

  if (webdav) {
    try {
      await webdavClient.putVaultDescriptor(webdav, JSON.stringify({ kdf, verifier }));
    } catch {
      // offline or unreachable NAS: the next successful sync republishes the descriptor.
    }
  }

  return key;
}

/** Unlocks an existing local vault; throws WrongPassphraseError on a bad passphrase (fail-closed). */
export async function unlockVault(passphrase: string): Promise<CryptoKey> {
  const record = await getVaultRecord();
  if (!record) throw new Error('Verschlüsselung ist nicht eingerichtet.');
  return verifyAndDeriveKey(passphrase, record);
}

/** Fetches the NAS-published vault descriptor, e.g. to detect an existing vault before setting up a new (conflicting) one. */
export async function fetchRemoteDescriptor(webdav: WebDavConfig): Promise<VaultDescriptor | undefined> {
  const raw = await webdavClient.getVaultDescriptor(webdav);
  return raw ? (JSON.parse(raw) as VaultDescriptor) : undefined;
}

/** Bootstraps a second device: verifies the passphrase against a vault descriptor found on the NAS and creates a matching local vault. */
export async function adoptRemoteVault(
  passphrase: string,
  descriptor: VaultDescriptor,
  webdav: WebDavConfig,
): Promise<CryptoKey> {
  const key = await verifyAndDeriveKey(passphrase, descriptor);
  const record: EncryptionVaultRecord = {
    ...descriptor,
    credentials: await encryptString(key, JSON.stringify(webdav)),
  };
  await saveRecord(record);
  return key;
}

export async function getVaultCredentials(key: CryptoKey): Promise<WebDavConfig | undefined> {
  const record = await getVaultRecord();
  if (!record?.credentials) return undefined;
  const json = await decryptString(key, record.credentials);
  return JSON.parse(json) as WebDavConfig;
}

export async function saveVaultCredentials(key: CryptoKey, webdav: WebDavConfig): Promise<void> {
  const record = await getVaultRecord();
  if (!record) throw new Error('Verschlüsselung ist nicht eingerichtet.');
  record.credentials = await encryptString(key, JSON.stringify(webdav));
  await saveRecord(record);
  try {
    await webdavClient.putVaultDescriptor(webdav, JSON.stringify({ kdf: record.kdf, verifier: record.verifier }));
  } catch {
    // best effort; descriptor republishes on the next sync too
  }
}
