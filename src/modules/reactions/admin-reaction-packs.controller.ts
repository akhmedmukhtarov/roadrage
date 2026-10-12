import { ApiStandardResponse } from '@common/decorators/api-standard-response.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateReactionPackDto } from './dto/create-reaction-pack.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { UpdateReactionPackDto } from './dto/update-reaction-pack.dto';
import { UpdateReactionDto } from './dto/update-reaction.dto';
import { AdminReactionPackEntity } from './entities';
import { ReactionsService } from './reactions.service';

@ApiTags('Admin: reaction packs')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/reaction-packs')
export class AdminReactionPacksController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Get()
  @ApiOperation({ summary: 'All reaction packs, including hidden ones' })
  @ApiStandardResponse(AdminReactionPackEntity, { isArray: true })
  list() {
    return this.reactionsService.adminList();
  }

  @Post()
  @ApiOperation({
    summary: 'Create an empty reaction pack. Price 0 makes it free',
    description:
      'Add its reactions with POST /admin/reaction-packs/{id}/reactions.',
  })
  @ApiStandardResponse(AdminReactionPackEntity, { status: 201 })
  create(@Body() dto: CreateReactionPackDto) {
    return this.reactionsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Change name, price or visibility',
    description:
      'Send only the fields to change. `isActive: false` hides the pack from the shop; owners keep it.',
  })
  @ApiStandardResponse(AdminReactionPackEntity)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReactionPackDto,
  ) {
    return this.reactionsService.update(id, dto);
  }

  @Post(':id/reactions')
  @ApiOperation({
    summary: 'Add a reaction to the pack',
    description:
      'Upload the icon, and the Lottie animation if there is one, first with POST /files/upload.',
  })
  @ApiStandardResponse(AdminReactionPackEntity, { status: 201 })
  addReaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReactionDto,
  ) {
    return this.reactionsService.addReaction(id, dto);
  }

  @Patch(':id/reactions/:reactionId')
  @ApiOperation({
    summary: 'Change a reaction',
    description:
      'Send only the fields to change. `animationFileId: null` removes the animation.',
  })
  @ApiStandardResponse(AdminReactionPackEntity)
  updateReaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reactionId', ParseUUIDPipe) reactionId: string,
    @Body() dto: UpdateReactionDto,
  ) {
    return this.reactionsService.updateReaction(id, reactionId, dto);
  }

  @Delete(':id/reactions/:reactionId')
  @ApiOperation({ summary: 'Remove a reaction from the pack' })
  @ApiStandardResponse(AdminReactionPackEntity)
  removeReaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reactionId', ParseUUIDPipe) reactionId: string,
  ) {
    return this.reactionsService.removeReaction(id, reactionId);
  }
}
