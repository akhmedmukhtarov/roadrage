import { ApiProperty } from '@nestjs/swagger';

export class ReactionEntity {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Thumbs up' })
  name: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Load the icon from GET /files/open?fileId=',
  })
  iconFileId: string;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    description:
      'A Lottie JSON to load from GET /files/open?fileId=; null = show the icon still',
  })
  animationFileId: string | null;

  @ApiProperty({
    example: 5,
    minimum: -10,
    maximum: 10,
    description: 'What it does to the rated driver: -10 worst, 10 best',
  })
  rating: number;
}

export class ReactionPackEntity {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Classic' })
  name: string;

  @ApiProperty({ example: 50, description: 'In coins. 0 = free' })
  price: number;

  @ApiProperty({ description: 'The user can use it: free or purchased' })
  owned: boolean;

  @ApiProperty({ type: [ReactionEntity], description: 'Best rating first' })
  reactions: ReactionEntity[];
}

export class AdminReactionPackEntity {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Classic' })
  name: string;

  @ApiProperty({ example: 50, description: 'In coins. 0 = free' })
  price: number;

  @ApiProperty({ description: 'false = hidden from the shop' })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [ReactionEntity], description: 'Best rating first' })
  reactions: ReactionEntity[];
}

export class PackPurchaseEntity {
  @ApiProperty({ example: 70, description: 'Coin balance after the purchase' })
  coins: number;

  @ApiProperty({ type: ReactionPackEntity })
  pack: ReactionPackEntity;
}
