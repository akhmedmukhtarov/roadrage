import { ApiProperty } from '@nestjs/swagger';

export class SkinEntity {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Red sport' })
  name: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Load the image from GET /files/open?fileId=',
  })
  imageFileId: string;

  @ApiProperty({ example: 50, description: 'In coins. 0 = free' })
  price: number;

  @ApiProperty({ description: 'The user can select it: free or purchased' })
  owned: boolean;

  @ApiProperty({ description: 'The skin the user currently drives with' })
  selected: boolean;
}

export class AdminSkinEntity {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Red sport' })
  name: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Load the image from GET /files/open?fileId=',
  })
  imageFileId: string;

  @ApiProperty({ example: 50, description: 'In coins. 0 = free' })
  price: number;

  @ApiProperty({ description: 'false = hidden from the shop' })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PurchaseEntity {
  @ApiProperty({ example: 70, description: 'Coin balance after the purchase' })
  coins: number;

  @ApiProperty({ type: SkinEntity })
  skin: SkinEntity;
}

export class SelectedEntity {
  @ApiProperty({
    type: SkinEntity,
    nullable: true,
    description: 'null means the default car',
  })
  skin: SkinEntity | null;
}
