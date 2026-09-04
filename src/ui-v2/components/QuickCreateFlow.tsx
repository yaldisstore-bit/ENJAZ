import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { EzFormActions, EzFormSection, EzSelect, EzTextarea } from './form-controls.tsx';
import { EzDialog } from './overlays.tsx';
import { EzButton, EzField, EzNotice } from './primitives.tsx';
import { EzStatePanel } from './state-patterns.tsx';

export type CreateKind = 'transaction' | 'followup' | 'party' | 'payment' | 'more';
type Draft = { primary: string; secondary: string; notes: string; option: string };
type DraftField = keyof Draft;
type Errors = Partial<Record<DraftField, string>>;
type DraftControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const emptyDraft: Draft = { primary: '', secondary: '', notes: '', option: '' };

const copy: Record<Exclude<CreateKind, 'more'>, { title: string; eyebrow: string; primary: string; primaryPlaceholder: string; secondary: string; secondaryPlaceholder: string; option: string; options: readonly { value: string; label: string }[] }> = {
  transaction: {
    title: 'بيانات المعاملة', eyebrow: 'معاملة جديدة', primary: 'عنوان المعاملة', primaryPlaceholder: 'مثال: تعديل عقد تأسيس', secondary: 'الشركة أو الجهة', secondaryPlaceholder: 'اكتب اسم الشركة', option: 'الأولوية', options: [{ value: 'normal', label: 'عادية' }, { value: 'high', label: 'مرتفعة' }, { value: 'urgent', label: 'عاجلة' }],
  },
  followup: {
    title: 'بيانات المتابعة', eyebrow: 'متابعة جديدة', primary: 'موضوع المتابعة', primaryPlaceholder: 'مثال: اتصال مع المحامي', secondary: 'المسؤول', secondaryPlaceholder: 'اسم المسؤول', option: 'التوقيت', options: [{ value: 'today', label: 'اليوم' }, { value: 'tomorrow', label: 'غدًا' }, { value: 'week', label: 'خلال أسبوع' }],
  },
  party: {
    title: 'بيانات السجل', eyebrow: 'شركة أو شخص', primary: 'الاسم', primaryPlaceholder: 'اسم الشركة أو الشخص', secondary: 'رقم الهاتف أو المرجع', secondaryPlaceholder: 'اختياري', option: 'نوع السجل', options: [{ value: 'company', label: 'شركة' }, { value: 'person', label: 'شخص' }, { value: 'lawyer', label: 'محامٍ' }],
  },
  payment: {
    title: 'بيانات الحركة المالية', eyebrow: 'دفعة مالية', primary: 'المبلغ', primaryPlaceholder: '0', secondary: 'البيان', secondaryPlaceholder: 'مثال: دفعة أتعاب', option: 'نوع الحركة', options: [{ value: 'receipt', label: 'قبض' }, { value: 'payment', label: 'دفع' }, { value: 'adjustment', label: 'تسوية' }],
  },
};

export function QuickCreateFlow(props: Readonly<{ kind: CreateKind; onClose(): void }>) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<Errors>({});
  const [reviewed, setReviewed] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  useEffect(() => {
    setDraft(emptyDraft);
    setErrors({});
    setReviewed(false);
    setClearConfirm(false);
  }, [props.kind]);

  const isPayment = props.kind === 'payment';
  const config = props.kind === 'more' ? null : copy[props.kind];
  const hasDraft = useMemo(() => Object.values(draft).some((value) => value.trim().length > 0), [draft]);

  const updateDraft = (field: DraftField) => (event: ChangeEvent<DraftControl>) => {
    const value = event.currentTarget.value;
    setDraft((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    if (!config) return false;
    const next: Errors = {};
    if (!draft.primary.trim()) next.primary = isPayment ? 'أدخل مبلغ الحركة المالية.' : `أدخل ${config.primary}.`;
    if (isPayment && draft.primary.trim()) {
      const normalized = Number(draft.primary.replace(/,/g, ''));
      if (!Number.isFinite(normalized) || normalized <= 0) next.primary = 'أدخل مبلغًا صحيحًا أكبر من صفر.';
    }
    if (!draft.option) next.option = `اختر ${config.option}.`;
    setErrors(next);
    if (Object.keys(next).length > 0) return false;
    setReviewed(true);
    return true;
  };

  const clearDraft = () => {
    setDraft(emptyDraft);
    setErrors({});
    setReviewed(false);
    setClearConfirm(false);
  };

  if (!config) {
    return <EzStatePanel kind="empty" title="كل الإجراءات في مكان واحد" body="ستظهر هنا الإجراءات الإضافية عند تفعيل مجالاتها الوظيفية ضمن الخطة الأصلية." detail="لم تتم إضافة وظيفة وهمية في UI-8." />;
  }

  if (reviewed) {
    const amount = isPayment ? new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 2 }).format(Number(draft.primary.replace(/,/g, ''))) : null;
    return (
      <div className="ez-quick-create" data-create-review="true">
        <EzStatePanel kind="success" title="البيانات جاهزة للمراجعة" body="تم التحقق من الحقول المطلوبة ولم يتم حفظ أي سجل بعد." detail={isPayment && amount ? `المبلغ: ${amount} د.ع` : draft.primary} actionLabel="تعديل البيانات" onAction={() => setReviewed(false)} />
        <EzNotice title="خطوة آمنة" body="الحفظ الفعلي يبقى مرتبطًا بعقد المجال وطبقة البيانات عند تنفيذ مرحلته الوظيفية؛ UI-8 لا يختلق عملية حفظ." tone="info" />
        <EzFormActions><EzButton tone="ghost" onClick={props.onClose}>إغلاق</EzButton></EzFormActions>
      </div>
    );
  }

  return (
    <form className="ez-quick-create" data-create-form={props.kind} onSubmit={(event) => { event.preventDefault(); validate(); }} noValidate>
      <EzFormSection title={config.title} eyebrow={config.eyebrow}>
        <div className="ez-form-grid">
          <EzField label={config.primary} placeholder={config.primaryPlaceholder} value={draft.primary} onChange={updateDraft('primary')} error={errors.primary} inputMode={isPayment ? 'decimal' : undefined} autoComplete="off" />
          <EzField label={config.secondary} placeholder={config.secondaryPlaceholder} value={draft.secondary} onChange={updateDraft('secondary')} autoComplete="off" />
          <EzSelect label={config.option} value={draft.option} onChange={updateDraft('option')} error={errors.option} options={[{ value: '', label: 'اختر...' }, ...config.options]} />
          <EzTextarea label="ملاحظات" placeholder="أضف تفاصيل تساعد على تنفيذ العمل دون تكرار المعلومات الأساسية." rows={4} maxLength={1200} value={draft.notes} onChange={updateDraft('notes')} hint={`${draft.notes.length}/1200`} />
        </div>
      </EzFormSection>
      {Object.keys(errors).length > 0 ? <EzNotice title="راجع الحقول المعلّمة" body="بعض البيانات المطلوبة ناقصة أو غير صالحة. لم يتم فقدان أي شيء مما كتبته." tone="danger" /> : null}
      <EzFormActions>
        <EzButton type="submit" tone="dark">مراجعة البيانات</EzButton>
        <EzButton type="button" tone="ghost" disabled={!hasDraft} onClick={() => setClearConfirm(true)}>مسح النموذج</EzButton>
      </EzFormActions>
      <EzDialog open={clearConfirm} tone="danger" title="مسح المسودة؟" body="سيتم حذف ما كتبته في هذا النموذج فقط. لا يؤثر ذلك على أي سجل محفوظ." primaryLabel="مسح المسودة" onPrimary={clearDraft} onClose={() => setClearConfirm(false)} />
    </form>
  );
}
