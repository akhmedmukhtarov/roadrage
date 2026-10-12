import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Client;
  readonly bucket: string;

  constructor(config: ConfigService) {
    this.client = new Client({
      endPoint: config.getOrThrow<string>('MINIO_ENDPOINT'),
      port: Number(config.get('MINIO_PORT', 9000)),
      useSSL: config.get('MINIO_USE_SSL') === 'true',
      accessKey: config.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: config.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
    this.bucket = config.getOrThrow<string>('MINIO_BUCKET');
  }

  async onModuleInit() {
    try {
      if (!(await this.client.bucketExists(this.bucket))) {
        await this.client.makeBucket(this.bucket);
      }
    } catch (e) {
      this.logger.error(`Could not prepare bucket "${this.bucket}"`, e);
    }
  }

  async upload(objectName: string, buffer: Buffer, type: string) {
    await this.client.putObject(
      this.bucket,
      objectName,
      buffer,
      buffer.length,
      {
        'Content-Type': type,
      },
    );
  }

  getObject(bucket: string, objectName: string): Promise<Readable> {
    return this.client.getObject(bucket, objectName);
  }
}
