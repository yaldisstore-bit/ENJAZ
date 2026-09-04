import { useState } from 'react';
import type { EnjazDomainId } from '../architecture/domain-composition.ts';
import { EzBadge, EzButton, EzChip, EzMetric, EzProgress, EzRow, EzSurface } from '../components/primitives.tsx';
import { FinanceCoreScreen, OperationsCoreScreen } from './CoreScreens.tsx';

function DomainIntro(props: Readonly<{ eyebrow: string; title: string; body: string; action?: string }>) {
  return <header className="ez-domain-intro"><div><span>{props.eyebrow}</span><h1>{props.title}</h1><p>{props.body}</p></div>{props.action ? <EzButton tone="dark">{props.action}</EzButton> : null}</header>;
}

function TransactionsScreen() {
  return <section className="ez-domain-screen ez-domain-transactions" data-domain-screen="transactions">
    <DomainIntro eyebrow="دورة العمل" title="المعاملات" body="الأولوية والمرحلة والملكية في لوحة تشغيلية واحدة." action="معاملة جديدة" />
    <div className="ez-domain-pipeline" data-pattern="pipeline">
      {[['وارد','8','gold'],['قيد التنفيذ','14','info'],['بانتظار طرف','5','warning'],['جاهزة للإغلاق','6','success']].map(([label,value,tone]) => <section key={label}><span>{label}</span><strong>{value}</strong><EzChip tone={tone as 'gold'|'info'|'warning'|'success'}>{label}</EzChip></section>)}
    </div>
    <section className="ez-domain-list"><header><div><span>الصف النشط</span><h2>الأعلى أثرًا الآن</h2></div><EzBadge tone="gold">33 معاملة</EzBadge></header>
      <EzRow index="1042" title="تعديل عقد تأسيس" detail="شركة الرافدين · المرحلة 3/5" meta="أحمد" state={<EzChip tone="danger">عاجلة</EzChip>} />
      <EzRow index="1038" title="قرار تأسيس" detail="قمر السلطان · بانتظار وثيقتين" meta="سارة" state={<EzChip tone="warning">متوقفة</EzChip>} />
      <EzRow index="1029" title="تجديد بيانات شركة" detail="روز بغداد · مراجعة نهائية" meta="علي" state={<EzChip tone="success">قريبة الإغلاق</EzChip>} />
    </section>
  </section>;
}

function CompaniesScreen() {
  return <section className="ez-domain-screen ez-domain-companies" data-domain-screen="companies">
    <DomainIntro eyebrow="الكيانات" title="الشركات" body="الشركة ليست بطاقة؛ هي شبكة معاملات ووثائق ومسؤولين." action="شركة جديدة" />
    <div className="ez-domain-company-hero" data-pattern="entity-profile"><div><span>الشركة النشطة</span><h2>قمر السلطان</h2><p>4 معاملات · 12 وثيقة · آخر نشاط اليوم</p><div><EzChip tone="success">سليمة</EzChip><EzChip tone="gold">بغداد</EzChip></div></div><EzMetric label="اكتمال الملف" value="92%" detail="عنصران ناقصان" tone="gold" /></div>
    <div className="ez-domain-relations" data-pattern="relationship-map"><section><span>المعاملات</span><strong>4</strong><small>2 نشطة</small></section><section><span>الأشخاص</span><strong>6</strong><small>مدير + مفوضون</small></section><section><span>الوثائق</span><strong>12</strong><small>3 فئات</small></section></div>
    <section className="ez-domain-list"><EzRow title="الرافدين للتجارة" detail="3 معاملات نشطة" meta="آخر نشاط 28د" state={<EzChip tone="warning">تحتاج متابعة</EzChip>} /><EzRow title="شركة الفجر" detail="معاملة واحدة نشطة" meta="اليوم" state={<EzChip tone="success">مستقرة</EzChip>} /></section>
  </section>;
}

function PeopleScreen() {
  return <section className="ez-domain-screen ez-domain-people" data-domain-screen="people">
    <DomainIntro eyebrow="شبكة العلاقات" title="الأشخاص والمحامون" body="هوية الشخص، حمله الحالي، وصلاته بالعمل." action="إضافة شخص" />
    <div className="ez-domain-people-grid" data-pattern="people-directory">
      {[['أحمد هادي','محامٍ','5 معاملات','82'],['سارة علي','مسؤولة متابعة','4 معاملات','91'],['علي كريم','محاسب','6 معاملات','74']].map(([name,role,load,score]) => <article key={name}><span className="ez-domain-avatar">{name[0]}</span><div><h3>{name}</h3><small>{role}</small><p>{load}</p></div><strong>{score}%</strong></article>)}
    </div>
    <section className="ez-domain-activity" data-pattern="activity-stream"><header><strong>نشاط العلاقات</strong><small>آخر 24 ساعة</small></header><EzRow title="أحمد هادي" detail="أغلق مراجعة عقد تأسيس" meta="منذ 18د" /><EzRow title="سارة علي" detail="أضافت متابعة على شركة الفجر" meta="منذ 42د" /></section>
  </section>;
}

function WorkflowScreen() {
  return <section className="ez-domain-screen ez-domain-workflow" data-domain-screen="workflow">
    <DomainIntro eyebrow="المراحل" title="سير العمل" body="كل مرحلة مرئية، وكل انتقال له معنى ومسؤول." action="قالب جديد" />
    <div className="ez-domain-stage-lanes" data-pattern="stage-lanes">{[
      ['استلام','8','وارد جديد'],['تدقيق','11','أعلى حمولة'],['مراجعة','7','3 متأخرة'],['موافقة','4','بانتظار قرار'],['إغلاق','6','جاهزة']
    ].map(([name,count,note],index) => <section key={name}><i>{index+1}</i><span>{name}</span><strong>{count}</strong><small>{note}</small></section>)}</div>
    <EzSurface tone="dark" emphasis="raised" className="ez-domain-transition"><span>أكثر انتقال يسبب تأخيرًا</span><h2>التدقيق ← المراجعة</h2><p>متوسط الانتظار 7.4 ساعة. ثلاثة سجلات تتجاوز الهدف التشغيلي.</p><EzButton tone="gold">فحص العائق</EzButton></EzSurface>
  </section>;
}

function AutomationScreen() {
  return <section className="ez-domain-screen ez-domain-automation" data-domain-screen="automation">
    <DomainIntro eyebrow="القواعد" title="الأتمتة" body="مشغلات وشروط وأفعال واضحة بدل قوائم تقنية مبهمة." action="قاعدة جديدة" />
    <div className="ez-domain-automation-health" data-pattern="execution-health"><EzMetric label="قواعد نشطة" value="18" tone="gold" /><EzMetric label="تنفيذ اليوم" value="126" detail="98.4% ناجح" /><EzMetric label="تحتاج مراجعة" value="2" detail="ليست حرجة" /></div>
    <section className="ez-domain-rule-stack" data-pattern="rule-stack">
      <article><span>عند</span><strong>تأخر معاملة 24 ساعة</strong><i>→</i><span>نفّذ</span><strong>إنشاء متابعة للمسؤول</strong><EzChip tone="success">نشطة</EzChip></article>
      <article><span>عند</span><strong>تسجيل دفعة</strong><i>→</i><span>نفّذ</span><strong>تحديث حالة التحصيل</strong><EzChip tone="success">نشطة</EzChip></article>
      <article><span>عند</span><strong>نقص وثيقة أساسية</strong><i>→</i><span>نفّذ</span><strong>تنبيه مسؤول المعاملة</strong><EzChip tone="warning">مراجعة</EzChip></article>
    </section>
  </section>;
}

function CommandScreen() {
  return <section className="ez-domain-screen ez-domain-command" data-domain-screen="command"><DomainIntro eyebrow="القرار" title="مركز القيادة" body="استثناءات وقرارات عابرة للمجالات؛ لا تفاصيل منخفضة القيمة." />
    <section className="ez-domain-command-score" data-pattern="executive-focus"><div><span>مؤشر السيطرة</span><strong>86</strong><small>جيد · 3 قرارات اليوم</small></div><div><EzMetric label="مخاطر عالية" value="3" tone="gold" /><EzMetric label="متلكئة" value="8" /><EzMetric label="تحصيل" value="78%" /></div></section>
    <div className="ez-domain-command-grid" data-pattern="cross-domain"><section><span>القرار الأعلى أثرًا</span><h2>إعادة توزيع 3 معاملات قبل الظهر</h2><p>سيخفض التراكم المتوقع 18%.</p><EzButton tone="gold">اتخاذ إجراء</EzButton></section><section><span>المالية</span><h3>450,000 د.ع مستحق قريب</h3></section><section><span>المخاطر</span><h3>3 معاملات تجاوزت حد الخطر</h3></section></div>
  </section>;
}

function RiskScreen() {
  return <section className="ez-domain-screen ez-domain-risk" data-domain-screen="risk"><DomainIntro eyebrow="الذكاء التشغيلي" title="المخاطر والرؤى" body="خريطة مخاطر ومناظر محفوظة بدل عدادات إنذار متفرقة." />
    <div className="ez-domain-risk-map" data-pattern="risk-map"><section className="is-high"><span>مرتفع</span><strong>3</strong><small>تحتاج قرارًا اليوم</small></section><section className="is-medium"><span>متوسط</span><strong>8</strong><small>تحت المراقبة</small></section><section className="is-low"><span>منخفض</span><strong>22</strong><small>ضمن الهدف</small></section></div>
    <div className="ez-domain-saved-views" data-pattern="saved-views"><button type="button"><strong>المعاملات المتلكئة</strong><span>8 نتائج</span></button><button type="button"><strong>تحصيل خلال 7 أيام</strong><span>5 نتائج</span></button><button type="button"><strong>نقص وثائق حرجة</strong><span>3 نتائج</span></button></div>
    <EzSurface tone="warm" emphasis="raised"><span>رؤية جديدة</span><h2>المعاملات التي يتغير مسؤولها أكثر من مرة تستغرق 1.8× أطول</h2><p>الإشارة مبنية على نمط تشغيلي وتحتاج تحققًا قبل اتخاذ قرار.</p></EzSurface>
  </section>;
}

function DocumentsScreen() {
  const [category, setCategory] = useState('تأسيس');
  return <section className="ez-domain-screen ez-domain-documents" data-domain-screen="documents"><DomainIntro eyebrow="الخزنة" title="الوثائق والتقارير" body="فئة، قائمة، ومعاينة في تسلسل واحد بدل شبكة ملفات." action="رفع وثيقة" />
    <div className="ez-domain-doc-layout" data-pattern="category-list-detail"><aside>{['تأسيس','مالية','مراسلات','تقارير'].map((item) => <button type="button" key={item} className={category===item?'is-active':''} onClick={() => setCategory(item)}><strong>{item}</strong><small>{item==='تأسيس'?'12':'6'} ملف</small></button>)}</aside><section><EzRow title="شهادة تأسيس.pdf" detail="قمر السلطان · 2.4 MB" meta="اليوم" state={<EzChip tone="success">مؤرشف</EzChip>} /><EzRow title="عقد تأسيس.pdf" detail="قمر السلطان · 5.1 MB" meta="أمس" state={<EzChip tone="gold">أساسي</EzChip>} /><EzRow title="قرار تأسيس.pdf" detail="شركة الفجر · 1.8 MB" meta="30 آب" /></section><article><span>معاينة</span><div className="ez-domain-document-preview"><strong>PDF</strong><small>شهادة تأسيس</small></div><h3>شهادة تأسيس</h3><p>آخر تحديث اليوم · مرتبط بشركة قمر السلطان.</p><EzButton tone="dark">فتح الوثيقة</EzButton></article></div>
  </section>;
}

function FollowupsScreen() {
  return <section className="ez-domain-screen ez-domain-followups" data-domain-screen="followups"><DomainIntro eyebrow="مركز الانتباه" title="المتابعات والإشعارات" body="وارد موحد حسب الأثر والوقت، وليس قائمة تنبيهات متساوية." action="متابعة جديدة" />
    <section className="ez-domain-attention" data-pattern="attention-inbox"><article className="is-critical"><time>الآن</time><div><span>تحتاج قرارًا</span><h2>معاملة 1042 متوقفة منذ 48 ساعة</h2><p>المراجع لم ينتقل إلى خطوة التدقيق النهائي.</p></div><EzButton tone="dark">فتح</EzButton></article><article><time>12:30</time><div><span>موعد</span><h3>اتصال متابعة مع المحامي</h3><p>مرتبط بشركة الفجر.</p></div><EzChip tone="info">اليوم</EzChip></article><article><time>15:20</time><div><span>تحصيل</span><h3>تأكيد دفعة مالية</h3><p>450,000 د.ع</p></div><EzChip tone="warning">بانتظارك</EzChip></article></section>
  </section>;
}

function CopilotScreen() {
  return <section className="ez-domain-screen ez-domain-copilot" data-domain-screen="copilot"><DomainIntro eyebrow="المساعد الذكي" title="مساعد إنجاز" body="مساعدة سياقية مرتبطة بالعمل الحالي، لا دردشة منفصلة عن النظام." />
    <div className="ez-domain-copilot-layout" data-pattern="context-assistant"><aside><span>السياق الحالي</span><h3>معاملة 1042</h3><small>تعديل عقد تأسيس</small><div><EzChip tone="danger">عاجلة</EzChip><EzChip tone="gold">شركة الرافدين</EzChip></div><p>آخر تحديث منذ 48 ساعة.</p></aside><section><div className="ez-domain-ai-answer"><span>اقتراح إنجاز</span><h2>ابدأ بفحص الوثيقتين الناقصتين ثم أرسل متابعة للمراجع.</h2><p>هذا الترتيب يقلل احتمال إعادة العمل قبل المراجعة النهائية.</p></div><div className="ez-domain-ai-actions"><button type="button">لخّص الملف</button><button type="button">ما سبب التأخير؟</button><button type="button">جهّز متابعة</button></div><EzButton tone="dark">فتح المحادثة السياقية</EzButton></section></div>
  </section>;
}

export function DomainScreen(props: Readonly<{ domain: EnjazDomainId }>) {
  if (props.domain === 'transactions') return <TransactionsScreen />;
  if (props.domain === 'companies') return <CompaniesScreen />;
  if (props.domain === 'people') return <PeopleScreen />;
  if (props.domain === 'finance') return <FinanceCoreScreen />;
  if (props.domain === 'workflow') return <WorkflowScreen />;
  if (props.domain === 'automation') return <AutomationScreen />;
  if (props.domain === 'operations') return <OperationsCoreScreen commandMode={false} onCommandMode={() => undefined} />;
  if (props.domain === 'command') return <CommandScreen />;
  if (props.domain === 'risk') return <RiskScreen />;
  if (props.domain === 'documents') return <DocumentsScreen />;
  if (props.domain === 'followups') return <FollowupsScreen />;
  return <CopilotScreen />;
}
