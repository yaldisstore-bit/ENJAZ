import assert from 'node:assert/strict';
import test from 'node:test';
import { createUnhandledErrorReporter } from '../src/core/errors/unhandled.ts';
import type { Logger, LogMetadata } from '../src/core/logging/logger.ts';

function makeSpyLogger(entries: Array<{ message: string; metadata?: LogMetadata }>): Logger {
  const noop = (): void => undefined;
  return {
    debug: noop,
    info: noop,
    warn: noop,
    error: (message, metadata) => entries.push(metadata ? { message, metadata } : { message }),
  };
}

test('unhandled reporter normalizes unknown runtime failures', () => {
  const entries: Array<{ message: string; metadata?: LogMetadata }> = [];
  const reporter = createUnhandledErrorReporter(makeSpyLogger(entries));
  reporter.reportRejection(new Error('network exploded'));
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.message, 'Unhandled runtime error');
  assert.equal(entries[0]?.metadata?.origin, 'unhandledrejection');
  assert.equal(entries[0]?.metadata?.code, 'UNKNOWN');
});
