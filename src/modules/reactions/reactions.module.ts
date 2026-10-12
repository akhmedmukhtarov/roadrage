import { FilesModule } from '@modules/files/files.module';
import { Module } from '@nestjs/common';
import { AdminReactionPacksController } from './admin-reaction-packs.controller';
import { ReactionPacksController } from './reaction-packs.controller';
import { ReactionsService } from './reactions.service';

@Module({
  imports: [FilesModule],
  controllers: [ReactionPacksController, AdminReactionPacksController],
  providers: [ReactionsService],
})
export class ReactionsModule {}
