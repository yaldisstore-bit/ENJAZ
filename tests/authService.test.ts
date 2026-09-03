import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthService } from '../src/features/auth/services/authService.ts';
import { AppError } from '../src/core/errors/AppError.ts';
import type { AuthGateway } from '../src/core/auth/authGateway.ts';

function makeGateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: { id: 'u1' }, session: { user: { id: 'u1' } } }, error: null }),
    signUp: async () => ({ data: { user: { id: 'u1' }, session: null }, error: null }),
    requestPasswordReset: async () => null,
    updatePassword: async () => null,
    signOut: async () => null,
    bootstrapWorkspace: async () => ({ data: 'workspace-1', error: null }),
    onAuthStateChange: () => ({ unsubscribe: () => undefined }),
    ...overrides,
  };
}

test('sign-in validates email before touching the auth gateway', async () => {
  let called = false;
  const gateway = makeGateway({
    signInWithPassword: async () => {
      called = true;
      return { data: { user: null, session: null }, error: null };
    },
  });
  const service = createAuthService(gateway);
  await assert.rejects(() => service.signIn({ email: 'not-an-email', password: 'anything' }), AppError);
  assert.equal(called, false);
});

test('signup with email confirmation does not bootstrap a workspace prematurely', async () => {
  let bootstrapCalls = 0;
  const gateway = makeGateway({
    bootstrapWorkspace: async () => {
      bootstrapCalls += 1;
      return { data: 'workspace-1', error: null };
    },
  });
  const result = await createAuthService(gateway).signUp({ displayName: 'اختبار', email: 'test@example.com', password: 'verystrong1' });
  assert.equal(result.confirmationRequired, true);
  assert.equal(result.workspaceId, null);
  assert.equal(bootstrapCalls, 0);
});

test('signup with immediate session bootstraps workspace exactly once', async () => {
  let bootstrapCalls = 0;
  const gateway = makeGateway({
    signUp: async () => ({ data: { user: { id: 'u1' }, session: { user: { id: 'u1' } } }, error: null }),
    bootstrapWorkspace: async () => {
      bootstrapCalls += 1;
      return { data: 'workspace-live', error: null };
    },
  });
  const result = await createAuthService(gateway).signUp({ displayName: 'اختبار', email: 'test@example.com', password: 'verystrong1' });
  assert.equal(result.confirmationRequired, false);
  assert.equal(result.workspaceId, 'workspace-live');
  assert.equal(bootstrapCalls, 1);
});

test('invalid credential response is normalized to stable app error', async () => {
  const gateway = makeGateway({
    signInWithPassword: async () => ({
      data: { user: null, session: null },
      error: { name: 'AuthApiError', message: 'bad', code: 'invalid_credentials', status: 400 },
    }),
  });
  await assert.rejects(
    () => createAuthService(gateway).signIn({ email: 'test@example.com', password: 'wrong' }),
    (error: unknown) => error instanceof AppError && error.code === 'AUTH_INVALID_CREDENTIALS',
  );
});

test('expired or invalidated session is surfaced as AUTH_SESSION_EXPIRED', async () => {
  const gateway = makeGateway({
    getUser: async () => ({ data: { user: null }, error: { code: 'refresh_token_not_found', status: 401, message: 'raw refresh failure' } }),
  });
  await assert.rejects(
    () => createAuthService(gateway).getVerifiedUser(),
    (error: unknown) => error instanceof AppError && error.code === 'AUTH_SESSION_EXPIRED' && !error.userMessage.includes('raw refresh failure'),
  );
});

test('auth transport failure is normalized without leaking endpoint details', async () => {
  const gateway = makeGateway({
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Failed to fetch https://auth.internal/token?secret=x' } }),
  });
  await assert.rejects(
    () => createAuthService(gateway).signIn({ email: 'test@example.com', password: 'secret' }),
    (error: unknown) => error instanceof AppError && error.code === 'NETWORK_UNAVAILABLE' && !error.userMessage.includes('auth.internal'),
  );
});

test('auth rate limiting has a distinct stable classification', async () => {
  const gateway = makeGateway({
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: { code: 'over_request_rate_limit', status: 429, message: 'too many' } }),
  });
  await assert.rejects(
    () => createAuthService(gateway).signIn({ email: 'test@example.com', password: 'secret' }),
    (error: unknown) => error instanceof AppError && error.code === 'AUTH_RATE_LIMITED',
  );
});
