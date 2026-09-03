export type AppErrorCode =
  | 'UNKNOWN'
  | 'CONFIG_INVALID'
  | 'ROUTE_NOT_FOUND'
  | 'NETWORK_UNAVAILABLE'
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_EMAIL_CONFIRMATION_REQUIRED'
  | 'AUTH_RATE_LIMITED'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_OPERATION_FAILED'
  | 'FORBIDDEN'
  | 'VALIDATION_FAILED';

export interface AppErrorOptions {
  readonly code: AppErrorCode;
  readonly cause?: unknown;
  readonly userMessage?: string;
  readonly context?: Readonly<Record<string, unknown>>;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly userMessage: string;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(message: string, options: AppErrorOptions) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code;
    this.userMessage = options.userMessage ?? 'حدث خطأ غير متوقع. حاول مرة أخرى.';
    this.context = Object.freeze({ ...(options.context ?? {}) });
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) return new AppError(error.message, { code: 'UNKNOWN', cause: error });
  return new AppError('Unknown thrown value', { code: 'UNKNOWN', context: { type: typeof error } });
}
