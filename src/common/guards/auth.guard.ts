import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { IRequest } from '@common/interfaces/request.interface';
import { AuthService } from '@modules/auth/auth.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Sockets are authenticated once, in the gateway handshake
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<IRequest>();
    request.user = await this.authService.verifyAccessToken(
      this.extractToken(request),
    );
    return true;
  }

  private extractToken(request: IRequest): string {
    const header = request.headers.authorization;
    if (!header) {
      throw new UnauthorizedException('Authorization token required');
    }
    return header.startsWith('Bearer ') ? header.slice(7) : header;
  }
}
