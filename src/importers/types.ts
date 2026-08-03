import type { NoteDraft } from '../types/note';

export interface Importer {
  id: string;
  /** Format name shown in the UI; not routed through i18n since these are mostly proper nouns (WordPress, Evernote, ...). */
  label: string;
  acceptedExtensions: string[];
  detect(file: File): Promise<boolean>;
  parse(file: File): Promise<NoteDraft[]>;
}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot).toLowerCase();
}
