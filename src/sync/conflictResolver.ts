import type { Note } from '../types/note';

export type ConflictDecision =
  | { action: 'push-local' }
  | { action: 'accept-remote' }
  | { action: 'up-to-date' };

/**
 * Last-write-wins: `version` (bumped on every local edit) is the primary tiebreaker
 * since it doesn't depend on device clocks being in sync; `updatedAt` only decides
 * the rare case where both sides show the same version but diverged content.
 */
export function resolveLastWriteWins(local: Note, remote: Note): ConflictDecision {
  if (local.version === remote.version && local.updatedAt === remote.updatedAt) {
    return { action: 'up-to-date' };
  }
  if (local.version !== remote.version) {
    return local.version > remote.version ? { action: 'push-local' } : { action: 'accept-remote' };
  }
  return local.updatedAt >= remote.updatedAt ? { action: 'push-local' } : { action: 'accept-remote' };
}
