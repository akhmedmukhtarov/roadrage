import { ErrorCodes } from '@common/constants/error-codes';
import { Database } from '@common/services/database/database.service';
import { MinioService } from '@common/services/minio/minio.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { extname } from 'path';
import { Readable } from 'stream';
import { OpenFileDto } from './dto';
import { FileEntity } from './entities';

export interface BufferedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
// Lottie animations
export const ANIMATION_TYPES = ['application/json'];

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly db: Database,
    private readonly minio: MinioService,
  ) {}

  async upload(
    file: BufferedFile | undefined,
    userId: string,
  ): Promise<FileEntity> {
    if (!file) {
      throw new BadRequestException({
        message: 'file is required',
        code: ErrorCodes.INVALID_FILE,
      });
    }
    // /files/open is public and serves the stored type inline, so only types
    // a browser will not execute
    if (
      !IMAGE_TYPES.includes(file.mimetype) &&
      !(ANIMATION_TYPES.includes(file.mimetype) && this.isJson(file.buffer))
    ) {
      throw new BadRequestException({
        message: 'file must be a png, jpeg or webp image, or a Lottie JSON',
        code: ErrorCodes.INVALID_FILE,
      });
    }

    // The database entry is created first: its id names the object
    const record = await this.db
      .insertInto('files')
      .values({
        type: file.mimetype,
        name: file.originalname,
        size: file.buffer.length,
        bucket_name: this.minio.bucket,
        created_by: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    try {
      await this.minio.upload(
        this.objectName(record),
        file.buffer,
        record.type,
      );
    } catch (e) {
      // roll back the entry so no id points at a missing object
      await this.db.deleteFrom('files').where('id', '=', record.id).execute();
      this.logger.error(`Upload of ${record.name} failed`, e);
      throw new InternalServerErrorException('File upload failed.');
    }

    return {
      id: record.id,
      type: record.type,
      name: record.name,
      size: record.size,
      createdById: record.created_by,
      createdAt: record.created_at,
    };
  }

  /** Streams the file itself, bypassing the standard API envelope. */
  async open(dto: OpenFileDto, response: Response): Promise<void> {
    const file = await this.db
      .selectFrom('files')
      .selectAll()
      .where('id', '=', dto.fileId)
      .executeTakeFirst();
    if (!file) throw this.notFound();

    let stream: Readable;
    try {
      stream = await this.minio.getObject(
        file.bucket_name,
        this.objectName(file),
      );
    } catch (e) {
      this.logger.error(`Object of file ${file.id} is missing`, e);
      throw this.notFound();
    }

    const disposition = dto.download ? 'attachment' : 'inline';
    response.status(200).set({
      'Content-Type': file.type,
      'Content-Length': `${file.size}`,
      // a file never changes under its id
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    });

    stream.on('error', () => {
      if (!response.headersSent) response.status(500);
      response.end();
    });
    stream.pipe(response);
  }

  /** Throws unless the id is an uploaded image. */
  assertImage(fileId: string, field = 'imageFileId'): Promise<void> {
    return this.assertType(fileId, IMAGE_TYPES, `${field} must be an image`);
  }

  /** Throws unless the id is an uploaded Lottie JSON. */
  assertAnimation(fileId: string, field = 'animationFileId'): Promise<void> {
    return this.assertType(
      fileId,
      ANIMATION_TYPES,
      `${field} must be a Lottie JSON`,
    );
  }

  private async assertType(
    fileId: string,
    types: string[],
    message: string,
  ): Promise<void> {
    const file = await this.db
      .selectFrom('files')
      .select('type')
      .where('id', '=', fileId)
      .executeTakeFirst();
    if (!file || !types.includes(file.type)) {
      throw new BadRequestException({
        message: `${message} uploaded via /files/upload`,
        code: ErrorCodes.INVALID_FILE,
      });
    }
  }

  private isJson(buffer: Buffer): boolean {
    try {
      JSON.parse(buffer.toString('utf8'));
      return true;
    } catch {
      return false;
    }
  }

  private objectName(file: { id: string; name: string }): string {
    return `${file.id}${extname(file.name)}`;
  }

  private notFound() {
    return new NotFoundException({
      message: 'File not found',
      code: ErrorCodes.FILE_NOT_FOUND,
    });
  }
}
