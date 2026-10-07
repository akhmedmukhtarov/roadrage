import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { ErrorCodes } from '@common/constants/error-codes';
import { IUser, JwtPayload } from '@common/interfaces/user.interface';
import { Database } from '@common/services/database/database.service';
import { TokensEntity } from './entities';

const PG_UNIQUE_VIOLATION = '23505';

type ExpiresIn = JwtSignOptions['expiresIn'];

@Injectable()
export class AuthService {
  constructor(
    private readonly db: Database,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(username: string, password: string): Promise<TokensEntity> {
    const passwordHash = await argon2.hash(password);
    try {
      const user = await this.db
        .insertInto('users')
        .values({ username, password_hash: passwordHash })
        .returning(['id', 'username'])
        .executeTakeFirstOrThrow();
      return this.issueTokens(user);
    } catch (e) {
      if ((e as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException({
          message: 'Username is already taken',
          code: ErrorCodes.USERNAME_EXISTS,
        });
      }
      throw e;
    }
  }

  async login(username: string, password: string): Promise<TokensEntity> {
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'username', 'password_hash'])
      .where('username', '=', username)
      .executeTakeFirst();
    if (!user || !(await argon2.verify(user.password_hash, password))) {
      throw new UnauthorizedException({
        message: 'Invalid username or password',
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    }
    return this.issueTokens(user);
  }

  /** Rotates the refresh token: the presented one stops working. */
  async refresh(refreshToken: string): Promise<TokensEntity> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        code: ErrorCodes.INVALID_TOKEN,
      });
    }

    const user = await this.db
      .selectFrom('users')
      .select(['id', 'username', 'refresh_token_hash'])
      .where('id', '=', payload.sub)
      .executeTakeFirst();
    if (
      !user?.refresh_token_hash ||
      !(await argon2.verify(user.refresh_token_hash, refreshToken))
    ) {
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        code: ErrorCodes.INVALID_TOKEN,
      });
    }
    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.db
      .updateTable('users')
      .set({ refresh_token_hash: null })
      .where('id', '=', userId)
      .execute();
  }

  async verifyAccessToken(token: string): Promise<IUser> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      return { id: payload.sub, username: payload.username };
    } catch {
      throw new UnauthorizedException({
        message: 'Invalid access token',
        code: ErrorCodes.INVALID_TOKEN,
      });
    }
  }

  private async issueTokens(user: IUser): Promise<TokensEntity> {
    const payload: JwtPayload = { sub: user.id, username: user.username };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<ExpiresIn>('JWT_ACCESS_TTL', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<ExpiresIn>('JWT_REFRESH_TTL', '30d'),
      }),
    ]);

    await this.db
      .updateTable('users')
      .set({ refresh_token_hash: await argon2.hash(refreshToken) })
      .where('id', '=', user.id)
      .execute();

    return { accessToken, refreshToken };
  }
}
