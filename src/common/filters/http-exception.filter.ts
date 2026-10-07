import { DEFAULT_ERROR_CODES, ErrorCodes } from '@common/constants/error-codes';
import { CustomApiResponse } from '@common/utils/api-response.util';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ExceptionBody {
  message?: string | string[];
  code?: string;
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code: string = ErrorCodes.INTERNAL_SERVER_ERROR;
    let details: unknown = null;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const body: ExceptionBody = typeof res === 'string' ? {} : res;
      statusCode = exception.getStatus();
      code =
        body.code ??
        DEFAULT_ERROR_CODES[statusCode] ??
        ErrorCodes.INTERNAL_SERVER_ERROR;
      if (Array.isArray(body.message)) {
        // class-validator: one message per failed constraint
        message = 'Validation failed';
        details = body.message;
      } else {
        message = body.message ?? exception.message;
        details = body.details ?? null;
      }
    }

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response
      .status(statusCode)
      .json(CustomApiResponse.error(message, statusCode, details, code));
  }
}
