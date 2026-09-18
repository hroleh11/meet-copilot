import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Language, MeetingProfile } from '~/generated/prisma/enums';
import { LlmProvider, type LlmRequest } from '~/infrastructure/llm';
import {
  MeetingStateStore,
  MeetingsRepository,
  type WindowSegment,
} from '~/modules/meetings';
import { UsageRecorder } from '~/modules/usage';
import { ContextWindow } from './context-window';
import { Summarizer } from './summarizer';

const settings: Record<string, unknown> = {
  WINDOW_MAX_CHARS: 100,
  SUMMARY_TRIGGER_CHARS: 50,
  SUMMARY_MODEL: 'claude-sonnet-5',
  SUMMARY_EFFORT: 'medium',
};

const segment = (id: string, text: string): WindowSegment => ({
  id,
  speaker: 'other',
  text,
  startMs: 0,
  durationMs: 0,
});

class FakeStateStore {
  window: WindowSegment[] = [];
  summary: string | null = null;
  claims = 0;
  locked = false;
  trimmedTo: number | null = null;

  readWindow = () => Promise.resolve(this.window);
  readState = () =>
    Promise.resolve({
      language: Language.uk,
      profile: MeetingProfile.daily,
      style: '',
    });
  readSummary = () => Promise.resolve(this.summary);
  writeSummary = (_id: string, summary: string) => {
    this.summary = summary;
    return Promise.resolve();
  };
  trimWindow = (_id: string, keepLast: number) => {
    this.trimmedTo = keepLast;
    return Promise.resolve();
  };
  claimSummarize = () => {
    this.claims += 1;

    if (this.locked) {
      return Promise.resolve(false);
    }

    this.locked = true;
    return Promise.resolve(true);
  };
  releaseSummarize = () => {
    this.locked = false;
    return Promise.resolve();
  };
}

class FakeLlmProvider extends LlmProvider {
  calls: LlmRequest[] = [];
  text = 'Обговорили онбординг.';

  complete(request: LlmRequest) {
    this.calls.push(request);

    return Promise.resolve({
      text: this.text,
      stopReason: 'end_turn',
      usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 5 },
    });
  }
}

async function build(): Promise<{
  summarizer: Summarizer;
  stateStore: FakeStateStore;
  llm: FakeLlmProvider;
  saved: string[];
  usageKinds: string[];
}> {
  const stateStore = new FakeStateStore();
  const llm = new FakeLlmProvider();
  const saved: string[] = [];
  const usageKinds: string[] = [];

  const moduleRef = await Test.createTestingModule({
    providers: [
      Summarizer,
      ContextWindow,
      { provide: MeetingStateStore, useValue: stateStore },
      {
        provide: MeetingsRepository,
        useValue: {
          updateSummary: (_id: string, summary: string) => {
            saved.push(summary);
            return Promise.resolve();
          },
        },
      },
      { provide: LlmProvider, useValue: llm },
      {
        provide: UsageRecorder,
        useValue: {
          record: (usage: { kind: string }) => {
            usageKinds.push(usage.kind);
            return Promise.resolve();
          },
        },
      },
      {
        provide: ConfigService,
        useValue: { getOrThrow: (key: string) => settings[key] },
      },
    ],
  }).compile();

  return { summarizer: moduleRef.get(Summarizer), stateStore, llm, saved, usageKinds };
}

describe('Summarizer', () => {
  it('stays idle while the transcript still fits the window', async () => {
    const { summarizer, stateStore, llm } = await build();
    stateStore.window = [segment('a', 'x'.repeat(40))];

    await summarizer.maybeRun('meeting', 'user');

    expect(llm.calls).toHaveLength(0);
    expect(stateStore.claims).toBe(0);
  });

  it('compresses the stale part and keeps the recent one', async () => {
    const { summarizer, stateStore, llm, saved, usageKinds } = await build();
    stateStore.window = [
      segment('a', 'x'.repeat(60)),
      segment('b', 'y'.repeat(60)),
      segment('c', 'z'.repeat(60)),
    ];

    await summarizer.maybeRun('meeting', 'user');

    expect(llm.calls).toHaveLength(1);
    expect(stateStore.summary).toBe('Обговорили онбординг.');
    expect(saved).toEqual(['Обговорили онбординг.']);
    expect(stateStore.trimmedTo).toBe(1);
    expect(usageKinds).toEqual(['summarize']);
  });

  it('merges into the notes it already has', async () => {
    const { summarizer, stateStore, llm } = await build();
    stateStore.summary = 'Раніше говорили про ціни.';
    stateStore.window = [segment('a', 'x'.repeat(200)), segment('b', 'y'.repeat(50))];

    await summarizer.maybeRun('meeting', 'user');

    expect(llm.calls[0]?.blocks.join('\n')).toContain('Раніше говорили про ціни.');
  });

  it('skips the run when another one already holds the lock', async () => {
    const { summarizer, stateStore, llm } = await build();
    stateStore.window = [segment('a', 'x'.repeat(200)), segment('b', 'y'.repeat(50))];
    stateStore.locked = true;

    await summarizer.maybeRun('meeting', 'user');

    expect(llm.calls).toHaveLength(0);
  });

  it('releases the lock when the provider fails', async () => {
    const { summarizer, stateStore, llm } = await build();
    stateStore.window = [segment('a', 'x'.repeat(200)), segment('b', 'y'.repeat(50))];
    llm.complete = () => Promise.reject(new Error('provider down'));

    await summarizer.maybeRun('meeting', 'user');

    expect(stateStore.locked).toBe(false);
  });
});
