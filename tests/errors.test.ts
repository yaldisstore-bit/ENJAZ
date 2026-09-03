import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError, toAppError } from '../src/core/errors/AppError.ts';

test('AppError keeps stable error code and safe user message', () => {
  const error = new AppError('internal detail', { code: 'VALIDATION_FAILED', userMessage: 'تحقق من البيانات.' });
  assert.equal(error.code, 'VALIDATION_FAILED');
  assert.equal(error.userMessage, 'تحقق من البيانات.');
});

test('unknown Error is normalized', () => {
  const normalized = toAppError(new Error('boom'));
  assert.equal(normalized.code, 'UNKNOWN');
  assert.equal(normalized.message, 'boom');
});
