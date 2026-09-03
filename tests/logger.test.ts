import assert from 'node:assert/strict';
import test from 'node:test';
import { redactMetadata } from '../src/core/logging/logger.ts';

test('logger redacts top-level and nested sensitive metadata', () => {
  const clean = redactMetadata({
    userId: 'u1',
    token: 'secret-value',
    nested: { apiKey: 'hidden', action: 'save', detail: 'Bearer abc.def.ghi' },
  });

  assert.equal(clean.userId, 'u1');
  assert.equal(clean.token, '[REDACTED]');
  const nested = clean.nested as Readonly<Record<string, unknown>>;
  assert.equal(nested.apiKey, '[REDACTED]');
  assert.equal(nested.action, 'save');
  assert.equal(nested.detail, '[REDACTED]');
});

test('logger survives circular metadata without leaking it', () => {
  const circular: Record<string, unknown> = { name: 'safe' };
  circular.self = circular;
  const clean = redactMetadata({ circular });
  const nested = clean.circular as Readonly<Record<string, unknown>>;
  assert.equal(nested.self, '[CIRCULAR]');
});
