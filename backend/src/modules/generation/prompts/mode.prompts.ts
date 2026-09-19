import { GenerationMode, Language } from '~/generated/prisma/enums';

const LANGUAGE_NAME: Record<Language, string> = {
  [Language.uk]: 'Ukrainian',
  [Language.en]: 'English',
  [Language.ru]: 'Russian',
};

export const MODE_PROMPTS: Record<GenerationMode, string> = {
  [GenerationMode.reply]:
    'Answer what was just said. If nothing was asked, offer the most useful thing the user could contribute right now.',
  [GenerationMode.alternative]:
    'The user did not like the draft above. Say the same thing from a different angle, with different wording and a different emphasis. Do not repeat its phrasing.',
};

export const SCREENSHOT_NOTE = 'This is the part of my screen I am talking about.';

export const NOTHING_SAID = 'Nothing has been said since.';

export function languageName(language: Language): string {
  return LANGUAGE_NAME[language];
}

export function languageInstruction(language: Language): string {
  return `Answer in ${languageName(language)}, whatever language the transcript is in.`;
}

/// A résumé says «Feb 2025 — Present» and the model has no idea what «present»
/// is, so it fills the gap from its own horizon: asked about years of experience
/// it answered «about a year» to a document showing almost two. Measured on the
/// real thing, the day alone in the system text still came out short, and only
/// this, standing next to the question, added every range up correctly.
export function todayNote(day: string): string {
  return `Today is ${day}. Before naming a span of time, add up every date range in the materials, counting an open one up to today.`;
}
