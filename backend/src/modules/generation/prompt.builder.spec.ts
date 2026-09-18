import { GenerationMode, Language, MeetingProfile } from '~/generated/prisma/enums';
import type { MeetingLiveState, WindowSegment } from '~/modules/meetings';
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

const input = (overrides: Partial<PromptInput> = {}): PromptInput => ({
  state: state(),
  summary: null,
  recent: [],
  previousAnswer: null,
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

  it('keeps the system text identical for two requests in one meeting', () => {
    const first = builder.build(
      input({ summary: 'Перше резюме', mode: GenerationMode.reply }),
    );
    const second = builder.build(
      input({
        summary: 'Зовсім інше резюме',
        recent: [segment('other', 'Нова репліка')],
        mode: GenerationMode.alternative,
        previousAnswer: 'Попередня відповідь',
      }),
    );

    expect(first.system).toBe(second.system);
  });

  it('orders the blocks from stable to volatile', () => {
    const prompt = builder.build(
      input({
        summary: 'Резюме',
        recent: [segment('other', 'Питання?')],
        mode: GenerationMode.alternative,
        previousAnswer: 'Стара відповідь',
      }),
    );

    expect(prompt.blocks[0]).toContain('Резюме');
    expect(prompt.blocks[1]).toContain('[other] Питання?');
    expect(prompt.blocks[2]).toContain('Стара відповідь');
    expect(prompt.blocks[3]).toContain('different angle');
    expect(prompt.blocks[4]).toContain('Ukrainian');
  });

  it('leaves out the previous answer unless another angle was asked for', () => {
    const prompt = builder.build(
      input({ mode: GenerationMode.reply, previousAnswer: 'Стара відповідь' }),
    );

    expect(prompt.blocks.join('\n')).not.toContain('Стара відповідь');
  });

  it.each([
    [Language.uk, 'Ukrainian'],
    [Language.en, 'English'],
    [Language.ru, 'Russian'],
  ])('asks for the answer in %s', (language, name) => {
    const prompt = builder.build(input({ state: state({ language }) }));

    expect(prompt.blocks.at(-1)).toContain(name);
  });
});
