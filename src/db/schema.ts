import Dexie, { type EntityTable } from 'dexie';
import type { Note } from '../types/note';

export interface SyncQueueItem {
  localId?: number;
  noteId: string;
  op: 'put' | 'delete';
  createdAt: string;
  attemptCount: number;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export interface TagRecord {
  name: string;
  noteCount: number;
  /** Optional parent tag name, for the user-defined tag hierarchy (Issue #17). Not an index — tag lists are small enough to filter in JS. */
  parent?: string;
}

class MyNotesDatabase extends Dexie {
  notes!: EntityTable<Note, 'id'>;
  syncQueue!: EntityTable<SyncQueueItem, 'localId'>;
  settings!: EntityTable<SettingRecord, 'key'>;
  tags!: EntityTable<TagRecord, 'name'>;

  constructor() {
    super('myNotes');
    // `deleted` (boolean tombstone flag) is intentionally not indexed: IndexedDB boolean
    // indexing is unreliable on older iOS Safari, so deleted-filtering happens in JS instead.
    this.version(1).stores({
      notes: 'id, entryDate, updatedAt, syncState, *tags',
      syncQueue: '++localId, noteId, op, createdAt',
      settings: 'key',
      tags: 'name',
    });
  }
}

export const db = new MyNotesDatabase();
