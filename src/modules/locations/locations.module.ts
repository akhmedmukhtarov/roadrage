import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module';
import { LocationsGateway } from './locations.gateway';
import { LocationsService } from './locations.service';

@Module({
  imports: [AuthModule],
  providers: [LocationsGateway, LocationsService],
})
export class LocationsModule {}
