import { GenerationMode, Language } from '~/generated/prisma/enums';

const LANGUAGE_NAME: Record<Language, string> = {
  [Language.uk]: 'Ukrainian',
  [Language.en]: 'English',
  [Language.ru]: 'Russian',
};

export const MODE_PROMPTS: Record<GenerationMode, string> = {
  [GenerationMode.reply]: [
    'Answer what was just said, and nothing beyond it.',
    'Greetings, thanks and small talk are answered in kind and left there: never introduce the user or their experience unless it was asked for.',
    'Only when a real question or a gap is on the table, and nobody has answered it, offer the most useful thing the user could contribute right now.',
  ].join(' '),
  [GenerationMode.alternative]:
    'The user did not like the draft above. Say the same thing from a different angle, with different wording and a different emphasis. Do not repeat its phrasing.',
};

export const SCREENSHOT_NOTE = 'This is the part of my screen I am talking about.';

export const NOTHING_SAID = 'Nothing has been said since.';

export function languageName(language: Language): string {
  return LANGUAGE_NAME[language];
}

/// An interview can open in one language and carry on in another, and the draft
/// has to follow the room. `null` is that: answer in whatever the other side is
/// speaking now. A language that was picked on purpose is still honoured.
export function replyInstruction(replyLanguage: Language | null): string {
  return replyLanguage
    ? `Answer in ${languageName(replyLanguage)}, whatever language the transcript is in.`
    : 'Answer in the language the other side is speaking right now, and switch with them when they switch. If nothing has been said yet, answer in the language of the notes.';
}

/// A résumé says «Feb 2025 — Present» and the model has no idea what «present»
/// is, so it fills the gap from its own horizon: asked about years of experience
/// it answered «about a year» to a document showing almost two. Measured on the
/// real thing, the day alone in the system text still came out short, and only
/// this, standing next to the question, added every range up correctly.
export function todayNote(day: string): string {
  return `Today is ${day}. Before naming a span of time, add up every date range in the materials, counting an open one up to today.`;
}
