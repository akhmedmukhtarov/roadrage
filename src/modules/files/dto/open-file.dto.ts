import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class OpenFileDto {
  @ApiProperty({ title: 'File ID', format: 'uuid' })
  @IsUUID()
  fileId: string;

  @ApiPropertyOptional({
    title: 'Download or open',
    type: 'boolean',
    default: false,
  })
  @IsOptional()
  // read the raw query string: implicit conversion turns "false" into true
  @Transform(({ obj }: { obj: { download?: unknown } }) =>
    obj.download === undefined ? undefined : obj.download === 'true',
  )
  @IsBoolean()
  download?: boolean;
}
