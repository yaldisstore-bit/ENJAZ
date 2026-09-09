import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { IdWorkspaceTableName, ListRequest, RowOf } from '../../data/contracts/dataTypes.ts';
import type { ReadRepository } from '../../data/repositories/createEntityRepository.ts';
import type { FieldOperationsCommandGateway, FieldOperationsContext } from '../field-operations/fieldOperationsCommands.ts';
import { buildFinancialIntelligenceSnapshot, type FinanceIntelligenceSnapshot } from '../finance/financeIntelligence.ts';
import { loadFinanceSource } from '../finance/financeService.ts';
import {
  evaluateRiskSnapshot,
  type RiskFinanceAnomalyFact,
  type RiskSignal,
  type RiskTransactionFact,
  type RiskWorkloadFact,
} from './riskEngine.ts';

const RISK_PAGE_SIZE = 100;
export const RISK_SOURCE_LIMIT = 10_000;

export class RiskWorkspaceUnavailableError extends Error {
  constructor() {
    super('No ENJAZ workspace is available for Smart Risk');
    this.name = 'RiskWorkspaceUnavailableError';
  }
}

export class RiskSourceCapacityError extends Error {
  readonly sourceName: string;
  constructor(sourceName: string) {
    super(`Smart Risk source capacity exceeded: ${sourceName}`);
    this.name = 'RiskSourceCapacityError';
    this.sourceName = sourceName;
  }
}

export class RiskSourcePageStalledError extends Error {
  readonly sourceName: string;
  constructor(sourceName: string) {
    super(`Smart Risk source page stalled: ${sourceName}`);
    this.name = 'RiskSourcePageStalledError';
    this.sourceName = sourceName;
  }
}

export class RiskAuthorityDriftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RiskAuthorityDriftError';
  }
}

type FinanceRiskSnapshot = Pick<FinanceIntelligenceSnapshot, 'asOf' | 'signals'>;
export type FinanceRiskLoader = (
  factory: EnjazDataLayerFactory,
  userId: string,
  now: Date,
) => Promise<Readonly<{ workspaceId: string; snapshot: FinanceRiskSnapshot }>>;

export interface SmartRiskDependencies {
  readonly dataFactory: EnjazDataLayerFactory;
  readonly fieldOperations: Pick<FieldOperationsCommandGateway, 'loadContext'>;
  readonly financeRiskLoader?: FinanceRiskLoader;
}

export interface SmartRiskLiveResult {
  readonly workspaceId: string;
  readonly evaluatedAt: string;
  readonly authority: 'read_only_derived_intelligence';
  readonly signals: readonly RiskSignal[];
  readonly sourceCounts: Readonly<{
    transactions: number;
    blockers: number;
    financeAnomalies: number;
    workloadOwners: number;
  }>;
}

async function collectAll<T extends IdWorkspaceTableName>(
  sourceName: string,
  repository: ReadRepository<T>,
  request: Omit<ListRequest<T>, 'offset' | 'limit'> = {},
): Promise<readonly RowOf<T>[]> {
  const rows: RowOf<T>[] = [];
  let offset = 0;
  for (;;) {
    const page = await repository.list({ ...request, offset, limit: RISK_PAGE_SIZE });
    rows.push(...page.items);
    if (rows.length > RISK_SOURCE_LIMIT) throw new RiskSourceCapacityError(sourceName);
    if (!page.hasMore) return Object.freeze(rows);
    if (page.items.length === 0) throw new RiskSourcePageStalledError(sourceName);
    offset += page.items.length;
  }
}

async function defaultFinanceRiskLoader(
  factory: EnjazDataLayerFactory,
  userId: string,
  now: Date,
): Promise<Readonly<{ workspaceId: string; snapshot: FinanceRiskSnapshot }>> {
  const loaded = await loadFinanceSource(factory, userId);
  return Object.freeze({
    workspaceId: loaded.workspaceId,
    snapshot: buildFinancialIntelligenceSnapshot(loaded.source, now),
  });
}

function activeTransaction(row: RowOf<'transactions'>): boolean {
  return row.deleted_at === null && row.archived_at === null && row.status !== 'completed';
}

function transactionLabel(row: RowOf<'transactions'>): string {
  const legacy = row.legacy_id?.trim();
  return legacy ? `معاملة ${legacy}` : row.type.trim() || `معاملة ${row.id.slice(0, 8)}`;
}

function companyLabel(row: RowOf<'companies'> | undefined): string | undefined {
  if (!row) return undefined;
  return row.display_name?.trim() || row.legal_name.trim() || undefined;
}

function assertFieldReadAuthority(context: FieldOperationsContext): void {
  if (
    context.authority !== 'field_assignments_visits_evidence_receipts'
    || context.transactionWriteAuthority !== 'none'
    || context.workflowWriteAuthority !== 'existing_workflow_rpc_only'
    || context.automationWriteAuthority !== 'existing_automation_rpc_only'
    || context.financeWriteAuthority !== 'none'
  ) throw new RiskAuthorityDriftError('Smart Risk refused Field Operations authority drift');
}

function mapFinanceAnomalies(snapshot: FinanceRiskSnapshot): readonly RiskFinanceAnomalyFact[] {
  return Object.freeze(snapshot.signals.flatMap((signal): RiskFinanceAnomalyFact[] => {
    if (signal.severity === 'info') return [];
    return [{
      id: signal.id,
      label: signal.title,
      kind: `finance_7_3:${signal.id}`,
      severity: signal.severity === 'high' ? 'high' : 'medium',
      explanation: signal.explanation,
      observedAt: snapshot.asOf,
    }];
  }));
}

function mapWorkloads(context: FieldOperationsContext, evaluatedAt: string): readonly RiskWorkloadFact[] {
  assertFieldReadAuthority(context);
  const grouped = new Map<string, { ownerLabel: string; activeCount: number; urgentCount: number }>();
  for (const assignment of context.assignments) {
    if (assignment.status !== 'queued' && assignment.status !== 'in_progress') continue;
    const current = grouped.get(assignment.assignedUserId) ?? {
      ownerLabel: assignment.assignedUserName,
      activeCount: 0,
      urgentCount: 0,
    };
    current.activeCount += 1;
    if (assignment.priority === 'urgent') current.urgentCount += 1;
    grouped.set(assignment.assignedUserId, current);
  }
  return Object.freeze([...grouped].map(([ownerId, value]) => Object.freeze({
    ownerId,
    ownerLabel: value.ownerLabel,
    activeCount: value.activeCount,
    urgentCount: value.urgentCount,
    observedAt: evaluatedAt,
  })));
}

function mapTransactions(
  transactions: readonly RowOf<'transactions'>[],
  blockers: readonly RowOf<'transaction_blockers'>[],
  companies: readonly RowOf<'companies'>[],
): readonly RiskTransactionFact[] {
  const companyById = new Map(companies
    .filter((row) => row.deleted_at === null)
    .map((row) => [row.id, row]));
  const blockerByTransaction = new Map<string, RowOf<'transaction_blockers'>[]>();
  for (const blocker of blockers) {
    if (blocker.status !== 'open') continue;
    const bucket = blockerByTransaction.get(blocker.transaction_id) ?? [];
    bucket.push(blocker);
    blockerByTransaction.set(blocker.transaction_id, bucket);
  }

  return Object.freeze(transactions.filter(activeTransaction).map((row): RiskTransactionFact => {
    const labelParts = [companyLabel(companyById.get(row.company_id)), transactionLabel(row)].filter(Boolean);
    const label = labelParts.join(' · ');
    return Object.freeze({
      id: row.id,
      ...(label ? { label } : {}),
      status: row.status,
      ...(row.priority === null ? {} : { priority: row.priority }),
      ...(row.last_activity_at === null ? {} : { lastActivityAt: row.last_activity_at }),
      blockers: Object.freeze((blockerByTransaction.get(row.id) ?? []).map((blocker) => Object.freeze({
        id: blocker.id,
        severity: blocker.severity,
        status: blocker.status,
        ...(blocker.opened_at ? { openedAt: blocker.opened_at } : {}),
      }))),
    });
  }));
}

export async function loadSmartRisk(
  dependencies: SmartRiskDependencies,
  userId: string,
  now: Date = new Date(),
): Promise<SmartRiskLiveResult> {
  if (!Number.isFinite(now.getTime())) throw new Error('Smart Risk requires a valid evaluation time');
  const workspaceId = await dependencies.dataFactory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new RiskWorkspaceUnavailableError();
  const layer: EnjazWorkspaceDataLayer = dependencies.dataFactory.forWorkspace(workspaceId);
  const financeLoader = dependencies.financeRiskLoader ?? defaultFinanceRiskLoader;

  const [transactions, companies, blockers, finance, fieldContext] = await Promise.all([
    collectAll('transactions', layer.transactions, {
      filters: [
        { column: 'archived_at', operator: 'is', value: null },
        { column: 'deleted_at', operator: 'is', value: null },
        { column: 'status', operator: 'neq', value: 'completed' },
      ],
      orderBy: [{ column: 'last_activity_at', ascending: false }],
    }),
    collectAll('companies', layer.companies, {
      filters: [{ column: 'deleted_at', operator: 'is', value: null }],
      orderBy: [{ column: 'updated_at', ascending: false }],
    }),
    collectAll('transaction_blockers', layer.blockers, {
      filters: [{ column: 'status', operator: 'eq', value: 'open' }],
      orderBy: [{ column: 'opened_at', ascending: false }],
    }),
    financeLoader(dependencies.dataFactory, userId, now),
    dependencies.fieldOperations.loadContext(workspaceId),
  ]);

  if (finance.workspaceId !== workspaceId) {
    throw new RiskAuthorityDriftError('Smart Risk refused cross-workspace finance composition');
  }
  assertFieldReadAuthority(fieldContext);

  const evaluatedAt = now.toISOString();
  const transactionFacts = mapTransactions(transactions, blockers, companies);
  const financeAnomalies = mapFinanceAnomalies(finance.snapshot);
  const workloads = mapWorkloads(fieldContext, evaluatedAt);
  const signals = evaluateRiskSnapshot(Object.freeze({
    evaluatedAt,
    transactions: transactionFacts,
    financeAnomalies,
    workloads,
  }));

  return Object.freeze({
    workspaceId,
    evaluatedAt,
    authority: 'read_only_derived_intelligence',
    signals,
    sourceCounts: Object.freeze({
      transactions: transactionFacts.length,
      blockers: blockers.filter((row) => row.status === 'open').length,
      financeAnomalies: financeAnomalies.length,
      workloadOwners: workloads.length,
    }),
  });
}
