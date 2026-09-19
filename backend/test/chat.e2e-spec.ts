import request from 'supertest';
import {
  LlmProvider,
  type LlmAgentEvent,
  type LlmAgentRequest,
} from '~/infrastructure/llm';
import { AppHarness, bearer, type TestAccount } from './app-harness';

const USAGE = { inputTokens: 100, cachedInputTokens: 40, outputTokens: 12 };

class FakeLlmProvider extends LlmProvider {
  requests: LlmAgentRequest[] = [];

  complete(): never {
    throw new Error('The chat only streams');
  }

  stream(): AsyncIterable<never> {
    throw new Error('The chat only streams with tools');
  }

  async *streamTools(request: LlmAgentRequest): AsyncIterable<LlmAgentEvent> {
    this.requests.push(request);
    await Promise.resolve();

    if (this.requests.length % 2 === 1) {
      yield {
        type: 'toolCall',
        call: { callId: 'call-1', name: 'meeting_facts', arguments: '{}' },
      };
      yield { type: 'done', handle: 'response-1', stopReason: 'completed', usage: USAGE };
      return;
    }

    yield { type: 'delta', text: 'Зустріч тривала ' };
    yield { type: 'delta', text: 'менше хвилини.' };
    yield { type: 'done', handle: 'response-2', stopReason: 'completed', usage: USAGE };
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

describe('Chat (e2e)', () => {
  const provider = new FakeLlmProvider();
  let harness: AppHarness;
  let account: TestAccount;
  let intruder: TestAccount;
  let meetingId = '';
  let chatId = '';

  beforeAll(async () => {
    harness = await AppHarness.boot((builder) =>
      builder.overrideProvider(LlmProvider).useValue(provider),
    );
    account = await harness.signUp('chat');
    intruder = await harness.signUp('chat-intruder');

    const meeting = await request(harness.server)
      .post('/api/v1/meetings')
      .set(...bearer(account.accessToken))
      .send({ profile: 'daily', language: 'uk' })
      .expect(201);

    meetingId = (meeting.body as { id: string }).id;
  });

  afterAll(async () => {
    await harness.shutdown();
  });

  it('starts a chat with no name and no questions', async () => {
    const created = await request(harness.server)
      .post(`/api/v1/meetings/${meetingId}/chats`)
      .set(...bearer(account.accessToken))
      .expect(201);

    chatId = (created.body as { id: string }).id;

    expect(created.body).toMatchObject({ title: null, messageCount: 0 });
  });

  it('hides the chats of a meeting from anybody else', async () => {
    await request(harness.server)
      .get(`/api/v1/meetings/${meetingId}/chats`)
      .set(...bearer(intruder.accessToken))
      .expect(404);
  });

  it('answers only after it has asked the meeting for facts', async () => {
    const response = await request(harness.server)
      .post(`/api/v1/meetings/${meetingId}/chats/${chatId}`)
      .set(...bearer(account.accessToken))
      .send({ question: 'Скільки тривала зустріч?' })
      .expect(200);

    const frames = parseSse(response.text);

    expect(frames.filter((frame) => frame.event === 'delta')).toHaveLength(2);
    expect(frames.at(-1)?.data.usage).toMatchObject({ inputTokens: 200 });
    expect(provider.requests[1]?.items).toMatchObject([
      { kind: 'toolResult', callId: 'call-1' },
    ]);
    expect(provider.requests[1]?.continueFrom).toBe('response-1');
  });

  it('names the chat after the first question and keeps the exchange', async () => {
    const [chats, messages] = await Promise.all([
      request(harness.server)
        .get(`/api/v1/meetings/${meetingId}/chats`)
        .set(...bearer(account.accessToken))
        .expect(200),
      request(harness.server)
        .get(`/api/v1/meetings/${meetingId}/chats/${chatId}`)
        .set(...bearer(account.accessToken))
        .expect(200),
    ]);

    expect(chats.body).toMatchObject([
      { id: chatId, title: 'Скільки тривала зустріч?', messageCount: 1 },
    ]);
    expect(messages.body).toMatchObject([
      { question: 'Скільки тривала зустріч?', answer: 'Зустріч тривала менше хвилини.' },
    ]);
  });

  it('keeps the first name when the same chat is asked again', async () => {
    await request(harness.server)
      .post(`/api/v1/meetings/${meetingId}/chats/${chatId}`)
      .set(...bearer(account.accessToken))
      .send({ question: 'А хто говорив більше?' })
      .expect(200);

    const chats = await request(harness.server)
      .get(`/api/v1/meetings/${meetingId}/chats`)
      .set(...bearer(account.accessToken))
      .expect(200);

    expect(chats.body).toMatchObject([
      { id: chatId, title: 'Скільки тривала зустріч?', messageCount: 2 },
    ]);
  });

  it('finds a chat by what was asked inside it', async () => {
    const [found, missing] = await Promise.all([
      request(harness.server)
        .get(`/api/v1/meetings/${meetingId}/chats?query=тривала`)
        .set(...bearer(account.accessToken))
        .expect(200),
      request(harness.server)
        .get(`/api/v1/meetings/${meetingId}/chats?query=реліз`)
        .set(...bearer(account.accessToken))
        .expect(200),
    ]);

    expect(found.body).toHaveLength(1);
    expect(missing.body).toHaveLength(0);
  });

  it('refuses to delete a chat for anybody but the owner', async () => {
    await request(harness.server)
      .delete(`/api/v1/meetings/${meetingId}/chats/${chatId}`)
      .set(...bearer(intruder.accessToken))
      .expect(404);

    await request(harness.server)
      .get(`/api/v1/meetings/${meetingId}/chats/${chatId}`)
      .set(...bearer(account.accessToken))
      .expect(200);
  });

  it('deletes a chat with everything asked in it', async () => {
    await request(harness.server)
      .delete(`/api/v1/meetings/${meetingId}/chats/${chatId}`)
      .set(...bearer(account.accessToken))
      .expect(200);

    const [chats, gone] = await Promise.all([
      request(harness.server)
        .get(`/api/v1/meetings/${meetingId}/chats`)
        .set(...bearer(account.accessToken))
        .expect(200),
      request(harness.server)
        .get(`/api/v1/meetings/${meetingId}/chats/${chatId}`)
        .set(...bearer(account.accessToken))
        .expect(404),
    ]);

    expect(chats.body).toHaveLength(0);
    expect(gone.body).toMatchObject({ statusCode: 404 });
  });

  it('keeps chats of one meeting out of another', async () => {
    const other = await request(harness.server)
      .post('/api/v1/meetings')
      .set(...bearer(account.accessToken))
      .send({ profile: 'daily', language: 'uk' })
      .expect(201);

    await request(harness.server)
      .get(`/api/v1/meetings/${(other.body as { id: string }).id}/chats/${chatId}`)
      .set(...bearer(account.accessToken))
      .expect(404);
  });
});
