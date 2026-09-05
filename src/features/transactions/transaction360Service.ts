import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import type { DataPage, RowOf } from '../../data/contracts/dataTypes.ts';
import { TRANSACTION_360_SECTION_LIMIT, type Transaction360Section, type Transaction360Source } from './transaction360Model.ts';

export class Transaction360WorkspaceUnavailableError extends Error {
  constructor() { super('No workspace is available for Transaction 360'); this.name = 'Transaction360WorkspaceUnavailableError'; }
}

export class Transaction360NotFoundError extends Error {
  constructor() { super('Transaction was not found'); this.name = 'Transaction360NotFoundError'; }
}

export class Transaction360DeletedError extends Error {
  constructor() { super('Deleted transaction is outside Phase 5.3'); this.name = 'Transaction360DeletedError'; }
}

export class Transaction360CoreLoadError extends Error {
  constructor(message: string, options?: ErrorOptions) { super(message, options); this.name = 'Transaction360CoreLoadError'; }
}

async function optionalSection<T>(loader: () => Promise<DataPage<T>>): Promise<Transaction360Section<T>> {
  try {
    const page = await loader();
    return Object.freeze({ state: page.hasMore ? 'truncated' : 'ready', items: Object.freeze([...page.items]) });
  } catch {
    return Object.freeze({ state: 'unavailable', items: Object.freeze([]) });
  }
}

export async function loadTransaction360Source(
  factory: EnjazDataLayerFactory,
  userId: string,
  transactionId: string,
): Promise<Readonly<{ workspaceId: string; source: Transaction360Source }>> {
  const id = transactionId.trim();
  if (!id) throw new Transaction360NotFoundError();

  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new Transaction360WorkspaceUnavailableError();
  const layer = factory.forWorkspace(workspaceId);

  let transaction: RowOf<'transactions'> | null;
  try {
    transaction = await layer.transactions.getById(id);
  } catch (error) {
    throw new Transaction360CoreLoadError('Authoritative transaction read failed', { cause: error });
  }
  if (!transaction) throw new Transaction360NotFoundError();
  if (transaction.deleted_at !== null) throw new Transaction360DeletedError();

  let company: RowOf<'companies'> | null;
  try {
    company = await layer.companies.getById(transaction.company_id);
  } catch (error) {
    throw new Transaction360CoreLoadError('Authoritative company relation read failed', { cause: error });
  }

  let contact: RowOf<'contacts'> | null = null;
  let contactState: Transaction360Source['contactState'] = transaction.primary_contact_id ? 'ready' : 'missing';
  if (transaction.primary_contact_id) {
    try {
      contact = await layer.contacts.getById(transaction.primary_contact_id);
      if (!contact || contact.deleted_at !== null) contactState = 'missing';
    } catch {
      contactState = 'unavailable';
    }
  }

  const filter = [{ column: 'transaction_id' as const, operator: 'eq' as const, value: transaction.id }];
  const [routes, activity, notes, followups, payments, feeChanges, documents, workflows, blockers] = await Promise.all([
    optionalSection(() => layer.transactionRoutes.list({ filters: filter, orderBy: [{ column: 'occurred_at', ascending: false }], limit: TRANSACTION_360_SECTION_LIMIT })),
    optionalSection(() => layer.transactionActivity.list({ filters: filter, orderBy: [{ column: 'occurred_at', ascending: false }], limit: TRANSACTION_360_SECTION_LIMIT })),
    optionalSection(() => layer.transactionNotes.list({ filters: filter, orderBy: [{ column: 'created_at', ascending: false }], limit: TRANSACTION_360_SECTION_LIMIT })),
    optionalSection(() => layer.followups.list({ filters: filter, orderBy: [{ column: 'due_at', ascending: true }], limit: TRANSACTION_360_SECTION_LIMIT })),
    optionalSection(() => layer.payments.list({ filters: filter, orderBy: [{ column: 'paid_at', ascending: false }], limit: TRANSACTION_360_SECTION_LIMIT })),
    optionalSection(() => layer.feeChanges.list({ filters: filter, orderBy: [{ column: 'effective_at', ascending: false }], limit: TRANSACTION_360_SECTION_LIMIT })),
    optionalSection(() => layer.documents.list({ filters: filter, orderBy: [{ column: 'created_at', ascending: false }], limit: TRANSACTION_360_SECTION_LIMIT })),
    optionalSection(() => layer.workflowInstances.list({ filters: filter, orderBy: [{ column: 'started_at', ascending: false }], limit: TRANSACTION_360_SECTION_LIMIT })),
    optionalSection(() => layer.blockers.list({ filters: filter, orderBy: [{ column: 'opened_at', ascending: false }], limit: TRANSACTION_360_SECTION_LIMIT })),
  ]);

  const source: Transaction360Source = Object.freeze({
    transaction,
    company,
    contact,
    contactState,
    routes,
    activity,
    notes,
    followups,
    payments,
    feeChanges,
    documents,
    workflows,
    blockers,
  });
  return Object.freeze({ workspaceId, source });
}
