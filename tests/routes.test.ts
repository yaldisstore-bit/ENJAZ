import assert from 'node:assert/strict';
import test from 'node:test';
import { ROUTES } from '../src/core/routing/routes.ts';

test('all ENJAZ routes are unique and absolute', () => {
  const values = Object.values(ROUTES);
  assert.equal(new Set(values).size, values.length);
  assert.equal(values.every((route) => route.startsWith('/')), true);
});

test('auth routes remain isolated under /auth', () => {
  assert.equal(ROUTES.login.startsWith('/auth/'), true);
  assert.equal(ROUTES.signUp.startsWith('/auth/'), true);
  assert.equal(ROUTES.forgotPassword.startsWith('/auth/'), true);
  assert.equal(ROUTES.updatePassword.startsWith('/auth/'), true);
});
