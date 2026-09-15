export type ClientPortalMembershipStatus = 'invited' | 'active' | 'revoked';
export type ClientPortalGrantTarget = 'company' | 'transaction';
export type ClientPortalPermission =
  | 'view'
  | 'upload_requested_document'
  | 'approve_document'
  | 'message'
  | 'confirm_appointment'
  | 'view_finance';

export interface ClientPortalPrincipal {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly contactId: string | null;
  readonly status: ClientPortalMembershipStatus;
  readonly activatedAt: string | null;
  readonly revokedAt: string | null;
}

export interface ClientPortalGrant {
  readonly id: string;
  readonly workspaceId: string;
  readonly principalId: string;
  readonly targetType: ClientPortalGrantTarget;
  readonly targetId: string;
  readonly permissions: readonly ClientPortalPermission[];
  readonly validFrom: string | null;
  readonly validUntil: string | null;
  readonly revokedAt: string | null;
}

export interface ClientPortalAccessIndex {
  readonly active: boolean;
  readonly workspaceId: string;
  readonly principalId: string;
  readonly companyIds: ReadonlySet<string>;
  readonly transactionIds: ReadonlySet<string>;
  readonly permissionsByTarget: ReadonlyMap<string, ReadonlySet<ClientPortalPermission>>;
}

export type ClientPortalChildKind =
  | 'document'
  | 'request'
  | 'approval'
  | 'payment'
  | 'receipt'
  | 'appointment'
  | 'message';

export interface ClientPortalChildFact {
  readonly kind: ClientPortalChildKind;
  readonly workspaceId: string;
  readonly transactionId: string;
  readonly clientVisible: boolean;
  readonly staffOnly?: boolean;
}

export const CLIENT_PORTAL_FORBIDDEN_DOMAINS = Object.freeze([
  'transaction_notes',
  'risk_signals',
  'intelligence_snapshots',
  'organization_members',
  'workspace_memberships',
  'audit_events_internal',
  'staff_only_finance',
] as const);

export const CLIENT_SAFE_COMPANY_FIELDS = Object.freeze([
  'id',
  'legalName',
  'displayName',
  'status',
] as const);

// Keep this list tied to canonical public.transactions columns. Client-safe
// projection intentionally excludes primary contact, department, priority,
// current fee, deletion metadata and legacy provenance.
export const CLIENT_SAFE_TRANSACTION_FIELDS = Object.freeze([
  'id',
  'companyId',
  'type',
  'status',
  'createdAt',
  'updatedAt',
  'completedAt',
] as const);

// Binary storage paths, checksums, OCR/analysis and internal provenance are
// intentionally absent. Download brokerage is a separate governed boundary.
export const CLIENT_SAFE_DOCUMENT_FIELDS = Object.freeze([
  'id',
  'transactionId',
  'companyId',
  'title',
  'documentType',
  'mimeType',
  'sizeBytes',
  'status',
  'capturedAt',
  'createdAt',
  'updatedAt',
] as const);

// Receipt facts come from authoritative payment/receipt state only. Internal
// notes, cashbox, creator, engagement and reversal reasons are never projected.
export const CLIENT_SAFE_RECEIPT_FIELDS = Object.freeze([
  'paymentId',
  'transactionId',
  'companyId',
  'receiptRef',
  'amount',
  'method',
  'paidAt',
  'status',
  'receiptVersion',
] as const);

function validInstant(value: string | null): number | null {
  if (value === null) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? instant : null;
}

function targetKey(type: ClientPortalGrantTarget, id: string): string {
  return `${type}:${id}`;
}

function grantIsCurrentlyActive(grant: ClientPortalGrant, nowMs: number): boolean {
  if (grant.revokedAt !== null) return false;
  const from = validInstant(grant.validFrom);
  const until = validInstant(grant.validUntil);
  if (grant.validFrom !== null && from === null) return false;
  if (grant.validUntil !== null && until === null) return false;
  if (from !== null && from > nowMs) return false;
  if (until !== null && until <= nowMs) return false;
  return true;
}

export function buildClientPortalAccessIndex(
  principal: ClientPortalPrincipal,
  grants: readonly ClientPortalGrant[],
  now = new Date(),
): ClientPortalAccessIndex {
  const active = principal.status === 'active' && principal.revokedAt === null;
  const companyIds = new Set<string>();
  const transactionIds = new Set<string>();
  const permissionsByTarget = new Map<string, ReadonlySet<ClientPortalPermission>>();

  if (active) {
    const nowMs = now.getTime();
    for (const grant of grants) {
      if (grant.workspaceId !== principal.workspaceId) continue;
      if (grant.principalId !== principal.id) continue;
      if (!grantIsCurrentlyActive(grant, nowMs)) continue;
      if (grant.targetType === 'company') companyIds.add(grant.targetId);
      if (grant.targetType === 'transaction') transactionIds.add(grant.targetId);
      permissionsByTarget.set(targetKey(grant.targetType, grant.targetId), new Set(grant.permissions));
    }
  }

  return Object.freeze({
    active,
    workspaceId: principal.workspaceId,
    principalId: principal.id,
    companyIds,
    transactionIds,
    permissionsByTarget,
  });
}

export function canViewCompany(index: ClientPortalAccessIndex, workspaceId: string, companyId: string): boolean {
  return index.active && index.workspaceId === workspaceId && index.companyIds.has(companyId);
}

export function canViewTransaction(index: ClientPortalAccessIndex, workspaceId: string, transactionId: string): boolean {
  return index.active && index.workspaceId === workspaceId && index.transactionIds.has(transactionId);
}

export function hasPortalPermission(
  index: ClientPortalAccessIndex,
  workspaceId: string,
  targetType: ClientPortalGrantTarget,
  targetId: string,
  permission: ClientPortalPermission,
): boolean {
  if (!index.active || index.workspaceId !== workspaceId) return false;
  return index.permissionsByTarget.get(targetKey(targetType, targetId))?.has(permission) === true;
}

export function canViewChildFact(index: ClientPortalAccessIndex, fact: ClientPortalChildFact): boolean {
  if (!index.active) return false;
  if (fact.workspaceId !== index.workspaceId) return false;
  if (fact.staffOnly === true || fact.clientVisible !== true) return false;
  return index.transactionIds.has(fact.transactionId);
}

export function canPerformChildAction(
  index: ClientPortalAccessIndex,
  fact: ClientPortalChildFact,
  permission: Exclude<ClientPortalPermission, 'view'>,
): boolean {
  if (!canViewChildFact(index, fact)) return false;
  return hasPortalPermission(index, fact.workspaceId, 'transaction', fact.transactionId, permission);
}

export function clientPortalDomainIsAlwaysForbidden(domain: string): boolean {
  return (CLIENT_PORTAL_FORBIDDEN_DOMAINS as readonly string[]).includes(domain);
}

export function assertClientSafeProjection(
  fields: readonly string[],
  allowlist: readonly string[],
): void {
  const allowed = new Set(allowlist);
  for (const field of fields) {
    if (!allowed.has(field)) throw new Error(`Client portal projection contains forbidden field: ${field}`);
  }
}
