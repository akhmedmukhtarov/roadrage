import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateReactionDto {
  @ApiProperty({ example: 'Thumbs up', minLength: 1, maxLength: 50 })
  @IsString()
  @Length(1, 50)
  name: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Id of an image uploaded via POST /files/upload',
  })
  @IsUUID()
  iconFileId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Id of a Lottie JSON uploaded via POST /files/upload. null = no animation',
  })
  @ValidateIf((dto: CreateReactionDto) => dto.animationFileId != null)
  @IsUUID()
  animationFileId?: string | null;

  @ApiProperty({
    example: 5,
    minimum: -10,
    maximum: 10,
    description: 'What it does to the rated driver: -10 worst, 10 best',
  })
  @IsInt()
  @Min(-10)
  @Max(10)
  rating: number;
}
