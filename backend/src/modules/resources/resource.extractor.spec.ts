import type { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import { ResourceKind } from '~/generated/prisma/enums';
import { ResourceExtractor } from './resource.extractor';

const config = (maxChars: number): ConfigService<Env, true> =>
  ({ getOrThrow: () => maxChars }) as unknown as ConfigService<Env, true>;

describe('ResourceExtractor', () => {
  const extractor = new ResourceExtractor(config(1_000));

  it('reads the kind from the media type', () => {
    expect(extractor.kindOf('application/pdf', 'cv')).toBe(ResourceKind.pdf);
    expect(extractor.kindOf('text/markdown; charset=utf-8', 'brief')).toBe(
      ResourceKind.markdown,
    );
    expect(extractor.kindOf('text/plain', 'notes')).toBe(ResourceKind.text);
  });

  it('falls back to the extension when the media type says nothing', () => {
    expect(extractor.kindOf('application/octet-stream', 'brief.md')).toBe(
      ResourceKind.markdown,
    );
    expect(extractor.kindOf('application/octet-stream', 'cv.pdf')).toBe(ResourceKind.pdf);
  });

  it('refuses a kind it cannot read', () => {
    expect(extractor.kindOf('image/png', 'screen.png')).toBeNull();
  });

  it('decodes text and collapses the blank lines', async () => {
    const text = await extractor.extract(
      ResourceKind.markdown,
      Buffer.from('# Резюме\n\n\n\nRust\n'),
    );

    expect(text).toBe('# Резюме\n\nRust');
  });

  it('cuts what is longer than the limit', () => {
    expect(new ResourceExtractor(config(5)).normalize('abcdefgh')).toBe('abcde');
  });
});
