import { ApiStandardResponse } from '@common/decorators/api-standard-response.decorator';
import { User } from '@common/decorators/user.decorator';
import type { IUser } from '@common/interfaces/user.interface';
import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PackPurchaseEntity, ReactionPackEntity } from './entities';
import { ReactionsService } from './reactions.service';

@ApiTags('Reaction packs')
@ApiBearerAuth()
@Controller('reaction-packs')
export class ReactionPacksController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Get()
  @ApiOperation({ summary: 'The reaction shop: every published pack' })
  @ApiStandardResponse(ReactionPackEntity, { isArray: true })
  catalog(@User() user: IUser) {
    return this.reactionsService.catalog(user.id);
  }

  @Get('mine')
  @ApiOperation({
    summary: 'Packs the user can react with: free ones and purchased ones',
  })
  @ApiStandardResponse(ReactionPackEntity, { isArray: true })
  available(@User() user: IUser) {
    return this.reactionsService.available(user.id);
  }

  @Post(':id/purchase')
  @HttpCode(200)
  @ApiOperation({ summary: 'Buy a paid reaction pack with coins' })
  @ApiStandardResponse(PackPurchaseEntity)
  purchase(@User() user: IUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.reactionsService.purchase(user.id, id);
  }
}
