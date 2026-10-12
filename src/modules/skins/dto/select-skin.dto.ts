import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';

export class SelectSkinDto {
  @ApiProperty({
    format: 'uuid',
    nullable: true,
    description: 'A free or purchased skin, or null for the default car',
  })
  @ValidateIf((dto: SelectSkinDto) => dto.skinId !== null)
  @IsUUID()
  skinId: string | null;
}
