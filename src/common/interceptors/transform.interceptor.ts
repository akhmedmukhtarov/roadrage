import { IApiResponse } from '@common/interfaces/api-response.interface';
import { CustomApiResponse } from '@common/utils/api-response.util';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  IApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<IApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // If the response is already in our API format, return it as is
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'meta' in data
        ) {
          return data as unknown as IApiResponse<T>;
        }

        // Otherwise, transform it into our API format
        return CustomApiResponse.success(
          (data ?? null) as T,
          response.statusCode,
        );
      }),
    );
  }
}
