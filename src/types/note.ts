export type SyncState = 'synced' | 'pending' | 'conflict';

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
}

/** Fields a user can edit directly; the rest are managed by the repository/sync layer. */
export type NoteDraft = Pick<Note, 'title' | 'bodyMarkdown' | 'entryDate' | 'tags'>;
