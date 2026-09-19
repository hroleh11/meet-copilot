import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extractText } from 'unpdf';
import type { Env } from '~/common/config';
import { ResourceKind } from '~/generated/prisma/enums';

const KIND_BY_MIME: Record<string, ResourceKind> = {
  'application/pdf': ResourceKind.pdf,
  'text/markdown': ResourceKind.markdown,
  'text/x-markdown': ResourceKind.markdown,
  'text/plain': ResourceKind.text,
};

const KIND_BY_EXTENSION: Record<string, ResourceKind> = {
  pdf: ResourceKind.pdf,
  md: ResourceKind.markdown,
  markdown: ResourceKind.markdown,
  txt: ResourceKind.text,
};

const BLANK_LINES = /\n{3,}/g;

@Injectable()
export class ResourceExtractor {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  kindOf(mimeType: string, name: string): ResourceKind | null {
    const type = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
    const extension = name.split('.').pop()?.toLowerCase() ?? '';

    return KIND_BY_MIME[type] ?? KIND_BY_EXTENSION[extension] ?? null;
  }

  async extract(kind: ResourceKind, bytes: Buffer): Promise<string> {
    const raw = kind === ResourceKind.pdf ? await readPdf(bytes) : bytes.toString('utf8');

    return this.normalize(raw);
  }

  normalize(raw: string): string {
    const text = raw.replace(BLANK_LINES, '\n\n').trim();
    const limit = this.configService.getOrThrow<number>('RESOURCE_EXTRACTED_MAX_CHARS');

    return text.length <= limit ? text : text.slice(0, limit);
  }
}

async function readPdf(bytes: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(bytes), { mergePages: true });

  return text;
}
