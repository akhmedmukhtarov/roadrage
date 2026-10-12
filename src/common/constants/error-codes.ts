import { HttpStatus } from '@nestjs/common';

export const ErrorCodes = {
  // System Errors (SYS_XXX)
  INTERNAL_SERVER_ERROR: 'SYS_001',

  // Authentication Errors (AUTH_XXX)
  UNAUTHORIZED: 'AUTH_001',
  INVALID_CREDENTIALS: 'AUTH_002',
  INVALID_TOKEN: 'AUTH_004',
  FORBIDDEN: 'AUTH_006',

  // User Errors (USER_XXX)
  USER_NOT_FOUND: 'USER_001',
  USERNAME_EXISTS: 'USER_002',

  // Skin Errors (SKIN_XXX)
  SKIN_NOT_FOUND: 'SKIN_001',
  SKIN_ALREADY_OWNED: 'SKIN_002',
  SKIN_NOT_AVAILABLE: 'SKIN_003',
  SKIN_IS_FREE: 'SKIN_004',

  // Reaction Errors (REACT_XXX)
  REACTION_PACK_NOT_FOUND: 'REACT_001',
  REACTION_PACK_ALREADY_OWNED: 'REACT_002',
  REACTION_PACK_IS_FREE: 'REACT_003',
  REACTION_NOT_FOUND: 'REACT_004',

  // Coin Errors (COIN_XXX)
  INSUFFICIENT_COINS: 'COIN_001',

  // File Errors (FILE_XXX)
  INVALID_FILE: 'FILE_001',
  FILE_NOT_FOUND: 'FILE_002',

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
  [HttpStatus.FORBIDDEN]: ErrorCodes.FORBIDDEN,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCodes.INVALID_FILE,
  [HttpStatus.NOT_FOUND]: ErrorCodes.RESOURCE_NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCodes.INVALID_OPERATION,
};
