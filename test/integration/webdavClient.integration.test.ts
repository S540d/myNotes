import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import * as webdavClient from '../../src/sync/webdavClient';
import type { WebDavConfig } from '../../src/sync/webdavClient';

/**
 * Runs against the local hacdias/webdav test server started via:
 *   docker compose -f docker-compose.webdav.yml up -d
 * See docs/TESTING.md. Skips itself (instead of failing CI) when the server isn't reachable,
 * since this suite is intentionally not part of the default `npm test` unit run.
 */
const config: WebDavConfig = {
  url: process.env.WEBDAV_TEST_URL ?? 'http://localhost:6065',
  username: process.env.WEBDAV_TEST_USER ?? 'testuser',
  password: process.env.WEBDAV_TEST_PASSWORD ?? 'testpass',
};

// Top-level await: resolved once at collection time so the whole suite can be skipped synchronously.
const serverReachable = await webdavClient
  .testConnection(config)
  .then(() => true)
  .catch(() => {
    // eslint-disable-next-line no-console
    console.warn(
      `[webdavClient.integration] skipping: no WebDAV test server reachable at ${config.url}. ` +
        'Run `docker compose -f docker-compose.webdav.yml up -d` first.',
    );
    return false;
  });

describe.skipIf(!serverReachable)('webdavClient against a real WebDAV server', () => {
  it('creates the notes/ and tombstones/ directories', async () => {
    await webdavClient.ensureRemoteLayout(config);
    const notes = await webdavClient.listNoteFiles(config);
    const tombstones = await webdavClient.listTombstoneFiles(config);
    expect(notes).toBeDefined();
    expect(tombstones).toBeDefined();
  });

  it('round-trips a note file through PUT/GET/PROPFIND/DELETE', async () => {
    await webdavClient.ensureRemoteLayout(config);
    const id = randomUUID();
    const body = JSON.stringify({ id, title: 'Integrationstest' });

    await webdavClient.putNoteFile(config, id, body);
    expect(await webdavClient.getNoteFile(config, id)).toBe(body);

    const listed = await webdavClient.listNoteFiles(config);
    expect(listed.some((f) => f.basename === `${id}.json`)).toBe(true);

    await webdavClient.deleteNoteFile(config, id);
    const afterDelete = await webdavClient.listNoteFiles(config);
    expect(afterDelete.some((f) => f.basename === `${id}.json`)).toBe(false);
  });

  it('rejects a PUT whose If-Match etag no longer matches the remote copy', async () => {
    await webdavClient.ensureRemoteLayout(config);
    const id = randomUUID();
    await webdavClient.putNoteFile(config, id, JSON.stringify({ id, v: 1 }));

    await expect(webdavClient.putNoteFile(config, id, JSON.stringify({ id, v: 2 }), '"stale-etag"')).rejects.toThrow(
      webdavClient.PreconditionFailedError,
    );

    await webdavClient.deleteNoteFile(config, id);
  });

  it('round-trips a tombstone file', async () => {
    await webdavClient.ensureRemoteLayout(config);
    const id = randomUUID();
    const deletedAt = new Date().toISOString();

    await webdavClient.putTombstoneFile(config, id, deletedAt);
    const tombstone = await webdavClient.getTombstoneFile(config, id);
    expect(tombstone).toEqual({ id, deletedAt });
  });

  it('publishes and reads back the vault descriptor', async () => {
    const payload = JSON.stringify({ kdf: { salt: 'abc', iterations: 210_000, hash: 'SHA-256' }, verifier: {} });
    await webdavClient.putVaultDescriptor(config, payload);
    expect(await webdavClient.getVaultDescriptor(config)).toBe(payload);
  });
});
