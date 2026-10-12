import { ApiStandardResponse } from '@common/decorators/api-standard-response.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdjustCoinsDto } from './dto/adjust-coins.dto';
import { CoinsEntity } from './entities/coins.entity';
import { UsersService } from './users.service';

@ApiTags('Admin: users')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post(':id/coins')
  @HttpCode(200)
  @ApiOperation({ summary: 'Grant coins to a user, or take them away' })
  @ApiStandardResponse(CoinsEntity)
  adjustCoins(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustCoinsDto,
  ) {
    return this.usersService.adjustCoins(id, dto.amount);
  }
}
