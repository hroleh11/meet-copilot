import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import { ObjectStorage, type StoredObject } from './object-storage';

const REGION = 'auto';

@Injectable()
export class R2ObjectStorage extends ObjectStorage {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor(configService: ConfigService<Env, true>) {
    super();

    this.bucket = configService.getOrThrow<string>('R2_BUCKET');
    this.client = new S3Client({
      region: REGION,
      endpoint: configService.getOrThrow<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: configService.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: configService.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  async put(object: StoredObject): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: object.key,
        Body: object.bytes,
        ContentType: object.mimeType,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
