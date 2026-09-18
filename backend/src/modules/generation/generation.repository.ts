import { Injectable } from '@nestjs/common';
import type { Generation } from '~/generated/prisma/client';
import type { GenerationMode } from '~/generated/prisma/enums';
import { PrismaService } from '~/infrastructure/prisma';

@Injectable()
export class GenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    meetingId: string;
    mode: GenerationMode;
    output: string;
    stopReason: string | null;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  }): Promise<Generation> {
    return this.prisma.generation.create({ data });
  }
}
