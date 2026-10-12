import { ErrorCodes } from '@common/constants/error-codes';
import { Database } from '@common/services/database/database.service';
import { FilesService } from '@modules/files/files.service';
import { LocationsGateway } from '@modules/locations/locations.gateway';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSkinDto } from './dto/create-skin.dto';
import { UpdateSkinDto } from './dto/update-skin.dto';
import {
  AdminSkinEntity,
  PurchaseEntity,
  SelectedEntity,
  SkinEntity,
} from './entities';

interface SkinRow {
  id: string;
  name: string;
  image_file_id: string;
  price: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class SkinsService {
  constructor(
    private readonly db: Database,
    private readonly filesService: FilesService,
    private readonly locationsGateway: LocationsGateway,
  ) {}

  // ---- users

  /** Everything in the shop. */
  catalog(userId: string): Promise<SkinEntity[]> {
    return this.listFor(userId, 'catalog');
  }

  /** What the user can select: free skins plus the ones they bought. */
  available(userId: string): Promise<SkinEntity[]> {
    return this.listFor(userId, 'available');
  }

  async purchase(userId: string, skinId: string): Promise<PurchaseEntity> {
    const { coins, skin } = await this.db.transaction().execute(async (trx) => {
      const skin = await trx
        .selectFrom('skins')
        .selectAll()
        .where('id', '=', skinId)
        .where('is_active', '=', true)
        .executeTakeFirst();
      if (!skin) throw this.notFound();
      if (skin.price === 0) {
        throw new BadRequestException({
          message: 'This skin is free',
          code: ErrorCodes.SKIN_IS_FREE,
        });
      }

      // A concurrent purchase of the same skin waits here, then sees the row
      const owned = await trx
        .insertInto('user_skins')
        .values({ user_id: userId, skin_id: skinId, price_paid: skin.price })
        .onConflict((oc) => oc.doNothing())
        .returning('skin_id')
        .executeTakeFirst();
      if (!owned) {
        throw new ConflictException({
          message: 'You already own this skin',
          code: ErrorCodes.SKIN_ALREADY_OWNED,
        });
      }

      // Throwing rolls back the ownership row above
      const user = await trx
        .updateTable('users')
        .set((eb) => ({ coins: eb('coins', '-', skin.price) }))
        .where('id', '=', userId)
        .where('coins', '>=', skin.price)
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
          amount: -skin.price,
          reason: 'SKIN_PURCHASE',
          skin_id: skinId,
        })
        .execute();

      return { coins: user.coins, skin };
    });

    const selectedId = await this.selectedSkinId(userId);
    return { coins, skin: this.toEntity(skin, true, selectedId) };
  }

  async select(userId: string, skinId: string | null): Promise<SelectedEntity> {
    let skin: SkinRow | undefined;
    if (skinId) {
      const row = await this.db
        .selectFrom('skins as s')
        .leftJoin('user_skins as us', (join) =>
          join.onRef('us.skin_id', '=', 's.id').on('us.user_id', '=', userId),
        )
        .selectAll('s')
        .select('us.skin_id as purchased_id')
        .where('s.id', '=', skinId)
        .executeTakeFirst();
      if (!row) throw this.notFound();
      if (!this.isOwned(row, row.purchased_id)) {
        throw new BadRequestException({
          message: 'Buy this skin before selecting it',
          code: ErrorCodes.SKIN_NOT_AVAILABLE,
        });
      }
      skin = row;
    }

    await this.db
      .updateTable('users')
      .set({ selected_skin_id: skinId })
      .where('id', '=', userId)
      .execute();

    await this.locationsGateway.setSkin(userId, skin?.image_file_id ?? null);
    return { skin: skin ? this.toEntity(skin, true, skin.id) : null };
  }

  // ---- admins

  async adminList(): Promise<AdminSkinEntity[]> {
    const rows = await this.db
      .selectFrom('skins')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();
    return rows.map((row) => this.toAdminEntity(row));
  }

  async create(dto: CreateSkinDto): Promise<AdminSkinEntity> {
    await this.filesService.assertImage(dto.imageFileId);
    const row = await this.db
      .insertInto('skins')
      .values({
        name: dto.name,
        price: dto.price,
        is_active: dto.isActive ?? true,
        image_file_id: dto.imageFileId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.toAdminEntity(row);
  }

  async update(id: string, dto: UpdateSkinDto): Promise<AdminSkinEntity> {
    if (dto.imageFileId) await this.filesService.assertImage(dto.imageFileId);

    const row = await this.db
      .updateTable('skins')
      .set({
        name: dto.name,
        price: dto.price,
        is_active: dto.isActive,
        image_file_id: dto.imageFileId,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    if (!row) throw this.notFound();
    return this.toAdminEntity(row);
  }

  // ---- helpers

  private async listFor(
    userId: string,
    scope: 'catalog' | 'available',
  ): Promise<SkinEntity[]> {
    const [rows, selectedId] = await Promise.all([
      this.db
        .selectFrom('skins as s')
        .leftJoin('user_skins as us', (join) =>
          join.onRef('us.skin_id', '=', 's.id').on('us.user_id', '=', userId),
        )
        .selectAll('s')
        .select('us.skin_id as purchased_id')
        .where((eb) =>
          scope === 'catalog'
            ? eb('s.is_active', '=', true)
            : eb.or([
                eb('us.skin_id', 'is not', null),
                eb.and([eb('s.price', '=', 0), eb('s.is_active', '=', true)]),
              ]),
        )
        .orderBy('s.price')
        .orderBy('s.created_at')
        .execute(),
      this.selectedSkinId(userId),
    ]);
    return rows.map((row) =>
      this.toEntity(row, this.isOwned(row, row.purchased_id), selectedId),
    );
  }

  private async selectedSkinId(userId: string): Promise<string | null> {
    const user = await this.db
      .selectFrom('users')
      .select('selected_skin_id')
      .where('id', '=', userId)
      .executeTakeFirst();
    return user?.selected_skin_id ?? null;
  }

  /** Purchased, or free and still in the shop. */
  private isOwned(skin: SkinRow, purchasedId: string | null): boolean {
    return purchasedId !== null || (skin.price === 0 && skin.is_active);
  }

  private toEntity(
    skin: SkinRow,
    owned: boolean,
    selectedId: string | null,
  ): SkinEntity {
    return {
      id: skin.id,
      name: skin.name,
      imageFileId: skin.image_file_id,
      price: skin.price,
      owned,
      selected: skin.id === selectedId,
    };
  }

  private toAdminEntity(skin: SkinRow): AdminSkinEntity {
    return {
      id: skin.id,
      name: skin.name,
      imageFileId: skin.image_file_id,
      price: skin.price,
      isActive: skin.is_active,
      createdAt: skin.created_at,
      updatedAt: skin.updated_at,
    };
  }

  private notFound() {
    return new NotFoundException({
      message: 'Skin not found',
      code: ErrorCodes.SKIN_NOT_FOUND,
    });
  }
}
