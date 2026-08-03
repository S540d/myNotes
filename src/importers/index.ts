import type { Importer } from './types';
import { jsonImporter } from './jsonImporter';
import { markdownImporter } from './markdownImporter';
import { plaintextImporter } from './plaintextImporter';
import { evernoteEnexImporter } from './evernoteEnexImporter';
import { wordpressWxrImporter } from './wordpressWxrImporter';

export type { Importer } from './types';

/** Order matters only as detection priority; extensions barely overlap so this rarely matters in practice. */
export const importers: Importer[] = [
  jsonImporter,
  markdownImporter,
  plaintextImporter,
  evernoteEnexImporter,
  wordpressWxrImporter,
];

/** First importer (in registry order) whose detect() accepts the file, or undefined if none does. */
export async function detectImporter(file: File): Promise<Importer | undefined> {
  for (const importer of importers) {
    if (await importer.detect(file)) return importer;
  }
  return undefined;
}
