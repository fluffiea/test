export const ErrorKey = {
  E_VALIDATION: 'E_VALIDATION',
  E_AUTH_INVALID: 'E_AUTH_INVALID',
  E_AUTH_REQUIRED: 'E_AUTH_REQUIRED',
  E_AUTH_EXPIRED: 'E_AUTH_EXPIRED',
  E_SESSION_KICKED: 'E_SESSION_KICKED',
  E_FORBIDDEN: 'E_FORBIDDEN',
  E_NOT_FOUND: 'E_NOT_FOUND',
  E_CONFLICT: 'E_CONFLICT',
  E_RATE_LIMIT: 'E_RATE_LIMIT',
  E_INTERNAL: 'E_INTERNAL',
} as const;

export type ErrorKeyType = (typeof ErrorKey)[keyof typeof ErrorKey];

export const ErrorCode: Record<ErrorKeyType, number> = {
  [ErrorKey.E_VALIDATION]: 40001,
  [ErrorKey.E_AUTH_INVALID]: 40101,
  [ErrorKey.E_AUTH_REQUIRED]: 40102,
  [ErrorKey.E_AUTH_EXPIRED]: 40103,
  [ErrorKey.E_SESSION_KICKED]: 40104,
  [ErrorKey.E_FORBIDDEN]: 40301,
  [ErrorKey.E_NOT_FOUND]: 40401,
  [ErrorKey.E_CONFLICT]: 40901,
  [ErrorKey.E_RATE_LIMIT]: 42901,
  [ErrorKey.E_INTERNAL]: 50001,
};

export const httpStatusToErrorKey: Record<number, ErrorKeyType> = {
  400: ErrorKey.E_VALIDATION,
  401: ErrorKey.E_AUTH_REQUIRED,
  403: ErrorKey.E_FORBIDDEN,
  404: ErrorKey.E_NOT_FOUND,
  409: ErrorKey.E_CONFLICT,
  429: ErrorKey.E_RATE_LIMIT,
  500: ErrorKey.E_INTERNAL,
};
