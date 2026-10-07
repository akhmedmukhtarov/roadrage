import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class NearbyDto {
  /** Metres. Capped by the grid: only the own bbox and its neighbours are searched. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  radius?: number;
}
