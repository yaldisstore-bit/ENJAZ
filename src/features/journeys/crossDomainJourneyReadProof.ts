import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { ColumnOf, RowOf } from '../../data/contracts/dataTypes.ts';
import type { ReadRepository } from '../../data/repositories/createEntityRepository.ts';

// Internal authenticated read proof only. Never expose this complete model through the client portal.
// It does not certify atomicity across independently read domains, or authorize a mutation.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_LIMIT = 100;

export class CrossDomainJourneyReadError extends Error {
  constructor(readonly reason: 'INVALID_ID' | 'NO_WORKSPACE' | 'NOT_FOUND' | 'LINK_DRIFT' | 'CAPACITY' | 'CHANGED') {
    super(`Cross-domain read proof rejected: ${reason}`);
    this.name = 'CrossDomainJourneyReadError';
  }
}

export interface CrossDomainJourneyReadProof {
  readonly workspaceId: string;
  readonly company: RowOf<'companies'>;
  readonly transaction: RowOf<'transactions'>;
  readonly procedures: readonly RowOf<'workflow_instances'>[];
  readonly followups: readonly RowOf<'transaction_followups'>[];
  readonly payments: readonly RowOf<'payments'>[];
  readonly reversals: readonly RowOf<'payment_reversals'>[];
  readonly documents: readonly RowOf<'documents'>[];
  readonly proofKind: 'AUTHENTICATED_INTERNAL_READ_ONLY';
  readonly atomicMultiDomainSnapshotCertified: false;
  readonly clientVisibilityCertified: false;
}

function requiredId(id: string): string {
  if (typeof id !== 'string' || !UUID.test(id.trim())) throw new CrossDomainJourneyReadError('INVALID_ID');
  return id.trim().toLowerCase();
}

function assertWorkspace(row: { workspace_id: string }, workspaceId: string): void {
  if (row.workspace_id !== workspaceId) throw new CrossDomainJourneyReadError('LINK_DRIFT');
}

async function limited<T extends 'workflow_instances' | 'transaction_followups' | 'payments' | 'payment_reversals' | 'documents'>(
  repo: ReadRepository<T>,
  column: ColumnOf<T>,
  value: string | readonly string[],
): Promise<readonly RowOf<T>[]> {
  const page = await repo.list({
    filters: [{ column, operator: Array.isArray(value) ? 'in' : 'eq', value }],
    offset: 0,
    limit: PAGE_LIMIT,
  });
  // An incomplete page must never be mistaken for proof of an exhaustive journey.
  if (page.hasMore || page.items.length > PAGE_LIMIT) throw new CrossDomainJourneyReadError('CAPACITY');
  return Object.freeze([...page.items]);
}

function checkLinks(
  layer: EnjazWorkspaceDataLayer,
  workspaceId: string,
  company: RowOf<'companies'>,
  transaction: RowOf<'transactions'>,
): void {
  assertWorkspace(company, workspaceId);
  assertWorkspace(transaction, workspaceId);
  if (layer.scope.workspaceId !== workspaceId || company.deleted_at !== null ||
      company.merged_into_id !== null || transaction.deleted_at !== null ||
      transaction.company_id !== company.id) throw new CrossDomainJourneyReadError('LINK_DRIFT');
}

/**
 * A2 source slice: prove that existing internal domain repositories agree about one
 * company/transaction chain under a resolved workspace. No writes, no shadow ledger,
 * no inferred IDs, no privileged RPC, and no client-facing authorization implied.
 * Hosted Auth/RLS, durable round-trip, browser and complete 11-domain journeys are separate gates.
 */
export async function loadCrossDomainJourneyReadProof(
  factory: EnjazDataLayerFactory,
  userId: string,
  companyId: string,
  transactionId: string,
): Promise<CrossDomainJourneyReadProof> {
  const companyKey = requiredId(companyId);
  const transactionKey = requiredId(transactionId);
  const workspaceId = await factory.resolveWorkspaceId(requiredId(userId));
  if (!workspaceId) throw new CrossDomainJourneyReadError('NO_WORKSPACE');
  const layer = factory.forWorkspace(workspaceId);
  const [company, transaction] = await Promise.all([
    layer.companies.getById(companyKey), layer.transactions.getById(transactionKey),
  ]);
  if (!company || !transaction) throw new CrossDomainJourneyReadError('NOT_FOUND');
  checkLinks(layer, workspaceId, company, transaction);

  const [procedures, followups, payments, documents] = await Promise.all([
    limited(layer.workflowInstances, 'transaction_id', transactionKey),
    limited(layer.followups, 'transaction_id', transactionKey),
    limited(layer.payments, 'transaction_id', transactionKey),
    limited(layer.documents, 'transaction_id', transactionKey),
  ]);
  for (const item of procedures) {
    assertWorkspace(item, workspaceId);
    if (item.transaction_id !== transactionKey) throw new CrossDomainJourneyReadError('LINK_DRIFT');
  }
  for (const item of followups) {
    assertWorkspace(item, workspaceId);
    if (item.transaction_id !== transactionKey) throw new CrossDomainJourneyReadError('LINK_DRIFT');
  }
  for (const item of payments) {
    assertWorkspace(item, workspaceId);
    if (item.transaction_id !== transactionKey || item.company_id !== companyKey)
      throw new CrossDomainJourneyReadError('LINK_DRIFT');
  }
  for (const item of documents) {
    assertWorkspace(item, workspaceId);
    if (item.transaction_id !== transactionKey || (item.company_id !== null && item.company_id !== companyKey))
      throw new CrossDomainJourneyReadError('LINK_DRIFT');
  }

  const reversals = payments.length
    ? await limited(layer.paymentReversals, 'payment_id', payments.map(item => item.id))
    : Object.freeze([]) as readonly RowOf<'payment_reversals'>[];
  const paymentIds = new Set(payments.map(item => item.id));
  for (const item of reversals) {
    assertWorkspace(item, workspaceId);
    if (!paymentIds.has(item.payment_id)) throw new CrossDomainJourneyReadError('LINK_DRIFT');
  }

  const [currentWorkspaceId, currentCompany, currentTransaction] = await Promise.all([
    factory.resolveWorkspaceId(userId),
    layer.companies.getById(companyKey),
    layer.transactions.getById(transactionKey),
  ]);
  if (currentWorkspaceId !== workspaceId || !currentCompany || !currentTransaction)
    throw new CrossDomainJourneyReadError('CHANGED');
  checkLinks(layer, workspaceId, currentCompany, currentTransaction);
  if (currentCompany.updated_at !== company.updated_at ||
      currentTransaction.updated_at !== transaction.updated_at ||
      currentTransaction.company_id !== transaction.company_id)
    throw new CrossDomainJourneyReadError('CHANGED');

  return Object.freeze({
    workspaceId, company, transaction, procedures, followups, payments, reversals, documents,
    proofKind: 'AUTHENTICATED_INTERNAL_READ_ONLY' as const,
    atomicMultiDomainSnapshotCertified: false as const,
    clientVisibilityCertified: false as const,
  });
}
