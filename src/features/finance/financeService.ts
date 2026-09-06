import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { FinanceSource } from './financeModel.ts';

const FINANCE_BATCH_SIZE = 100;
export const FINANCE_SOURCE_LIMIT = 10_000;

export class FinanceWorkspaceUnavailableError extends Error {
  constructor() {
    super('finance workspace unavailable');
    this.name = 'FinanceWorkspaceUnavailableError';
  }
}

export class FinanceSourceCapacityError extends Error {
  readonly sourceName: string;
  constructor(sourceName: string) {
    super(`finance source capacity exceeded: ${sourceName}`);
    this.name = 'FinanceSourceCapacityError';
    this.sourceName = sourceName;
  }
}

export class FinanceSourcePageStalledError extends Error {
  readonly sourceName: string;
  constructor(sourceName: string) {
    super(`finance source page stalled: ${sourceName}`);
    this.name = 'FinanceSourcePageStalledError';
    this.sourceName = sourceName;
  }
}

type Page<T> = Readonly<{ items: readonly T[]; hasMore: boolean }>;

async function collectAll<T>(
  sourceName: string,
  readPage: (offset: number, limit: number) => Promise<Page<T>>,
): Promise<readonly T[]> {
  const rows: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await readPage(offset, FINANCE_BATCH_SIZE);
    rows.push(...page.items);
    if (rows.length > FINANCE_SOURCE_LIMIT) throw new FinanceSourceCapacityError(sourceName);
    if (!page.hasMore) return Object.freeze(rows);
    if (page.items.length === 0) throw new FinanceSourcePageStalledError(sourceName);
    offset += page.items.length;
  }
}

async function collectTransactions(layer: EnjazWorkspaceDataLayer): Promise<readonly RowOf<'transactions'>[]> {
  return collectAll('transactions', async (offset, limit) => layer.transactions.list({
    orderBy: [{ column: 'created_at', ascending: false }],
    offset,
    limit,
  }));
}

async function collectCompanies(layer: EnjazWorkspaceDataLayer): Promise<readonly RowOf<'companies'>[]> {
  return collectAll('companies', async (offset, limit) => layer.companies.list({
    orderBy: [{ column: 'created_at', ascending: false }],
    offset,
    limit,
  }));
}

async function collectPayments(layer: EnjazWorkspaceDataLayer): Promise<readonly RowOf<'payments'>[]> {
  return collectAll('payments', async (offset, limit) => layer.payments.list({
    orderBy: [{ column: 'paid_at', ascending: false }],
    offset,
    limit,
  }));
}

async function collectPaymentReversals(layer: EnjazWorkspaceDataLayer): Promise<readonly RowOf<'payment_reversals'>[]> {
  return collectAll('payment_reversals', async (offset, limit) => layer.paymentReversals.list({
    orderBy: [{ column: 'reversed_at', ascending: false }],
    offset,
    limit,
  }));
}

async function collectLedger(layer: EnjazWorkspaceDataLayer): Promise<readonly RowOf<'financial_ledger_entries'>[]> {
  return collectAll('financial_ledger_entries', async (offset, limit) => layer.ledger.list({
    orderBy: [{ column: 'occurred_at', ascending: false }],
    offset,
    limit,
  }));
}

async function collectCashboxes(layer: EnjazWorkspaceDataLayer): Promise<readonly RowOf<'cashbox_accounts'>[]> {
  return collectAll('cashbox_accounts', async (offset, limit) => layer.cashboxes.list({
    orderBy: [{ column: 'opened_at', ascending: true }],
    offset,
    limit,
  }));
}

export async function loadFinanceSource(
  factory: EnjazDataLayerFactory,
  userId: string,
): Promise<Readonly<{ workspaceId: string; source: FinanceSource }>> {
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new FinanceWorkspaceUnavailableError();
  const layer = factory.forWorkspace(workspaceId);

  const [transactions, companies, payments, paymentReversals, ledger, cashboxes] = await Promise.all([
    collectTransactions(layer),
    collectCompanies(layer),
    collectPayments(layer),
    collectPaymentReversals(layer),
    collectLedger(layer),
    collectCashboxes(layer),
  ]);

  return Object.freeze({
    workspaceId,
    source: Object.freeze({ transactions, companies, payments, paymentReversals, ledger, cashboxes }),
  });
}
