import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { FinanceSource } from './financeModel.ts';

const FINANCE_BATCH_SIZE = 100;
export const FINANCE_SOURCE_LIMIT = 10_000;

type Page<T> = Readonly<{ items: readonly T[]; hasMore: boolean }>;
type PageRepository<T> = { list(request: Readonly<Record<string, unknown>>): Promise<Page<T>> };

export class FinanceWorkspaceUnavailableError extends Error {
  constructor() { super('finance workspace unavailable'); this.name = 'FinanceWorkspaceUnavailableError'; }
}

export class FinanceSourceCapacityError extends Error {
  readonly sourceName: string;
  constructor(sourceName: string) { super(`finance source capacity exceeded: ${sourceName}`); this.name = 'FinanceSourceCapacityError'; this.sourceName = sourceName; }
}

export class FinanceSourcePageStalledError extends Error {
  readonly sourceName: string;
  constructor(sourceName: string) { super(`finance source page stalled: ${sourceName}`); this.name = 'FinanceSourcePageStalledError'; this.sourceName = sourceName; }
}

async function collect<T>(sourceName: string, repository: PageRepository<T>, orderColumn: string, ascending = false): Promise<readonly T[]> {
  const rows: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await repository.list({ orderBy: [{ column: orderColumn, ascending }], offset, limit: FINANCE_BATCH_SIZE });
    rows.push(...page.items);
    if (rows.length > FINANCE_SOURCE_LIMIT) throw new FinanceSourceCapacityError(sourceName);
    if (!page.hasMore) return Object.freeze(rows);
    if (!page.items.length) throw new FinanceSourcePageStalledError(sourceName);
    offset += page.items.length;
  }
}

function repo<T>(value: unknown): PageRepository<T> { return value as PageRepository<T>; }

export async function loadFinanceSource(factory: EnjazDataLayerFactory, userId: string): Promise<Readonly<{ workspaceId: string; source: FinanceSource }>> {
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new FinanceWorkspaceUnavailableError();
  const layer: EnjazWorkspaceDataLayer = factory.forWorkspace(workspaceId);
  const [transactions, companies, payments, paymentReversals, ledger, cashboxes] = await Promise.all([
    collect('transactions', repo<RowOf<'transactions'>>(layer.transactions), 'created_at'),
    collect('companies', repo<RowOf<'companies'>>(layer.companies), 'created_at'),
    collect('payments', repo<RowOf<'payments'>>(layer.payments), 'paid_at'),
    collect('payment_reversals', repo<RowOf<'payment_reversals'>>(layer.paymentReversals), 'reversed_at'),
    collect('financial_ledger_entries', repo<RowOf<'financial_ledger_entries'>>(layer.ledger), 'occurred_at'),
    collect('cashbox_accounts', repo<RowOf<'cashbox_accounts'>>(layer.cashboxes), 'opened_at', true),
  ]);
  return Object.freeze({ workspaceId, source: Object.freeze({ transactions, companies, payments, paymentReversals, ledger, cashboxes }) });
}
