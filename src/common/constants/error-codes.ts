import { HttpStatus } from '@nestjs/common';

export const ErrorCodes = {
  // System Errors (SYS_XXX)
  INTERNAL_SERVER_ERROR: 'SYS_001',

  // Authentication Errors (AUTH_XXX)
  UNAUTHORIZED: 'AUTH_001',
  INVALID_CREDENTIALS: 'AUTH_002',
  INVALID_TOKEN: 'AUTH_004',

  // User Errors (USER_XXX)
  USERNAME_EXISTS: 'USER_002',

  // Business Errors (BUS_XXX)
  VALIDATION_ERROR: 'BUS_001',
  INVALID_OPERATION: 'BUS_002',
  RESOURCE_NOT_FOUND: 'BUS_003',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** Code used when an HttpException does not carry its own `code`. */
export const DEFAULT_ERROR_CODES: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCodes.VALIDATION_ERROR,
  [HttpStatus.UNAUTHORIZED]: ErrorCodes.UNAUTHORIZED,
  [HttpStatus.NOT_FOUND]: ErrorCodes.RESOURCE_NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCodes.INVALID_OPERATION,
};
