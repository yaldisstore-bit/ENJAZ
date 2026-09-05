import type { RowOf } from '../../data/contracts/dataTypes.ts';
import { buildTransactionListPreviewSource } from './transactionListPreview.ts';
import type { Transaction360Section, Transaction360Source } from './transaction360Model.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';

const ready = <T>(items: readonly T[] = []): Transaction360Section<T> => Object.freeze({ state: 'ready', items: Object.freeze([...items]) });

export function buildTransaction360PreviewSource(transactionId: string): Transaction360Source {
  const list = buildTransactionListPreviewSource();
  const transaction = list.transactions.find((row) => row.id === transactionId) ?? list.transactions[0];
  if (!transaction) throw new Error('Transaction 360 preview requires at least one transaction');
  const company = list.companies.find((row) => row.id === transaction.company_id) ?? null;

  const routes: RowOf<'transaction_routes'>[] = [
    { id: 'route-1', workspace_id: WORKSPACE_ID, transaction_id: transaction.id, station_name: 'تدقيق المستندات', assigned_to_text: 'فريق المتابعة', occurred_at: '2026-09-05T08:10:00.000Z', created_by: null, legacy_id: null, legacy_source: null },
    { id: 'route-2', workspace_id: WORKSPACE_ID, transaction_id: transaction.id, station_name: 'مسجل الشركات', assigned_to_text: null, occurred_at: '2026-09-04T12:30:00.000Z', created_by: null, legacy_id: null, legacy_source: null },
  ];
  const activity: RowOf<'transaction_activity'>[] = [
    { id: 'activity-1', workspace_id: WORKSPACE_ID, transaction_id: transaction.id, event_type: 'status', summary: 'تم تحديث حالة المعاملة', occurred_at: '2026-09-05T08:15:00.000Z', source_entity_type: 'transaction', source_entity_id: transaction.id, metadata: {}, actor_user_id: null, legacy_id: null, legacy_source: null },
    { id: 'activity-2', workspace_id: WORKSPACE_ID, transaction_id: transaction.id, event_type: 'document', summary: 'أضيف مستند إلى ملف المعاملة', occurred_at: '2026-09-04T15:20:00.000Z', source_entity_type: 'document', source_entity_id: 'document-1', metadata: {}, actor_user_id: null, legacy_id: null, legacy_source: null },
  ];
  const notes: RowOf<'transaction_notes'>[] = [
    { id: 'note-1', workspace_id: WORKSPACE_ID, transaction_id: transaction.id, body: 'تمت مراجعة بيانات الشركة ويجب التأكد من النسخة النهائية قبل التسليم.', created_at: '2026-09-05T07:45:00.000Z', created_by: null, legacy_id: null, legacy_source: null },
    { id: 'note-2', workspace_id: WORKSPACE_ID, transaction_id: transaction.id, body: 'العميل طلب إشعاره فور اكتمال مرحلة التدقيق.', created_at: '2026-09-04T10:00:00.000Z', created_by: null, legacy_id: null, legacy_source: null },
  ];
  const followups: RowOf<'transaction_followups'>[] = [
    { id: 'followup-1', workspace_id: WORKSPACE_ID, transaction_id: transaction.id, title: 'الاتصال بالشركة بشأن المستند الناقص', due_at: '2026-09-05T11:00:00.000Z', status: 'open', created_at: '2026-09-04T09:00:00.000Z', completed_at: null, completed_by: null, snoozed_until: null, legacy_id: null, legacy_source: null },
    { id: 'followup-2', workspace_id: WORKSPACE_ID, transaction_id: transaction.id, title: 'تأكيد استلام النسخة الموقعة', due_at: '2026-09-06T10:00:00.000Z', status: 'open', created_at: '2026-09-05T08:00:00.000Z', completed_at: null, completed_by: null, snoozed_until: null, legacy_id: null, legacy_source: null },
  ];
  const payments: RowOf<'payments'>[] = [
    { id: 'payment-1', workspace_id: WORKSPACE_ID, transaction_id: transaction.id, company_id: transaction.company_id, amount: Math.min(transaction.current_fee, 150_000), method: 'cash', paid_at: '2026-09-03T13:00:00.000Z', status: 'posted', receipt_ref: 'ENJAZ-1042', note: null, legacy_id: null, legacy_source: null, created_at: '2026-09-03T13:00:00.000Z' },
  ];
  const feeChanges: RowOf<'fee_changes'>[] = [
    { id: 'fee-1', workspace_id: WORKSPACE_ID, transaction_id: transaction.id, previous_fee: Math.max(0, transaction.current_fee - 50_000), new_fee: transaction.current_fee, reason: 'إضافة متطلبات جديدة للمعاملة', effective_at: '2026-09-02T09:00:00.000Z', actor_user_id: null },
  ];
  const documents: RowOf<'documents'>[] = [
    { id: 'document-1', workspace_id: WORKSPACE_ID, company_id: transaction.company_id, transaction_id: transaction.id, title: 'عقد التأسيس.pdf', document_type: 'contract', mime_type: 'application/pdf', storage_path: 'preview/contract.pdf', size_bytes: 480_000, original_size_bytes: 480_000, checksum: null, status: 'ready', captured_at: null, created_at: '2026-09-04T15:20:00.000Z', updated_at: '2026-09-04T15:20:00.000Z', legacy_id: null, legacy_source: null },
    { id: 'document-2', workspace_id: WORKSPACE_ID, company_id: transaction.company_id, transaction_id: transaction.id, title: 'كتاب الطلب الرسمي.pdf', document_type: 'letter', mime_type: 'application/pdf', storage_path: 'preview/letter.pdf', size_bytes: 290_000, original_size_bytes: 290_000, checksum: null, status: 'ready', captured_at: null, created_at: '2026-09-03T10:30:00.000Z', updated_at: '2026-09-03T10:30:00.000Z', legacy_id: null, legacy_source: null },
  ];
  const workflows: RowOf<'workflow_instances'>[] = [
    { id: 'workflow-1', workspace_id: WORKSPACE_ID, transaction_id: transaction.id, workflow_template_id: null, template_snapshot: { name: 'مسار تأسيس شركة' }, current_stage_position: 3, status: 'active', started_at: '2026-09-01T08:30:00.000Z', completed_at: null },
  ];
  const blockers: RowOf<'transaction_blockers'>[] = transaction.priority === 'urgent' ? [
    { id: 'blocker-1', workspace_id: WORKSPACE_ID, transaction_id: transaction.id, title: 'نسخة مصدقة مطلوبة', severity: 'high', note: 'لا يمكن إكمال التدقيق قبل وصولها.', status: 'open', opened_at: '2026-09-05T07:30:00.000Z', resolved_at: null },
  ] : [];

  return Object.freeze({
    transaction,
    company,
    contact: null,
    contactState: 'missing',
    routes: ready(routes),
    activity: ready(activity),
    notes: ready(notes),
    followups: ready(followups),
    payments: ready(payments),
    feeChanges: ready(feeChanges),
    documents: ready(documents),
    workflows: ready(workflows),
    blockers: ready(blockers),
  });
}
