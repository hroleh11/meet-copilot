import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Env } from '~/common/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const env = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix(env.getOrThrow<string>('API_PREFIX'));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: env.getOrThrow<string>('FRONTEND_URL'),
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    credentials: true,
  });

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Meet Copilot API')
      .setDescription('Meetings, transcripts and reply generation')
      .setVersion('0.1.0')
      .build(),
  );
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'docs-json',
  });

  await app.listen(env.getOrThrow<number>('PORT'));
}

void bootstrap();
