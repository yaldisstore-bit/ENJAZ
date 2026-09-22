import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertIntegrationClientSafeProjection,
  authorizeIntegrationRequest,
  browserMayHoldIntegrationSecrets,
  decideWebhookDelivery,
  integrationCredentialGrantsDatabaseAccess,
  normalizeWebhookEndpoint,
  operationContract,
  parseIntegrationApiRequest,
  webhookSigningMaterial,
  WEBHOOK_MAX_BODY_BYTES,
  type IntegrationCredentialClaims,
} from '../src/features/integrations/integrationPlatformContract.ts';

const W = '11111111-1111-4111-8111-111111111111';
const W2 = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const R = '44444444-4444-4444-8444-444444444444';
const E = '55555555-5555-4555-8555-555555555555';
const NOW = 1_800_000_000;

function claims(overrides: Partial<IntegrationCredentialClaims> = {}): IntegrationCredentialClaims {
  return {
    workspaceId: W,
    credentialId: C,
    subject: 'service_account',
    tokenVersion: 1,
    scopes: ['companies:read', 'webhooks:manage'],
    issuedAtEpochSeconds: NOW - 60,
    expiresAtEpochSeconds: NOW + 3_600,
    revokedAtEpochSeconds: null,
    ...overrides,
  };
}

function request(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 'v1',
    requestId: R,
    workspaceId: W,
    operation: 'companies.list',
    idempotencyKey: null,
    payload: {},
    ...overrides,
  };
}

test('14.2 A1 accepts only explicit versioned operations and maps exact scopes', () => {
  assert.deepEqual(operationContract('companies.list'), { requiredScope: 'companies:read', mutating: false });
  assert.deepEqual(operationContract('imports.execute'), { requiredScope: 'imports:execute', mutating: true });
  assert.equal(operationContract('database.sql'), null);
  assert.throws(() => parseIntegrationApiRequest(request({ version: 'v2' })), /VERSION_UNSUPPORTED/);
  assert.throws(() => parseIntegrationApiRequest(request({ operation: 'database.sql' })), /OPERATION_FORBIDDEN/);
});

test('14.2 A1 rejects unknown envelope fields and malformed identifiers', () => {
  assert.throws(() => parseIntegrationApiRequest({ ...request(), serviceRoleKey: 'forbidden' }), /SHAPE_INVALID/);
  assert.throws(() => parseIntegrationApiRequest(request({ requestId: 'request-1' })), /REQUEST_ID_INVALID/);
  assert.throws(() => parseIntegrationApiRequest(request({ workspaceId: 'all-workspaces' })), /WORKSPACE_ID_INVALID/);
  assert.throws(() => parseIntegrationApiRequest(request({ payload: [] })), /PAYLOAD_INVALID/);
});

test('14.2 A1 requires stable idempotency for every mutating external operation', () => {
  assert.throws(
    () => parseIntegrationApiRequest(request({ operation: 'webhooks.register', idempotencyKey: null })),
    /IDEMPOTENCY_KEY_REQUIRED/,
  );
  assert.throws(
    () => parseIntegrationApiRequest(request({ operation: 'imports.execute', idempotencyKey: 'short' })),
    /IDEMPOTENCY_KEY_INVALID/,
  );
  const parsed = parseIntegrationApiRequest(request({
    operation: 'webhooks.disable',
    idempotencyKey: 'disable-hook-55555555-v1',
    payload: { subscriptionId: E },
  }));
  assert.equal(parsed.idempotencyKey, 'disable-hook-55555555-v1');
  assert.equal(parsed.operation, 'webhooks.disable');
});

test('14.2 A1 authorizes a live service credential only inside its workspace and exact scope', () => {
  assert.deepEqual(authorizeIntegrationRequest({
    claims: claims(),
    requestedWorkspaceId: W,
    requiredScope: 'companies:read',
    nowEpochSeconds: NOW,
  }), { allowed: true, workspaceId: W, credentialId: C, scope: 'companies:read' });
  assert.deepEqual(authorizeIntegrationRequest({
    claims: claims(),
    requestedWorkspaceId: W2,
    requiredScope: 'companies:read',
    nowEpochSeconds: NOW,
  }), { allowed: false, code: 'WORKSPACE_MISMATCH' });
  assert.deepEqual(authorizeIntegrationRequest({
    claims: claims(),
    requestedWorkspaceId: W,
    requiredScope: 'transactions:read',
    nowEpochSeconds: NOW,
  }), { allowed: false, code: 'SCOPE_DENIED' });
});

test('14.2 A1 revoked, future and expired credentials fail closed', () => {
  const decide = (value: IntegrationCredentialClaims) => authorizeIntegrationRequest({
    claims: value,
    requestedWorkspaceId: W,
    requiredScope: 'companies:read',
    nowEpochSeconds: NOW,
  });
  assert.deepEqual(decide(claims({ revokedAtEpochSeconds: NOW - 1 })), { allowed: false, code: 'CREDENTIAL_REVOKED' });
  assert.deepEqual(decide(claims({ revokedAtEpochSeconds: NOW + 60 })), { allowed: false, code: 'CREDENTIAL_REVOKED' });
  assert.deepEqual(decide(claims({ issuedAtEpochSeconds: NOW + 1 })), { allowed: false, code: 'CREDENTIAL_NOT_YET_VALID' });
  assert.deepEqual(decide(claims({ expiresAtEpochSeconds: NOW })), { allowed: false, code: 'CREDENTIAL_EXPIRED' });
});

test('14.2 A1 rejects duplicated or invented credential scopes', () => {
  const decide = (scopes: readonly string[]) => authorizeIntegrationRequest({
    claims: claims({ scopes }),
    requestedWorkspaceId: W,
    requiredScope: 'companies:read',
    nowEpochSeconds: NOW,
  });
  assert.deepEqual(decide(['companies:read', 'companies:read']), { allowed: false, code: 'CREDENTIAL_SCOPE_INVALID' });
  assert.deepEqual(decide(['companies:read', 'database:admin']), { allowed: false, code: 'CREDENTIAL_SCOPE_INVALID' });
});

test('14.2 A1 webhook endpoints require public HTTPS and no embedded credentials', () => {
  assert.equal(normalizeWebhookEndpoint('https://hooks.example.com/enjaz'), 'https://hooks.example.com/enjaz');
  for (const endpoint of [
    'http://hooks.example.com/enjaz',
    'https://user:pass@hooks.example.com/enjaz',
    'https://localhost/enjaz',
    'https://127.0.0.1/enjaz',
    'https://10.0.0.8/enjaz',
    'https://172.20.0.5/enjaz',
    'https://192.168.1.8/enjaz',
    'https://169.254.1.8/enjaz',
  ]) assert.equal(normalizeWebhookEndpoint(endpoint), null, endpoint);
});

test('14.2 A1 webhook signing material is deterministic and binds timestamp, event and exact body', () => {
  const base = { eventId: E, timestampEpochSeconds: NOW, rawBody: '{"event":"transaction.updated"}' };
  const material = webhookSigningMaterial(base);
  assert.equal(material, webhookSigningMaterial(base));
  assert.notEqual(material, webhookSigningMaterial({ ...base, timestampEpochSeconds: NOW + 1 }));
  assert.notEqual(material, webhookSigningMaterial({ ...base, rawBody: '{"event":"company.updated"}' }));
  assert.throws(() => webhookSigningMaterial({ ...base, eventId: 'bad' }), /EVENT_ID_INVALID/);
  assert.throws(() => webhookSigningMaterial({ ...base, rawBody: '' }), /BODY_SIZE_INVALID/);
});

test('14.2 A1 webhook body ceiling measures UTF-8 bytes instead of JavaScript characters', () => {
  const arabic = 'أ'.repeat(Math.floor(WEBHOOK_MAX_BODY_BYTES / 2) + 1);
  assert.ok(arabic.length < WEBHOOK_MAX_BODY_BYTES);
  assert.throws(() => webhookSigningMaterial({ eventId: E, timestampEpochSeconds: NOW, rawBody: arabic }), /BODY_SIZE_INVALID/);
});

test('14.2 A1 webhook retry schedule terminates in a dead letter', () => {
  assert.deepEqual(decideWebhookDelivery({ attempt: 1, outcome: 'success', nowEpochSeconds: NOW }), {
    status: 'delivered', nextAttemptAtEpochSeconds: null,
  });
  assert.deepEqual(decideWebhookDelivery({ attempt: 1, outcome: 'retryable_failure', nowEpochSeconds: NOW }), {
    status: 'retry_scheduled', nextAttemptAtEpochSeconds: NOW + 60,
  });
  assert.deepEqual(decideWebhookDelivery({ attempt: 4, outcome: 'retryable_failure', nowEpochSeconds: NOW }), {
    status: 'retry_scheduled', nextAttemptAtEpochSeconds: NOW + 7_200,
  });
  assert.deepEqual(decideWebhookDelivery({ attempt: 5, outcome: 'retryable_failure', nowEpochSeconds: NOW }), {
    status: 'dead_letter', nextAttemptAtEpochSeconds: null,
  });
  assert.deepEqual(decideWebhookDelivery({ attempt: 1, outcome: 'permanent_failure', nowEpochSeconds: NOW }), {
    status: 'dead_letter', nextAttemptAtEpochSeconds: null,
  });
});

test('14.2 A1 client projections cannot expose credential or signing secrets', () => {
  assert.doesNotThrow(() => assertIntegrationClientSafeProjection(['id', 'name', 'workspaceId', 'scopes', 'lastFour']));
  for (const field of ['rawToken', 'tokenHash', 'tokenDigest', 'signingSecret', 'webhookSecret', 'serviceRoleKey', 'unknown']) {
    assert.throws(() => assertIntegrationClientSafeProjection(['id', field]), /CLIENT_FIELD_FORBIDDEN/);
  }
  assert.equal(browserMayHoldIntegrationSecrets(), false);
  assert.equal(integrationCredentialGrantsDatabaseAccess(), false);
});
