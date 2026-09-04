import { useEffect, useState } from 'react';
import type { HomeDashboardSnapshot, HomePriorityItem, HomePriorityLevel, HomeSignalTone } from '../../features/home/homeDashboardModel.ts';
import { buildHomePreviewSnapshot, normalizeHomePreviewScenario, type HomePreviewScenario } from '../../features/home/homeDashboardPreview.ts';
import { useHomeDashboard } from '../../features/home/useHomeDashboard.ts';
import { EzButton, EzChip, EzNotice, EzStatPill } from '../components/primitives.tsx';

export type HomePriorityOpenAction = (item: HomePriorityItem) => void;

function priorityTone(level: HomePriorityLevel): 'danger' | 'warning' | 'info' {
  if (level === 'critical') return 'danger';
  if (level === 'high') return 'warning';
  return 'info';
}

function signalTone(tone: HomeSignalTone): 'success' | 'warning' | 'danger' | 'info' {
  return tone;
}

function formatMoney(value: number): string {
  return `${new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 2 }).format(value)} د.ع`;
}

function HomeSkeleton() {
  return (
    <section className="ez-core-screen ez-home-dashboard" data-core-screen="home" data-home-status="loading">
      <header className="ez-core-intro"><div><span>مساحة العمل</span><h1>الرئيسية</h1><p>نجمع حالة العمل من المصادر الموثوقة قبل عرض أي رقم.</p></div></header>
      <div className="ez-home-skeleton" aria-label="جارٍ تحميل لوحة العمل"><i /><i /><i /><i /><i /></div>
    </section>
  );
}

function HomeError(props: Readonly<{ message: string; onRetry(): void }>) {
  return (
    <section className="ez-core-screen ez-home-dashboard" data-core-screen="home" data-home-status="error">
      <header className="ez-core-intro"><div><span>مساحة العمل</span><h1>الرئيسية</h1><p>تعذر تجهيز لوحة العمل من المصدر الموثوق، لذلك لم نعرض أرقامًا جزئية أو تخمينية.</p></div></header>
      <EzNotice title="تعذر تحميل الرئيسية" body={props.message} tone="danger" action={<EzButton tone="dark" onClick={props.onRetry}>إعادة المحاولة</EzButton>} />
    </section>
  );
}

function HomeEmpty() {
  return (
    <section className="ez-home-empty" data-home-empty="true">
      <span>مساحة العمل هادئة</span>
      <strong>لا توجد معاملات نشطة أو أولويات تحتاج تدخلك الآن</strong>
      <small>ستظهر هنا الأولويات والمتابعات والعوائق تلقائيًا عند وجود عمل فعلي.</small>
    </section>
  );
}

function PriorityHero(props: Readonly<{ item: HomePriorityItem; onOpen(item: HomePriorityItem): void }>) {
  return (
    <section className={`ez-home-focus is-${props.item.level}`} data-home-focus={props.item.id}>
      <div className="ez-home-focus__copy">
        <span>الأولوية الآن</span>
        <h2>{props.item.title}</h2>
        <p>{props.item.reason}</p>
        <div className="ez-home-focus__chips">
          <EzChip tone={priorityTone(props.item.level)}>{props.item.level === 'critical' ? 'حرجة' : props.item.level === 'high' ? 'مرتفعة' : 'متوسطة'}</EzChip>
          {props.item.companyLabel ? <EzChip tone="neutral">{props.item.companyLabel}</EzChip> : null}
        </div>
      </div>
      <div className="ez-home-focus__action">
        <small>درجة الأولوية</small>
        <strong>{props.item.score}</strong>
        <EzButton tone="dark" onClick={() => props.onOpen(props.item)}>فتح المعاملة</EzButton>
      </div>
    </section>
  );
}

function HomeFinance(props: Readonly<{ snapshot: HomeDashboardSnapshot }>) {
  const finance = props.snapshot.finance;
  return (
    <section className="ez-home-finance" data-home-finance-precision={finance.precisionSafe ? 'safe' : 'unsafe'}>
      <header><div><span>النبض المالي</span><strong>العمل النشط فقط</strong></div><EzChip tone={finance.precisionSafe ? 'success' : 'warning'}>{finance.precisionSafe ? 'دقيق' : 'تحقق مطلوب'}</EzChip></header>
      {finance.precisionSafe ? (
        <div className="ez-home-finance__grid">
          <div><small>الأتعاب النشطة</small><strong>{formatMoney(finance.activeFees)}</strong></div>
          <div><small>المحصّل</small><strong>{formatMoney(finance.collectedAgainstActive)}</strong></div>
          <div><small>المتبقي</small><strong>{formatMoney(finance.outstandingActive)}</strong></div>
        </div>
      ) : (
        <EzNotice title="قيمة مالية أكبر من نطاق الدقة الآمن" body="تم إخفاء الأرقام بدل تقريبها أو تخمينها. افتح المالية للتحقق من القيمة من المصدر." tone="warning" />
      )}
    </section>
  );
}

export function HomeDashboardScreen(props: Readonly<{
  snapshot: HomeDashboardSnapshot | null;
  status: 'loading' | 'ready' | 'error';
  errorMessage: string | null;
  onRetry(): void;
  onOpenPriority(item: HomePriorityItem): void;
}>) {
  if (props.status === 'loading') return <HomeSkeleton />;
  if (props.status === 'error' || !props.snapshot) return <HomeError message={props.errorMessage ?? 'تعذر تجهيز لوحة العمل.'} onRetry={props.onRetry} />;

  const snapshot = props.snapshot;
  const focus = snapshot.priorities[0] ?? null;
  const trulyEmpty = snapshot.activeTransactions === 0 && snapshot.openFollowups === 0 && snapshot.openBlockers === 0 && snapshot.priorities.length === 0;

  return (
    <section className="ez-core-screen ez-home-dashboard" data-core-screen="home" data-pattern="home-dashboard" data-home-status="ready" data-home-priority-count={snapshot.priorities.length}>
      <header className="ez-core-intro">
        <div><span>مساحة العمل</span><h1>الرئيسية</h1><p>الأولوية والعمل الجاري والعوائق والنبض المالي من بيانات مساحة العمل نفسها.</p></div>
      </header>

      <section className="ez-home-summary" aria-label="ملخص الرئيسية" data-home-summary="true">
        <EzStatPill value={String(snapshot.activeTransactions)} label="معاملة نشطة" tone="dark" />
        <EzStatPill value={String(snapshot.urgentTransactions)} label="عاجلة" tone={snapshot.urgentTransactions ? 'gold' : 'soft'} />
        <EzStatPill value={String(snapshot.openFollowups)} label="متابعات مفتوحة" />
        <EzStatPill value={String(snapshot.openBlockers)} label="عوائق" tone={snapshot.criticalBlockers ? 'gold' : 'soft'} />
      </section>

      {focus ? <PriorityHero item={focus} onOpen={props.onOpenPriority} /> : trulyEmpty ? <HomeEmpty /> : <section className="ez-home-clear"><strong>لا توجد أولوية حرجة الآن</strong><small>توجد بيانات تشغيلية، لكن لا يوجد عنصر يتطلب التصعيد إلى منطقة الأولوية.</small></section>}

      <section className="ez-home-signals" aria-label="الإشارات التشغيلية">
        {snapshot.signals.map((signal) => (
          <article key={signal.id} data-home-signal={signal.id} className={`is-${signal.tone}`}>
            <header><span>{signal.label}</span><EzChip tone={signalTone(signal.tone)}>{signal.value}</EzChip></header>
            <strong>{signal.value}</strong>
            <p>{signal.detail}</p>
          </article>
        ))}
      </section>

      <HomeFinance snapshot={snapshot} />

      <section className="ez-home-priority-list" data-home-priority-list="true">
        <header><div><span>الأولويات</span><strong>أعلى عناصر تحتاج حركة</strong></div><EzChip tone="neutral">{snapshot.priorities.length} / 6</EzChip></header>
        {snapshot.priorities.length ? (
          <div>
            {snapshot.priorities.map((item, index) => (
              <button type="button" key={item.id} data-home-priority={item.id} onClick={() => props.onOpenPriority(item)}>
                <span className={`ez-home-priority-list__index is-${item.level}`}>{String(index + 1).padStart(2, '0')}</span>
                <span className="ez-home-priority-list__copy"><small>{item.companyLabel ?? 'معاملة نشطة'}</small><strong>{item.title}</strong><b>{item.reason}</b></span>
                <EzChip tone={priorityTone(item.level)}>{item.level === 'critical' ? 'حرجة' : item.level === 'high' ? 'مرتفعة' : 'متوسطة'}</EzChip>
              </button>
            ))}
          </div>
        ) : <div className="ez-home-priority-list__empty"><strong>لا توجد أولويات مفتوحة</strong><small>القائمة ستتحدث من حالة العمل الفعلية.</small></div>}
      </section>
    </section>
  );
}

export function ConnectedHomeScreen(props: Readonly<{ onOpenPriority: HomePriorityOpenAction }>) {
  const controller = useHomeDashboard();
  return <HomeDashboardScreen {...controller} onRetry={controller.retry} onOpenPriority={props.onOpenPriority} />;
}

export function FixtureHomeScreen(props: Readonly<{ onOpenPriority: HomePriorityOpenAction }>) {
  const [scenario] = useState<HomePreviewScenario>(() => normalizeHomePreviewScenario(new URLSearchParams(window.location.search).get('phase44-home')));
  const [state, setState] = useState<Readonly<{ status: 'loading' | 'ready' | 'error'; snapshot: HomeDashboardSnapshot | null; errorMessage: string | null }>>(() => {
    if (scenario === 'slow') return Object.freeze({ status: 'loading', snapshot: null, errorMessage: null });
    if (scenario === 'offline') return Object.freeze({ status: 'error', snapshot: null, errorMessage: 'تعذر الوصول إلى بيانات إنجاز الآن. تحقق من الاتصال ثم أعد المحاولة.' });
    return Object.freeze({ status: 'ready', snapshot: buildHomePreviewSnapshot(scenario), errorMessage: null });
  });

  useEffect(() => {
    if (scenario !== 'slow') return undefined;
    const timer = window.setTimeout(() => setState(Object.freeze({ status: 'ready', snapshot: buildHomePreviewSnapshot('normal'), errorMessage: null })), 650);
    return () => window.clearTimeout(timer);
  }, [scenario]);

  const retry = () => {
    setState(Object.freeze({ status: 'loading', snapshot: null, errorMessage: null }));
    window.setTimeout(() => setState(Object.freeze({ status: 'ready', snapshot: buildHomePreviewSnapshot('normal'), errorMessage: null })), 180);
  };

  return <HomeDashboardScreen {...state} onRetry={retry} onOpenPriority={props.onOpenPriority} />;
}
