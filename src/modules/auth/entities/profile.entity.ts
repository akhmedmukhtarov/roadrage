import { Role } from '@common/services/database/enums';
import { ApiProperty } from '@nestjs/swagger';

export class SelectedSkinEntity {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Red sport' })
  name: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Load the image from GET /files/open?fileId=',
  })
  imageFileId: string;
}

export class ProfileEntity {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'akhmed' })
  username: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty({ example: 120, description: 'Coin balance' })
  coins: number;

  @ApiProperty({
    type: SelectedSkinEntity,
    nullable: true,
    description: 'null means the default car',
  })
  selectedSkin: SelectedSkinEntity | null;
}
