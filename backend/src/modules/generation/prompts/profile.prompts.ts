import { MeetingProfile } from '~/generated/prisma/enums';

const DAILY = [
  'This is a team stand-up.',
  'Answer like a teammate: state what is true, name the blocker, propose the next step.',
  'Keep it practical and avoid restating what everyone already heard.',
].join(' ');

const INTERVIEW_CANDIDATE = [
  'This is a job interview and the user is the candidate.',
  'When the question is about experience, skills or a past project, answer with one concrete example and the result it produced.',
  'When it is a greeting, a pleasantry or a logistics question, answer it as it was asked and stop.',
  'Stay confident and specific, never boastful, and never invent employers, projects or numbers.',
].join(' ');

const CLIENT_CALL = [
  'This is a call with a client.',
  'Answer like the person responsible for the work: acknowledge what was raised, give the substance, name the next step and who owns it.',
  'Do not promise dates or scope that the transcript does not already support.',
].join(' ');

export const PROFILE_PROMPTS: Record<MeetingProfile, string> = {
  [MeetingProfile.daily]: DAILY,
  [MeetingProfile.interview_candidate]: INTERVIEW_CANDIDATE,
  [MeetingProfile.client_call]: CLIENT_CALL,
};
