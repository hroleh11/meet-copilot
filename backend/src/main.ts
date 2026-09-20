import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Env } from '~/common/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();

  const env = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix(env.getOrThrow<string>('API_PREFIX'));

  const limit = env.getOrThrow<number>('MAX_REQUEST_BODY_BYTES');
  app.useBodyParser('json', { limit });
  app.useBodyParser('urlencoded', { limit, extended: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Cueline API')
      .setDescription('Meetings, transcripts and reply generation')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'docs-json',
  });

  await app.listen(env.getOrThrow<number>('PORT'));
}

void bootstrap();
