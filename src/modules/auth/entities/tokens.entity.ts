import { ApiProperty } from '@nestjs/swagger';

export class TokensEntity {
  @ApiProperty({
    description:
      'Short-lived JWT for the Authorization header and the socket handshake',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Long-lived JWT, only accepted by POST /auth/refresh',
  })
  refreshToken: string;
}
