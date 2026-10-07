import type { ColumnType } from 'kysely';
export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type User = {
  id: Generated<string>;
  username: string;
  password_hash: string;
  refresh_token_hash: string | null;
  created_at: Generated<Timestamp>;
};
export type DB = {
  users: User;
};
