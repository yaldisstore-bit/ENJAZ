import { Link } from 'react-router';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Skeleton, type BadgeTone } from '../../../design-system/components/index.ts';
import { RiskSignalPattern, formatIqd, type RiskLevel } from '../../../design-system/patterns/index.ts';
import type { HomeDashboardSnapshot, HomeOperationalSignal } from '../homeDashboardModel.ts';
import { useHomeDashboard } from '../useHomeDashboard.ts';

const SIGNAL_TONES: Readonly<Record<HomeOperationalSignal['tone'], BadgeTone>> = Object.freeze({
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'brand',
});

type FocusGlyph = 'active' | 'urgent' | 'stalled' | 'followup';
type FocusVariant = 'mint' | 'peach' | 'cream' | 'ink';

function FocusGlyphIcon({ name }: Readonly<{ name: FocusGlyph }>) {
  const common = {
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    focusable: false,
    'aria-hidden': true,
  };

  switch (name) {
    case 'active':
      return <svg {...common}><rect x="9" y="9" width="30" height="30" rx="10" /><path d="M17 24h14M24 17v14" /><circle cx="35" cy="13" r="4" /></svg>;
    case 'urgent':
      return <svg {...common}><path d="M24 7 41 37H7L24 7Z" /><path d="M24 18v9M24 32h.01" /></svg>;
    case 'stalled':
      return <svg {...common}><path d="M12 13h24v22H12z" /><path d="M18 19h12M18 25h8M18 31h5" /><path d="m34 8 5 5-5 5" /></svg>;
    case 'followup':
      return <svg {...common}><path d="M10 14h28v20H10z" /><path d="m10 20 14 9 14-9" /><circle cx="36" cy="12" r="5" /></svg>;
  }
}

function DashboardLoading() {
  return (
    <section className="home-dashboard" aria-busy="true" aria-label="جارٍ تجهيز لوحة العمل">
      <div className="home-dashboard__intro home-dashboard__intro--loading">
        <Skeleton variant="line" className="home-dashboard__skeleton-short" />
        <Skeleton variant="line" />
      </div>
      <div className="home-dashboard__hero home-dashboard__hero--loading">
        <Skeleton variant="block" />
      </div>
      <div className="home-dashboard__metric-grid" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} variant="block" />)}
      </div>
      <div className="home-dashboard__content-grid" aria-hidden="true">
        <Skeleton variant="block" />
        <Skeleton variant="block" />
      </div>
    </section>
  );
}

function DashboardError({ message, retry }: Readonly<{ message: string; retry(): void }>) {
  return (
    <section className="home-dashboard home-dashboard--centered" aria-labelledby="home-error-title">
      <Card tone="raised" className="home-dashboard__error-card">
        <CardHeader title="تعذر تجهيز لوحة العمل" subtitle="تم إيقاف العرض بدل إظهار أرقام جزئية" />
        <CardBody>
          <p id="home-error-title" className="type-body-lg">{message}</p>
          <Button onClick={retry}>إعادة المحاولة</Button>
        </CardBody>
      </Card>
    </section>
  );
}

function MetricCard({ label, value, detail, tone = 'neutral', glyph, variant }: Readonly<{
  label: string;
  value: number;
  detail: string;
  tone?: BadgeTone;
  glyph: FocusGlyph;
  variant: FocusVariant;
}>) {
  return (
    <article className={`home-focus-card home-focus-card--${variant}`}>
      <div className="home-focus-card__copy">
        <span className="type-caption">{label}</span>
        <strong className="home-focus-card__value type-title-lg text-numeric">{value}</strong>
        <Badge tone={tone}>{detail}</Badge>
      </div>
      <span className="home-focus-card__visual" aria-hidden="true"><FocusGlyphIcon name={glyph} /></span>
    </article>
  );
}

export function HomeDashboardView({ snapshot }: Readonly<{ snapshot: HomeDashboardSnapshot }>) {
  const attentionCount = snapshot.priorities.length;
  const priorityDestination = snapshot.priorities[0]?.destination ?? '/app/transactions';
  const priorityBadge = attentionCount > 0
    ? <Badge tone="warning">{attentionCount} تحتاج انتباهًا</Badge>
    : <Badge tone="success">لا توجد أولوية حرجة</Badge>;

  return (
    <section className="home-dashboard" aria-labelledby="home-dashboard-title">
      <header className="home-dashboard__intro">
        <div className="home-dashboard__intro-copy text-container-safe">
          <p className="home-dashboard__eyebrow">إنجاز · اليوم</p>
          <h1 id="home-dashboard-title" className="type-display-md">لننجز يومك بوضوح</h1>
          <p className="type-body home-dashboard__lead">كل ما يحتاج قرارًا أو متابعة أمامك، بلا ضجيج وبلا مؤشرات وهمية.</p>
        </div>
        {priorityBadge}
      </header>

      <section className="home-dashboard__hero" aria-labelledby="home-plan-title">
        <div className="home-dashboard__hero-copy">
          <p className="home-dashboard__hero-kicker">خطة العمل الآن</p>
          <h2 id="home-plan-title" className="type-title-lg">
            {attentionCount ? `${attentionCount} عناصر تبدأ بها اليوم` : 'يومك تحت السيطرة'}
          </h2>
          <p>{attentionCount ? 'ابدأ بالأعلى أثرًا، ثم تحرك لبقية العمل بهدوء.' : 'لا توجد أولوية حرجة؛ يمكنك متابعة العمل النشط.'}</p>
          <Link className="home-dashboard__primary-action" to={priorityDestination}>
            {attentionCount ? 'ابدأ بالأولوية' : 'افتح المعاملات'}
          </Link>
        </div>
        <div className="home-dashboard__attention-orb" aria-label={`${attentionCount} أولويات ظاهرة`}>
          <span className="home-dashboard__attention-ring" aria-hidden="true" />
          <strong className="text-numeric">{attentionCount}</strong>
          <span>أولوية</span>
        </div>
      </section>

      <section className="home-dashboard__focus" aria-labelledby="home-focus-title">
        <div className="home-dashboard__section-heading">
          <div>
            <p className="type-caption">Today's Focus</p>
            <h2 id="home-focus-title" className="type-title-md">تركيز اليوم</h2>
          </div>
          <Link className="home-dashboard__text-link" to="/app/today">العمل اليومي</Link>
        </div>

        <div className="home-dashboard__metric-grid" aria-label="ملخص العمل النشط">
          <MetricCard label="المعاملات النشطة" value={snapshot.activeTransactions} detail="نشطة الآن" tone="brand" glyph="active" variant="mint" />
          <MetricCard label="الأولوية العاجلة" value={snapshot.urgentTransactions} detail={snapshot.urgentTransactions ? 'تحتاج انتباهًا' : 'مستقر'} tone={snapshot.urgentTransactions ? 'warning' : 'success'} glyph="urgent" variant="peach" />
          <MetricCard label="المعاملات المتلكئة" value={snapshot.stalledTransactions} detail={snapshot.stalledTransactions ? 'تحتاج معالجة' : 'لا توجد'} tone={snapshot.stalledTransactions ? 'warning' : 'success'} glyph="stalled" variant="cream" />
          <MetricCard label="المتابعات المفتوحة" value={snapshot.openFollowups} detail={snapshot.overdueFollowups ? `${snapshot.overdueFollowups} متأخرة` : 'ضمن الوقت'} tone={snapshot.overdueFollowups ? 'danger' : 'success'} glyph="followup" variant="ink" />
        </div>
      </section>

      <div className="home-dashboard__content-grid">
        <section className="home-dashboard__priorities" aria-labelledby="home-priorities-title">
          <div className="home-dashboard__section-heading">
            <div>
              <p className="type-caption">الأولوية قبل الكثرة</p>
              <h2 id="home-priorities-title" className="type-title-md">جدول الأولويات</h2>
            </div>
            <Link className="home-dashboard__text-link" to="/app/transactions">كل المعاملات</Link>
          </div>

          {snapshot.priorities.length ? (
            <div className="home-dashboard__priority-list">
              {snapshot.priorities.map((priority) => (
                <RiskSignalPattern
                  key={priority.id}
                  level={priority.level as RiskLevel}
                  title={priority.title}
                  {...(priority.companyLabel ? { entityLabel: priority.companyLabel } : {})}
                  reason={priority.reason}
                  nextAction="راجع المعاملة وحدد الإجراء التالي."
                  density="compact"
                  action={<Link className="home-dashboard__text-link" to={priority.destination}>فتح</Link>}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="لا توجد أولوية حرجة الآن"
              description="لم نجد عائقًا حرجًا أو متابعة متأخرة أو معاملة عاجلة/متلكئة ضمن العمل النشط."
              icon="✓"
              action={<Link className="home-dashboard__text-link" to="/app/transactions">استعراض المعاملات</Link>}
            />
          )}
        </section>

        <aside className="home-dashboard__side-column" aria-label="المالية والإشارات التشغيلية">
          <section className="home-dashboard__finance" aria-labelledby="home-finance-title">
            <div className="home-dashboard__finance-heading">
              <div>
                <p className="type-caption">نظرة مالية سريعة</p>
                <h2 id="home-finance-title" className="type-title-md">تحصيل العمل النشط</h2>
              </div>
              <Badge tone={snapshot.finance.precisionSafe ? 'success' : 'warning'}>{snapshot.finance.precisionSafe ? 'دقة رقمية آمنة' : 'قيمة تقريبية'}</Badge>
            </div>
            <p className="home-dashboard__finance-copy">الأتعاب الحالية مقابل المقبوضات المسجلة للمعاملات النشطة</p>
            <div className="home-dashboard__money-hero">
              <span className="type-caption">المتبقي على العمل النشط</span>
              <strong className="type-title-lg text-numeric">{formatIqd(snapshot.finance.outstandingActive)}</strong>
            </div>
            <dl className="home-dashboard__money-grid">
              <div><dt>إجمالي الأتعاب</dt><dd className="text-numeric">{formatIqd(snapshot.finance.activeFees)}</dd></div>
              <div><dt>المقبوض</dt><dd className="text-numeric">{formatIqd(snapshot.finance.collectedAgainstActive)}</dd></div>
            </dl>
            {!snapshot.finance.precisionSafe ? (
              <p className="type-caption home-dashboard__precision-note">
                تجاوزت بعض القيم نطاق الحساب الآمن في JavaScript؛ لذلك لا تُعرض هذه النظرة كحساب مالي نهائي. الدفتر المالي في Phase 7 يبقى المرجع المحاسبي.
              </p>
            ) : null}
          </section>

          <section className="home-dashboard__signals" aria-labelledby="home-signals-title">
            <div className="home-dashboard__section-heading">
              <div>
                <p className="type-caption">إشارات تشغيلية</p>
                <h2 id="home-signals-title" className="type-title-md">صحة العمل الآن</h2>
              </div>
            </div>
            <div className="home-dashboard__signal-list">
              {snapshot.signals.map((signal) => (
                <article key={signal.id} className="home-signal">
                  <div className="home-signal__heading">
                    <strong className="type-body">{signal.label}</strong>
                    <Badge tone={SIGNAL_TONES[signal.tone]}>{signal.value}</Badge>
                  </div>
                  <p className="type-caption">{signal.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export function HomeDashboardPage() {
  const state = useHomeDashboard();
  if (state.status === 'loading') return <DashboardLoading />;
  if (state.status === 'error') return <DashboardError message={state.errorMessage} retry={state.retry} />;
  return <HomeDashboardView snapshot={state.snapshot} />;
}
