import { ApiProperty } from '@nestjs/swagger';

export class CoinsEntity {
  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty({ example: 120, description: 'Balance after the change' })
  coins: number;
}
