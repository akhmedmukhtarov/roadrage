import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { DB } from './types';

@Injectable()
export class Database extends Kysely<DB> implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
        }),
      }),
    });
  }

  async onModuleDestroy() {
    await this.destroy();
  }
}
