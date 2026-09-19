import { GenerationMode, Language } from '~/generated/prisma/enums';

const LANGUAGE_NAME: Record<Language, string> = {
  [Language.uk]: 'Ukrainian',
  [Language.en]: 'English',
  [Language.ru]: 'Russian',
};

export const MODE_PROMPTS: Record<GenerationMode, string> = {
  [GenerationMode.reply]:
    'Answer the last thing that was said, on its own terms. If the subject has just changed, leave the earlier one where it was. If nothing was asked, offer the most useful thing the user could contribute right now.',
  [GenerationMode.alternative]:
    'The answer above was already drafted and the user did not like it. Say the same thing from a different angle, with different wording and a different emphasis. Do not repeat its phrasing.',
};

export const PREVIOUS_ANSWER_LABELS: Record<GenerationMode, string> = {
  [GenerationMode.reply]:
    'You suggested this a moment ago. Use it only if the last question is about it; otherwise ignore it entirely and never mention it:',
  [GenerationMode.alternative]: 'Answer already drafted:',
};

export const SCREENSHOT_PROMPT =
  'The user showed a screenshot of part of their screen a short while ago — code, an error, a diagram, a document. Read it and answer from it while the questions are about it, follow-ups included. Do not describe the picture. Once the talk turns to something else, the picture is over: answer the new question without it and without referring to it.';

export function languageName(language: Language): string {
  return LANGUAGE_NAME[language];
}

export function languageInstruction(language: Language): string {
  return `Answer in ${languageName(language)}, whatever language the transcript is in.`;
}
