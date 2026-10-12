import { ApiStandardResponse } from '@common/decorators/api-standard-response.decorator';
import { User } from '@common/decorators/user.decorator';
import type { IUser } from '@common/interfaces/user.interface';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SelectSkinDto } from './dto/select-skin.dto';
import { PurchaseEntity, SelectedEntity, SkinEntity } from './entities';
import { SkinsService } from './skins.service';

@ApiTags('Skins')
@ApiBearerAuth()
@Controller('skins')
export class SkinsController {
  constructor(private readonly skinsService: SkinsService) {}

  @Get()
  @ApiOperation({ summary: 'The skin shop: every published skin' })
  @ApiStandardResponse(SkinEntity, { isArray: true })
  catalog(@User() user: IUser) {
    return this.skinsService.catalog(user.id);
  }

  @Get('mine')
  @ApiOperation({
    summary: 'Skins the user can select: free ones and purchased ones',
  })
  @ApiStandardResponse(SkinEntity, { isArray: true })
  available(@User() user: IUser) {
    return this.skinsService.available(user.id);
  }

  @Put('selected')
  @ApiOperation({
    summary: 'Choose the skin to drive with',
    description: 'Pass `skinId: null` to go back to the default car.',
  })
  @ApiStandardResponse(SelectedEntity)
  select(@User() user: IUser, @Body() dto: SelectSkinDto) {
    return this.skinsService.select(user.id, dto.skinId);
  }

  @Post(':id/purchase')
  @HttpCode(200)
  @ApiOperation({ summary: 'Buy a paid skin with coins' })
  @ApiStandardResponse(PurchaseEntity)
  purchase(@User() user: IUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.skinsService.purchase(user.id, id);
  }
}
