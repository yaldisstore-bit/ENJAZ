import assert from 'node:assert/strict';
import test from 'node:test';
import { createRuntimeConfig } from '../src/core/config/env.ts';

test('client configuration never accepts service-role style material', () => {
  assert.throws(() => createRuntimeConfig({
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_this_must_never_be_client_side',
  }));
});
