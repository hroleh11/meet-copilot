import type { ResourceScope } from '~/generated/prisma/enums';

export interface ResourceUpload {
  mimeType: string;
  bytes: Buffer;
}

export interface BriefSource {
  name: string;
  body: string;
}

export type BriefLevels = Record<ResourceScope, BriefSource[]>;
