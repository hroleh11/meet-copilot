import request from 'supertest';
import {
  LlmProvider,
  type LlmCompletion,
  type LlmEvent,
  type LlmRequest,
} from '~/infrastructure/llm';
import { AppHarness, bearer, type TestAccount } from './app-harness';

class FakeLlmProvider extends LlmProvider {
  requests: LlmRequest[] = [];
  chunks = ['Я б скоротив ', 'анкету до трьох полів.'];

  complete(): Promise<LlmCompletion> {
    throw new Error('The generation route only streams');
  }

  streamTools(): AsyncIterable<never> {
    throw new Error('Generation has no tools');
  }

  async *stream(request: LlmRequest): AsyncIterable<LlmEvent> {
    this.requests.push(request);

    for (const text of this.chunks) {
      await Promise.resolve();
      yield { type: 'delta', text };
    }

    yield {
      type: 'done',
      stopReason: 'completed',
      usage: { inputTokens: 120, cachedInputTokens: 64, outputTokens: 18 },
    };
  }
}

interface SseFrame {
  event: string;
  data: Record<string, unknown>;
}

function parseSse(body: string): SseFrame[] {
  return body
    .split('\n\n')
    .filter((chunk) => chunk.includes('event:'))
    .map((chunk) => {
      const [eventLine = '', dataLine = ''] = chunk.split('\n');

      return {
        event: eventLine.replace('event: ', ''),
        data: JSON.parse(dataLine.replace('data: ', '')) as Record<string, unknown>,
      };
    });
}

describe('Generation (e2e)', () => {
  const provider = new FakeLlmProvider();
  let harness: AppHarness;
  let account: TestAccount;
  let meetingId = '';

  const generate = (mode: string, screenshot?: unknown): request.Test =>
    request(harness.server)
      .post(`/api/v1/meetings/${meetingId}/generate`)
      .set(...bearer(account.accessToken))
      .send(screenshot === undefined ? { mode } : { mode, screenshot });

  const picture = { mimeType: 'image/jpeg', dataBase64: 'AQID' };

  beforeAll(async () => {
    harness = await AppHarness.boot((builder) =>
      builder.overrideProvider(LlmProvider).useValue(provider),
    );
    account = await harness.signUp('generation');

    const meeting = await request(harness.server)
      .post('/api/v1/meetings')
      .set(...bearer(account.accessToken))
      .send({ profile: 'client_call', language: 'uk' })
      .expect(201);

    meetingId = (meeting.body as { id: string }).id;
  });

  afterAll(async () => {
    await harness.shutdown();
  });

  it('streams the answer as deltas and finishes with usage', async () => {
    const response = await generate('reply').expect(200);
    const frames = parseSse(response.text);

    expect(frames.filter((f) => f.event === 'delta').map((f) => f.data.text)).toEqual([
      'Я б скоротив ',
      'анкету до трьох полів.',
    ]);
    expect(frames.at(-1)?.event).toBe('done');
    expect(frames.at(-1)?.data.usage).toMatchObject({ cachedInputTokens: 64 });
  });

  it('stores the answer so the meeting history keeps it', async () => {
    const details = await request(harness.server)
      .get(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(account.accessToken))
      .expect(200);

    const body = details.body as {
      generations: { mode: string; output: string }[];
      usage: { outputTokens: number };
    };

    expect(body.generations).toHaveLength(1);
    expect(body.generations[0]).toMatchObject({
      mode: 'reply',
      output: 'Я б скоротив анкету до трьох полів.',
    });
    expect(body.usage.outputTokens).toBe(18);
  });

  it('shows the previous answer to the model when another angle is asked for', async () => {
    provider.requests = [];

    await generate('alternative').expect(200);

    expect(provider.requests[0]?.blocks.join('\n')).toContain(
      'Я б скоротив анкету до трьох полів.',
    );
  });

  it('hands the screenshot to the model and marks the answer with it', async () => {
    provider.requests = [];

    await generate('reply', picture).expect(200);

    expect(provider.requests[0]?.image).toEqual(picture);
    expect(provider.requests[0]?.blocks.join('\n')).toContain('showed a screenshot');

    const details = await request(harness.server)
      .get(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(account.accessToken))
      .expect(200);

    const { generations } = details.body as { generations: { hasScreenshot: boolean }[] };

    expect(generations.at(-1)?.hasScreenshot).toBe(true);
  });

  it('shows the same screenshot again when another angle is asked for', async () => {
    provider.requests = [];

    await generate('alternative').expect(200);

    expect(provider.requests[0]?.image).toEqual(picture);
  });

  it('keeps the screenshot for the question that follows it', async () => {
    provider.requests = [];

    await generate('reply').expect(200);

    expect(provider.requests[0]?.image).toEqual(picture);
  });

  it('refuses a screenshot in a format the model does not read', async () => {
    await generate('reply', { mimeType: 'image/gif', dataBase64: 'AQID' }).expect(400);
  });

  it('shows the model its own last answer when the next question comes', async () => {
    provider.requests = [];

    await generate('reply').expect(200);

    expect(provider.requests[0]?.blocks.join('\n')).toContain(
      'You suggested this a moment ago',
    );
  });

  it('rejects a mode that does not exist', async () => {
    await generate('rewrite').expect(400);
  });

  it('refuses to draft for a meeting that is already finished', async () => {
    await request(harness.server)
      .post(`/api/v1/meetings/${meetingId}/finish`)
      .set(...bearer(account.accessToken))
      .expect(201);

    await generate('reply').expect(409);
  });
});
