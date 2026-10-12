import { Role } from '@common/services/database/enums';

export interface IUser {
  id: string;
  username: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role?: Role;
}
