import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequest } from '@common/interfaces/request.interface';
import { IUser } from '@common/interfaces/user.interface';

export const User = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): IUser => {
    return ctx.switchToHttp().getRequest<IRequest>().user;
  },
);
