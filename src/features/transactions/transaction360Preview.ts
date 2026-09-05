import type { RowOf } from '../../data/contracts/dataTypes.ts';
import { buildTransactionListPreviewSource } from './transactionListPreview.ts';
import type { Transaction360Section, Transaction360Source } from './transaction360Model.ts';

const W = '11111111-1111-4111-8111-111111111111';
const ready = <T>(...items: T[]): Transaction360Section<T> => Object.freeze({ state: 'ready', items: Object.freeze(items) });

export function buildTransaction360PreviewSource(transactionId: string): Transaction360Source {
  const list = buildTransactionListPreviewSource();
  const transaction = list.transactions.find((row) => row.id === transactionId) ?? list.transactions[0];
  if (!transaction) throw new Error('360 preview requires a transaction');
  const company = list.companies.find((row) => row.id === transaction.company_id) ?? null;
  const t = transaction.id;
  const base = { workspace_id: W, transaction_id: t } as const;

  const route: RowOf<'transaction_routes'> = { ...base, id: 'route-1', station_name: 'تدقيق المستندات', assigned_to_text: 'فريق المتابعة', occurred_at: '2026-09-05T08:10:00Z', created_by: null, legacy_id: null, legacy_source: null };
  const activity: RowOf<'transaction_activity'> = { ...base, id: 'activity-1', event_type: 'status', summary: 'تم تحديث حالة المعاملة', occurred_at: '2026-09-05T08:15:00Z', source_entity_type: 'transaction', source_entity_id: t, metadata: {}, actor_user_id: null, legacy_id: null, legacy_source: null };
  const note: RowOf<'transaction_notes'> = { ...base, id: 'note-1', body: 'تمت مراجعة بيانات الشركة قبل التسليم.', created_at: '2026-09-05T07:45:00Z', created_by: null, legacy_id: null, legacy_source: null };
  const followup: RowOf<'transaction_followups'> = { ...base, id: 'followup-1', title: 'متابعة المستند الناقص', due_at: '2026-09-05T11:00:00Z', status: 'open', created_at: '2026-09-04T09:00:00Z', completed_at: null, completed_by: null, snoozed_until: null, legacy_id: null, legacy_source: null };
  const payment: RowOf<'payments'> = { ...base, id: 'payment-1', company_id: transaction.company_id, amount: Math.min(transaction.current_fee, 150_000), method: 'cash', paid_at: '2026-09-03T13:00:00Z', status: 'posted', receipt_ref: 'ENJAZ-1042', note: null, legacy_id: null, legacy_source: null, created_at: '2026-09-03T13:00:00Z' };
  const fee: RowOf<'fee_changes'> = { ...base, id: 'fee-1', previous_fee: Math.max(0, transaction.current_fee - 50_000), new_fee: transaction.current_fee, reason: 'متطلبات إضافية', effective_at: '2026-09-02T09:00:00Z', actor_user_id: null };
  const document: RowOf<'documents'> = { ...base, id: 'document-1', company_id: transaction.company_id, title: 'عقد التأسيس.pdf', document_type: 'contract', mime_type: 'application/pdf', storage_path: 'preview/contract.pdf', size_bytes: 480_000, original_size_bytes: 480_000, checksum: null, status: 'ready', captured_at: null, created_at: '2026-09-04T15:20:00Z', updated_at: '2026-09-04T15:20:00Z', legacy_id: null, legacy_source: null };
  const workflow: RowOf<'workflow_instances'> = { ...base, id: 'workflow-1', workflow_template_id: null, template_snapshot: { name: 'مسار تأسيس' }, current_stage_position: 3, status: 'active', started_at: '2026-09-01T08:30:00Z', completed_at: null };
  const blocker: RowOf<'transaction_blockers'> = { ...base, id: 'blocker-1', title: 'نسخة مصدقة مطلوبة', severity: 'high', note: null, status: 'open', opened_at: '2026-09-05T07:30:00Z', resolved_at: null };

  return Object.freeze({
    transaction, company, contact: null, contactState: 'missing',
    routes: ready(route), activity: ready(activity), notes: ready(note), followups: ready(followup),
    payments: ready(payment), feeChanges: ready(fee), documents: ready(document), workflows: ready(workflow),
    blockers: transaction.priority === 'urgent' ? ready(blocker) : ready(),
  });
}
