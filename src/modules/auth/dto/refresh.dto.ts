import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    description: 'The refresh token from register, login or the last refresh',
  })
  @IsJWT()
  refreshToken: string;
}
