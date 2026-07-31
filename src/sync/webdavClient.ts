import { createClient, type WebDAVClient } from 'webdav';

export interface WebDavConfig {
  url: string;
  username: string;
  password: string;
}

export interface RemoteFile {
  /** Filename without the leading directory, e.g. "<uuid>.json". */
  basename: string;
  etag: string | null;
  lastmod: string;
}

const NOTES_DIR = 'notes';
const TOMBSTONES_DIR = 'tombstones';

export class PreconditionFailedError extends Error {
  constructor(id: string) {
    super(`412 Precondition Failed for note ${id}`);
    this.name = 'PreconditionFailedError';
  }
}

function client(config: WebDavConfig): WebDAVClient {
  return createClient(config.url, {
    username: config.username,
    password: config.password,
  });
}

function isStatusError(err: unknown, status: number): boolean {
  return typeof err === 'object' && err !== null && 'status' in err && (err as { status: unknown }).status === status;
}

async function ensureDir(c: WebDAVClient, path: string): Promise<void> {
  if (!(await c.exists(path))) {
    await c.createDirectory(path, { recursive: true });
  }
}

/** Creates the notes/ and tombstones/ directories on the NAS if they don't exist yet. */
export async function ensureRemoteLayout(config: WebDavConfig): Promise<void> {
  const c = client(config);
  await ensureDir(c, NOTES_DIR);
  await ensureDir(c, TOMBSTONES_DIR);
}

async function listDir(config: WebDavConfig, dir: string): Promise<RemoteFile[]> {
  const c = client(config);
  await ensureDir(c, dir);
  const contents = await c.getDirectoryContents(dir);
  return contents
    .filter((item) => item.type === 'file')
    .map((item) => ({ basename: item.basename, etag: item.etag, lastmod: item.lastmod }));
}

export function listNoteFiles(config: WebDavConfig): Promise<RemoteFile[]> {
  return listDir(config, NOTES_DIR);
}

export function listTombstoneFiles(config: WebDavConfig): Promise<RemoteFile[]> {
  return listDir(config, TOMBSTONES_DIR);
}

export async function getNoteFile(config: WebDavConfig, id: string): Promise<string> {
  const c = client(config);
  const content = await c.getFileContents(`${NOTES_DIR}/${id}.json`, { format: 'text' });
  return content as string;
}

/** Uploads a note file. If `ifMatchEtag` is given, the write is rejected with PreconditionFailedError when the remote copy has moved on. */
export async function putNoteFile(
  config: WebDavConfig,
  id: string,
  body: string,
  ifMatchEtag?: string | null,
): Promise<void> {
  const c = client(config);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ifMatchEtag) headers['If-Match'] = ifMatchEtag;
  try {
    await c.putFileContents(`${NOTES_DIR}/${id}.json`, body, { headers, overwrite: true });
  } catch (err) {
    if (isStatusError(err, 412)) throw new PreconditionFailedError(id);
    throw err;
  }
}

export async function deleteNoteFile(config: WebDavConfig, id: string): Promise<void> {
  const c = client(config);
  try {
    await c.deleteFile(`${NOTES_DIR}/${id}.json`);
  } catch (err) {
    if (isStatusError(err, 404)) return;
    throw err;
  }
}

export interface TombstoneFile {
  id: string;
  deletedAt: string;
}

export async function putTombstoneFile(config: WebDavConfig, id: string, deletedAt: string): Promise<void> {
  const c = client(config);
  const body: TombstoneFile = { id, deletedAt };
  await c.putFileContents(`${TOMBSTONES_DIR}/${id}.json`, JSON.stringify(body), {
    overwrite: true,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getTombstoneFile(config: WebDavConfig, id: string): Promise<TombstoneFile> {
  const c = client(config);
  const content = await c.getFileContents(`${TOMBSTONES_DIR}/${id}.json`, { format: 'text' });
  return JSON.parse(content as string) as TombstoneFile;
}

/** Verifies the given credentials can reach the WebDAV root; throws on failure. */
export async function testConnection(config: WebDavConfig): Promise<void> {
  const c = client(config);
  await c.getDirectoryContents('/');
}

const VAULT_DESCRIPTOR_FILE = 'vault.json';

/**
 * Publishes the encryption vault's kdf params + verifier (never the derived key or credentials)
 * to the NAS root, so a second device can bootstrap unlocking without a prior local vault.
 */
export async function putVaultDescriptor(config: WebDavConfig, json: string): Promise<void> {
  const c = client(config);
  await c.putFileContents(VAULT_DESCRIPTOR_FILE, json, {
    overwrite: true,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getVaultDescriptor(config: WebDavConfig): Promise<string | undefined> {
  const c = client(config);
  if (!(await c.exists(VAULT_DESCRIPTOR_FILE))) return undefined;
  return (await c.getFileContents(VAULT_DESCRIPTOR_FILE, { format: 'text' })) as string;
}
