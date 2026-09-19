import request from 'supertest';
import { ObjectStorage, type StoredObject } from '~/infrastructure/storage';
import { AppHarness, bearer, type TestAccount } from './app-harness';

class FakeObjectStorage extends ObjectStorage {
  readonly objects = new Map<string, StoredObject>();

  put(object: StoredObject): Promise<void> {
    this.objects.set(object.key, object);

    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key);

    return Promise.resolve();
  }
}

interface ResourceBody {
  id: string;
  scope: string;
  meetingId: string | null;
  kind: string;
  status: string;
}

interface MeetingBody {
  id: string;
  resources: ResourceBody[];
}

describe('Resources (e2e)', () => {
  const storage = new FakeObjectStorage();
  let harness: AppHarness;
  let owner: TestAccount;
  let intruder: TestAccount;
  let stagedId = '';

  const addText = async (
    account: TestAccount,
    body: Record<string, unknown>,
  ): Promise<ResourceBody> => {
    const response = await request(harness.server)
      .post('/api/v1/resources/text')
      .set(...bearer(account.accessToken))
      .send(body)
      .expect(201);

    return response.body as ResourceBody;
  };

  const settled = async (id: string): Promise<ResourceBody> => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const response = await request(harness.server)
        .get(`/api/v1/resources/${id}`)
        .set(...bearer(owner.accessToken))
        .expect(200);

      const resource = response.body as ResourceBody;

      if (resource.status !== 'pending') {
        return resource;
      }

      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    throw new Error(`Material ${id} is still being read`);
  };

  beforeAll(async () => {
    harness = await AppHarness.boot((builder) =>
      builder.overrideProvider(ObjectStorage).useValue(storage),
    );
    owner = await harness.signUp('resource-owner');
    intruder = await harness.signUp('resource-intruder');
  });

  afterAll(async () => {
    await harness.shutdown();
  });

  it('takes pasted text as material of the user level', async () => {
    const resource = await addText(owner, {
      scope: 'user',
      name: 'Про мене',
      text: 'Сім років на Rust і TypeScript.',
    });

    expect(resource).toMatchObject({ scope: 'user', kind: 'text', status: 'ready' });
  });

  it('takes an uploaded markdown file and reads it', async () => {
    const response = await request(harness.server)
      .post('/api/v1/resources')
      .set(...bearer(owner.accessToken))
      .field('scope', 'meeting')
      .field('name', 'Вакансія — Senior Rust.md')
      .attach('file', Buffer.from('# Вакансія\n\nSenior Rust'), {
        filename: 'vacancy.md',
        contentType: 'text/markdown',
      })
      .expect(201);

    stagedId = (response.body as ResourceBody).id;

    expect(response.body).toMatchObject({
      scope: 'meeting',
      kind: 'markdown',
      status: 'pending',
      name: 'Вакансія — Senior Rust.md',
    });
    expect(await settled(stagedId)).toMatchObject({ status: 'ready' });
    expect(storage.objects.size).toBe(1);
  });

  it('refuses a kind it cannot read', async () => {
    await request(harness.server)
      .post('/api/v1/resources')
      .set(...bearer(owner.accessToken))
      .field('scope', 'user')
      .field('name', 'screen.png')
      .attach('file', Buffer.from('binary'), {
        filename: 'screen.png',
        contentType: 'image/png',
      })
      .expect(415);
  });

  it('refuses a project material without a project', async () => {
    await request(harness.server)
      .post('/api/v1/resources/text')
      .set(...bearer(owner.accessToken))
      .send({ scope: 'project', name: 'Опис', text: 'Платіжки' })
      .expect(400);
  });

  it('lists the materials nobody claimed yet', async () => {
    const response = await request(harness.server)
      .get('/api/v1/resources?scope=meeting')
      .set(...bearer(owner.accessToken))
      .expect(200);

    const staged = response.body as ResourceBody[];

    expect(staged.map((resource) => resource.id)).toContain(stagedId);
  });

  it('tells how large a file and how long a text may be', async () => {
    const response = await request(harness.server)
      .get('/api/v1/resources/limits')
      .set(...bearer(owner.accessToken))
      .expect(200);

    expect(response.body).toMatchObject({
      maxBytes: 10_485_760,
      maxTextChars: 1_000,
    });
  });

  it('refuses a text longer than the limit', async () => {
    await request(harness.server)
      .post('/api/v1/resources/text')
      .set(...bearer(owner.accessToken))
      .send({ scope: 'user', name: 'Забагато', text: 'я'.repeat(1_001) })
      .expect(413);
  });

  it('shows what it read out of a material', async () => {
    const response = await request(harness.server)
      .get(`/api/v1/resources/${stagedId}/content`)
      .set(...bearer(owner.accessToken))
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'Вакансія — Senior Rust.md',
      text: '# Вакансія\n\nSenior Rust',
      digest: null,
    });
  });

  it('hides a material from everybody else', async () => {
    await request(harness.server)
      .get(`/api/v1/resources/${stagedId}`)
      .set(...bearer(intruder.accessToken))
      .expect(404);
  });

  it('claims the staged materials when the meeting starts', async () => {
    const started = await request(harness.server)
      .post('/api/v1/meetings')
      .set(...bearer(owner.accessToken))
      .send({ profile: 'interview_candidate', language: 'uk', resourceIds: [stagedId] })
      .expect(201);

    const meetingId = (started.body as MeetingBody).id;

    await request(harness.server)
      .post(`/api/v1/meetings/${meetingId}/finish`)
      .set(...bearer(owner.accessToken))
      .expect(201);

    const details = await request(harness.server)
      .get(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(owner.accessToken))
      .expect(200);

    expect((details.body as MeetingBody).resources).toHaveLength(1);
    expect((details.body as MeetingBody).resources[0]).toMatchObject({
      id: stagedId,
      meetingId,
    });
  });

  it('refuses to start a meeting on somebody else’s material', async () => {
    const theirs = await addText(intruder, {
      scope: 'meeting',
      name: 'Чуже',
      text: 'Не для цього користувача',
    });

    await request(harness.server)
      .post('/api/v1/meetings')
      .set(...bearer(owner.accessToken))
      .send({ profile: 'daily', language: 'uk', resourceIds: [theirs.id] })
      .expect(404);
  });

  it('deletes a material together with the file behind it', async () => {
    const resource = await addText(owner, {
      scope: 'user',
      name: 'Зайве',
      text: 'Видалити',
    });

    await request(harness.server)
      .delete(`/api/v1/resources/${resource.id}`)
      .set(...bearer(owner.accessToken))
      .expect(200);

    await request(harness.server)
      .get(`/api/v1/resources/${resource.id}`)
      .set(...bearer(owner.accessToken))
      .expect(404);
  });
});
