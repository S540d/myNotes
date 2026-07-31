import { db } from '../db/schema';
import type { SyncQueueItem } from '../db/schema';

const MAX_ATTEMPTS = 5;

export interface QueueBatchItem {
  noteId: string;
  op: 'put' | 'delete';
  attemptCount: number;
  queueIds: number[];
}

/** Collapses the FIFO outbox into one entry per note (the latest queued op wins). */
export async function collapseQueue(): Promise<QueueBatchItem[]> {
  const items: SyncQueueItem[] = await db.syncQueue.orderBy('createdAt').toArray();
  const byNote = new Map<string, QueueBatchItem>();
  for (const item of items) {
    const existing = byNote.get(item.noteId);
    if (existing) {
      existing.op = item.op;
      existing.attemptCount = Math.max(existing.attemptCount, item.attemptCount);
      existing.queueIds.push(item.localId as number);
    } else {
      byNote.set(item.noteId, {
        noteId: item.noteId,
        op: item.op,
        attemptCount: item.attemptCount,
        queueIds: [item.localId as number],
      });
    }
  }
  return [...byNote.values()];
}

/** Bumps the attempt count on a failed push and returns the new (highest) count. */
export async function bumpAttempts(queueIds: number[]): Promise<number> {
  let attemptCount = 0;
  for (const localId of queueIds) {
    const item = await db.syncQueue.get(localId);
    if (!item) continue;
    attemptCount = Math.max(attemptCount, item.attemptCount + 1);
    await db.syncQueue.update(localId, { attemptCount });
  }
  return attemptCount;
}

export async function clearQueueEntries(queueIds: number[]): Promise<void> {
  await db.syncQueue.bulkDelete(queueIds);
}

export function hasExceededRetries(attemptCount: number): boolean {
  return attemptCount >= MAX_ATTEMPTS;
}
