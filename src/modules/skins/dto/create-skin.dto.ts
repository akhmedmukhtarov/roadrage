import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateSkinDto {
  @ApiProperty({ example: 'Red sport', minLength: 1, maxLength: 50 })
  @IsString()
  @Length(1, 50)
  name: string;

  @ApiProperty({ example: 50, description: 'In coins. 0 = free' })
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  price: number;

  @ApiPropertyOptional({
    default: true,
    description: 'false = created hidden from the shop',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    format: 'uuid',
    description: 'Id of an image uploaded via POST /files/upload',
  })
  @IsUUID()
  imageFileId: string;
}
