export const INTEGRATION_API_VERSION = 'v1' as const;
export const INTEGRATION_TOKEN_VERSION = 1 as const;

export const INTEGRATION_SCOPES = Object.freeze([
  'companies:read',
  'transactions:read',
  'webhooks:read',
  'webhooks:manage',
  'imports:dry-run',
  'imports:execute',
] as const);

export type IntegrationScope = (typeof INTEGRATION_SCOPES)[number];
export type IntegrationOperation =
  | 'companies.list'
  | 'transactions.get'
  | 'webhooks.list'
  | 'webhooks.register'
  | 'webhooks.disable'
  | 'imports.dry-run'
  | 'imports.execute';

export interface IntegrationOperationContract {
  readonly requiredScope: IntegrationScope;
  readonly mutating: boolean;
}

export const INTEGRATION_OPERATION_CONTRACTS: Readonly<Record<IntegrationOperation, IntegrationOperationContract>> = Object.freeze({
  'companies.list': Object.freeze({ requiredScope: 'companies:read', mutating: false }),
  'transactions.get': Object.freeze({ requiredScope: 'transactions:read', mutating: false }),
  'webhooks.list': Object.freeze({ requiredScope: 'webhooks:read', mutating: false }),
  'webhooks.register': Object.freeze({ requiredScope: 'webhooks:manage', mutating: true }),
  'webhooks.disable': Object.freeze({ requiredScope: 'webhooks:manage', mutating: true }),
  'imports.dry-run': Object.freeze({ requiredScope: 'imports:dry-run', mutating: false }),
  'imports.execute': Object.freeze({ requiredScope: 'imports:execute', mutating: true }),
});

export interface IntegrationCredentialClaims {
  readonly workspaceId: string;
  readonly credentialId: string;
  readonly subject: 'service_account';
  readonly tokenVersion: typeof INTEGRATION_TOKEN_VERSION;
  readonly scopes: readonly string[];
  readonly issuedAtEpochSeconds: number;
  readonly expiresAtEpochSeconds: number;
  readonly revokedAtEpochSeconds: number | null;
}

export interface IntegrationApiRequest {
  readonly version: typeof INTEGRATION_API_VERSION;
  readonly requestId: string;
  readonly workspaceId: string;
  readonly operation: IntegrationOperation;
  readonly idempotencyKey: string | null;
  readonly payload: Readonly<Record<string, unknown>>;
}

export type IntegrationAuthorizationDecision =
  | Readonly<{ allowed: true; workspaceId: string; credentialId: string; scope: IntegrationScope }>
  | Readonly<{ allowed: false; code: IntegrationAuthorizationErrorCode }>;

export type IntegrationAuthorizationErrorCode =
  | 'CREDENTIAL_INVALID'
  | 'CREDENTIAL_REVOKED'
  | 'CREDENTIAL_NOT_YET_VALID'
  | 'CREDENTIAL_EXPIRED'
  | 'CREDENTIAL_SCOPE_INVALID'
  | 'WORKSPACE_MISMATCH'
  | 'SCOPE_DENIED';

export const WEBHOOK_EVENT_TYPES = Object.freeze([
  'company.updated',
  'transaction.updated',
  'followup.due',
  'payment.recorded',
  'document.ready',
] as const);

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];
export const WEBHOOK_MAX_ATTEMPTS = 5;
export const WEBHOOK_RETRY_DELAYS_SECONDS = Object.freeze([60, 300, 1_800, 7_200] as const);
export const WEBHOOK_MAX_BODY_BYTES = 1_048_576;

export const INTEGRATION_CLIENT_SAFE_CREDENTIAL_FIELDS = Object.freeze([
  'id',
  'name',
  'workspaceId',
  'scopes',
  'lastFour',
  'createdAt',
  'expiresAt',
  'revokedAt',
] as const);

export const INTEGRATION_CLIENT_FORBIDDEN_FIELDS = Object.freeze([
  'rawToken',
  'tokenHash',
  'tokenDigest',
  'signingSecret',
  'webhookSecret',
  'serviceRoleKey',
  'authorizationHeader',
  'rawProviderHeaders',
] as const);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,199}$/;
const KNOWN_SCOPES = new Set<string>(INTEGRATION_SCOPES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const known = new Set(allowed);
  return Object.keys(value).every((key) => known.has(key));
}

function safeEpoch(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function denied(code: IntegrationAuthorizationErrorCode): IntegrationAuthorizationDecision {
  return Object.freeze({ allowed: false, code });
}

export function operationContract(operation: string): IntegrationOperationContract | null {
  if (!Object.prototype.hasOwnProperty.call(INTEGRATION_OPERATION_CONTRACTS, operation)) return null;
  return INTEGRATION_OPERATION_CONTRACTS[operation as IntegrationOperation];
}

export function authorizeIntegrationRequest(input: Readonly<{
  claims: IntegrationCredentialClaims;
  requestedWorkspaceId: string;
  requiredScope: IntegrationScope;
  nowEpochSeconds: number;
}>): IntegrationAuthorizationDecision {
  const { claims } = input;
  if (
    !UUID.test(claims.workspaceId)
    || !UUID.test(claims.credentialId)
    || claims.subject !== 'service_account'
    || claims.tokenVersion !== INTEGRATION_TOKEN_VERSION
    || !safeEpoch(claims.issuedAtEpochSeconds)
    || !safeEpoch(claims.expiresAtEpochSeconds)
    || !safeEpoch(input.nowEpochSeconds)
    || claims.expiresAtEpochSeconds <= claims.issuedAtEpochSeconds
    || (claims.revokedAtEpochSeconds !== null && !safeEpoch(claims.revokedAtEpochSeconds))
  ) return denied('CREDENTIAL_INVALID');

  if (claims.revokedAtEpochSeconds !== null) return denied('CREDENTIAL_REVOKED');
  if (claims.issuedAtEpochSeconds > input.nowEpochSeconds) return denied('CREDENTIAL_NOT_YET_VALID');
  if (claims.expiresAtEpochSeconds <= input.nowEpochSeconds) return denied('CREDENTIAL_EXPIRED');
  if (claims.workspaceId !== input.requestedWorkspaceId) return denied('WORKSPACE_MISMATCH');

  const uniqueScopes = new Set(claims.scopes);
  if (uniqueScopes.size !== claims.scopes.length || claims.scopes.some((scope) => !KNOWN_SCOPES.has(scope))) {
    return denied('CREDENTIAL_SCOPE_INVALID');
  }
  if (!uniqueScopes.has(input.requiredScope)) return denied('SCOPE_DENIED');

  return Object.freeze({
    allowed: true,
    workspaceId: claims.workspaceId,
    credentialId: claims.credentialId,
    scope: input.requiredScope,
  });
}

export function parseIntegrationApiRequest(value: unknown): IntegrationApiRequest {
  if (!isRecord(value) || !exactKeys(value, ['version', 'requestId', 'workspaceId', 'operation', 'idempotencyKey', 'payload'])) {
    throw new Error('INTEGRATION_REQUEST_SHAPE_INVALID');
  }
  if (value.version !== INTEGRATION_API_VERSION) throw new Error('INTEGRATION_API_VERSION_UNSUPPORTED');
  if (typeof value.requestId !== 'string' || !UUID.test(value.requestId)) throw new Error('INTEGRATION_REQUEST_ID_INVALID');
  if (typeof value.workspaceId !== 'string' || !UUID.test(value.workspaceId)) throw new Error('INTEGRATION_WORKSPACE_ID_INVALID');
  if (typeof value.operation !== 'string') throw new Error('INTEGRATION_OPERATION_INVALID');
  const contract = operationContract(value.operation);
  if (!contract) throw new Error('INTEGRATION_OPERATION_FORBIDDEN');
  if (!isRecord(value.payload)) throw new Error('INTEGRATION_PAYLOAD_INVALID');

  const idempotencyKey = value.idempotencyKey ?? null;
  if (idempotencyKey !== null && (typeof idempotencyKey !== 'string' || !IDEMPOTENCY_KEY.test(idempotencyKey))) {
    throw new Error('INTEGRATION_IDEMPOTENCY_KEY_INVALID');
  }
  if (contract.mutating && idempotencyKey === null) throw new Error('INTEGRATION_IDEMPOTENCY_KEY_REQUIRED');

  return Object.freeze({
    version: INTEGRATION_API_VERSION,
    requestId: value.requestId,
    workspaceId: value.workspaceId,
    operation: value.operation as IntegrationOperation,
    idempotencyKey,
    payload: Object.freeze({ ...value.payload }),
  });
}

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [a, b] = octets;
  if (a === undefined || b === undefined) return false;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function normalizeWebhookEndpoint(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return null;
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || isPrivateIpv4(hostname)) return null;
    if (hostname === '[::1]' || hostname === '::1' || hostname.startsWith('[fc') || hostname.startsWith('[fd') || hostname.startsWith('[fe80:')) return null;
    url.hostname = hostname;
    return url.toString();
  } catch {
    return null;
  }
}

export function webhookSigningMaterial(input: Readonly<{
  eventId: string;
  timestampEpochSeconds: number;
  rawBody: string;
}>): string {
  if (!UUID.test(input.eventId)) throw new Error('WEBHOOK_EVENT_ID_INVALID');
  if (!safeEpoch(input.timestampEpochSeconds)) throw new Error('WEBHOOK_TIMESTAMP_INVALID');
  const byteLength = new TextEncoder().encode(input.rawBody).byteLength;
  if (byteLength === 0 || byteLength > WEBHOOK_MAX_BODY_BYTES) throw new Error('WEBHOOK_BODY_SIZE_INVALID');
  return `enjaz.webhook.v1\n${input.timestampEpochSeconds}\n${input.eventId}\n${input.rawBody}`;
}

export type WebhookDeliveryDecision =
  | Readonly<{ status: 'delivered'; nextAttemptAtEpochSeconds: null }>
  | Readonly<{ status: 'retry_scheduled'; nextAttemptAtEpochSeconds: number }>
  | Readonly<{ status: 'dead_letter'; nextAttemptAtEpochSeconds: null }>;

export function decideWebhookDelivery(input: Readonly<{
  attempt: number;
  outcome: 'success' | 'retryable_failure' | 'permanent_failure';
  nowEpochSeconds: number;
}>): WebhookDeliveryDecision {
  if (!Number.isSafeInteger(input.attempt) || input.attempt < 1 || !safeEpoch(input.nowEpochSeconds)) {
    throw new Error('WEBHOOK_ATTEMPT_INVALID');
  }
  if (input.outcome === 'success') return Object.freeze({ status: 'delivered', nextAttemptAtEpochSeconds: null });
  if (input.outcome === 'permanent_failure' || input.attempt >= WEBHOOK_MAX_ATTEMPTS) {
    return Object.freeze({ status: 'dead_letter', nextAttemptAtEpochSeconds: null });
  }
  const delay = WEBHOOK_RETRY_DELAYS_SECONDS[input.attempt - 1];
  if (delay === undefined) return Object.freeze({ status: 'dead_letter', nextAttemptAtEpochSeconds: null });
  return Object.freeze({ status: 'retry_scheduled', nextAttemptAtEpochSeconds: input.nowEpochSeconds + delay });
}

export function assertIntegrationClientSafeProjection(fields: readonly string[]): void {
  const allowed = new Set<string>(INTEGRATION_CLIENT_SAFE_CREDENTIAL_FIELDS);
  const forbidden = new Set<string>(INTEGRATION_CLIENT_FORBIDDEN_FIELDS);
  for (const field of fields) {
    if (forbidden.has(field) || !allowed.has(field)) throw new Error(`INTEGRATION_CLIENT_FIELD_FORBIDDEN:${field}`);
  }
}

export function browserMayHoldIntegrationSecrets(): false {
  return false;
}

export function integrationCredentialGrantsDatabaseAccess(): false {
  return false;
}
