import type { Logger } from '../logging/logger.ts';
import { toAppError } from './AppError.ts';

export interface UnhandledErrorReporter {
  reportError(error: unknown, origin: string): void;
  reportRejection(reason: unknown): void;
}

export function createUnhandledErrorReporter(logger: Logger): UnhandledErrorReporter {
  const reportError = (error: unknown, origin: string): void => {
    const normalized = toAppError(error);
    logger.error('Unhandled runtime error', {
      code: normalized.code,
      origin,
      message: normalized.message,
    });
  };

  return Object.freeze({
    reportError,
    reportRejection: (reason: unknown) => reportError(reason, 'unhandledrejection'),
  });
}
