export type SyncState = 'synced' | 'pending' | 'conflict';

/** Snapshot of the remote note that lost a push race, kept so the user can compare and resolve it manually. */
export interface ConflictShadow {
  title: string;
  bodyMarkdown: string;
  entryDate: string;
  tags: string[];
  updatedAt: string;
  version: number;
}

export interface Note {
  id: string;
  title: string;
  bodyMarkdown: string;
  /** Journal date the entry is about (YYYY-MM-DD), distinct from createdAt/updatedAt. */
  entryDate: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  /** Per-note edit counter, used as a conflict tiebreaker when clocks drift. */
  version: number;
  encrypted: boolean;
  deleted: boolean;
  deletedAt?: string;
  remoteEtag?: string;
  syncState: SyncState;
  /** Present only while syncState === 'conflict'; the remote version the user still needs to resolve against. */
  conflictShadow?: ConflictShadow;
}

/** Fields a user can edit directly; the rest are managed by the repository/sync layer. */
export type NoteDraft = Pick<Note, 'title' | 'bodyMarkdown' | 'entryDate' | 'tags'>;
