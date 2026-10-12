import { ApiStandardResponse } from '@common/decorators/api-standard-response.decorator';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { User } from '@common/decorators/user.decorator';
import type { IUser } from '@common/interfaces/user.interface';
import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { OpenFileDto } from './dto';
import { FileEntity } from './entities';
import { FilesService, MAX_FILE_SIZE } from './files.service';
import type { BufferedFile } from './files.service';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiOperation({
    summary: 'Upload a file',
    description:
      'png, jpeg, webp or a Lottie JSON, up to 5 MB. Returns the id to reference.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiStandardResponse(FileEntity, { status: 201 })
  @Post('upload')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  createFile(
    @UploadedFile() file: BufferedFile | undefined,
    @User() user: IUser,
  ) {
    return this.filesService.upload(file, user.id);
  }

  @Get('open')
  @Public()
  @ApiOperation({ summary: 'Open a file by id' })
  @ApiOkResponse({
    description:
      'The raw file stream (inline or attachment, per `download`) — bypasses the standard API envelope',
    schema: { type: 'string', format: 'binary' },
  })
  open(@Query() query: OpenFileDto, @Res() response: Response) {
    return this.filesService.open(query, response);
  }
}
