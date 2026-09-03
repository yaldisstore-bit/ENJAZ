import assert from 'node:assert/strict';
import test from 'node:test';
import { createRuntimeConfig } from '../src/core/config/env.ts';
import { AppError } from '../src/core/errors/AppError.ts';

const cloud = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abcdefghijklmnopqrstuvwxyz',
};

test('runtime config accepts supported values and modern publishable key', () => {
  assert.deepEqual(createRuntimeConfig({ ...cloud, VITE_APP_ENV: 'production', VITE_APP_LOG_LEVEL: 'error' }), {
    environment: 'production',
    logLevel: 'error',
    supabaseUrl: 'https://example.supabase.co',
    supabasePublishableKey: cloud.VITE_SUPABASE_PUBLISHABLE_KEY,
  });
});

test('runtime config defaults only non-sensitive app settings', () => {
  const config = createRuntimeConfig(cloud);
  assert.equal(config.environment, 'development');
  assert.equal(config.logLevel, 'info');
});

test('runtime config rejects missing cloud configuration', () => {
  assert.throws(() => createRuntimeConfig({}), (error: unknown) => error instanceof AppError && error.code === 'CONFIG_INVALID');
});

test('runtime config rejects legacy anon or secret-shaped client keys', () => {
  assert.throws(
    () => createRuntimeConfig({ ...cloud, VITE_SUPABASE_PUBLISHABLE_KEY: 'eyLegacyAnonKey' }),
    (error: unknown) => error instanceof AppError && error.code === 'CONFIG_INVALID',
  );
});

test('runtime config rejects insecure remote Supabase URL', () => {
  assert.throws(
    () => createRuntimeConfig({ ...cloud, VITE_SUPABASE_URL: 'http://example.com' }),
    (error: unknown) => error instanceof AppError && error.code === 'CONFIG_INVALID',
  );
});
