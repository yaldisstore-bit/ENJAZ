import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import type { DataPage, RowOf } from '../../data/contracts/dataTypes.ts';
import { TRANSACTION_360_SECTION_LIMIT, type Transaction360Section, type Transaction360Source } from './transaction360Model.ts';

export class Transaction360WorkspaceUnavailableError extends Error {}
export class Transaction360NotFoundError extends Error {}
export class Transaction360DeletedError extends Error {}
export class Transaction360CoreLoadError extends Error {}

async function optionalSection<T>(loader: () => Promise<DataPage<T>>): Promise<Transaction360Section<T>> {
  try { const page = await loader(); return { state: page.hasMore ? 'truncated' : 'ready', items: page.items }; }
  catch { return { state: 'unavailable', items: [] }; }
}

type AnyRepo = { list: (query: unknown) => Promise<DataPage<unknown>> };

export async function loadTransaction360Source(factory: EnjazDataLayerFactory, userId: string, transactionId: string): Promise<Readonly<{ workspaceId: string; source: Transaction360Source }>> {
  const id = transactionId.trim();
  if (!id) throw new Transaction360NotFoundError();
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new Transaction360WorkspaceUnavailableError();
  const layer = factory.forWorkspace(workspaceId);

  let transaction: RowOf<'transactions'> | null;
  try { transaction = await layer.transactions.getById(id); }
  catch { throw new Transaction360CoreLoadError(); }
  if (!transaction) throw new Transaction360NotFoundError();
  if (transaction.deleted_at !== null) throw new Transaction360DeletedError();

  let company: RowOf<'companies'> | null;
  try { company = await layer.companies.getById(transaction.company_id); }
  catch { throw new Transaction360CoreLoadError(); }

  let contact: RowOf<'contacts'> | null = null;
  let contactState: Transaction360Source['contactState'] = transaction.primary_contact_id ? 'ready' : 'missing';
  if (transaction.primary_contact_id) try {
    contact = await layer.contacts.getById(transaction.primary_contact_id);
    if (!contact || contact.deleted_at !== null) contactState = 'missing';
  } catch { contactState = 'unavailable'; }

  const filter = [{ column: 'transaction_id' as const, operator: 'eq' as const, value: transaction.id }];
  const load = (repo: unknown, column: string, ascending = false) => optionalSection(() => (repo as AnyRepo).list({ filters: filter, orderBy: [{ column, ascending }], limit: TRANSACTION_360_SECTION_LIMIT }));
  const [routes, activity, notes, followups, payments, feeChanges, documents, workflows, blockers] = await Promise.all([
    load(layer.transactionRoutes, 'occurred_at'), load(layer.transactionActivity, 'occurred_at'), load(layer.transactionNotes, 'created_at'),
    load(layer.followups, 'due_at', true), load(layer.payments, 'paid_at'), load(layer.feeChanges, 'effective_at'),
    load(layer.documents, 'created_at'), load(layer.workflowInstances, 'started_at'), load(layer.blockers, 'opened_at'),
  ]);

  return { workspaceId, source: { transaction, company, contact, contactState, routes, activity, notes, followups, payments, feeChanges, documents, workflows, blockers } as Transaction360Source };
}
