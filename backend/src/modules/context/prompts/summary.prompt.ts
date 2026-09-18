import { Language } from '~/generated/prisma/enums';

const LANGUAGE_NAME: Record<Language, string> = {
  [Language.uk]: 'Ukrainian',
  [Language.en]: 'English',
  [Language.ru]: 'Russian',
};

export const SUMMARY_SYSTEM_PROMPT = [
  'You compress a running meeting transcript into notes that another assistant will rely on later.',
  'Keep every fact that could matter: topics raised, decisions made, numbers, names, commitments, open questions and disagreements.',
  'Drop small talk, filler and repetition. Never invent anything that is not in the transcript.',
  'Write dense prose in a few short paragraphs, not a bulleted list, and write nothing except the notes themselves.',
].join(' ');

export function buildSummaryBlocks(
  language: Language,
  previousSummary: string | null,
  transcript: string,
): string[] {
  const blocks: string[] = [];

  if (previousSummary) {
    blocks.push(`Notes so far:\n${previousSummary}`);
  }

  blocks.push(`New part of the transcript:\n${transcript}`);
  blocks.push(
    previousSummary
      ? 'Merge the new part into the notes so far and return the complete updated notes.'
      : 'Return the notes for this transcript.',
  );
  blocks.push(`Write the notes in ${LANGUAGE_NAME[language]}.`);

  return blocks;
}
