import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min, NotEquals } from 'class-validator';

export class AdjustCoinsDto {
  @ApiProperty({
    example: 100,
    description: 'Positive to grant, negative to take away',
  })
  @IsInt()
  @NotEquals(0)
  @Min(-1_000_000)
  @Max(1_000_000)
  amount: number;
}
