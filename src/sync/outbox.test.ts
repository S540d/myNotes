import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import { bumpAttempts, clearQueueEntries, collapseQueue, hasExceededRetries } from './outbox';

beforeEach(async () => {
  await db.syncQueue.clear();
});

afterEach(async () => {
  await db.syncQueue.clear();
});

describe('outbox', () => {
  it('collapses multiple queued ops for the same note into the latest op', async () => {
    await db.syncQueue.bulkAdd([
      { noteId: 'n1', op: 'put', createdAt: '2026-01-01T00:00:00.000Z', attemptCount: 0 },
      { noteId: 'n1', op: 'delete', createdAt: '2026-01-01T00:00:01.000Z', attemptCount: 0 },
      { noteId: 'n2', op: 'put', createdAt: '2026-01-01T00:00:02.000Z', attemptCount: 0 },
    ]);

    const batch = await collapseQueue();
    expect(batch).toHaveLength(2);
    const n1 = batch.find((b) => b.noteId === 'n1');
    expect(n1?.op).toBe('delete');
    expect(n1?.queueIds).toHaveLength(2);
  });

  it('bumps attempt counts and reports the highest across collapsed entries', async () => {
    const ids = await db.syncQueue.bulkAdd(
      [
        { noteId: 'n1', op: 'put', createdAt: '2026-01-01T00:00:00.000Z', attemptCount: 1 },
        { noteId: 'n1', op: 'put', createdAt: '2026-01-01T00:00:01.000Z', attemptCount: 3 },
      ],
      { allKeys: true },
    );

    const attemptCount = await bumpAttempts(ids as number[]);
    expect(attemptCount).toBe(4);
  });

  it('exceeds retries at the configured max attempt count', () => {
    expect(hasExceededRetries(4)).toBe(false);
    expect(hasExceededRetries(5)).toBe(true);
    expect(hasExceededRetries(6)).toBe(true);
  });

  it('clears queue entries by id', async () => {
    const ids = await db.syncQueue.bulkAdd(
      [{ noteId: 'n1', op: 'put', createdAt: '2026-01-01T00:00:00.000Z', attemptCount: 0 }],
      { allKeys: true },
    );
    await clearQueueEntries(ids as number[]);
    expect(await db.syncQueue.count()).toBe(0);
  });
});
