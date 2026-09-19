import type { LlmTool } from '~/infrastructure/llm';

export const MEETING_FACTS = 'meeting_facts';
export const SEARCH_TRANSCRIPT = 'search_transcript';
export const READ_TRANSCRIPT = 'read_transcript';
export const LIST_ANSWERS = 'list_answers';

export const MEETING_TOOLS: LlmTool[] = [
  {
    name: MEETING_FACTS,
    description:
      'Facts recorded about this meeting: when it started and ended, how long it lasted, how long each side spoke, how many lines the transcript has and how many answers the copilot gave. Call it for any question about time, length or who talked more.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: SEARCH_TRANSCRIPT,
    description:
      'Lines of the transcript that contain a word or phrase, with the line number of each. Use it to find where something was said.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Word or phrase to look for' },
        limit: { type: 'integer', description: 'How many lines at most, default 20' },
      },
      required: ['query'],
    },
  },
  {
    name: READ_TRANSCRIPT,
    description:
      'A stretch of the transcript by line number, oldest line first. Use it to read around what a search found, or to read the start or the end of the meeting.',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'integer', description: 'First line number, starting at 1' },
        count: { type: 'integer', description: 'How many lines, default 60' },
      },
      required: ['from'],
    },
  },
  {
    name: LIST_ANSWERS,
    description:
      'The answers the copilot generated during the meeting, oldest first, with the time each was made.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
];
