import type { R2DestinationId } from '../architecture/navigation-contract.ts';

type OperationalDestination = Extract<R2DestinationId, 'finance' | 'operations' | 'workflow' | 'automation' | 'command' | 'risk' | 'copilot'>;

type WorkspaceProps = {
  id: OperationalDestination;
};

const DEMO_NOTE = 'عينة تفاعلية R2.0-7 · لا تدّعي بيانات إنتاج أو تنفيذًا حقيقيًا.';

function Header({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="r2-oi-header">
      <div>
        <p className="r2-eyebrow">{eyebrow} · R2.0-7</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <span className="r2-oi-stage">Operational Intelligence</span>
    </header>
  );
}

function TruthNote() {
  return <p className="r2-oi-truth" role="note">{DEMO_NOTE}</p>;
}

function Finance() {
  return (
    <div className="r2-screen r2-oi-workspace r2-oi-finance" data-operational-domain="finance">
      <Header eyebrow="الدفتر" title="المالية" description="الحركة والاستحقاق أولًا؛ الأرقام هنا منظّمة كدفتر عمل لا كلوحة مؤشرات مزخرفة." />
      <section className="r2-finance-balance" aria-label="ملخص مالي">
        <div><span>الرصيد التشغيلي</span><strong>18,420,000 د.ع</strong><small>عينة بصرية فقط</small></div>
        <div className="r2-finance-pulse"><span>مستحق قريبًا</span><strong>3 دفعات</strong><small>خلال 7 أيام</small></div>
      </section>
      <section className="r2-oi-panel r2-finance-ledger" aria-labelledby="r2-finance-ledger-title">
        <div className="r2-oi-section-head"><div><p className="r2-eyebrow">الحركة</p><h2 id="r2-finance-ledger-title">دفتر اليوم</h2></div><span>آخر 4 قيود</span></div>
        <div className="r2-ledger-list">
          {[['دفعة معاملة #1042','+ 1,250,000 د.ع','اليوم · 10:40'],['رسم معاملة #1038','− 175,000 د.ع','اليوم · 09:15'],['تحصيل شركة النور','+ 3,500,000 د.ع','أمس · 16:20'],['تسوية قيد','− 90,000 د.ع','أمس · 13:05']].map(([label, amount, meta]) => <div className="r2-ledger-row" key={label}><span><strong>{label}</strong><small>{meta}</small></span><b dir="ltr">{amount}</b></div>)}
        </div>
      </section>
      <TruthNote />
    </div>
  );
}

function Operations() {
  return (
    <div className="r2-screen r2-oi-workspace r2-oi-operations" data-operational-domain="operations">
      <Header eyebrow="التشغيل" title="مركز العمليات" description="من يملك العمل؟ ما المتوقف؟ وما الإجراء التالي؟ هذه الأسئلة هي بنية الشاشة." />
      <section className="r2-operations-pulse">
        <div><span>الآن</span><strong>7 عناصر فعّالة</strong><small>3 تحتاج قرارًا</small></div>
        <div><span>الملكية</span><strong>4 مسؤولين</strong><small>لا عناصر بلا مالك</small></div>
        <div><span>القريب</span><strong>5 مواعيد</strong><small>خلال 48 ساعة</small></div>
      </section>
      <section className="r2-oi-panel">
        <div className="r2-oi-section-head"><div><p className="r2-eyebrow">أولوية التشغيل</p><h2>ما يحتاج حركة الآن</h2></div></div>
        <div className="r2-operations-queue">
          {[['01','معاملة #1042 متوقفة عند جهة خارجية','سارة علي','تحديد التصعيد'],['02','دفعة مستحقة دون توثيق','أحمد كريم','مراجعة القيد'],['03','مسار عمل بلا انتقال منذ يومين','نور حسين','فحص الحاجز']].map(([n,title,owner,next]) => <div className="r2-operation-row" key={n}><span className="r2-operation-index">{n}</span><span><strong>{title}</strong><small>المالك: {owner}</small></span><b>{next}</b></div>)}
        </div>
      </section>
      <TruthNote />
    </div>
  );
}

function Workflow() {
  const lanes = [
    ['استلام', ['#1048', '#1047']],
    ['مراجعة', ['#1042', '#1039', '#1037']],
    ['اعتماد', ['#1035']],
    ['إغلاق', ['#1028', '#1027']],
  ] as const;
  return (
    <div className="r2-screen r2-oi-workspace r2-oi-workflow" data-operational-domain="workflow">
      <Header eyebrow="المراحل" title="سير العمل" description="الحالة والانتقال والحاجز تظهر مكانيًا؛ لا تُختزل العملية إلى أرقام منفصلة." />
      <section className="r2-workflow-lanes" aria-label="مراحل سير العمل">
        {lanes.map(([name, items], index) => <div className="r2-workflow-lane" key={name}><div className="r2-workflow-lane__head"><span>0{index + 1}</span><strong>{name}</strong><small>{items.length} عناصر</small></div><div className="r2-workflow-items">{items.map((item) => <div className="r2-workflow-item" key={item}><strong>معاملة {item}</strong><small>{name === 'مراجعة' ? 'يوجد حاجز يحتاج معالجة' : 'الانتقال التالي واضح'}</small></div>)}</div></div>)}
      </section>
      <TruthNote />
    </div>
  );
}

function Automation() {
  return (
    <div className="r2-screen r2-oi-workspace r2-oi-automation" data-operational-domain="automation">
      <Header eyebrow="القواعد" title="الأتمتة" description="المشغّل ← الشرط ← الفعل ← النتيجة؛ السببية مرئية بدل قائمة إعدادات غامضة." />
      <section className="r2-automation-stack">
        {[['متابعة متأخرة','عند تجاوز موعد المتابعة','إذا كانت المعاملة فعّالة','أضفها إلى عمل اليوم','جاهزة'],['دفعة قريبة','قبل الاستحقاق بـ 48 ساعة','إذا لم يوجد توثيق','أنشئ تنبيه مراجعة','جاهزة'],['معاملة متوقفة','بعد 2 يوم دون حركة','إذا لم تكن مؤرشفة','ارفع إشارة للمخاطر','مراجعة']].map(([title,trigger,condition,action,state]) => <article className="r2-automation-rule" key={title}><div className="r2-automation-rule__top"><div><p className="r2-eyebrow">{state}</p><h2>{title}</h2></div><span className="r2-automation-health">سجل التنفيذ متاح للقراءة</span></div><div className="r2-automation-flow"><span><small>مشغّل</small><strong>{trigger}</strong></span><i>←</i><span><small>شرط</small><strong>{condition}</strong></span><i>←</i><span><small>فعل</small><strong>{action}</strong></span></div></article>)}
      </section>
      <TruthNote />
    </div>
  );
}

function Command() {
  return (
    <div className="r2-screen r2-oi-workspace r2-oi-command" data-operational-domain="command">
      <Header eyebrow="القرار" title="مركز القيادة" description="الاستثناءات والقرارات العابرة للمجالات تتقدّم على أي تجميع زخرفي للمؤشرات." />
      <section className="r2-command-focus">
        <div className="r2-command-focus__primary"><p className="r2-eyebrow">قرار اليوم</p><h2>3 حالات تتطلب تدخلًا إداريًا</h2><p>المطلوب ليس مشاهدة البيانات بل معرفة أين يجب اتخاذ قرار.</p></div>
        <div className="r2-command-signal"><span>أعلى أثر</span><strong>معاملة متوقفة + دفعة قريبة</strong><small>سياق عابر للمعاملات والمالية</small></div>
      </section>
      <section className="r2-command-decisions">
        {[['تشغيل','اعتماد تصعيد معاملة #1042','مرتفع'],['مالية','مراجعة قيد غير موثق','متوسط'],['مخاطر','حسم إشارة تكررت 3 مرات','متوسط']].map(([domain,title,impact]) => <div className="r2-command-row" key={title}><span>{domain}</span><strong>{title}</strong><b>{impact}</b></div>)}
      </section>
      <TruthNote />
    </div>
  );
}

function Risk() {
  return (
    <div className="r2-screen r2-oi-workspace r2-oi-risk" data-operational-domain="risk">
      <Header eyebrow="الذكاء التشغيلي" title="المخاطر والرؤى" description="الإشارة، سببها، أثرها، وما الذي يثبتها؛ لا سطح أبيض مسطح ولا تنبيهات بلا سياق." />
      <section className="r2-risk-map">
        <div className="r2-risk-axis"><span>أثر أعلى</span><span>أثر أقل</span></div>
        <div className="r2-risk-field">
          <button type="button" className="r2-risk-node r2-risk-node--high"><strong>توقف متكرر</strong><small>3 معاملات</small></button>
          <button type="button" className="r2-risk-node r2-risk-node--medium"><strong>استحقاق قريب</strong><small>3 دفعات</small></button>
          <button type="button" className="r2-risk-node r2-risk-node--low"><strong>ضغط عمل</strong><small>مسؤول واحد</small></button>
        </div>
      </section>
      <section className="r2-oi-panel"><div className="r2-oi-section-head"><div><p className="r2-eyebrow">إشارات قابلة للفهم</p><h2>لماذا ظهرت؟</h2></div></div><div className="r2-risk-signals">{[['توقف متكرر','عدم وجود حركة في مسارين لأكثر من 48 ساعة'],['استحقاق قريب','دفعات خلال سبعة أيام دون إغلاق توثيق'],['ضغط عمل','تجمّع عناصر عالية الأولوية لدى مالك واحد']].map(([title,why]) => <div key={title}><strong>{title}</strong><p>{why}</p></div>)}</div></section>
      <TruthNote />
    </div>
  );
}

function Copilot() {
  return (
    <div className="r2-screen r2-oi-workspace r2-oi-copilot" data-operational-domain="copilot">
      <Header eyebrow="المساعد الذكي" title="مساعد إنجاز" description="مساعد سياقي يبدأ من مكانك الحالي. لا يدّعي استدعاء نموذج أو تنفيذ إجراء قبل ربط ذلك واعتماده." />
      <section className="r2-copilot-context"><span>السياق الحالي</span><strong>مساحة العمل العامة</strong><small>يمكن لاحقًا تقييده بمعاملة أو شركة أو شاشة محددة.</small></section>
      <section className="r2-copilot-thread" aria-label="مثال محادثة">
        <div className="r2-copilot-message r2-copilot-message--user"><span>أنت</span><p>ما الذي يحتاج انتباهي أولًا؟</p></div>
        <div className="r2-copilot-message r2-copilot-message--assistant"><span>إنجاز</span><p>توجد ثلاث إشارات في العينة الحالية: معاملة متوقفة، دفعة قريبة، ومسار عمل بلا انتقال. في R2.0-7 هذا مثال عرض فقط، وليس استنتاجًا مولدًا من بيانات إنتاج.</p></div>
      </section>
      <div className="r2-copilot-compose"><input aria-label="رسالة إلى مساعد إنجاز" placeholder="اكتب سؤالك هنا…" disabled /><button type="button" disabled>إرسال</button></div>
      <TruthNote />
    </div>
  );
}

export function OperationalIntelligenceExperience({ id }: WorkspaceProps) {
  if (id === 'finance') return <Finance />;
  if (id === 'operations') return <Operations />;
  if (id === 'workflow') return <Workflow />;
  if (id === 'automation') return <Automation />;
  if (id === 'command') return <Command />;
  if (id === 'risk') return <Risk />;
  return <Copilot />;
}
