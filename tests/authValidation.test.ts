import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createRuntimeConfig } from '../src/core/config/env.ts';

test('client configuration never accepts service-role style material', () => {
  assert.throws(() => createRuntimeConfig({
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_this_must_never_be_client_side',
  }));
});

test('auth route guards remain independent from eradicated legacy presentation', () => {
  const guards = readFileSync(new URL('../src/features/auth/pages/AuthRouteGuards.tsx', import.meta.url), 'utf8');
  const checking = readFileSync(new URL('../src/shared/session/SessionChecking.tsx', import.meta.url), 'utf8');
  const checkingCss = readFileSync(new URL('../src/shared/session/session-checking.css', import.meta.url), 'utf8');

  assert.match(guards, /shared\/session\/SessionChecking\.tsx/);
  assert.doesNotMatch(guards, /ui-rebirth|RebirthSessionChecking/);
  assert.match(checking, /role="status"/);
  assert.match(checking, /aria-busy="true"/);
  assert.doesNotMatch(checking, /rebirth/i);
  assert.doesNotMatch(checkingCss, /--rebirth-|rebirth-/i);
  assert.match(checkingCss, /prefers-reduced-motion/);
});
