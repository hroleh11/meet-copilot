import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import type { Env } from '~/common/config';
import { ProjectsModule } from '~/modules/projects';
import { UsageModule } from '~/modules/usage';
import { ContextBriefBuilder } from './context-brief.builder';
import { ResourceDigester } from './resource.digester';
import { ResourceExtractor } from './resource.extractor';
import { ResourceIngestor } from './resource.ingestor';
import { ResourceLevels } from './resource.levels';
import { ResourcesController } from './resources.controller';
import { ResourcesRepository } from './resources.repository';
import { ResourcesService } from './resources.service';
import { StagedResourcesSweeper } from './staged-resources.sweeper';

@Module({
  imports: [
    ProjectsModule,
    UsageModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        limits: { fileSize: configService.getOrThrow<number>('RESOURCE_MAX_BYTES') },
      }),
    }),
  ],
  controllers: [ResourcesController],
  providers: [
    ResourcesService,
    ResourcesRepository,
    ResourceIngestor,
    ResourceExtractor,
    ResourceDigester,
    ResourceLevels,
    ContextBriefBuilder,
    StagedResourcesSweeper,
  ],
  exports: [ResourcesService, StagedResourcesSweeper],
})
export class ResourcesModule {}
