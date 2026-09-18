import { GenerationMode, Language } from '~/generated/prisma/enums';

const LANGUAGE_NAME: Record<Language, string> = {
  [Language.uk]: 'Ukrainian',
  [Language.en]: 'English',
  [Language.ru]: 'Russian',
};

export const MODE_PROMPTS: Record<GenerationMode, string> = {
  [GenerationMode.reply]:
    'Answer the last thing that was said. If nothing was asked, offer the most useful thing the user could contribute right now.',
  [GenerationMode.alternative]:
    'The answer above was already drafted and the user did not like it. Say the same thing from a different angle, with different wording and a different emphasis. Do not repeat its phrasing.',
};

export function languageInstruction(language: Language): string {
  return `Answer in ${LANGUAGE_NAME[language]}, whatever language the transcript is in.`;
}
