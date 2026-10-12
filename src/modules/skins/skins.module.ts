import { FilesModule } from '@modules/files/files.module';
import { LocationsModule } from '@modules/locations/locations.module';
import { Module } from '@nestjs/common';
import { AdminSkinsController } from './admin-skins.controller';
import { SkinsController } from './skins.controller';
import { SkinsService } from './skins.service';

@Module({
  imports: [FilesModule, LocationsModule],
  controllers: [SkinsController, AdminSkinsController],
  providers: [SkinsService],
})
export class SkinsModule {}
