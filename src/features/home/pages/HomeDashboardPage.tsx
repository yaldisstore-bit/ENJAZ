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

function DashboardLoading() {
  return (
    <section className="home-dashboard" aria-busy="true" aria-label="جارٍ تجهيز لوحة العمل">
      <div className="home-dashboard__hero home-dashboard__hero--loading">
        <Skeleton variant="line" className="home-dashboard__skeleton-short" />
        <Skeleton variant="line" />
        <Skeleton variant="line" />
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

function MetricCard({ label, value, detail, tone = 'neutral' }: Readonly<{
  label: string;
  value: number;
  detail: string;
  tone?: BadgeTone;
}>) {
  return (
    <article className="home-metric">
      <div className="home-metric__topline">
        <span className="type-caption">{label}</span>
        <Badge tone={tone}>{detail}</Badge>
      </div>
      <strong className="home-metric__value type-display-sm text-numeric">{value}</strong>
    </article>
  );
}

export function HomeDashboardView({ snapshot }: Readonly<{ snapshot: HomeDashboardSnapshot }>) {
  const priorityBadge = snapshot.priorities.length > 0
    ? <Badge tone="warning">{snapshot.priorities.length} تحتاج انتباهًا</Badge>
    : <Badge tone="success">لا توجد أولوية حرجة</Badge>;

  return (
    <section className="home-dashboard" aria-labelledby="home-dashboard-title">
      <header className="home-dashboard__hero">
        <div className="home-dashboard__hero-copy text-container-safe">
          <p className="home-dashboard__eyebrow">إنجاز · لوحة العمل</p>
          <h1 id="home-dashboard-title" className="type-display-md">ما الذي يحتاج انتباهك الآن؟</h1>
          <p className="type-body-lg home-dashboard__lead">
            ملخص تشغيلي مباشر من مساحة العمل الحالية: الأولويات، التعثر، المتابعات والتحصيل المرتبط بالعمل النشط — دون مؤشرات تجميلية أو بيانات وهمية.
          </p>
        </div>
        {priorityBadge}
      </header>

      <div className="home-dashboard__metric-grid" aria-label="ملخص العمل النشط">
        <MetricCard label="المعاملات النشطة" value={snapshot.activeTransactions} detail="نشطة الآن" tone="brand" />
        <MetricCard label="الأولوية العاجلة" value={snapshot.urgentTransactions} detail={snapshot.urgentTransactions ? 'تحتاج انتباهًا' : 'مستقر'} tone={snapshot.urgentTransactions ? 'warning' : 'success'} />
        <MetricCard label="المعاملات المتلكئة" value={snapshot.stalledTransactions} detail={snapshot.stalledTransactions ? 'تحتاج معالجة' : 'لا توجد'} tone={snapshot.stalledTransactions ? 'warning' : 'success'} />
        <MetricCard label="المتابعات المفتوحة" value={snapshot.openFollowups} detail={snapshot.overdueFollowups ? `${snapshot.overdueFollowups} متأخرة` : 'ضمن الوقت'} tone={snapshot.overdueFollowups ? 'danger' : 'success'} />
      </div>

      <div className="home-dashboard__content-grid">
        <section className="home-dashboard__priorities" aria-labelledby="home-priorities-title">
          <div className="home-dashboard__section-heading">
            <div>
              <p className="type-caption">الأولوية قبل الكثرة</p>
              <h2 id="home-priorities-title" className="type-title-md">ما يجب معالجته أولًا</h2>
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
          <Card tone="prominent" className="home-dashboard__finance">
            <CardHeader
              title="تحصيل العمل النشط"
              subtitle="الأتعاب الحالية مقابل المقبوضات المسجلة للمعاملات النشطة"
              aside={<Badge tone={snapshot.finance.precisionSafe ? 'success' : 'warning'}>{snapshot.finance.precisionSafe ? 'دقة رقمية آمنة' : 'قيمة تقريبية'}</Badge>}
            />
            <CardBody>
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
            </CardBody>
          </Card>

          <section className="home-dashboard__signals" aria-labelledby="home-signals-title">
            <div className="home-dashboard__section-heading">
              <div>
                <p className="type-caption">إشارات تشغيلية</p>
                <h2 id="home-signals-title" className="type-title-md">صحة العمل الآن</h2>
              </div>
              <Link className="home-dashboard__text-link" to="/app/today">العمل اليومي</Link>
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
