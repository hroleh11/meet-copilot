import type { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import type { Resource } from '~/generated/prisma/client';
import { ObjectStorage, type StoredObject } from '~/infrastructure/storage';
import type { ResourceDigester } from './resource.digester';
import { ResourceExtractor } from './resource.extractor';
import { ResourceIngestor } from './resource.ingestor';
import type { ResourcesRepository } from './resources.repository';

const config = { getOrThrow: () => 200_000 } as unknown as ConfigService<Env, true>;

const resource = (over: Partial<Resource> = {}): Resource =>
  ({
    id: 'res-1',
    userId: 'owner',
    scope: 'user',
    kind: 'markdown',
    name: 'cv.md',
    mimeType: 'text/markdown',
    storageKey: 'users/owner/resources/res-1',
    status: 'pending',
    failure: null,
    ...over,
  }) as Resource;

class FakeStorage extends ObjectStorage {
  broken = false;
  readonly stored: string[] = [];

  put(object: StoredObject): Promise<void> {
    if (this.broken) {
      return Promise.reject(new Error('getaddrinfo ENOTFOUND'));
    }

    this.stored.push(object.key);

    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

function build(): {
  ingestor: ResourceIngestor;
  storage: FakeStorage;
  written: Partial<Resource>[];
} {
  const storage = new FakeStorage();
  const written: Partial<Resource>[] = [];
  const repository = {
    update: (_id: string, data: Partial<Resource>) => {
      written.push(data);

      return Promise.resolve(resource(data));
    },
  } as unknown as ResourcesRepository;
  const digester = { digest: () => Promise.resolve(null) } as unknown as ResourceDigester;

  return {
    ingestor: new ResourceIngestor(
      storage,
      new ResourceExtractor(config),
      digester,
      repository,
    ),
    storage,
    written,
  };
}

describe('ResourceIngestor', () => {
  it('keeps the text and the original of a material it could read', async () => {
    const { ingestor, storage, written } = build();

    await ingestor.ingest(resource(), Buffer.from('# Резюме\n\nRust'));

    expect(storage.stored).toEqual(['users/owner/resources/res-1']);
    expect(written[0]).toMatchObject({ status: 'ready', text: '# Резюме\n\nRust' });
  });

  it('blames the file store rather than the document when the store is down', async () => {
    const { ingestor, storage, written } = build();
    storage.broken = true;

    await ingestor.ingest(resource(), Buffer.from('# Резюме'));

    expect(written[0]).toMatchObject({ status: 'failed', failure: 'storage' });
  });

  it('blames the document when there is no text in it', async () => {
    const { ingestor, written } = build();

    await ingestor.ingest(resource(), Buffer.from('   \n\n  '));

    expect(written[0]).toMatchObject({ status: 'failed', failure: 'no_text_layer' });
  });
});
