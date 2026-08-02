export interface NoteTemplate {
  name: string;
  bodyMarkdown: string;
}

/** Static starter snippets for a new entry — intentionally just Markdown text, no logic. */
export const noteTemplates: NoteTemplate[] = [
  {
    name: 'Reisebericht',
    bodyMarkdown: '## Wo\n\n## Was ich erlebt habe\n\n## Highlights\n\n- \n\n## Nächste Schritte\n\n',
  },
  {
    name: 'Tagesrückblick',
    bodyMarkdown: '## Was gut war\n\n- \n\n## Was schwierig war\n\n- \n\n## Morgen',
  },
];
