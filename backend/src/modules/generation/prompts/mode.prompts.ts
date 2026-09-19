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
