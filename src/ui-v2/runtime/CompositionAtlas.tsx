import { useMemo, useState } from 'react';
import { AppShell } from '../components/AppShell.tsx';
import { EzBadge, EzButton, EzChip, EzMetric, EzProgress, EzRow, EzSurface } from '../components/primitives.tsx';
import { screenCompositionMap, type EnjazScreenFamily } from '../architecture/compositionContract.ts';

type ShellTab = 'home' | 'today' | 'operations' | 'finance';

type AtlasMode =
  | 'home'
  | 'daily-work'
  | 'transaction-list'
  | 'transaction-360'
  | 'finance'
  | 'analytics'
  | 'workflow'
  | 'operations'
  | 'command'
  | 'documents';

const atlasOptions: readonly { id: AtlasMode; label: string; shellTab?: ShellTab }[] = [
  { id: 'home', label: 'الرئيسية', shellTab: 'home' },
  { id: 'daily-work', label: 'اليوم', shellTab: 'today' },
  { id: 'transaction-list', label: 'المعاملات' },
  { id: 'transaction-360', label: 'تفاصيل' },
  { id: 'finance', label: 'المالية', shellTab: 'finance' },
  { id: 'analytics', label: 'التحليلات' },
  { id: 'workflow', label: 'سير العمل' },
  { id: 'operations', label: 'العمليات', shellTab: 'operations' },
  { id: 'command', label: 'القيادة' },
  { id: 'documents', label: 'الوثائق' },
] as const;

const shellToMode: Record<ShellTab, AtlasMode> = {
  home: 'home',
  today: 'daily-work',
  operations: 'operations',
  finance: 'finance',
};

const shellTitles: Record<AtlasMode, string> = {
  home: 'الرئيسية',
  'daily-work': 'اليوم',
  'transaction-list': 'المعاملات',
  'transaction-360': 'تفاصيل المعاملة',
  finance: 'المالية',
  analytics: 'التحليلات',
  workflow: 'سير العمل',
  operations: 'العمليات',
  command: 'القيادة',
  documents: 'الوثائق',
};

function WorkspaceSwitcher(props: Readonly<{ mode: AtlasMode; onChange(mode: AtlasMode): void }>) {
  return (
    <nav className="ez-ia-switcher" aria-label="مساحات إنجاز">
      {atlasOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          className={props.mode === option.id ? 'is-active' : ''}
          aria-pressed={props.mode === option.id}
          onClick={() => props.onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </nav>
  );
}

function PageIntro(props: Readonly<{ eyebrow: string; title: string; body: string; action?: string }>) {
  return (
    <header className="ez-ia-page-intro">
      <div>
        <span>{props.eyebrow}</span>
        <h1>{props.title}</h1>
        <p>{props.body}</p>
      </div>
      {props.action ? <EzButton tone="dark">{props.action}</EzButton> : null}
    </header>
  );
}

function MiniTrend(props: Readonly<{ values: readonly number[]; label: string; tone?: 'gold' | 'finance' | 'analytics' | 'operations' }>) {
  const max = Math.max(...props.values, 1);
  return (
    <div className={`ez-ia-mini-trend ez-ia-mini-trend--${props.tone ?? 'gold'}`} data-pattern="trend-panel">
      <div className="ez-ia-mini-trend__head"><strong>{props.label}</strong><small>آخر 7 أيام</small></div>
      <div className="ez-ia-mini-trend__bars" aria-label={props.label} role="img">
        {props.values.map((value, index) => <i key={`${value}-${index}`} style={{ '--bar': `${Math.max(12, Math.round((value / max) * 100))}%` } as React.CSSProperties} />)}
      </div>
    </div>
  );
}

function HomeComposition() {
  return (
    <section className="ez-ia-screen ez-ia-home" data-composition-family="home">
      <PageIntro eyebrow="صباح العمل" title="الرئيسية" body="قرارك الأهم أولًا، ثم الإشارات والعمل الجاري دون جدار بطاقات متساوية." />
      <div className="ez-ia-home__lead">
        <section className="ez-ia-decision-zone" data-pattern="focal-zone">
          <div className="ez-ia-decision-zone__copy">
            <span>الأولوية الآن</span>
            <h2>إغلاق مراجعة عقد تأسيس قبل 12:30</h2>
            <p>شركة الرافدين · متوقفة عند خطوة المراجعة منذ 31 ساعة.</p>
            <div><EzChip tone="danger" dot>عاجلة</EzChip><EzChip tone="neutral">المسؤول: أحمد</EzChip></div>
          </div>
          <div className="ez-ia-decision-zone__action"><strong>68%</strong><small>3 من 5 خطوات</small><EzButton tone="dark">فتح المعاملة</EzButton></div>
        </section>
        <section className="ez-ia-dark-signal" data-pattern="trend-panel">
          <span>إشارة تنفيذية</span>
          <strong>3 قرارات تؤثر على إغلاق اليوم</strong>
          <MiniTrend label="وتيرة الإنجاز" values={[38, 52, 46, 66, 58, 78, 84]} />
        </section>
      </div>
      <div className="ez-ia-home__metrics" data-pattern="metric-cluster">
        <EzMetric label="عمل نشط" value="24" detail="3 عاجلة" tone="gold" />
        <EzMetric label="متابعات اليوم" value="14" detail="2 متأخرة" />
        <EzMetric label="التحصيل" value="78%" detail="+8% عن الأسبوع الماضي" />
        <div className="ez-ia-home__micro"><span>متوسط دورة العمل</span><strong>4.2 يوم</strong><small>تحسن 0.6 يوم</small></div>
      </div>
      <section className="ez-ia-queue" data-pattern="dense-row">
        <header><div><span>العمل الجاري</span><h2>أقرب عناصر تحتاج حركة</h2></div><EzBadge tone="gold">6 عناصر</EzBadge></header>
        <div>
          <EzRow index="01" title="تدقيق مستندات شركة الفجر" detail="6 وثائق · آخر تحديث منذ 18 دقيقة" meta="سارة" state={<EzChip tone="warning">مراجعة</EzChip>} />
          <EzRow index="02" title="تحصيل أتعاب معاملة 1042" detail="متبقي 450,000 د.ع" meta="علي" state={<EzChip tone="info">تحصيل</EzChip>} />
          <EzRow index="03" title="اتصال متابعة مع المحامي" detail="اليوم · 15:20" meta="أحمد" state={<EzChip tone="success">جاهزة</EzChip>} />
        </div>
      </section>
    </section>
  );
}

function DailyWorkComposition() {
  const days = ['الأحد 6', 'الاثنين 7', 'الثلاثاء 8', 'الأربعاء 9', 'الخميس 10'];
  return (
    <section className="ez-ia-screen ez-ia-daily" data-composition-family="daily-work">
      <PageIntro eyebrow="مسار اليوم" title="اليوم" body="الوقت والترتيب أهم من حجم البطاقات؛ العنصر القادم يملك أعلى حضور بصري." action="متابعة جديدة" />
      <div className="ez-ia-date-strip" aria-label="أيام العمل">{days.map((day, index) => <button key={day} type="button" className={index === 2 ? 'is-active' : ''}>{day}</button>)}</div>
      <div className="ez-ia-daily__layout">
        <section className="ez-ia-next-task" data-pattern="focal-zone">
          <span>المهمة التالية · 10:45</span><h2>مراجعة قرار تأسيس</h2><p>شركة قمر السلطان · الملف جاهز للمراجعة النهائية.</p>
          <div><EzChip tone="gold">25 دقيقة</EzChip><EzChip tone="neutral">المسؤول: سارة</EzChip></div>
          <EzButton tone="dark">بدء المهمة</EzButton>
        </section>
        <section className="ez-ia-timeline" data-pattern="timeline">
          {[['09:10','اكتمل','إرسال كتاب رسمي','success'],['10:45','التالي','مراجعة قرار تأسيس','gold'],['12:30','لاحقًا','اتصال متابعة مع محامٍ','neutral'],['15:20','لاحقًا','تسوية حركة مالية','neutral']].map(([time,state,title,tone], index) => (
            <div className={`ez-ia-timeline__item is-${tone}`} key={time}>
              <time>{time}</time><i aria-hidden="true" /><div><small>{state}</small><strong>{title}</strong><span>{index === 0 ? 'شركة الفجر' : index === 1 ? 'قمر السلطان' : 'معاملة نشطة'}</span></div>
            </div>
          ))}
        </section>
      </div>
      <section className="ez-ia-daily__remaining" data-pattern="dense-row">
        <header><strong>ما تبقى اليوم</strong><small>4 عناصر مرتبة حسب التأثير والوقت</small></header>
        <EzRow title="رفع مستندين ناقصين" detail="معاملة 1038" meta="قبل 13:00" state={<EzChip tone="danger">متأخرة</EzChip>} />
        <EzRow title="تأكيد موعد المراجعة" detail="شركة الروان" meta="14:10" state={<EzChip tone="warning">بانتظارك</EzChip>} />
      </section>
    </section>
  );
}

function TransactionListComposition() {
  return (
    <section className="ez-ia-screen ez-ia-transactions" data-composition-family="transaction-list">
      <PageIntro eyebrow="المعاملات" title="المعاملات" body="بحث وفلاتر أولًا، ثم صفوف كثيفة قابلة للمسح بدل بطاقة كبيرة لكل معاملة." action="معاملة جديدة" />
      <section className="ez-ia-filter-band">
        <label><span>ابحث</span><input aria-label="بحث المعاملات" placeholder="شركة، رقم، نوع معاملة..." /></label>
        <div className="ez-ia-filter-band__chips"><button className="is-active" type="button">الكل 42</button><button type="button">عاجلة 6</button><button type="button">متلكئة 8</button><button type="button">قريبة الإغلاق 11</button></div>
      </section>
      <div className="ez-ia-transactions__summary" data-pattern="metric-cluster"><span><small>قيد العمل</small><strong>24</strong></span><span><small>متوسط العمر</small><strong>4.2 يوم</strong></span><span><small>تحتاج قرارًا</small><strong>5</strong></span></div>
      <section className="ez-ia-record-list" data-pattern="dense-row">
        <div className="ez-ia-record-list__head"><span>المعاملة</span><span>المرحلة</span><span>المسؤول</span><span>الحالة</span></div>
        {[
          ['1042','تعديل عقد تأسيس','شركة الرافدين','مراجعة نهائية','أحمد','عاجلة','danger'],
          ['1038','إضافة نشاط','شركة الفجر','وثائق','سارة','قيد العمل','warning'],
          ['1034','تغيير مدير مفوض','روز بغداد','تحصيل','علي','مستقرة','success'],
          ['1027','تصحيح قرار','شعار بابل','تدقيق','أحمد','بانتظار','info'],
        ].map(([id,title,company,stage,owner,state,tone]) => (
          <button type="button" className="ez-ia-record" key={id}>
            <span className="ez-ia-record__identity"><small>#{id}</small><strong>{title}</strong><em>{company}</em></span>
            <span>{stage}</span><span>{owner}</span><EzChip tone={tone as 'danger'|'warning'|'success'|'info'}>{state}</EzChip>
          </button>
        ))}
      </section>
    </section>
  );
}

function Transaction360Composition() {
  return (
    <section className="ez-ia-screen ez-ia-detail" data-composition-family="transaction-360">
      <PageIntro eyebrow="معاملة #1042" title="تفاصيل المعاملة" body="ملخص قوي ثم المسار والنشاط والعلاقات؛ لا نافذة حقول كبيرة بلا ترتيب." />
      <section className="ez-ia-detail__hero" data-pattern="step-progression">
        <div><span>تعديل عقد تأسيس</span><h2>شركة الرافدين للتجارة العامة</h2><p>بدأت 30 أغسطس · آخر حركة منذ 18 دقيقة</p><div><EzChip tone="warning">قيد المراجعة</EzChip><EzChip tone="neutral">أحمد</EzChip></div></div>
        <div className="ez-ia-detail__progress"><strong>3/5</strong><span>الخطوة الحالية</span><b>المراجعة النهائية</b></div>
      </section>
      <div className="ez-ia-detail__columns">
        <section className="ez-ia-step-track" data-pattern="step-progression">
          {['استلام الطلب','تدقيق الوثائق','المراجعة النهائية','التوقيع','الإغلاق'].map((step,index) => <div key={step} className={index < 2 ? 'is-done' : index === 2 ? 'is-current' : ''}><span>{index+1}</span><strong>{step}</strong><small>{index < 2 ? 'مكتملة' : index === 2 ? 'الحالية' : 'قادمة'}</small></div>)}
        </section>
        <section className="ez-ia-activity" data-pattern="activity-stream">
          <header><strong>آخر النشاط</strong><small>ما الذي تغير فعلًا</small></header>
          <div><time>10:24</time><p><strong>سارة</strong> رفعت مستندين للمراجعة النهائية.</p></div>
          <div><time>09:50</time><p><strong>أحمد</strong> أنهى تدقيق البيانات الأساسية.</p></div>
          <div><time>أمس</time><p><strong>النظام</strong> نقل المعاملة إلى مرحلة المراجعة.</p></div>
        </section>
      </div>
      <section className="ez-ia-relationships" data-pattern="relationship-cluster"><div><span>الشركة</span><strong>الرافدين</strong><small>12 معاملة سابقة</small></div><div><span>المحامي</span><strong>محمود سالم</strong><small>آخر تواصل اليوم</small></div><div><span>المسؤول الداخلي</span><strong>أحمد</strong><small>مالك الخطوة الحالية</small></div></section>
    </section>
  );
}

function FinanceComposition() {
  return (
    <section className="ez-ia-screen ez-ia-finance" data-composition-family="finance">
      <PageIntro eyebrow="المركز المالي" title="المالية" body="الرصيد والتحصيل يقودان المشهد، والحركات تظهر كسجل مالي كثيف ومترابط." action="تسجيل دفعة" />
      <section className="ez-ia-finance__hero" data-pattern="ledger">
        <div className="ez-ia-finance__balance"><span>المتحصل هذا الشهر</span><strong>12,850,000 <small>د.ع</small></strong><p>78% من المستحقات النشطة</p><EzProgress value={78} label="نسبة التحصيل" detail="78%" /></div>
        <MiniTrend tone="finance" label="حركة التحصيل" values={[42,36,55,49,68,73,88]} />
        <div className="ez-ia-finance__facts"><span><small>المتبقي</small><strong>3.6M</strong></span><span><small>متأخر</small><strong>820K</strong></span><span><small>اليوم</small><strong>1.25M</strong></span></div>
      </section>
      <section className="ez-ia-ledger" data-pattern="ledger">
        <header><div><span>آخر الحركات</span><h2>السجل المالي</h2></div><EzChip tone="info">مرتبط بالمعاملات</EzChip></header>
        {[
          ['اليوم 11:42','شركة الرافدين','دفعة أتعاب معاملة #1042','+ 650,000','داخل'],
          ['اليوم 09:20','شركة الفجر','مصاريف وثائق #1038','- 75,000','خارج'],
          ['أمس 16:10','روز بغداد','إغلاق ذمة #1034','+ 1,200,000','داخل'],
          ['أمس 13:45','شعار بابل','دفعة مقدمة #1027','+ 400,000','داخل'],
        ].map(([time,entity,detail,amount,direction]) => <div className="ez-ia-ledger__row" key={`${time}-${entity}`}><time>{time}</time><span><strong>{entity}</strong><small>{detail}</small></span><b className={direction === 'داخل' ? 'is-in' : 'is-out'}>{amount}</b></div>)}
      </section>
    </section>
  );
}

function AnalyticsComposition() {
  return (
    <section className="ez-ia-screen ez-ia-analytics" data-composition-family="analytics">
      <PageIntro eyebrow="التحليلات" title="التحليلات" body="الاستنتاج يسبق الرسم؛ كل مخطط يجب أن يقول ماذا يعني للعمل." />
      <section className="ez-ia-analytics__hero" data-pattern="trend-panel"><div><span>الخلاصة هذا الأسبوع</span><h2>زمن إغلاق المعاملة تحسن 14%</h2><p>التحسن جاء من تقليص زمن المراجعة، بينما مرحلة الوثائق ما زالت أكبر مصدر تأخير.</p><div><EzChip tone="success">أفضل من الأسبوع السابق</EzChip><EzChip tone="neutral">42 معاملة</EzChip></div></div><MiniTrend tone="analytics" label="سرعة الإغلاق" values={[48,51,50,62,69,73,81]} /></section>
      <div className="ez-ia-analytics__grid" data-pattern="metric-cluster"><EzMetric label="متوسط الدورة" value="4.2 يوم" detail="-0.6 يوم" tone="gold"/><EzMetric label="نسبة الإغلاق" value="86%" detail="+9%"/><EzMetric label="العوائق" value="7" detail="3 منها وثائق"/></div>
      <section className="ez-ia-analytics__breakdown"><header><strong>أين يضيع الوقت؟</strong><small>متوسط الزمن حسب المرحلة</small></header>{[['استلام','0.4 يوم',18],['وثائق','1.6 يوم',72],['مراجعة','1.1 يوم',51],['توقيع','0.7 يوم',31],['إغلاق','0.4 يوم',16]].map(([label,value,width]) => <div key={label}><span>{label}</span><i><b style={{width:`${width}%`}}/></i><strong>{value}</strong></div>)}</section>
    </section>
  );
}

function WorkflowComposition() {
  return (
    <section className="ez-ia-screen ez-ia-workflow" data-composition-family="workflow">
      <PageIntro eyebrow="سير العمل" title="سير العمل" body="الحالة الحالية واضحة بصريًا، وما قبلها وما بعدها أقل وزنًا." />
      <section className="ez-ia-workflow__hero" data-pattern="step-progression"><div className="ez-ia-workflow__ring"><strong>60%</strong><small>3 من 5</small></div><div><span>المسار النشط</span><h2>تأسيس شركة محدودة المسؤولية</h2><p>الخطوة الحالية: مراجعة الوثائق · المسؤول سارة</p></div><EzButton tone="dark">متابعة الخطوة</EzButton></section>
      <section className="ez-ia-workflow__steps">{['استلام البيانات','تدقيق الهوية','مراجعة الوثائق','التوقيع','الإغلاق'].map((step,index)=><div key={step} className={index<2?'is-done':index===2?'is-current':'is-next'}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{step}</strong><small>{index<2?'مكتملة':index===2?'المرحلة الحالية':'قادمة'}</small></div>{index===2?<EzChip tone="gold">الآن</EzChip>:null}</div>)}</section>
    </section>
  );
}

function OperationsComposition() {
  return (
    <section className="ez-ia-screen ez-ia-operations" data-composition-family="operations">
      <PageIntro eyebrow="مركز العمليات" title="العمليات" body="كثافة تشغيلية واضحة: ملكية، وقت، تقدم وعوائق بدون تكرار بطاقات داشبورد عادية." />
      <div className="ez-ia-operations__status"><span><small>العمل الجاري</small><strong>18</strong></span><span><small>بانتظار خارجي</small><strong>5</strong></span><span><small>معرّض للتأخير</small><strong>3</strong></span><EzChip tone="success" dot>الحمل مستقر</EzChip></div>
      <div className="ez-ia-operations__layout">
        <section className="ez-ia-ops-board" data-pattern="dense-row"><header><strong>العمل الجاري الآن</strong><small>مرتب حسب الخطر والوقت</small></header>{[
          ['01','مراجعة عقد تأسيس','الرافدين · 31 ساعة','أحمد','68%','warning'],['02','تدقيق 6 وثائق','الفجر · 18 دقيقة','سارة','42%','info'],['03','تحصيل دفعة','روز بغداد · اليوم','علي','82%','success'],['04','تأكيد توقيع','شعار بابل · 14:30','أحمد','55%','neutral']
        ].map(([index,title,detail,owner,progress,tone])=><div className="ez-ia-ops-row" key={index}><span>{index}</span><div><strong>{title}</strong><small>{detail}</small></div><em>{owner}</em><i><b style={{width:progress}}/></i><EzChip tone={tone as 'warning'|'info'|'success'|'neutral'}>{progress}</EzChip></div>)}</section>
        <section className="ez-ia-ops-schedule" data-pattern="timeline"><span>الجدول</span><strong>الساعات الحرجة</strong>{[['10:45','مراجعة'],['12:30','توقيع'],['14:10','اتصال'],['15:20','تحصيل']].map(([time,label])=><div key={time}><time>{time}</time><i/><span>{label}</span></div>)}</section>
      </div>
    </section>
  );
}

function CommandComposition() {
  return (
    <section className="ez-ia-screen ez-ia-command" data-composition-family="command">
      <PageIntro eyebrow="مركز القيادة" title="القيادة" body="واجهة قرار عالية التباين لا نسخة داكنة من الرئيسية." />
      <section className="ez-ia-command__hero" data-pattern="focal-zone"><div><span>ما يحتاج تدخلك</span><h2>عنق الزجاجة الآن في مراجعة الوثائق</h2><p>7 معاملات متأثرة، 3 منها تجاوزت الحد الآمن. التدخل المقترح: إعادة توزيع مراجعتين إلى سارة.</p><EzButton tone="gold">عرض العناصر المتأثرة</EzButton></div><div className="ez-ia-command__score"><small>استقرار التشغيل</small><strong>82</strong><span>/100</span></div></section>
      <div className="ez-ia-command__modules" data-pattern="metric-cluster"><section><span>المعاملات</span><strong>24 نشطة</strong><small>5 تحتاج قرارًا</small></section><section><span>المالية</span><strong>78% تحصيل</strong><small>820K متأخر</small></section><section><span>الفريق</span><strong>73% حمل</strong><small>سارة أقل ازدحامًا</small></section></div>
      <section className="ez-ia-command__exceptions" data-pattern="dense-row"><header><strong>استثناءات لا تنتظر</strong><small>مرتبة حسب أثرها على العمل</small></header><EzRow title="3 معاملات تجاوزت 48 ساعة" detail="مرحلة الوثائق" meta="خطر مرتفع" state={<EzChip tone="danger">تدخل</EzChip>}/><EzRow title="دفعتان مستحقتان اليوم" detail="إجمالي 1.1M د.ع" meta="مالية" state={<EzChip tone="warning">متابعة</EzChip>}/></section>
    </section>
  );
}

function DocumentsComposition() {
  const [category, setCategory] = useState('تأسيس');
  return (
    <section className="ez-ia-screen ez-ia-documents" data-composition-family="documents">
      <PageIntro eyebrow="الخزنة" title="الوثائق" body="الفئة ثم المستند ثم بياناته؛ لا شبكة ملفات متساوية بلا سياق." action="رفع وثيقة" />
      <div className="ez-ia-documents__layout" data-pattern="document-browser">
        <aside><span>الفئات</span>{['تأسيس','عقود','قرارات','مالية','مراسلات'].map(item=><button key={item} className={category===item?'is-active':''} type="button" onClick={()=>setCategory(item)}><strong>{item}</strong><small>{item==='تأسيس'?'18':'7'} ملف</small></button>)}</aside>
        <section className="ez-ia-doc-list"><header><div><span>{category}</span><h2>المستندات الأخيرة</h2></div><EzChip tone="neutral">مرتبة بالأحدث</EzChip></header>{[['شهادة تأسيس — الرافدين','PDF · 1.8MB','اليوم 10:18'],['عقد تأسيس — قمر السلطان','PDF · 2.4MB','أمس 16:42'],['قرار تأسيس — الفجر','PDF · 980KB','أمس 13:10']].map(([title,meta,time],index)=><button type="button" className={index===0?'is-selected':''} key={title}><span className="ez-ia-doc-icon">PDF</span><span><strong>{title}</strong><small>{meta}</small></span><time>{time}</time></button>)}</section>
        <section className="ez-ia-doc-detail"><span>المحدد</span><h2>شهادة تأسيس — الرافدين</h2><dl><div><dt>النوع</dt><dd>شهادة تأسيس</dd></div><div><dt>الشركة</dt><dd>الرافدين للتجارة العامة</dd></div><div><dt>المعاملة</dt><dd>#1042</dd></div><div><dt>آخر تحديث</dt><dd>اليوم 10:18</dd></div></dl><EzButton tone="dark">فتح المستند</EzButton></section>
      </div>
    </section>
  );
}

function ActiveComposition({ mode }: Readonly<{ mode: AtlasMode }>) {
  switch (mode) {
    case 'home': return <HomeComposition />;
    case 'daily-work': return <DailyWorkComposition />;
    case 'transaction-list': return <TransactionListComposition />;
    case 'transaction-360': return <Transaction360Composition />;
    case 'finance': return <FinanceComposition />;
    case 'analytics': return <AnalyticsComposition />;
    case 'workflow': return <WorkflowComposition />;
    case 'operations': return <OperationsComposition />;
    case 'command': return <CommandComposition />;
    case 'documents': return <DocumentsComposition />;
  }
}

export function CompositionAtlas() {
  const [mode, setMode] = useState<AtlasMode>('home');
  const [shellTab, setShellTab] = useState<ShellTab>('home');
  const mappedRule = useMemo(() => screenCompositionMap.find((item) => item.id === (mode as EnjazScreenFamily)), [mode]);

  const changeMode = (next: AtlasMode) => {
    setMode(next);
    const option = atlasOptions.find((item) => item.id === next);
    if (option?.shellTab) setShellTab(option.shellTab);
  };

  const onShellTabChange = (next: ShellTab) => {
    setShellTab(next);
    setMode(shellToMode[next]);
  };

  return (
    <AppShell title="إنجاز" subtitle="مكتب الشركات" activeTab={shellTab} onTabChange={onShellTabChange}>
      <div className="ez-ia-atlas" data-stage="ui-5" data-active-composition={mode}>
        <WorkspaceSwitcher mode={mode} onChange={changeMode} />
        {mappedRule ? <div className="ez-ia-rule-marker" aria-hidden="true" data-focal-pattern={mappedRule.focalPattern} data-accent={mappedRule.accent} /> : null}
        <ActiveComposition mode={mode} />
      </div>
    </AppShell>
  );
}
