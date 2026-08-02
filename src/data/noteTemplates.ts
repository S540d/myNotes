import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';

export interface NoteTemplate {
  id: 'travelReport' | 'dailyReview';
  name: string;
  bodyMarkdown: string;
}

const bodyMarkdown: Record<Language, Record<NoteTemplate['id'], string>> = {
  de: {
    travelReport: '## Wo\n\n## Was ich erlebt habe\n\n## Highlights\n\n- \n\n## Nächste Schritte\n\n',
    dailyReview: '## Was gut war\n\n- \n\n## Was schwierig war\n\n- \n\n## Morgen',
  },
  en: {
    travelReport: '## Where\n\n## What I experienced\n\n## Highlights\n\n- \n\n## Next steps\n\n',
    dailyReview: '## What went well\n\n- \n\n## What was hard\n\n- \n\n## Tomorrow',
  },
};

/** Static starter snippets for a new entry — intentionally just Markdown text, no logic. */
export function getNoteTemplates(language: Language): NoteTemplate[] {
  const t = translations[language];
  return [
    { id: 'travelReport', name: t.templates.travelReport, bodyMarkdown: bodyMarkdown[language].travelReport },
    { id: 'dailyReview', name: t.templates.dailyReview, bodyMarkdown: bodyMarkdown[language].dailyReview },
  ];
}
