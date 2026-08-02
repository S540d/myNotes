import type { Note } from '../types/note';

export interface OnThisDayEntry {
  note: Note;
  yearsAgo: number;
}

/** Journal-classic "on this day": earlier entries whose entryDate falls on today's month/day in a past year. */
export function findOnThisDay(notes: Note[], today: Date = new Date()): OnThisDayEntry[] {
  const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const currentYear = today.getFullYear();

  const entries: OnThisDayEntry[] = [];
  for (const note of notes) {
    if (note.deleted) continue;
    const [yearStr, monthDay] = [note.entryDate.slice(0, 4), note.entryDate.slice(5)];
    if (monthDay !== todayMonthDay) continue;
    const year = Number(yearStr);
    if (!Number.isFinite(year) || year >= currentYear) continue;
    entries.push({ note, yearsAgo: currentYear - year });
  }

  return entries.sort((a, b) => a.yearsAgo - b.yearsAgo);
}
