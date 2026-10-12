import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateReactionPackDto {
  @ApiProperty({ example: 'Classic', minLength: 1, maxLength: 50 })
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
}
