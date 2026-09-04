import { useState } from 'react';
import { EzButton, EzField } from '../components/primitives.tsx';
import { EzDialog } from '../components/overlays.tsx';
import { EzFormSection, EzSelect, EzTextarea } from '../components/form-controls.tsx';
import { EzStatePanel } from '../components/state-patterns.tsx';

const longArabic = 'طلب تحديث بيانات شركة ذات اسم تجاري طويل جدًا مع تفاصيل متعددة تتضمن فرعًا رئيسيًا وفرعًا ثانويًا وملاحظات تشغيلية متتابعة للتأكد من أن النص العربي الطويل يلتف داخل المساحة دون دفع الواجهة خارج حدود الشاشة.';
const largeMoney = '9,999,999,999,999,999.99 د.ع';

export function InteractionLab() {
  const [dangerOpen, setDangerOpen] = useState(false);
  const [name, setName] = useState(longArabic);
  const [notes, setNotes] = useState(longArabic.repeat(2));
  const [priority, setPriority] = useState('urgent');

  return (
    <main className="ez-ui8-lab" dir="rtl" data-ui8-lab="true">
      <section className="ez-ui8-lab__hero">
        <div><span>ENJAZ UI V2</span><h1>States & Forms</h1><p>Regression surface for exceptional states, constrained forms, destructive confirmation, long Arabic content and very large values.</p></div>
        <EzButton tone="danger" onClick={() => setDangerOpen(true)}>اختبار إجراء تدميري</EzButton>
      </section>

      <section className="ez-ui8-lab__states" data-ui8-states="true">
        <EzStatePanel kind="loading" title="جارٍ تحميل سجل المعاملة" body="نسترجع آخر نسخة متاحة من البيانات." />
        <EzStatePanel kind="empty" title="لا توجد متابعات بعد" body="ستظهر المتابعات هنا عند إضافتها." actionLabel="إضافة متابعة" onAction={() => undefined} />
        <EzStatePanel kind="error" title="تعذر تحميل البيانات" body="حدث خطأ أثناء جلب السجل." actionLabel="إعادة المحاولة" onAction={() => undefined} />
        <EzStatePanel kind="offline" title="أنت غير متصل" body="يمكنك مواصلة القراءة من آخر بيانات متاحة، وستتم إعادة المحاولة عند عودة الاتصال." />
        <EzStatePanel kind="conflict" title="تم تعديل هذا السجل من مكان آخر" body="راجع النسخة الأحدث قبل متابعة التعديل حتى لا تفقد تغييرات أي طرف." actionLabel="مراجعة النسخة الأحدث" onAction={() => undefined} />
        <EzStatePanel kind="permission" title="لا تملك صلاحية هذا الإجراء" body="يمكنك مشاهدة السجل، لكن التعديل يحتاج صلاحية إضافية." />
        <EzStatePanel kind="success" title="تمت العملية بنجاح" body="أصبحت الحالة الجديدة جاهزة للعرض في السجل." />
        <EzStatePanel kind="archived" title="هذا السجل مؤرشف" body="المحتوى محفوظ للرجوع إليه دون أن يظهر ضمن العمل النشط." actionLabel="استعادة" onAction={() => undefined} />
      </section>

      <EzFormSection title="نموذج ضغط الواجهة" eyebrow="Long content + validation">
        <div className="ez-form-grid" data-ui8-form="true">
          <EzField label="عنوان طويل" value={name} onChange={(event) => setName(event.currentTarget.value)} />
          <EzSelect label="الأولوية" value={priority} onChange={(event) => setPriority(event.currentTarget.value)} options={[{ value: 'normal', label: 'عادية' }, { value: 'urgent', label: 'عاجلة جدًا' }]} />
          <EzTextarea label="ملاحظات طويلة" rows={5} value={notes} onChange={(event) => setNotes(event.currentTarget.value)} />
        </div>
      </EzFormSection>

      <section className="ez-ui8-lab__stress" data-ui8-stress="true">
        <section><small>قيمة مالية ضخمة</small><strong>{largeMoney}</strong><p>يجب أن تبقى القيمة داخل الحاوية وتلتف أو تتقلص بصريًا دون overflow أفقي.</p></section>
        <section><small>نص عربي طويل</small><p>{longArabic}</p></section>
      </section>

      <EzDialog open={dangerOpen} tone="danger" title="حذف النسخة التجريبية؟" body="هذا التأكيد يختبر نمط الإجراءات التدميرية فقط." primaryLabel="حذف" onPrimary={() => setDangerOpen(false)} onClose={() => setDangerOpen(false)} />
    </main>
  );
}
