import type { NoteDraft } from '../types/note';
import type { Importer } from './types';
import { extensionOf } from './types';
import { JSON_EXPORT_FORMAT } from '../export/exporters';

interface RawNoteLike {
  title?: unknown;
  bodyMarkdown?: unknown;
  entryDate?: unknown;
  tags?: unknown;
}

function toDraft(raw: RawNoteLike): NoteDraft {
  return {
    title: typeof raw.title === 'string' ? raw.title : '',
    bodyMarkdown: typeof raw.bodyMarkdown === 'string' ? raw.bodyMarkdown : '',
    entryDate: typeof raw.entryDate === 'string' ? raw.entryDate : '',
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [],
  };
}

/** Accepts myNotes' own export format ({ format, notes: [...] }) or, leniently, a bare array of note-like objects. */
function extractNotes(parsed: unknown): RawNoteLike[] | undefined {
  if (Array.isArray(parsed)) return parsed as RawNoteLike[];
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { notes?: unknown }).notes)) {
    return (parsed as { notes: RawNoteLike[] }).notes;
  }
  return undefined;
}

export const jsonImporter: Importer = {
  id: 'json',
  label: 'JSON (myNotes)',
  acceptedExtensions: ['.json'],

  async detect(file) {
    if (extensionOf(file.name) !== '.json') return false;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (extractNotes(parsed) === undefined) return false;
      // A `format` field matching our own export is a strong signal, but not required —
      // a bare array of note-shaped objects is accepted too (see extractNotes).
      return true;
    } catch {
      return false;
    }
  },

  async parse(file) {
    const parsed: unknown = JSON.parse(await file.text());
    const notes = extractNotes(parsed);
    if (!notes) throw new Error(`Expected a "${JSON_EXPORT_FORMAT}" export or an array of notes.`);
    return notes.map(toDraft);
  },
};
