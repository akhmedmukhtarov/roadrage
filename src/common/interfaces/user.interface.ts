export interface IUser {
  id: string;
  username: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
}
