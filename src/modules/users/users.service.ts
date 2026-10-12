import { ErrorCodes } from '@common/constants/error-codes';
import { Database } from '@common/services/database/database.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoinsEntity } from './entities/coins.entity';

@Injectable()
export class UsersService {
  constructor(private readonly db: Database) {}

  /** Changes the balance and records it in the ledger. Never goes below 0. */
  adjustCoins(userId: string, amount: number): Promise<CoinsEntity> {
    return this.db.transaction().execute(async (trx) => {
      const user = await trx
        .updateTable('users')
        .set((eb) => ({ coins: eb('coins', '+', amount) }))
        .where('id', '=', userId)
        .where((eb) => eb(eb('coins', '+', amount), '>=', 0))
        .returning('coins')
        .executeTakeFirst();

      if (!user) {
        const exists = await trx
          .selectFrom('users')
          .select('id')
          .where('id', '=', userId)
          .executeTakeFirst();
        if (!exists) {
          throw new NotFoundException({
            message: 'User not found',
            code: ErrorCodes.USER_NOT_FOUND,
          });
        }
        throw new BadRequestException({
          message: 'The user does not have that many coins',
          code: ErrorCodes.INSUFFICIENT_COINS,
        });
      }

      await trx
        .insertInto('coin_transactions')
        .values({ user_id: userId, amount, reason: 'ADMIN_GRANT' })
        .execute();

      return { userId, coins: user.coins };
    });
  }
}
