import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

import type { Role, CoinReason } from "./enums";

export type CoinTransaction = {
    id: Generated<string>;
    user_id: string;
    amount: number;
    reason: CoinReason;
    skin_id: string | null;
    reaction_pack_id: string | null;
    created_at: Generated<Timestamp>;
};
export type File = {
    id: Generated<string>;
    type: string;
    name: string;
    size: number;
    bucket_name: string;
    created_by: string | null;
    created_at: Generated<Timestamp>;
};
export type Reaction = {
    id: Generated<string>;
    pack_id: string;
    name: string;
    icon_file_id: string;
    animation_file_id: string | null;
    rating: number;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
};
export type ReactionPack = {
    id: Generated<string>;
    name: string;
    price: Generated<number>;
    is_active: Generated<boolean>;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
};
export type Skin = {
    id: Generated<string>;
    name: string;
    image_file_id: string;
    price: Generated<number>;
    is_active: Generated<boolean>;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
};
export type User = {
    id: Generated<string>;
    username: string;
    password_hash: string;
    refresh_token_hash: string | null;
    role: Generated<Role>;
    coins: Generated<number>;
    selected_skin_id: string | null;
    created_at: Generated<Timestamp>;
};
export type UserReactionPack = {
    user_id: string;
    pack_id: string;
    price_paid: number;
    created_at: Generated<Timestamp>;
};
export type UserSkin = {
    user_id: string;
    skin_id: string;
    price_paid: number;
    created_at: Generated<Timestamp>;
};
export type DB = {
    coin_transactions: CoinTransaction;
    files: File;
    reaction_packs: ReactionPack;
    reactions: Reaction;
    skins: Skin;
    user_reaction_packs: UserReactionPack;
    user_skins: UserSkin;
    users: User;
};
