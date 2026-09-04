import type { ExecutiveBriefingDestination, ExecutiveBriefingSnapshot, ExecutiveBriefingState } from '../../features/executive-briefing/executiveBriefingModel.ts';
import { buildExecutiveBriefingPreviewSnapshot } from '../../features/executive-briefing/executiveBriefingPreview.ts';
import { useExecutiveBriefing } from '../../features/executive-briefing/useExecutiveBriefing.ts';
import { EzBadge, EzButton, EzChip, EzMetric, EzNotice } from '../components/primitives.tsx';

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 2 }).format(value);
}

function statePresentation(state: ExecutiveBriefingState): Readonly<{ label: string; tone: 'success' | 'warning' | 'danger' }> {
  if (state === 'critical') return { label: 'يحتاج قرارًا', tone: 'danger' };
  if (state === 'watch') return { label: 'تحت المراقبة', tone: 'warning' };
  return { label: 'مستقر', tone: 'success' };
}

function ExecutiveBriefingView(props: Readonly<{
  snapshot: ExecutiveBriefingSnapshot;
  onBack(): void;
  onOpenDestination(destination: ExecutiveBriefingDestination): void;
}>) {
  const snapshot = props.snapshot;
  const state = statePresentation(snapshot.state);
  const financeDelta = snapshot.finance.deltaAmount === 0
    ? 'دون تغير عن الأسبوع السابق'
    : `${snapshot.finance.deltaAmount > 0 ? '+' : '−'}${formatMoney(Math.abs(snapshot.finance.deltaAmount))} د.ع عن الأسبوع السابق`;

  return (
    <section className="ez-core-screen ez-executive-briefing" data-core-screen="executive-briefing" data-pattern="executive-briefing" data-executive-state={snapshot.state}>
      <header className="ez-core-intro ez-executive-briefing__intro">
        <div><span>نظرة تنفيذية</span><h1>الملخص التنفيذي</h1><p>الاستثناءات والقرارات والضغط التشغيلي في قراءة واحدة مختصرة.</p></div>
        <EzButton tone="ghost" onClick={props.onBack}>العودة للرئيسية</EzButton>
      </header>

      <section className={`ez-executive-briefing__hero is-${snapshot.state}`} data-executive-hero="true">
        <div className="ez-executive-briefing__hero-copy">
          <div><EzBadge tone={state.tone}>{state.label}</EzBadge><span>الوضع الآن</span></div>
          <h2>{snapshot.headline}</h2>
          <p>{snapshot.summary}</p>
        </div>
        <div className="ez-executive-briefing__hero-stats" aria-label="ملخص الاستثناءات">
          <span><strong>{snapshot.risks.criticalBlockers}</strong><small>عوائق حرجة</small></span>
          <span><strong>{snapshot.workload.overdue}</strong><small>متأخرة</small></span>
          <span><strong>{snapshot.workload.approvals}</strong><small>تنتظر قرارًا</small></span>
        </div>
      </section>

      <div className="ez-executive-briefing__grid">
        <section className="ez-executive-panel" data-executive-panel="risk">
          <header><div><span>المخاطر والعوائق</span><h2>ما قد يعرقل التقدم</h2></div><EzChip tone={snapshot.risks.criticalBlockers ? 'danger' : 'success'}>{snapshot.risks.criticalBlockers ? 'حرج' : 'مستقر'}</EzChip></header>
          <div className="ez-executive-panel__metrics">
            <EzMetric label="عوائق مفتوحة" value={String(snapshot.risks.openBlockers)} detail={`${snapshot.risks.criticalBlockers} حرجة`} tone="gold" />
            <EzMetric label="متلكئة" value={String(snapshot.risks.stalledTransactions)} detail="معاملات نشطة" />
            <EzMetric label="عاجلة" value={String(snapshot.risks.urgentTransactions)} detail="تحتاج انتباهًا" />
          </div>
        </section>

        <section className="ez-executive-panel" data-executive-panel="workload">
          <header><div><span>ضغط العمل</span><h2>ما ينتظر التنفيذ</h2></div><EzChip tone={snapshot.workload.overdue ? 'warning' : 'success'}>{snapshot.workload.total} مفتوحة</EzChip></header>
          <div className="ez-executive-workload">
            <span><strong>{snapshot.workload.dueToday}</strong><small>اليوم</small></span>
            <span><strong>{snapshot.workload.overdue}</strong><small>متأخرة</small></span>
            <span><strong>{snapshot.workload.approvals}</strong><small>اعتمادات</small></span>
            <span><strong>{snapshot.workload.upcoming}</strong><small>قادمة</small></span>
          </div>
          <EzButton tone="ghost" onClick={() => props.onOpenDestination('today')}>فتح صندوق العمل</EzButton>
        </section>

        <section className="ez-executive-panel ez-executive-panel--finance" data-executive-panel="finance">
          <header><div><span>النبضة المالية</span><h2>دفعات posted خلال 7 أيام</h2></div><EzChip tone={snapshot.finance.trend === 'down' ? 'warning' : snapshot.finance.trend === 'up' ? 'success' : 'neutral'}>{snapshot.finance.postedCount7d} حركات</EzChip></header>
          {snapshot.finance.precisionSafe ? (
            <>
              <strong className="ez-executive-finance-value">{formatMoney(snapshot.finance.posted7d)} د.ع</strong>
              <small>{financeDelta}</small>
              <div className="ez-executive-finance-outstanding"><span>المتبقي على العمل النشط</span><strong>{formatMoney(snapshot.finance.outstandingActive)} د.ع</strong></div>
            </>
          ) : <EzNotice title="الدقة الرقمية تحتاج مراجعة" body="تجاوزت قيمة مالية نطاق الدقة الآمنة للعرض التنفيذي. افتح المالية لمراجعة المصدر بدل الاعتماد على رقم تقريبي." tone="warning" />}
          <EzButton tone="ghost" onClick={() => props.onOpenDestination('finance')}>فتح المالية</EzButton>
        </section>
      </div>

      <section className="ez-executive-decisions" data-executive-decisions="true">
        <header><div><span>قرارات مقترحة للانتباه</span><h2>الأعلى أثرًا الآن</h2></div><EzBadge tone="gold">{snapshot.decisions.length}</EzBadge></header>
        {snapshot.decisions.length ? snapshot.decisions.map((decision, index) => (
          <button type="button" key={decision.id} className="ez-executive-decision" onClick={() => props.onOpenDestination(decision.destination)} data-executive-decision={decision.id}>
            <span className={`ez-executive-decision__index is-${decision.tone}`}>{String(index + 1).padStart(2, '0')}</span>
            <span><small>{decision.destination === 'transactions' ? 'المعاملات' : decision.destination === 'today' ? 'العمل اليومي' : 'المالية'}</small><strong>{decision.title}</strong><b>{decision.detail}</b></span>
            <i aria-hidden="true">‹</i>
          </button>
        )) : <div className="ez-executive-decisions__empty"><strong>لا توجد قرارات حرجة الآن</strong><small>استمر في متابعة صندوق العمل والإشارات التشغيلية.</small></div>}
      </section>
    </section>
  );
}

function ExecutiveBriefingLoading(props: Readonly<{ onBack(): void }>) {
  return <section className="ez-core-screen ez-executive-briefing" data-core-screen="executive-briefing" data-executive-status="loading"><header className="ez-core-intro"><div><span>نظرة تنفيذية</span><h1>الملخص التنفيذي</h1><p>نجمع المصادر الموثوقة ونستخرج الاستثناءات المهمة.</p></div><EzButton tone="ghost" onClick={props.onBack}>العودة للرئيسية</EzButton></header><div className="ez-daily-skeleton" aria-label="جارٍ تجهيز الملخص التنفيذي"><i /><i /><i /><i /></div></section>;
}

function ExecutiveBriefingError(props: Readonly<{ message: string; onRetry(): void; onBack(): void }>) {
  return <section className="ez-core-screen ez-executive-briefing" data-core-screen="executive-briefing" data-executive-status="error"><header className="ez-core-intro"><div><span>نظرة تنفيذية</span><h1>الملخص التنفيذي</h1><p>تعذر تجهيز القراءة التنفيذية دون اكتمال المصادر.</p></div><EzButton tone="ghost" onClick={props.onBack}>العودة للرئيسية</EzButton></header><EzNotice title="تعذر تجهيز الملخص التنفيذي" body={props.message} tone="danger" action={<EzButton tone="dark" onClick={props.onRetry}>إعادة المحاولة</EzButton>} /></section>;
}

export function ConnectedExecutiveBriefingScreen(props: Readonly<{ onBack(): void; onOpenDestination(destination: ExecutiveBriefingDestination): void }>) {
  const controller = useExecutiveBriefing();
  if (controller.status === 'loading') return <ExecutiveBriefingLoading onBack={props.onBack} />;
  if (controller.status === 'error') return <ExecutiveBriefingError message={controller.errorMessage} onRetry={controller.retry} onBack={props.onBack} />;
  return <ExecutiveBriefingView snapshot={controller.snapshot} onBack={props.onBack} onOpenDestination={props.onOpenDestination} />;
}

export function FixtureExecutiveBriefingScreen(props: Readonly<{ onBack(): void; onOpenDestination(destination: ExecutiveBriefingDestination): void }>) {
  return <ExecutiveBriefingView snapshot={buildExecutiveBriefingPreviewSnapshot()} onBack={props.onBack} onOpenDestination={props.onOpenDestination} />;
}
