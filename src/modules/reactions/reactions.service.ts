import { ErrorCodes } from '@common/constants/error-codes';
import { Database } from '@common/services/database/database.service';
import { FilesService } from '@modules/files/files.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReactionPackDto } from './dto/create-reaction-pack.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { UpdateReactionPackDto } from './dto/update-reaction-pack.dto';
import { UpdateReactionDto } from './dto/update-reaction.dto';
import {
  AdminReactionPackEntity,
  PackPurchaseEntity,
  ReactionEntity,
  ReactionPackEntity,
} from './entities';

interface PackRow {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ReactionsService {
  constructor(
    private readonly db: Database,
    private readonly filesService: FilesService,
  ) {}

  // ---- users

  /** Everything in the shop. */
  catalog(userId: string): Promise<ReactionPackEntity[]> {
    return this.listFor(userId, 'catalog');
  }

  /** What the user can react with: free packs plus the ones they bought. */
  available(userId: string): Promise<ReactionPackEntity[]> {
    return this.listFor(userId, 'available');
  }

  async purchase(userId: string, packId: string): Promise<PackPurchaseEntity> {
    const { coins, pack } = await this.db.transaction().execute(async (trx) => {
      const pack = await trx
        .selectFrom('reaction_packs')
        .selectAll()
        .where('id', '=', packId)
        .where('is_active', '=', true)
        .executeTakeFirst();
      if (!pack) throw this.packNotFound();
      if (pack.price === 0) {
        throw new BadRequestException({
          message: 'This reaction pack is free',
          code: ErrorCodes.REACTION_PACK_IS_FREE,
        });
      }

      // A concurrent purchase of the same pack waits here, then sees the row
      const owned = await trx
        .insertInto('user_reaction_packs')
        .values({ user_id: userId, pack_id: packId, price_paid: pack.price })
        .onConflict((oc) => oc.doNothing())
        .returning('pack_id')
        .executeTakeFirst();
      if (!owned) {
        throw new ConflictException({
          message: 'You already own this reaction pack',
          code: ErrorCodes.REACTION_PACK_ALREADY_OWNED,
        });
      }

      // Throwing rolls back the ownership row above
      const user = await trx
        .updateTable('users')
        .set((eb) => ({ coins: eb('coins', '-', pack.price) }))
        .where('id', '=', userId)
        .where('coins', '>=', pack.price)
        .returning('coins')
        .executeTakeFirst();
      if (!user) {
        throw new BadRequestException({
          message: 'Not enough coins',
          code: ErrorCodes.INSUFFICIENT_COINS,
        });
      }

      await trx
        .insertInto('coin_transactions')
        .values({
          user_id: userId,
          amount: -pack.price,
          reason: 'REACTION_PACK_PURCHASE',
          reaction_pack_id: packId,
        })
        .execute();

      return { coins: user.coins, pack };
    });

    const reactions = await this.reactionsOf([pack.id]);
    return { coins, pack: this.toEntity(pack, true, reactions.get(pack.id)) };
  }

  // ---- admins

  async adminList(): Promise<AdminReactionPackEntity[]> {
    const rows = await this.db
      .selectFrom('reaction_packs')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();
    const reactions = await this.reactionsOf(rows.map((row) => row.id));
    return rows.map((row) => this.toAdminEntity(row, reactions.get(row.id)));
  }

  async create(dto: CreateReactionPackDto): Promise<AdminReactionPackEntity> {
    const row = await this.db
      .insertInto('reaction_packs')
      .values({
        name: dto.name,
        price: dto.price,
        is_active: dto.isActive ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.toAdminEntity(row);
  }

  async update(
    id: string,
    dto: UpdateReactionPackDto,
  ): Promise<AdminReactionPackEntity> {
    const row = await this.db
      .updateTable('reaction_packs')
      .set({
        name: dto.name,
        price: dto.price,
        is_active: dto.isActive,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    if (!row) throw this.packNotFound();
    return this.adminPack(row);
  }

  async addReaction(
    packId: string,
    dto: CreateReactionDto,
  ): Promise<AdminReactionPackEntity> {
    const pack = await this.findPack(packId);
    await this.assertFiles(dto);
    await this.db
      .insertInto('reactions')
      .values({
        pack_id: packId,
        name: dto.name,
        icon_file_id: dto.iconFileId,
        animation_file_id: dto.animationFileId ?? null,
        rating: dto.rating,
      })
      .execute();
    return this.adminPack(pack);
  }

  async updateReaction(
    packId: string,
    reactionId: string,
    dto: UpdateReactionDto,
  ): Promise<AdminReactionPackEntity> {
    const pack = await this.findPack(packId);
    await this.assertFiles(dto);
    const row = await this.db
      .updateTable('reactions')
      .set({
        name: dto.name,
        icon_file_id: dto.iconFileId,
        // undefined leaves the animation alone, null removes it
        animation_file_id: dto.animationFileId,
        rating: dto.rating,
        updated_at: new Date(),
      })
      .where('id', '=', reactionId)
      .where('pack_id', '=', packId)
      .returning('id')
      .executeTakeFirst();
    if (!row) throw this.reactionNotFound();
    return this.adminPack(pack);
  }

  async removeReaction(
    packId: string,
    reactionId: string,
  ): Promise<AdminReactionPackEntity> {
    const pack = await this.findPack(packId);
    const row = await this.db
      .deleteFrom('reactions')
      .where('id', '=', reactionId)
      .where('pack_id', '=', packId)
      .returning('id')
      .executeTakeFirst();
    if (!row) throw this.reactionNotFound();
    return this.adminPack(pack);
  }

  // ---- helpers

  private async listFor(
    userId: string,
    scope: 'catalog' | 'available',
  ): Promise<ReactionPackEntity[]> {
    const rows = await this.db
      .selectFrom('reaction_packs as p')
      .leftJoin('user_reaction_packs as up', (join) =>
        join.onRef('up.pack_id', '=', 'p.id').on('up.user_id', '=', userId),
      )
      .selectAll('p')
      .select('up.pack_id as purchased_id')
      .where((eb) =>
        scope === 'catalog'
          ? eb('p.is_active', '=', true)
          : eb.or([
              eb('up.pack_id', 'is not', null),
              eb.and([eb('p.price', '=', 0), eb('p.is_active', '=', true)]),
            ]),
      )
      .orderBy('p.price')
      .orderBy('p.created_at')
      .execute();
    const reactions = await this.reactionsOf(rows.map((row) => row.id));
    return rows.map((row) =>
      this.toEntity(
        row,
        this.isOwned(row, row.purchased_id),
        reactions.get(row.id),
      ),
    );
  }

  /** Reactions of the given packs by pack id, best rating first. */
  private async reactionsOf(
    packIds: string[],
  ): Promise<Map<string, ReactionEntity[]>> {
    const byPack = new Map<string, ReactionEntity[]>();
    if (packIds.length === 0) return byPack;

    const rows = await this.db
      .selectFrom('reactions')
      .selectAll()
      .where('pack_id', 'in', packIds)
      .orderBy('rating', 'desc')
      .orderBy('created_at')
      .execute();
    for (const row of rows) {
      const reactions = byPack.get(row.pack_id) ?? [];
      reactions.push({
        id: row.id,
        name: row.name,
        iconFileId: row.icon_file_id,
        animationFileId: row.animation_file_id,
        rating: row.rating,
      });
      byPack.set(row.pack_id, reactions);
    }
    return byPack;
  }

  private async findPack(id: string): Promise<PackRow> {
    const pack = await this.db
      .selectFrom('reaction_packs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (!pack) throw this.packNotFound();
    return pack;
  }

  private async adminPack(pack: PackRow): Promise<AdminReactionPackEntity> {
    const reactions = await this.reactionsOf([pack.id]);
    return this.toAdminEntity(pack, reactions.get(pack.id));
  }

  private async assertFiles(dto: UpdateReactionDto): Promise<void> {
    if (dto.iconFileId) {
      await this.filesService.assertImage(dto.iconFileId, 'iconFileId');
    }
    if (dto.animationFileId) {
      await this.filesService.assertAnimation(dto.animationFileId);
    }
  }

  /** Purchased, or free and still in the shop. */
  private isOwned(pack: PackRow, purchasedId: string | null): boolean {
    return purchasedId !== null || (pack.price === 0 && pack.is_active);
  }

  private toEntity(
    pack: PackRow,
    owned: boolean,
    reactions: ReactionEntity[] = [],
  ): ReactionPackEntity {
    return {
      id: pack.id,
      name: pack.name,
      price: pack.price,
      owned,
      reactions,
    };
  }

  private toAdminEntity(
    pack: PackRow,
    reactions: ReactionEntity[] = [],
  ): AdminReactionPackEntity {
    return {
      id: pack.id,
      name: pack.name,
      price: pack.price,
      isActive: pack.is_active,
      createdAt: pack.created_at,
      updatedAt: pack.updated_at,
      reactions,
    };
  }

  private packNotFound() {
    return new NotFoundException({
      message: 'Reaction pack not found',
      code: ErrorCodes.REACTION_PACK_NOT_FOUND,
    });
  }

  private reactionNotFound() {
    return new NotFoundException({
      message: 'Reaction not found',
      code: ErrorCodes.REACTION_NOT_FOUND,
    });
  }
}
