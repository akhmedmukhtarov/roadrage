import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FileEntity {
  @ApiProperty({ format: 'uuid', description: 'Pass to GET /files/open' })
  id: string;

  @ApiProperty({ description: 'MIME type', example: 'image/png' })
  type: string;

  @ApiProperty({ description: 'Original filename' })
  name: string;

  @ApiProperty({ description: 'Size in bytes' })
  size: number;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  createdById: string | null;

  @ApiProperty()
  createdAt: Date;
}
