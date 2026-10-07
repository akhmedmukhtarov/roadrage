import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CredentialsDto {
  @ApiProperty({
    example: 'akhmed',
    description: 'Unique, case-insensitive. 3-24 chars of a-z, 0-9, _ or .',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @Matches(/^[a-z0-9_.]{3,24}$/, {
    message: 'username must be 3-24 chars of a-z, 0-9, _ or .',
  })
  username: string;

  @ApiProperty({ example: 'secret123', minLength: 6, maxLength: 72 })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;
}
