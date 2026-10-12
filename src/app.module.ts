import { AuthGuard } from '@common/guards/auth.guard';
import { DatabaseModule } from '@common/services/database/database.module';
import { MinioModule } from '@common/services/minio/minio.module';
import { RedisModule } from '@common/services/redis/redis.module';
import { AuthModule } from '@modules/auth/auth.module';
import { FilesModule } from '@modules/files/files.module';
import { HealthModule } from '@modules/health/health.module';
import { LocationsModule } from '@modules/locations/locations.module';
import { ReactionsModule } from '@modules/reactions/reactions.module';
import { SkinsModule } from '@modules/skins/skins.module';
import { UsersModule } from '@modules/users/users.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    RedisModule,
    MinioModule,
    AuthModule,
    FilesModule,
    HealthModule,
    LocationsModule,
    ReactionsModule,
    SkinsModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
