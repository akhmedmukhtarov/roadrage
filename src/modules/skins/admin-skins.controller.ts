import { ApiStandardResponse } from '@common/decorators/api-standard-response.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSkinDto } from './dto/create-skin.dto';
import { UpdateSkinDto } from './dto/update-skin.dto';
import { AdminSkinEntity } from './entities';
import { SkinsService } from './skins.service';

@ApiTags('Admin: skins')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/skins')
export class AdminSkinsController {
  constructor(private readonly skinsService: SkinsService) {}

  @Get()
  @ApiOperation({ summary: 'All skins, including hidden ones' })
  @ApiStandardResponse(AdminSkinEntity, { isArray: true })
  list() {
    return this.skinsService.adminList();
  }

  @Post()
  @ApiOperation({
    summary: 'Create a skin. Price 0 makes it free',
    description: 'Upload the image first with POST /files/upload.',
  })
  @ApiStandardResponse(AdminSkinEntity, { status: 201 })
  create(@Body() dto: CreateSkinDto) {
    return this.skinsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Change name, price, visibility or image',
    description:
      'Send only the fields to change. `isActive: false` hides the skin from the shop; owners keep it.',
  })
  @ApiStandardResponse(AdminSkinEntity)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSkinDto) {
    return this.skinsService.update(id, dto);
  }
}
