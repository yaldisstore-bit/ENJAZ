import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { ReadRepository } from '../../data/repositories/createEntityRepository.ts';
import type { TransactionListSource } from './transactionListModel.ts';

const TRANSACTION_BATCH_SIZE = 100;
const TRANSACTION_SOURCE_LIMIT = 5_000;
const COMPANY_BATCH_SIZE = 100;

export class TransactionWorkspaceUnavailableError extends Error {
  constructor() {
    super('No ENJAZ workspace is available for the authenticated user');
    this.name = 'TransactionWorkspaceUnavailableError';
  }
}

export class TransactionListCapacityError extends Error {
  constructor() {
    super(`Transaction list exceeds the Phase 5.1 safe source limit of ${TRANSACTION_SOURCE_LIMIT} rows`);
    this.name = 'TransactionListCapacityError';
  }
}

async function collectTransactions(repository: ReadRepository<'transactions'>): Promise<readonly RowOf<'transactions'>[]> {
  const rows: RowOf<'transactions'>[] = [];
  let offset = 0;

  for (;;) {
    const page = await repository.list({
      filters: [{ column: 'deleted_at', operator: 'is', value: null }],
      orderBy: [{ column: 'last_activity_at', ascending: false }],
      offset,
      limit: TRANSACTION_BATCH_SIZE,
    });
    rows.push(...page.items);
    if (rows.length > TRANSACTION_SOURCE_LIMIT) throw new TransactionListCapacityError();
    if (!page.hasMore) return Object.freeze(rows);
    if (page.items.length === 0) throw new Error('Non-progressing transaction source page');
    offset += page.items.length;
  }
}

async function loadCompanies(
  layer: EnjazWorkspaceDataLayer,
  transactions: readonly RowOf<'transactions'>[],
): Promise<readonly RowOf<'companies'>[]> {
  const ids = [...new Set(transactions.map((row) => row.company_id))];
  const companies: RowOf<'companies'>[] = [];

  for (let index = 0; index < ids.length; index += COMPANY_BATCH_SIZE) {
    const batch = ids.slice(index, index + COMPANY_BATCH_SIZE);
    if (!batch.length) continue;
    const page = await layer.companies.list({
      filters: [
        { column: 'id', operator: 'in', value: batch },
        { column: 'deleted_at', operator: 'is', value: null },
      ],
      orderBy: [{ column: 'legal_name', ascending: true }],
      offset: 0,
      limit: COMPANY_BATCH_SIZE,
    });
    companies.push(...page.items);
  }

  return Object.freeze(companies);
}

export async function loadTransactionListSource(
  factory: EnjazDataLayerFactory,
  userId: string,
): Promise<Readonly<{ workspaceId: string; source: TransactionListSource }>> {
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new TransactionWorkspaceUnavailableError();

  const layer = factory.forWorkspace(workspaceId);
  const transactions = await collectTransactions(layer.transactions);
  const companies = await loadCompanies(layer, transactions);

  return Object.freeze({
    workspaceId,
    source: Object.freeze({ transactions, companies }),
  });
}
