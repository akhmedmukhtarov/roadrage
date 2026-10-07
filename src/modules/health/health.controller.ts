import { Public } from '@common/decorators/public.decorator';
import { Database } from '@common/services/database/database.service';
import { RedisService } from '@common/services/redis/redis.service';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { sql } from 'kysely';

@ApiTags('Health')
@Controller('health-check')
export class HealthController {
  constructor(
    private readonly db: Database,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Checks that Postgres and Redis are reachable' })
  async check() {
    await Promise.all([sql`select 1`.execute(this.db), this.redis.ping()]);
    return { status: 'ok' };
  }
}
