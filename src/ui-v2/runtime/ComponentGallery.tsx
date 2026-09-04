import { useState } from 'react';
import { ArrowIcon, BellIcon, BriefcaseIcon, MoreIcon, PlusIcon, SearchIcon, WalletIcon } from '../components/icons.tsx';
import { EzDialog, EzMenu, EzSheet } from '../components/overlays.tsx';
import { CommandPattern, DenseOperationsPattern, FinancePattern, FollowupPattern, TransactionPattern, WorkflowPattern } from '../components/patterns.tsx';
import { EzBadge, EzButton, EzChip, EzField, EzIconButton, EzNotice, EzSegmented, EzSurface } from '../components/primitives.tsx';
import '../styles/components.css';

const segmentedOptions = [
  { value: 'today', label: 'اليوم' },
  { value: 'week', label: 'الأسبوع' },
  { value: 'month', label: 'الشهر' },
] as const;

export function ComponentGallery() {
  const [range, setRange] = useState('today');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState('لم يتم تنفيذ إجراء بعد.');

  return (
    <main className="ui-v2-components" data-enjaz-ui="v2" data-stage="ui-3" dir="rtl">
      <div className="ui-v2-components__frame">
        <header className="ui-v2-components__hero">
          <div>
            <span className="ui-v2-components__eyebrow">UI-3 · Design System</span>
            <h1>مكوّنات تتحمل العمل الحقيقي، لا مجرد العرض.</h1>
            <p>هذه الصفحة هي Reality Gallery لاختبار اللمس، الكثافة، القراءة، الحقول، القوائم، الـSheet والـDialog قبل بناء شاشات إنجاز الكاملة.</p>
          </div>
          <div className="ui-v2-components__hero-actions">
            <EzIconButton label="بحث" icon={<SearchIcon />} onClick={() => setMessage('تم فتح مدخل البحث التجريبي.')} />
            <EzIconButton label="إشعارات" icon={<BellIcon />} onClick={() => setMessage('تم فتح مدخل الإشعارات التجريبي.')} />
            <div className="ui-v2-components__menu-anchor">
              <EzIconButton label="المزيد" icon={<MoreIcon />} onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} />
              <EzMenu
                open={menuOpen}
                anchorLabel="قائمة الإجراءات"
                items={[
                  { id: 'pin', label: 'تثبيت العرض', detail: 'احفظ هذا الترتيب' },
                  { id: 'share', label: 'مشاركة', detail: 'إنشاء رابط آمن' },
                  { id: 'delete', label: 'حذف العرض', detail: 'إجراء لا يمكن التراجع عنه', danger: true },
                ]}
                onSelect={(id) => { setMessage(`تم اختيار: ${id}`); setMenuOpen(false); }}
              />
            </div>
          </div>
        </header>

        <EzNotice title="حالة Reality Gallery" body={message} tone="info" />

        <section className="ui-v2-components__section" aria-labelledby="controls-title">
          <div className="ui-v2-components__section-head">
            <div><span>01</span><h2 id="controls-title">التحكم والإدخال</h2><p>أزرار وحقول وحالات مصممة لهاتف عربي، لا لعروض سطح المكتب فقط.</p></div>
            <EzSegmented value={range} options={segmentedOptions} onChange={setRange} />
          </div>

          <div className="ui-v2-components__control-grid">
            <EzSurface tone="paper" emphasis="raised" className="ui-v2-components__control-card">
              <span className="ui-v2-components__label">Buttons</span>
              <div className="ui-v2-components__button-stack">
                <EzButton icon={<PlusIcon />} onClick={() => setSheetOpen(true)}>إجراء جديد</EzButton>
                <EzButton tone="dark" icon={<BriefcaseIcon />} onClick={() => setDialogOpen(true)}>تأكيد معاملة</EzButton>
                <EzButton tone="ghost" icon={<ArrowIcon />} onClick={() => setMessage('تم تنفيذ الإجراء الثانوي.')}>إجراء ثانوي</EzButton>
              </div>
            </EzSurface>

            <EzSurface tone="warm" emphasis="quiet" className="ui-v2-components__control-card">
              <span className="ui-v2-components__label">Fields</span>
              <div className="ui-v2-components__field-stack">
                <EzField label="ابحث داخل إنجاز" placeholder="شركة، معاملة، محامٍ..." prefix={<SearchIcon />} hint="البحث يتقبل العربية والأرقام والنص المختلط." />
                <EzField label="المبلغ" inputMode="numeric" defaultValue="1250000" prefix={<WalletIcon />} />
              </div>
            </EzSurface>

            <EzSurface tone="dark" emphasis="focus" className="ui-v2-components__control-card ui-v2-components__control-card--states">
              <span className="ui-v2-components__label">Status language</span>
              <div className="ui-v2-components__chip-cloud">
                <EzChip tone="gold" dot>قيد العمل</EzChip>
                <EzChip tone="success" dot>مكتملة</EzChip>
                <EzChip tone="warning" dot>تحتاج مراجعة</EzChip>
                <EzChip tone="danger" dot>متأخرة</EzChip>
                <EzChip tone="info" dot>معلومة</EzChip>
                <EzBadge tone="gold">12</EzBadge>
              </div>
            </EzSurface>
          </div>
        </section>

        <section className="ui-v2-components__section" aria-labelledby="patterns-title">
          <div className="ui-v2-components__section-head"><div><span>02</span><h2 id="patterns-title">أنماط إنجاز المركبة</h2><p>كل مجال يأخذ تكوينًا يناسب المعلومة بدل نسخ البطاقة نفسها ست مرات.</p></div></div>
          <div className="ui-v2-components__pattern-grid">
            <TransactionPattern title="تعديل عقد تأسيس" company="شركة الرافدين للتجارة العامة" status="عاجلة" urgency="urgent" progress={68} owner="أحمد هادي" />
            <FinancePattern collected="7٬850٬000 د.ع" outstanding="2٬150٬000" percent={78} trend="+12% عن الأسبوع السابق" />
            <FollowupPattern items={[
              { time: '09:30', title: 'مراجعة قرار', detail: 'شركة النهرين', state: 'متأخرة', tone: 'danger' },
              { time: '12:00', title: 'اتصال بالمحامي', detail: 'معاملة 1042', state: 'اليوم', tone: 'warning' },
              { time: '15:20', title: 'تسليم مستندات', detail: '6 وثائق جاهزة', state: 'جاهزة', tone: 'success' },
            ]} />
            <WorkflowPattern title="إجراءات التأسيس" current={3} total={5} steps={[
              { title: 'تدقيق البيانات', state: 'done' },
              { title: 'مطابقة الوثائق', state: 'done' },
              { title: 'مراجعة القرار', state: 'current' },
              { title: 'التوقيع', state: 'next' },
              { title: 'الإغلاق', state: 'next' },
            ]} />
            <DenseOperationsPattern />
            <CommandPattern title="مركز القيادة" headline="ثلاث إشارات تستحق قرارك الآن." metrics={[
              { label: 'عوائق حرجة', value: '03', tone: 'gold' },
              { label: 'متابعات اليوم', value: '14', tone: 'dark' },
              { label: 'تحصيل نشط', value: '78%', tone: 'plain' },
            ]}>
              <EzNotice title="إشارة تنفيذية" body="يوجد تراكم في معاملات التعديل منذ 48 ساعة." tone="warning" />
            </CommandPattern>
          </div>
        </section>

        <section className="ui-v2-components__section ui-v2-components__section--feedback" aria-labelledby="feedback-title">
          <div className="ui-v2-components__section-head"><div><span>03</span><h2 id="feedback-title">Feedback & overlays</h2><p>نختبر هنا الطبقات التي كانت سابقًا سببًا للقص والازدحام ومشاكل الهاتف.</p></div></div>
          <div className="ui-v2-components__feedback-grid">
            <EzNotice title="تم الحفظ" body="تم تحديث المعاملة بنجاح." tone="success" />
            <EzNotice title="يحتاج انتباه" body="هناك مستند ناقص قبل إكمال الإجراء." tone="warning" />
            <EzNotice title="تعذر الإكمال" body="لم نحفظ أي تغيير غير مؤكد." tone="danger" />
          </div>
          <div className="ui-v2-components__feedback-actions">
            <EzButton onClick={() => setSheetOpen(true)}>افتح Sheet</EzButton>
            <EzButton tone="dark" onClick={() => setDialogOpen(true)}>افتح Dialog</EzButton>
          </div>
        </section>
      </div>

      <EzSheet open={sheetOpen} title="إجراء سريع" eyebrow="Quick Action" onClose={() => setSheetOpen(false)}>
        <div className="ui-v2-components__sheet-form">
          <EzField label="العنوان" defaultValue="متابعة جديدة" />
          <EzField label="الموعد" defaultValue="اليوم، 16:30" />
          <EzButton icon={<PlusIcon />} onClick={() => { setMessage('تم اختبار إجراء الـSheet بنجاح.'); setSheetOpen(false); }}>إنشاء المتابعة</EzButton>
        </div>
      </EzSheet>

      <EzDialog
        open={dialogOpen}
        title="تأكيد إغلاق المعاملة؟"
        body="لن نغيّر أي سجل مالي مرتبط. سيتم فقط تغيير حالة المعاملة بعد التحقق."
        primaryLabel="تأكيد الإغلاق"
        onClose={() => setDialogOpen(false)}
        onPrimary={() => { setMessage('تم اختبار Dialog وإجراء التأكيد بنجاح.'); setDialogOpen(false); }}
      />
    </main>
  );
}
