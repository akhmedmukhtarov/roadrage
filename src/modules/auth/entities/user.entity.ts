import { ApiProperty } from '@nestjs/swagger';

export class UserEntity {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'akhmed' })
  username: string;
}
