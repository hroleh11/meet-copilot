import { GenerationMode, Language, MeetingProfile } from '~/generated/prisma/enums';
import type { MeetingLiveState, MeetingTurn, WindowSegment } from '~/modules/meetings';
import { PromptBuilder, type PromptInput } from './prompt.builder';

const state = (overrides: Partial<MeetingLiveState> = {}): MeetingLiveState => ({
  language: Language.uk,
  profile: MeetingProfile.daily,
  style: '',
  ...overrides,
});

const segment = (speaker: 'me' | 'other', text: string): WindowSegment => ({
  id: text,
  speaker,
  text,
  startMs: 0,
  durationMs: 0,
});

const picture = { mimeType: 'image/jpeg', dataBase64: 'AQID' };

const turn = (overrides: Partial<MeetingTurn> = {}): MeetingTurn => ({
  question: '[other] Що таке проміс?',
  answer: 'Це обгортка над майбутнім значенням.',
  ...overrides,
});

const input = (overrides: Partial<PromptInput> = {}): PromptInput => ({
  state: state(),
  summary: null,
  turns: [],
  spoken: [],
  screenshot: null,
  mode: GenerationMode.reply,
  ...overrides,
});

describe('PromptBuilder', () => {
  const builder = new PromptBuilder();

  it('falls back to the default style when the user set none', () => {
    expect(builder.build(input()).system).toContain('competent colleague');
  });

  it('uses the style the meeting froze at its start', () => {
    const prompt = builder.build(
      input({ state: state({ style: 'Дуже сухо і коротко' }) }),
    );

    expect(prompt.system).toContain('Дуже сухо і коротко');
    expect(prompt.system).not.toContain('competent colleague');
  });

  it.each([
    [MeetingProfile.daily, 'stand-up'],
    [MeetingProfile.interview_candidate, 'candidate'],
    [MeetingProfile.client_call, 'client'],
  ])('describes the %s profile in the system text', (profile, marker) => {
    expect(builder.build(input({ state: state({ profile }) })).system).toContain(marker);
  });

  it.each([
    [Language.uk, 'Ukrainian'],
    [Language.en, 'English'],
    [Language.ru, 'Russian'],
  ])('asks for the answer in %s', (language, name) => {
    expect(builder.build(input({ state: state({ language }) })).system).toContain(name);
  });

  it('keeps the system text identical for two requests in one meeting', () => {
    const first = builder.build(input({ summary: 'Перше резюме' }));
    const second = builder.build(
      input({
        summary: 'Зовсім інше резюме',
        spoken: [segment('other', 'Нова репліка')],
        turns: [turn()],
        mode: GenerationMode.alternative,
      }),
    );

    expect(first.system).toBe(second.system);
  });

  it('opens with the notes and closes with what was just said', () => {
    const prompt = builder.build(
      input({ summary: 'Резюме', spoken: [segment('other', 'Питання?')] }),
    );

    expect(prompt.messages[0]?.text).toContain('Резюме');
    expect(prompt.messages.at(-1)?.text).toContain('[other] Питання?');
    expect(prompt.messages.at(-1)?.text).toContain('Answer what was just said');
  });

  it('replays earlier turns as questions and the drafts that answered them', () => {
    const prompt = builder.build(
      input({ turns: [turn()], spoken: [segment('other', 'А як працює useEffect?')] }),
    );

    expect(prompt.messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'user',
    ]);
    expect(prompt.messages[0]?.text).toContain('Що таке проміс?');
    expect(prompt.messages[1]?.text).toBe('Це обгортка над майбутнім значенням.');
  });

  it('leaves the screenshot on the turn it came with', () => {
    const prompt = builder.build(
      input({
        turns: [turn({ screenshot: picture })],
        spoken: [segment('other', 'А як працює useEffect?')],
      }),
    );

    expect(prompt.messages[0]?.image).toEqual(picture);
    expect(prompt.messages.at(-1)?.image).toBeUndefined();
    expect(prompt.messages.at(-1)?.text).not.toContain('screen');
  });

  it('attaches a screenshot that came with this request to this question', () => {
    const prompt = builder.build(input({ screenshot: picture }));

    expect(prompt.messages.at(-1)?.image).toEqual(picture);
    expect(prompt.messages.at(-1)?.text).toContain('part of my screen');
  });

  it('carries one picture at a time, the one this question points at', () => {
    const newer = { mimeType: 'image/png', dataBase64: 'BAUG' };
    const prompt = builder.build(
      input({ turns: [turn({ screenshot: picture })], screenshot: newer }),
    );

    expect(prompt.messages.filter((message) => message.image)).toEqual([
      expect.objectContaining({ image: newer }),
    ]);
  });

  it('says so plainly when nothing was said since the last draft', () => {
    const prompt = builder.build(input({ turns: [turn()] }));

    expect(prompt.messages.at(-1)?.text).toContain('Nothing has been said since');
  });

  it('asks for another angle on the draft above only in alternative mode', () => {
    const drafted = builder.build(
      input({ turns: [turn()], mode: GenerationMode.alternative }),
    );
    const plain = builder.build(input({ turns: [turn()] }));

    expect(drafted.messages.at(-1)?.text).toContain('different angle');
    expect(plain.messages.at(-1)?.text).not.toContain('different angle');
  });
});
