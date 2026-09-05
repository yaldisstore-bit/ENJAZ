import { useMemo, useState } from 'react';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import { buildTransactionListPreviewSource } from '../../features/transactions/transactionListPreview.ts';
import {
  buildTransactionLifecyclePatch,
  transactionLifecycleCapabilities,
  type TransactionLifecycleAction,
  type TransactionLifecycleCapabilities,
} from '../../features/transactions/transactionLifecycleModel.ts';
import type { TransactionLifecycleWarning } from '../../features/transactions/transactionLifecycleService.ts';
import { useTransactionLifecycle, type TransactionLifecycleControllerState } from '../../features/transactions/useTransactionLifecycle.ts';
import { EzDialog } from '../components/overlays.tsx';
import { EzButton, EzChip, EzField, EzNotice, EzSurface } from '../components/primitives.tsx';

interface LifecycleViewProps {
  readonly status: TransactionLifecycleControllerState;
  readonly transaction: RowOf<'transactions'> | null;
  readonly capabilities: TransactionLifecycleCapabilities | null;
  readonly openFollowupCount: number;
  readonly errorMessage: string | null;
  readonly warnings: readonly TransactionLifecycleWarning[];
  readonly onRetry: () => void;
  readonly onExecute: (action: TransactionLifecycleAction, note?: string | null) => Promise<boolean>;
  readonly onChanged?: (() => void) | undefined;
}

function lifecycleStatusLabel(transaction: RowOf<'transactions'>): string {
  if (transaction.archived_at !== null) return 'مؤرشفة';
  if (transaction.status === 'completed' || transaction.completed_at !== null) return 'مكتملة';
  if (transaction.status === 'stalled') return 'متلكئة';
  return 'جارية';
}

function actionLabel(action: TransactionLifecycleAction): string {
  if (action === 'archive') return 'أرشفة المعاملة';
  if (action === 'restore') return 'استعادة من الأرشيف';
  return 'إعادة تنشيط المعاملة';
}

function actionDescription(action: TransactionLifecycleAction, transaction: RowOf<'transactions'>): string {
  if (action === 'archive') {
    return 'ستخرج المعاملة من العمل النشط، لكن الملاحظات والمتابعات والسجل المالي والتاريخ التشغيلي ستبقى محفوظة دون حذف.';
  }
  if (action === 'restore') {
    return transaction.status === 'completed' || transaction.completed_at !== null
      ? 'سيُزال وسم الأرشفة فقط. ستبقى المعاملة مكتملة ولن تعود إلى العمل النشط إلا بإجراء منفصل لإعادة التنشيط.'
      : 'سيُزال وسم الأرشفة وتعود المعاملة إلى حالتها التشغيلية السابقة. المتابعات المفتوحة المحفوظة قد تصبح نشطة مجددًا.';
  }
  return 'سيتم فتح المعاملة المكتملة للعمل من جديد، وإزالة تاريخ الإكمال والأرشفة إن وجد. المتابعات المفتوحة المحفوظة قد تعود إلى مساحات العمل النشط.';
}

function actionTone(action: TransactionLifecycleAction): 'danger' | 'dark' | 'ghost' {
  if (action === 'archive') return 'danger';
  if (action === 'reactivate') return 'dark';
  return 'ghost';
}

function confirmTone(action: TransactionLifecycleAction): 'warning' | 'danger' {
  return action === 'archive' ? 'danger' : 'warning';
}

function availableActions(capabilities: TransactionLifecycleCapabilities | null): readonly TransactionLifecycleAction[] {
  if (!capabilities) return Object.freeze([]);
  const actions: TransactionLifecycleAction[] = [];
  if (capabilities.canArchive) actions.push('archive');
  if (capabilities.canRestore) actions.push('restore');
  if (capabilities.canReactivate) actions.push('reactivate');
  return Object.freeze(actions);
}

function TransactionLifecycleView(props: Readonly<LifecycleViewProps>) {
  const [confirmAction, setConfirmAction] = useState<TransactionLifecycleAction | null>(null);
  const [note, setNote] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const transaction = props.transaction;
  const actions = availableActions(props.capabilities);
  const busy = props.status === 'mutating';

  const executeConfirmed = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null);
    setSuccessMessage(null);
    const ok = await props.onExecute(action, note);
    if (!ok) return;
    setNote('');
    setSuccessMessage(`${actionLabel(action)} تمت بنجاح وفق ضوابط دورة الحياة.`);
    props.onChanged?.();
  };

  if (props.status === 'loading') {
    return <section className="ez-transaction-lifecycle" data-pattern="transaction-lifecycle" data-lifecycle-status="loading"><EzNotice title="جارٍ التحقق من الحالة" body="نقرأ الحالة الحالية والمتابعات المرتبطة قبل إتاحة أي إجراء." /></section>;
  }

  if (props.status === 'error' && !transaction) {
    return <section className="ez-transaction-lifecycle" data-pattern="transaction-lifecycle" data-lifecycle-status="error"><EzNotice title="تعذر فتح إدارة الحالة" body={props.errorMessage ?? 'تعذر تحميل المعاملة.'} tone="danger" action={<EzButton tone="dark" onClick={props.onRetry}>إعادة المحاولة</EzButton>} /></section>;
  }

  if (!transaction || !props.capabilities) {
    return <section className="ez-transaction-lifecycle" data-pattern="transaction-lifecycle" data-lifecycle-status="error"><EzNotice title="الحالة غير متاحة" body="تعذر تكوين سياق دورة الحياة بصورة آمنة." tone="danger" /></section>;
  }

  return (
    <section className="ez-transaction-lifecycle" data-pattern="transaction-lifecycle" data-lifecycle-status={props.status} data-lifecycle-transaction={transaction.id}>
      <header className="ez-transaction-lifecycle__head">
        <div><span>دورة حياة المعاملة</span><strong>{transaction.type}</strong><small>{transaction.legacy_id?.trim() || transaction.id.slice(0, 8).toUpperCase()}</small></div>
        <EzChip tone={props.capabilities.archived ? 'neutral' : props.capabilities.completed ? 'info' : transaction.status === 'stalled' ? 'warning' : 'success'}>{lifecycleStatusLabel(transaction)}</EzChip>
      </header>

      <div className="ez-transaction-lifecycle__facts">
        <EzSurface tone="warm" emphasis="quiet" className="ez-transaction-lifecycle__fact"><small>الحالة الأصلية</small><strong>{transaction.status}</strong></EzSurface>
        <EzSurface tone="warm" emphasis="quiet" className="ez-transaction-lifecycle__fact"><small>المتابعات المفتوحة المحفوظة</small><strong>{props.openFollowupCount}</strong></EzSurface>
        <EzSurface tone="warm" emphasis="quiet" className="ez-transaction-lifecycle__fact"><small>الأرشفة</small><strong>{transaction.archived_at ? 'مفعلة' : 'غير مفعلة'}</strong></EzSurface>
      </div>

      <EzNotice
        title="لا حذف صامت للتاريخ"
        body={props.openFollowupCount > 0
          ? `هناك ${props.openFollowupCount} متابعة مفتوحة. الأرشفة توقف ظهورها في العمل النشط عبر حالة المعاملة، لكنها لا تحذفها أو تلغيها.`
          : 'لا توجد متابعات مفتوحة حاليًا. الملاحظات والنشاط والعلاقات التاريخية تبقى محفوظة في جميع الأحوال.'}
        tone="info"
      />

      {successMessage ? <EzNotice title="تم تحديث دورة الحياة" body={successMessage} tone="success" /> : null}
      {props.errorMessage ? <EzNotice title="تعذر تنفيذ الإجراء" body={props.errorMessage} tone="danger" action={<EzButton tone="ghost" onClick={props.onRetry}>إعادة تحميل الحالة</EzButton>} /> : null}
      {props.warnings.map((warning) => <EzNotice key={warning.code} title="تم التغيير مع تنبيه" body={warning.message} tone="warning" />)}

      <EzField
        label="ملاحظة الإجراء — اختيارية"
        aria-label="ملاحظة دورة حياة المعاملة"
        placeholder="سبب الأرشفة أو الاستعادة أو إعادة التنشيط"
        maxLength={600}
        value={note}
        disabled={busy}
        onChange={(event) => setNote(event.currentTarget.value)}
        hint="تُحفظ مع سجل النشاط ولا تغيّر السجل التاريخي السابق."
      />

      <div className="ez-transaction-lifecycle__actions" aria-label="إجراءات دورة حياة المعاملة">
        {actions.length ? actions.map((action) => (
          <EzButton key={action} tone={actionTone(action)} disabled={busy} onClick={() => setConfirmAction(action)} data-lifecycle-action={action}>
            {busy ? 'جارٍ التنفيذ…' : actionLabel(action)}
          </EzButton>
        )) : <EzNotice title="لا يوجد إجراء متاح" body="الحالة الحالية لا تسمح بتغيير إضافي من هذه الشاشة." tone="info" />}
      </div>

      <EzDialog
        open={confirmAction !== null}
        eyebrow="تأكيد دورة الحياة"
        title={confirmAction ? actionLabel(confirmAction) : 'تأكيد الإجراء'}
        body={confirmAction ? actionDescription(confirmAction, transaction) : ''}
        tone={confirmAction ? confirmTone(confirmAction) : 'warning'}
        primaryLabel={confirmAction ? actionLabel(confirmAction) : 'تأكيد الإجراء'}
        onPrimary={() => { void executeConfirmed(); }}
        onClose={() => setConfirmAction(null)}
      />
    </section>
  );
}

export function ConnectedTransactionLifecycle(props: Readonly<{ transactionId: string; onChanged?: (() => void) | undefined }>) {
  const controller = useTransactionLifecycle(props.transactionId);
  return (
    <TransactionLifecycleView
      status={controller.status}
      transaction={controller.context?.transaction ?? null}
      capabilities={controller.capabilities}
      openFollowupCount={controller.context?.openFollowupCount ?? 0}
      errorMessage={controller.errorMessage}
      warnings={controller.warnings}
      onRetry={controller.retry}
      onExecute={controller.execute}
      onChanged={props.onChanged}
    />
  );
}

export function FixtureTransactionLifecycle(props: Readonly<{ transactionId: string; onChanged?: (() => void) | undefined }>) {
  const source = useMemo(() => buildTransactionListPreviewSource(), []);
  const initial = useMemo(() => source.transactions.find((row) => row.id === props.transactionId) ?? null, [props.transactionId, source.transactions]);
  const [transaction, setTransaction] = useState<RowOf<'transactions'> | null>(initial);
  const [warnings] = useState<readonly TransactionLifecycleWarning[]>(Object.freeze([]));
  const capabilities = useMemo(() => transaction ? transactionLifecycleCapabilities(transaction) : null, [transaction]);

  const execute = async (action: TransactionLifecycleAction): Promise<boolean> => {
    if (!transaction) return false;
    const patch = buildTransactionLifecyclePatch(transaction, action, new Date('2026-09-05T14:00:00.000Z'));
    setTransaction(Object.freeze({ ...transaction, ...patch }));
    return true;
  };

  return (
    <TransactionLifecycleView
      status={transaction ? 'ready' : 'error'}
      transaction={transaction}
      capabilities={capabilities}
      openFollowupCount={transaction?.legacy_id === '0994' ? 3 : 2}
      errorMessage={transaction ? null : 'معاملة المعاينة غير متاحة.'}
      warnings={warnings}
      onRetry={() => setTransaction(initial)}
      onExecute={execute}
      onChanged={props.onChanged}
    />
  );
}
