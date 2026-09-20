import type {
  ClientPortalGateway, ClientPortalAuthorityGrant,
} from '../client-portal/clientPortalGateway.ts';
import {
  CLIENT_SAFE_COMPANY_FIELDS, CLIENT_SAFE_TRANSACTION_FIELDS,
  CLIENT_SAFE_DOCUMENT_FIELDS, CLIENT_SAFE_RECEIPT_FIELDS, CLIENT_SAFE_REQUEST_FIELDS,
} from '../client-portal/clientPortalAuthority.ts';
import type { CrossDomainJourneyReadProof } from './crossDomainJourneyReadProof.ts';

// Internal independent acceptance probe over an actual separately-authenticated
// client portal gateway. Never return internal company/transaction rows to a client.
export class CrossDomainPortalProofError extends Error {
  readonly reason: 'AUTHORITY_DRIFT' | 'GRANT_MISSING' | 'UNRELATED_RECORD' | 'SOURCE_DRIFT' | 'FORBIDDEN_FIELD';
  constructor(reason: CrossDomainPortalProofError['reason']) {
    super(`Cross-domain client portal proof rejected: ${reason}`);
    this.name = 'CrossDomainPortalProofError';
    this.reason = reason;
  }
}

export interface CrossDomainPortalReadProof {
  readonly workspaceId: string;
  readonly principalId: string;
  readonly observedCompanyCount: number;
  readonly observedTransactionCount: number;
  readonly observedDocumentCount: number;
  readonly observedReceiptCount: number;
  readonly targetTransactionVisible: boolean;
  readonly proofKind: 'READ_ONLY_INDEPENDENT_CLIENT_PROJECTION_CROSSCHECK';
  readonly realAuthRlsCertified: false;
  readonly clientWritePermissionCertified: false;
  readonly atomicCrossPrincipalSnapshotCertified: false;
}

function allowedFields(value: object, allowed: readonly string[]): void {
  const keys = Object.keys(value);
  if (keys.some(key => !allowed.includes(key)))
    throw new CrossDomainPortalProofError('FORBIDDEN_FIELD');
}

// The portal SQL emits numeric(18,2) amounts as decimal text. Compare in cents
// without accepting rounded, unsafe or malformed values from either read path.
function strictPaymentCents(amount: number): bigint {
  const scaled = amount * 100;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 ||
      !Number.isFinite(scaled) || !Number.isSafeInteger(Math.round(scaled)) ||
      Math.round(scaled) < 1 ||
      Math.abs(scaled - Math.round(scaled)) > 0.0000001)
    throw new CrossDomainPortalProofError('SOURCE_DRIFT');
  return BigInt(Math.round(scaled));
}

function strictReceiptCents(amount: string): bigint {
  if (typeof amount !== 'string') throw new CrossDomainPortalProofError('SOURCE_DRIFT');
  const match = /^(0|[1-9]\d{0,15})(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) throw new CrossDomainPortalProofError('SOURCE_DRIFT');
  return BigInt(match[1]!) * 100n + BigInt((match[2] ?? '').padEnd(2, '0') || '0');
}

function sameInstant(source: string | null, visible: string | null): boolean {
  if (source === null || visible === null) return source === visible;
  const sourceTime = Date.parse(source);
  const visibleTime = Date.parse(visible);
  return Number.isFinite(sourceTime) && Number.isFinite(visibleTime) && sourceTime === visibleTime;
}

function activeGrant(grant: ClientPortalAuthorityGrant, now: number): boolean {
  const from = grant.validFrom === null ? null : Date.parse(grant.validFrom);
  const until = grant.validUntil === null ? null : Date.parse(grant.validUntil);
  if ((from !== null && !Number.isFinite(from)) ||
      (until !== null && !Number.isFinite(until)))
    throw new CrossDomainPortalProofError('AUTHORITY_DRIFT');
  return (from === null || from <= now) && (until === null || until > now);
}

function granted(
  grants: readonly ClientPortalAuthorityGrant[],
  type: 'company' | 'transaction',
  id: string,
  permission: ClientPortalAuthorityGrant['permissions'][number],
  now: number,
): boolean {
  return grants.some(grant => grant.targetType === type && grant.targetId === id &&
    grant.permissions.includes(permission) && activeGrant(grant, now));
}

function authoritySignature(grants: readonly ClientPortalAuthorityGrant[]): string {
  const seen = new Set<string>();
  const serial = grants.map(grant => {
    if (seen.has(grant.id)) throw new CrossDomainPortalProofError('AUTHORITY_DRIFT');
    seen.add(grant.id);
    return [grant.id, grant.targetType, grant.targetId, grant.version, grant.validFrom,
      grant.validUntil, [...grant.permissions].sort()];
  });
  return JSON.stringify(serial.sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

/**
 * Source-only client isolation probe: portal is supplied as the authentic
 * independently signed-in client gateway, not the staff DataLayer/finance client.
 * Validates observations, never grants access or exposes private source rows.
 */
export async function verifyCrossDomainClientPortalRead(
  source: CrossDomainJourneyReadProof,
  portal: Pick<ClientPortalGateway, 'authority' | 'readModel'>,
  now = new Date(),
): Promise<CrossDomainPortalReadProof> {
  if (!Number.isFinite(now.getTime())) throw new CrossDomainPortalProofError('AUTHORITY_DRIFT');
  const before = await portal.authority(source.workspaceId);
  if (before.workspaceId !== source.workspaceId || !before.principalId)
    throw new CrossDomainPortalProofError('AUTHORITY_DRIFT');
  const signature = authoritySignature(before.grants);
  const view = await portal.readModel(source.workspaceId);
  const asOf = now.getTime();
  const observedCompanyIds = new Set<string>();
  for (const company of view.companies) {
    allowedFields(company, CLIENT_SAFE_COMPANY_FIELDS);
    if (observedCompanyIds.has(company.id))
      throw new CrossDomainPortalProofError('UNRELATED_RECORD');
    observedCompanyIds.add(company.id);
    if (!granted(before.grants, 'company', company.id, 'view', asOf))
      throw new CrossDomainPortalProofError('GRANT_MISSING');
    if (company.id === source.company.id &&
        (company.legalName !== source.company.legal_name ||
         company.displayName !== source.company.display_name ||
         company.status !== source.company.status))
      throw new CrossDomainPortalProofError('SOURCE_DRIFT');
  }
  const transactionById = new Map(view.transactions.map(t => [t.id, t] as const));
  if (transactionById.size !== view.transactions.length)
    throw new CrossDomainPortalProofError('UNRELATED_RECORD');
  for (const transaction of view.transactions) {
    allowedFields(transaction, CLIENT_SAFE_TRANSACTION_FIELDS);
    if (!granted(before.grants, 'transaction', transaction.id, 'view', asOf))
      throw new CrossDomainPortalProofError('GRANT_MISSING');
    if (transaction.id === source.transaction.id &&
        (transaction.companyId !== source.company.id ||
         transaction.type !== source.transaction.type ||
         transaction.status !== source.transaction.status ||
         !sameInstant(source.transaction.created_at, transaction.createdAt) ||
         !sameInstant(source.transaction.updated_at, transaction.updatedAt) ||
         !sameInstant(source.transaction.completed_at, transaction.completedAt)))
      throw new CrossDomainPortalProofError('SOURCE_DRIFT');
  }
  const observedDocs = new Set<string>();
  const sourceDocs = new Map(source.documents.map(document => [document.id, document] as const));
  for (const document of view.documents) {
    allowedFields(document, CLIENT_SAFE_DOCUMENT_FIELDS);
    if (observedDocs.has(document.id)) throw new CrossDomainPortalProofError('UNRELATED_RECORD');
    observedDocs.add(document.id);
    const transaction = transactionById.get(document.transactionId);
    if (!transaction || transaction.companyId !== document.companyId)
      throw new CrossDomainPortalProofError('UNRELATED_RECORD');
    if (!granted(before.grants, 'transaction', document.transactionId, 'view', asOf))
      throw new CrossDomainPortalProofError('GRANT_MISSING');
    if (document.transactionId === source.transaction.id) {
      const original = sourceDocs.get(document.id);
      if (!original || original.workspace_id !== source.workspaceId ||
          original.transaction_id !== document.transactionId ||
          original.company_id !== document.companyId ||
          original.title !== document.title || original.status !== document.status ||
          original.document_type !== document.documentType ||
          original.mime_type !== document.mimeType || original.size_bytes !== document.sizeBytes ||
          !sameInstant(original.captured_at, document.capturedAt) ||
          !sameInstant(original.created_at, document.createdAt) ||
          !sameInstant(original.updated_at, document.updatedAt))
        throw new CrossDomainPortalProofError('SOURCE_DRIFT');
    }
  }
  const observedReceipts = new Set<string>();
  const sourcePayments = new Map(source.payments.map(payment => [payment.id, payment] as const));
  for (const receipt of view.receipts) {
    allowedFields(receipt, CLIENT_SAFE_RECEIPT_FIELDS);
    if (observedReceipts.has(receipt.paymentId))
      throw new CrossDomainPortalProofError('UNRELATED_RECORD');
    observedReceipts.add(receipt.paymentId);
    const transaction = transactionById.get(receipt.transactionId);
    // The authoritative portal SQL permits individually shared receipts with
    // view_finance even if the transaction's general view grant is absent.
    if (transaction && transaction.companyId !== receipt.companyId)
      throw new CrossDomainPortalProofError('UNRELATED_RECORD');
    if (!granted(before.grants, 'transaction', receipt.transactionId, 'view_finance', asOf))
      throw new CrossDomainPortalProofError('GRANT_MISSING');
    if (receipt.transactionId === source.transaction.id) {
      const payment = sourcePayments.get(receipt.paymentId);
      if (!payment || payment.company_id !== receipt.companyId ||
          payment.transaction_id !== receipt.transactionId ||
          payment.workspace_id !== source.workspaceId ||
          payment.receipt_ref !== receipt.receiptRef ||
          payment.method !== receipt.method || payment.status !== receipt.status ||
          !Number.isFinite(Date.parse(payment.paid_at)) ||
          !Number.isFinite(Date.parse(receipt.paidAt)) ||
          Date.parse(payment.paid_at) !== Date.parse(receipt.paidAt) ||
          strictPaymentCents(payment.amount) !== strictReceiptCents(receipt.amount))
        throw new CrossDomainPortalProofError('SOURCE_DRIFT');
    }
  }
  // Requests use their *own* scoped capability, not an inferred transaction
  // view grant. The SQL request source also permits a finance-only request.
  const requiredRequestPermission = {
    document: 'upload_requested_document',
    approval: 'approve_document',
    information: 'message',
    appointment: 'confirm_appointment',
    payment: 'view_finance',
  } as const;
  const observedRequestIds = new Set<string>();
  for (const request of view.requests) {
    allowedFields(request, CLIENT_SAFE_REQUEST_FIELDS);
    if (!request.id || observedRequestIds.has(request.id))
      throw new CrossDomainPortalProofError('UNRELATED_RECORD');
    observedRequestIds.add(request.id);
    const permission = requiredRequestPermission[request.requestType];
    if (!permission || (request.requestType === 'approval') !== (request.resourceShareId !== null))
      throw new CrossDomainPortalProofError('UNRELATED_RECORD');
    if (!granted(before.grants, 'transaction', request.transactionId, permission, asOf))
      throw new CrossDomainPortalProofError('GRANT_MISSING');
  }
  const after = await portal.authority(source.workspaceId);
  if (after.workspaceId !== before.workspaceId || after.principalId !== before.principalId ||
      authoritySignature(after.grants) !== signature)
    throw new CrossDomainPortalProofError('AUTHORITY_DRIFT');
  return Object.freeze({
    workspaceId: source.workspaceId, principalId: before.principalId,
    observedCompanyCount: view.companies.length,
    observedTransactionCount: view.transactions.length,
    observedDocumentCount: view.documents.length,
    observedReceiptCount: view.receipts.length,
    targetTransactionVisible: transactionById.has(source.transaction.id),
    proofKind: 'READ_ONLY_INDEPENDENT_CLIENT_PROJECTION_CROSSCHECK' as const,
    realAuthRlsCertified: false as const,
    clientWritePermissionCertified: false as const,
    atomicCrossPrincipalSnapshotCertified: false as const,
  });
}
