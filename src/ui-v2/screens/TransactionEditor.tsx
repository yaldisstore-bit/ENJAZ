import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  createEmptyTransactionDraft,
  createTransactionEditDraft,
  getRelatedContacts,
  validateTransactionEditorDraft,
  type TransactionEditorDraft,
  type TransactionEditorErrors,
  type TransactionEditorField,
  type TransactionEditorMode,
} from '../../features/transactions/transactionEditorModel.ts';
import { buildTransactionEditorPreviewSource, TRANSACTION_EDITOR_PREVIEW_EDIT_ID } from '../../features/transactions/transactionEditorPreview.ts';
import type { TransactionEditorWarning } from '../../features/transactions/transactionEditorService.ts';
import { useTransactionEditor, type TransactionEditorController } from '../../features/transactions/useTransactionEditor.ts';
import { EzFormActions, EzFormSection, EzSelect, EzTextarea } from '../components/form-controls.tsx';
import { EzButton, EzChip, EzField, EzNotice } from '../components/primitives.tsx';
import { EzStatePanel } from '../components/state-patterns.tsx';

const statusOptions = [
  { value: 'active', label: 'جارية' },
  { value: 'stalled', label: 'متلكئة / متوقفة' },
  { value: 'completed', label: 'مكتملة' },
] as const;

const priorityOptions = [
  { value: 'low', label: 'منخفضة' },
  { value: 'normal', label: 'عادية' },
  { value: 'high', label: 'مرتفعة' },
  { value: 'urgent', label: 'عاجلة' },
] as const;

function warningTone(warning: TransactionEditorWarning): 'warning' | 'danger' {
  return warning.outcomeUnknown || warning.code === 'fee-history-unconfirmed' ? 'danger' : 'warning';
}

function TransactionEditorReady(props: Readonly<{
  controller: TransactionEditorController;
  onCancel?: (() => void) | undefined;
}>) {
  const controller = props.controller;
  const source = controller.source;
  if (!source) return null;
  const contacts = getRelatedContacts(source, controller.draft.companyId);
  const editingFeeChanged = controller.mode === 'edit' && source.transaction
    ? Math.round(Number(controller.draft.currentFee || 0) * 100) !== Math.round(source.transaction.current_fee * 100)
    : false;
  const busy = controller.status === 'saving';
  const update = (field: TransactionEditorField) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => controller.update(field, event.currentTarget.value);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void controller.submit();
  };

  return (
    <form className="ez-transaction-editor" data-transaction-editor={controller.mode} data-transaction-editor-status={controller.status} onSubmit={submit} noValidate aria-busy={busy || undefined}>
      <EzFormSection title="هوية المعاملة" eyebrow={controller.mode === 'create' ? 'معاملة جديدة' : 'تعديل المعاملة'}>
        <div className="ez-form-grid ez-transaction-editor__grid">
          <EzSelect
            label="الشركة"
            value={controller.draft.companyId}
            onChange={update('companyId')}
            error={controller.errors.companyId}
            disabled={busy}
            options={[{ value: '', label: 'اختر الشركة...' }, ...source.companies.map((company) => ({ value: company.id, label: company.display_name?.trim() || company.legal_name }))]}
          />
          <EzSelect
            label="جهة الاتصال الأساسية"
            value={controller.draft.primaryContactId}
            onChange={update('primaryContactId')}
            error={controller.errors.primaryContactId}
            hint={controller.draft.companyId && contacts.length === 0 ? 'لا توجد جهة اتصال مرتبطة بهذه الشركة حاليًا.' : 'تظهر فقط الجهات المرتبطة بالشركة المختارة.'}
            disabled={busy || !controller.draft.companyId}
            options={[{ value: '', label: 'بدون جهة اتصال' }, ...contacts.map((contact) => ({ value: contact.id, label: contact.display_name }))]}
          />
          <EzField label="نوع المعاملة" maxLength={180} value={controller.draft.type} onChange={update('type')} error={controller.errors.type} disabled={busy} autoComplete="off" placeholder="مثال: تعديل عقد تأسيس" />
          <EzField label="الجهة / الدائرة" maxLength={240} value={controller.draft.department} onChange={update('department')} error={controller.errors.department} disabled={busy} autoComplete="off" placeholder="مثال: دائرة تسجيل الشركات" />
        </div>
      </EzFormSection>

      <EzFormSection title="الحالة والأتعاب" eyebrow="حقائق العمل">
        <div className="ez-form-grid ez-transaction-editor__grid">
          <EzSelect label="الحالة" value={controller.draft.status} onChange={update('status')} error={controller.errors.status} disabled={busy} options={statusOptions} />
          <EzSelect label="الأولوية" value={controller.draft.priority} onChange={update('priority')} error={controller.errors.priority} disabled={busy} options={priorityOptions} />
          <EzField label="الأتعاب الحالية" inputMode="decimal" value={controller.draft.currentFee} onChange={update('currentFee')} error={controller.errors.currentFee} hint="بالدينار العراقي · بحد أقصى منزلتان عشريتان" disabled={busy} autoComplete="off" placeholder="0" />
          {controller.draft.status === 'completed' ? <EzField label="تاريخ الإكمال" type="datetime-local" value={controller.draft.completedAt} onChange={update('completedAt')} error={controller.errors.completedAt} disabled={busy} /> : null}
        </div>
        {editingFeeChanged ? <div className="ez-transaction-editor__fee-reason"><EzTextarea label="سبب تغيير الأتعاب" rows={3} maxLength={600} value={controller.draft.feeChangeReason} onChange={update('feeChangeReason')} error={controller.errors.feeChangeReason} disabled={busy} hint="إلزامي عند تغيير الأتعاب حتى لا تضيع حقيقة مالية سابقة." /></div> : null}
      </EzFormSection>

      <EzFormSection title="مسار / محطة العمل" eyebrow="سجل الحركة" aside={<EzChip tone="info">إضافة تاريخية</EzChip>}>
        <div className="ez-form-grid ez-transaction-editor__grid">
          <EzField label="المحطة الحالية" maxLength={240} value={controller.draft.stationName} onChange={update('stationName')} error={controller.errors.stationName} disabled={busy} autoComplete="off" placeholder="مثال: التدقيق القانوني" />
          <EzField label="المسؤول / المكلف" maxLength={240} value={controller.draft.assignedToText} onChange={update('assignedToText')} error={controller.errors.assignedToText} disabled={busy} autoComplete="off" placeholder="اسم أو وصف المسؤول" />
          <EzField label="وقت المحطة" type="datetime-local" value={controller.draft.stationOccurredAt} onChange={update('stationOccurredAt')} error={controller.errors.stationOccurredAt} disabled={busy || !controller.draft.stationName.trim()} />
        </div>
        <small className="ez-transaction-editor__hint">تغيير المحطة يضيف سجل حركة جديدًا ولا يمحو المحطات السابقة. إدارة قوالب سير العمل الكاملة تبقى ضمن Phase 8.</small>
      </EzFormSection>

      <EzFormSection title={controller.mode === 'create' ? 'ملاحظة أولية' : 'ملاحظة جديدة'} eyebrow="سياق اختياري">
        <EzTextarea label="الملاحظات" rows={5} maxLength={4000} value={controller.draft.noteBody} onChange={update('noteBody')} error={controller.errors.noteBody} disabled={busy} hint={`${controller.draft.noteBody.length}/4000 · الملاحظات الجديدة تضاف كسجل مستقل ولا تستبدل التاريخ السابق.`} />
      </EzFormSection>

      {controller.errors.form ? <EzNotice title="لا يمكن حفظ هذه المعاملة" body={controller.errors.form} tone="danger" /> : null}
      {Object.keys(controller.errors).some((key) => key !== 'form') ? <EzNotice title="راجع الحقول المعلّمة" body="بعض البيانات المطلوبة ناقصة أو غير صالحة. لم يتم تنفيذ أي حفظ من هذا النموذج." tone="danger" /> : null}

      <EzFormActions>
        <EzButton type="submit" tone="dark" size="lg" disabled={busy}>{busy ? 'جارٍ الحفظ…' : controller.mode === 'create' ? 'حفظ المعاملة' : 'حفظ التعديلات'}</EzButton>
        {props.onCancel ? <EzButton type="button" tone="ghost" disabled={busy} onClick={props.onCancel}>إلغاء</EzButton> : null}
      </EzFormActions>
    </form>
  );
}

export function TransactionEditorView(props: Readonly<{
  controller: TransactionEditorController;
  onSaved?: ((transactionId: string) => void) | undefined;
  onCancel?: (() => void) | undefined;
}>) {
  const controller = props.controller;
  if (controller.status === 'loading') return <section className="ez-transaction-editor__loading" aria-label="جارٍ تجهيز نموذج المعاملة"><i /><i /><i /><i /></section>;
  if (controller.status === 'error') return <EzNotice title="تعذر تجهيز أو حفظ المعاملة" body={controller.errorMessage ?? 'تعذر متابعة العملية.'} tone="danger" action={<EzButton tone="dark" onClick={controller.retry}>إعادة تحميل البيانات</EzButton>} />;
  if (controller.status === 'saved' && controller.savedTransactionId) {
    return (
      <div className="ez-transaction-editor__saved" data-transaction-editor-saved="true">
        <EzStatePanel kind={controller.warnings.length ? 'conflict' : 'success'} title={controller.warnings.length ? 'تم حفظ السجل الأساسي مع نتيجة جزئية' : 'تم حفظ المعاملة'} body={controller.warnings.length ? 'تم تأكيد السجل الأساسي، لكن توجد كتابة تاريخية لم يتم تأكيدها بالكامل. اقرأ التنبيه قبل أي محاولة جديدة.' : 'تم تأكيد عملية الحفظ ويمكن العودة إلى قائمة المعاملات.'} detail={`المعرّف: ${controller.savedTransactionId.slice(0, 8)}`} />
        {controller.warnings.map((warning) => <EzNotice key={warning.code} title={warning.outcomeUnknown ? 'نتيجة كتابة غير مؤكدة' : 'تحتاج مراجعة'} body={warning.message} tone={warningTone(warning)} />)}
        <EzFormActions>
          {props.onSaved ? <EzButton tone="dark" onClick={() => props.onSaved?.(controller.savedTransactionId ?? '')}>العودة إلى المعاملات</EzButton> : null}
          <EzButton tone="ghost" onClick={controller.editAgain}>إعادة تحميل السجل</EzButton>
        </EzFormActions>
      </div>
    );
  }
  return <TransactionEditorReady controller={controller} onCancel={props.onCancel} />;
}

export function ConnectedTransactionEditor(props: Readonly<{
  mode: TransactionEditorMode;
  transactionId?: string | null | undefined;
  onSaved?: ((transactionId: string) => void) | undefined;
  onCancel?: (() => void) | undefined;
}>) {
  const controller = useTransactionEditor(props.mode, props.transactionId ?? null);
  return <TransactionEditorView controller={controller} onSaved={props.onSaved} onCancel={props.onCancel} />;
}

function useFixtureTransactionEditor(mode: TransactionEditorMode): TransactionEditorController {
  const source = useMemo(() => buildTransactionEditorPreviewSource(mode), [mode]);
  const [draft, setDraft] = useState<TransactionEditorDraft>(() => mode === 'edit' ? createTransactionEditDraft(source) : createEmptyTransactionDraft());
  const [status, setStatus] = useState<TransactionEditorController['status']>('ready');
  const [errors, setErrors] = useState<TransactionEditorErrors>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  return Object.freeze({
    mode,
    transactionId: mode === 'edit' ? TRANSACTION_EDITOR_PREVIEW_EDIT_ID : null,
    status,
    source,
    draft,
    errors,
    errorMessage: null,
    warnings: [],
    savedTransactionId: savedId,
    update(field: TransactionEditorField, value: string) {
      setDraft((current) => Object.freeze({ ...current, [field]: value }));
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return Object.freeze(next);
      });
    },
    async submit() {
      const nextErrors = validateTransactionEditorDraft(draft, source, mode);
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        return false;
      }
      setStatus('saving');
      await Promise.resolve();
      setSavedId(mode === 'edit' ? TRANSACTION_EDITOR_PREVIEW_EDIT_ID : 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
      setStatus('saved');
      return true;
    },
    retry() { setStatus('ready'); },
    editAgain() { setStatus('ready'); setSavedId(null); },
  });
}

export function FixtureTransactionEditor(props: Readonly<{
  mode: TransactionEditorMode;
  onSaved?: ((transactionId: string) => void) | undefined;
  onCancel?: (() => void) | undefined;
}>) {
  const controller = useFixtureTransactionEditor(props.mode);
  return <TransactionEditorView controller={controller} onSaved={props.onSaved} onCancel={props.onCancel} />;
}
