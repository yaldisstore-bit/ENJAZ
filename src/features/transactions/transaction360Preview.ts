import type { RowOf } from '../../data/contracts/dataTypes.ts';
import { buildTransactionListPreviewSource } from './transactionListPreview.ts';
import type { Transaction360Section, Transaction360Source } from './transaction360Model.ts';

const ready = <T>(...items: T[]): Transaction360Section<T> => ({ state: 'ready', items });

export function buildTransaction360PreviewSource(transactionId: string): Transaction360Source {
  const list = buildTransactionListPreviewSource();
  const transaction = list.transactions.find((row) => row.id === transactionId) ?? list.transactions[0];
  if (!transaction) throw new Error('360 preview requires a transaction');
  const company = list.companies.find((row) => row.id === transaction.company_id) ?? null;

  const route = { id: 'route-1', station_name: 'تدقيق', occurred_at: '2026-09-05T08:10Z' } as RowOf<'transaction_routes'>;
  const activity = { id: 'activity-1', event_type: 'status', summary: 'تحديث الحالة', occurred_at: '2026-09-05T08:15Z' } as RowOf<'transaction_activity'>;
  const note = { id: 'note-1', body: 'مراجعة قبل التسليم.', created_at: '2026-09-05T07:45Z' } as RowOf<'transaction_notes'>;
  const followup = { id: 'followup-1', title: 'المستند الناقص', due_at: '2026-09-05T11:00Z', status: 'open', completed_at: null } as RowOf<'transaction_followups'>;
  const payment = { id: 'payment-1', amount: Math.min(transaction.current_fee, 150_000), paid_at: '2026-09-03T13:00Z', status: 'posted', receipt_ref: '' } as RowOf<'payments'>;
  const fee = { id: 'fee-1', reason: 'تعديل', effective_at: '2026-09-02T09:00Z' } as RowOf<'fee_changes'>;
  const document = { id: 'document-1', title: 'عقد.pdf', document_type: 'pdf', status: 'ready' } as RowOf<'documents'>;
  const workflow = { id: 'workflow-1', current_stage_position: 3, status: 'active', started_at: '2026-09-01T08:30Z' } as RowOf<'workflow_instances'>;
  const blocker = { id: 'blocker-1', severity: 'high', status: 'open', resolved_at: null } as RowOf<'transaction_blockers'>;

  return {
    transaction, company, contact: null, contactState: 'missing', routes: ready(route), activity: ready(activity), notes: ready(note), followups: ready(followup),
    payments: ready(payment), feeChanges: ready(fee), documents: ready(document), workflows: ready(workflow),
    blockers: transaction.priority === 'urgent' ? ready(blocker) : ready<RowOf<'transaction_blockers'>>(),
  };
}
