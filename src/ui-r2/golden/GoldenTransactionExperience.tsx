import { useMemo, useState } from 'react';
import type { R2DestinationId } from '../architecture/navigation-contract.ts';

type Navigate = (id: R2DestinationId) => void;
type TabId = 'overview' | 'activity' | 'followups' | 'documents' | 'finance';

const TRANSACTION = {
  id: '1042',
  title: 'تعديل عقد تأسيس',
  company: 'شركة الرافدين',
  owner: 'فريق المعاملات',
  status: 'قيد المتابعة',
  priority: 'أولوية مرتفعة',
  updated: 'آخر نشاط قبل 18 دقيقة',
  nextAction: 'مراجعة كتاب الجهة قبل الإرسال',
  due: 'اليوم · 14:30',
} as const;

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'activity', label: 'النشاط' },
  { id: 'followups', label: 'المتابعات' },
  { id: 'documents', label: 'الوثائق' },
  { id: 'finance', label: 'المالية' },
];

function SpecimenBadge() {
  return <span className="r2-golden-specimen-badge">Golden specimen · بيانات عرض غير إنتاجية</span>;
}

function OverviewPanel() {
  return (
    <div className="r2-golden-panel" data-golden-panel="overview">
      <div className="r2-golden-panel__heading">
        <div><span>المشهد الحالي</span><h2>ما الذي يحتاج قرارًا الآن؟</h2></div>
        <strong>خطوة واحدة واضحة</strong>
      </div>
      <div className="r2-golden-decision">
        <div>
          <span className="r2-golden-kicker">الإجراء التالي</span>
          <h3>{TRANSACTION.nextAction}</h3>
          <p>المعلومات الأهم تظهر أولًا، والتفاصيل الأعمق تبقى قريبة دون تحويل الصفحة إلى جدار بطاقات.</p>
        </div>
        <time>{TRANSACTION.due}</time>
      </div>
      <div className="r2-golden-facts" aria-label="ملخص المعاملة">
        <div><span>المالك</span><strong>{TRANSACTION.owner}</strong></div>
        <div><span>الحالة</span><strong>{TRANSACTION.status}</strong></div>
        <div><span>الأولوية</span><strong>{TRANSACTION.priority}</strong></div>
        <div><span>آخر تحديث</span><strong>{TRANSACTION.updated}</strong></div>
      </div>
      <div className="r2-golden-progress" aria-label="تقدم المعاملة">
        {[
          ['01', 'استلام الطلب', 'مكتمل'],
          ['02', 'تدقيق المستندات', 'مكتمل'],
          ['03', 'مراجعة الجهة', 'الحالي'],
          ['04', 'الإغلاق', 'لاحقًا'],
        ].map(([index, label, state]) => (
          <div key={index} className={`r2-golden-progress__step${state === 'الحالي' ? ' is-current' : ''}`}>
            <span>{index}</span><div><strong>{label}</strong><small>{state}</small></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityPanel() {
  return (
    <div className="r2-golden-panel" data-golden-panel="activity">
      <div className="r2-golden-panel__heading"><div><span>سجل واضح</span><h2>النشاط الأخير</h2></div></div>
      <div className="r2-golden-activity">
        {[
          ['اليوم · 11:42', 'تمت مراجعة مسودة التعديل', 'تحديث داخلي موثق ضمن سياق المعاملة.'],
          ['اليوم · 10:18', 'أضيف مستند جديد', 'كتاب الجهة — نسخة للمراجعة.'],
          ['أمس · 15:06', 'تغيرت حالة المتابعة', 'من بانتظار مستند إلى قيد المتابعة.'],
        ].map(([time, title, text]) => (
          <article key={time}><time>{time}</time><div><strong>{title}</strong><p>{text}</p></div></article>
        ))}
      </div>
    </div>
  );
}

function FollowupsPanel() {
  return (
    <div className="r2-golden-panel" data-golden-panel="followups">
      <div className="r2-golden-panel__heading"><div><span>المتابعات</span><h2>الالتزامات المرتبطة</h2></div></div>
      <div className="r2-golden-line-items">
        <article><div><strong>مراجعة كتاب الجهة</strong><small>اليوم · 14:30</small></div><span>مفتوحة</span></article>
        <article><div><strong>تأكيد استلام النسخة المعدلة</strong><small>غدًا · 10:00</small></div><span>قادمة</span></article>
      </div>
    </div>
  );
}

function DocumentsPanel() {
  return (
    <div className="r2-golden-panel" data-golden-panel="documents">
      <div className="r2-golden-panel__heading"><div><span>الوثائق</span><h2>مستندات في سياقها</h2></div></div>
      <div className="r2-golden-line-items">
        <article><div><strong>عقد التأسيس — النسخة الحالية</strong><small>PDF · مرجع أساسي</small></div><span>معتمد</span></article>
        <article><div><strong>كتاب الجهة — للمراجعة</strong><small>PDF · أضيف اليوم</small></div><span>جديد</span></article>
        <article><div><strong>مسودة التعديل</strong><small>DOCX · عمل داخلي</small></div><span>مسودة</span></article>
      </div>
    </div>
  );
}

function FinancePanel() {
  return (
    <div className="r2-golden-panel" data-golden-panel="finance">
      <div className="r2-golden-panel__heading"><div><span>المالية</span><h2>الإشارة المالية فقط عندما تفيد القرار</h2></div></div>
      <div className="r2-golden-finance">
        <div><span>المبلغ المتوقع</span><strong>750,000 د.ع</strong></div>
        <div><span>المسدد</span><strong>500,000 د.ع</strong></div>
        <div><span>المتبقي</span><strong>250,000 د.ع</strong></div>
      </div>
    </div>
  );
}

function Golden360({ navigate }: { navigate: Navigate }) {
  const [tab, setTab] = useState<TabId>('overview');
  const panel = useMemo(() => {
    if (tab === 'activity') return <ActivityPanel />;
    if (tab === 'followups') return <FollowupsPanel />;
    if (tab === 'documents') return <DocumentsPanel />;
    if (tab === 'finance') return <FinancePanel />;
    return <OverviewPanel />;
  }, [tab]);

  return (
    <div className="r2-screen r2-golden-transaction" data-screen="golden-transaction-360">
      <header className="r2-golden-transaction__hero">
        <div className="r2-golden-transaction__identity">
          <SpecimenBadge />
          <p className="r2-eyebrow">المعاملة #{TRANSACTION.id} · 360°</p>
          <h1>{TRANSACTION.title}</h1>
          <p>{TRANSACTION.company}</p>
          <div className="r2-golden-status-line"><span>{TRANSACTION.status}</span><span>{TRANSACTION.priority}</span><span>{TRANSACTION.updated}</span></div>
        </div>
        <div className="r2-golden-transaction__actions">
          <button type="button" className="r2-action r2-action--primary" onClick={() => navigate('transactions.editor')}>تعديل المعاملة</button>
          <button type="button" className="r2-action r2-action--secondary" onClick={() => navigate('transactions.lifecycle')}>دورة الحياة</button>
        </div>
      </header>

      <nav className="r2-golden-context-tabs" aria-label="مناطق 360">
        {TABS.map((item) => (
          <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </nav>

      <div className="r2-golden-context-layout">
        <main>{panel}</main>
        <aside className="r2-golden-sidecar" aria-label="سياق المعاملة السريع">
          <span className="r2-golden-kicker">التركيز</span>
          <h2>قرار واحد قبل الانتقال</h2>
          <p>{TRANSACTION.nextAction}</p>
          <div className="r2-golden-sidecar__meta"><span>الموعد</span><strong>{TRANSACTION.due}</strong></div>
          <button type="button" className="r2-action r2-action--secondary" onClick={() => navigate('transactions')}>العودة للمعاملات</button>
        </aside>
      </div>
    </div>
  );
}

function GoldenEditor({ navigate }: { navigate: Navigate }) {
  const [title, setTitle] = useState(TRANSACTION.title);
  const [company, setCompany] = useState(TRANSACTION.company);
  const [priority, setPriority] = useState('مرتفعة');
  const [notes, setNotes] = useState('مراجعة كتاب الجهة قبل الإرسال.');
  const [saved, setSaved] = useState(false);

  return (
    <div className="r2-screen r2-golden-editor" data-screen="golden-transaction-editor">
      <header className="r2-section-heading r2-section-heading--hero">
        <div><SpecimenBadge /><p className="r2-eyebrow">المعاملة #{TRANSACTION.id}</p><h1>تحرير المعاملة</h1><p className="r2-supporting">نموذج Golden تفاعلي لإثبات التسلسل والوضوح فقط؛ لا يكتب في بيانات الإنتاج.</p></div>
      </header>
      <form className="r2-golden-form" onSubmit={(event) => { event.preventDefault(); setSaved(true); }}>
        <div className="r2-golden-form__grid">
          <label><span>عنوان المعاملة</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label><span>الشركة</span><input value={company} onChange={(event) => setCompany(event.target.value)} /></label>
          <label><span>الأولوية</span><select value={priority} onChange={(event) => setPriority(event.target.value)}><option>مرتفعة</option><option>متوسطة</option><option>اعتيادية</option></select></label>
          <label className="r2-golden-form__wide"><span>ملاحظة العمل</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} /></label>
        </div>
        {saved && <p className="r2-golden-form__success" role="status">تم حفظ التعديل داخل عينة Golden فقط. لم تتغير أي بيانات إنتاجية.</p>}
        <div className="r2-golden-form__actions">
          <button type="submit" className="r2-action r2-action--primary">حفظ المعاينة</button>
          <button type="button" className="r2-action r2-action--secondary" onClick={() => navigate('transactions.detail')}>العودة إلى 360°</button>
        </div>
      </form>
    </div>
  );
}

function GoldenLifecycle({ navigate }: { navigate: Navigate }) {
  const [state, setState] = useState<'active' | 'archived'>('active');
  return (
    <div className="r2-screen r2-golden-lifecycle" data-screen="golden-transaction-lifecycle">
      <header className="r2-section-heading r2-section-heading--hero">
        <div><SpecimenBadge /><p className="r2-eyebrow">المعاملة #{TRANSACTION.id}</p><h1>دورة حياة المعاملة</h1><p className="r2-supporting">الفعل الخطير منفصل بصريًا عن القراءة اليومية، مع حالة واضحة قبل وبعد المحاكاة.</p></div>
      </header>
      <section className="r2-golden-lifecycle__body">
        <div className="r2-golden-lifecycle__state"><span>الحالة الحالية في العينة</span><strong>{state === 'active' ? 'نشطة · قيد المتابعة' : 'مؤرشفة · معاينة فقط'}</strong><p>هذه المحاكاة محلية داخل Golden Experience ولا تستدعي خدمة الأرشفة الحقيقية.</p></div>
        <ol className="r2-golden-lifecycle__timeline">
          <li><span>01</span><div><strong>أنشئت المعاملة</strong><small>تم تثبيت الهوية والمالك.</small></div></li>
          <li><span>02</span><div><strong>بدأت المتابعة</strong><small>العمل الجاري ظاهر في 360°.</small></div></li>
          <li className="is-current"><span>03</span><div><strong>{state === 'active' ? 'قيد المتابعة' : 'مؤرشفة'}</strong><small>{state === 'active' ? 'يمكن محاكاة الأرشفة قبل اعتماد النمط.' : 'يمكن استعادة المعاينة فورًا.'}</small></div></li>
        </ol>
        <div className="r2-golden-lifecycle__actions">
          {state === 'active'
            ? <button type="button" className="r2-action r2-action--primary" onClick={() => setState('archived')}>محاكاة الأرشفة</button>
            : <button type="button" className="r2-action r2-action--primary" onClick={() => setState('active')}>استعادة المعاينة</button>}
          <button type="button" className="r2-action r2-action--secondary" onClick={() => navigate('transactions.detail')}>العودة إلى 360°</button>
        </div>
      </section>
    </div>
  );
}

export function GoldenTransactionExperience({ id, navigate }: { id: Extract<R2DestinationId, `transactions.${string}`>; navigate: Navigate }) {
  if (id === 'transactions.editor') return <GoldenEditor navigate={navigate} />;
  if (id === 'transactions.lifecycle') return <GoldenLifecycle navigate={navigate} />;
  return <Golden360 navigate={navigate} />;
}
