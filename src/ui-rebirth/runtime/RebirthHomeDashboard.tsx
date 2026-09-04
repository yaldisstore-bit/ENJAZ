import type { AppRoute } from '../../core/routing/routes.ts';
import { ROUTES } from '../../core/routing/routes.ts';
import type { HomeDashboardSnapshot, HomePriorityItem, HomeSignalTone } from '../../features/home/homeDashboardModel.ts';
import type { HomeDashboardLoadState } from '../../features/home/useHomeDashboard.ts';
import './rebirth-home-dashboard.css';

export interface RebirthHomeDashboardProps {
  readonly state: HomeDashboardLoadState;
  readonly onNavigate(route: AppRoute): void;
  readonly onRetry?: () => void;
}

const money = new Intl.NumberFormat('ar-IQ', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${money.format(value)} د.ع`;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function collectionPercent(snapshot: HomeDashboardSnapshot): number {
  if (snapshot.finance.activeFees <= 0) return 0;
  return clampPercent((snapshot.finance.collectedAgainstActive / snapshot.finance.activeFees) * 100);
}

function toneLabel(tone: HomeSignalTone): string {
  if (tone === 'danger') return 'يحتاج تدخلاً';
  if (tone === 'warning') return 'تحت المراقبة';
  if (tone === 'success') return 'مستقر';
  return 'للمتابعة';
}

function PriorityCard(props: Readonly<{
  item: HomePriorityItem;
  index: number;
  onOpen(): void;
}>) {
  const { item, index, onOpen } = props;
  return (
    <button
      className="rebirth-home__priority-card ui-pressable"
      data-level={item.level}
      data-rank={index + 1}
      type="button"
      onClick={onOpen}
      aria-label={`فتح ${item.title}`}
    >
      <span className="rebirth-home__priority-topline">
        <span className="rebirth-home__priority-rank">0{index + 1}</span>
        <span className="rebirth-home__priority-level">
          {item.level === 'critical' ? 'حرج' : item.level === 'high' ? 'مرتفع' : 'متوسط'}
        </span>
      </span>
      <span className="rebirth-home__priority-copy">
        {item.companyLabel ? <small>{item.companyLabel}</small> : null}
        <strong>{item.title}</strong>
        <span>{item.reason}</span>
      </span>
      <span className="rebirth-home__priority-arrow" aria-hidden="true">↗</span>
    </button>
  );
}

function LoadingHome() {
  return (
    <section className="rebirth-home rebirth-home--loading" aria-label="تحميل الرئيسية" aria-busy="true">
      <div className="rebirth-home__loading-hero" aria-hidden="true">
        <span /><span /><span />
      </div>
      <div className="rebirth-home__loading-grid" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <span className="sr-only">جارٍ تجهيز لوحة العمل.</span>
    </section>
  );
}

function ErrorHome(props: Readonly<{ message: string; onRetry?: () => void }>) {
  return (
    <section className="rebirth-home rebirth-home--error" aria-labelledby="rebirth-home-error-title">
      <div className="rebirth-home__error-mark" aria-hidden="true">!</div>
      <div>
        <span className="rebirth-home__eyebrow">تعذر تجهيز اللوحة</span>
        <h1 id="rebirth-home-error-title">لم نعرض أرقامًا غير مؤكدة.</h1>
        <p>{props.message}</p>
      </div>
      {props.onRetry ? (
        <button className="rebirth-home__error-action ui-pressable" type="button" onClick={props.onRetry}>
          إعادة المحاولة
        </button>
      ) : null}
    </section>
  );
}

function ReadyHome(props: Readonly<{
  snapshot: HomeDashboardSnapshot;
  onNavigate(route: AppRoute): void;
}>) {
  const { snapshot, onNavigate } = props;
  const priorities = snapshot.priorities.slice(0, 4);
  const percent = collectionPercent(snapshot);

  return (
    <div className="rebirth-home" data-home-ready="true">
      <section className="rebirth-home__hero" aria-labelledby="rebirth-home-title">
        <div className="rebirth-home__hero-orbit" aria-hidden="true" />
        <div className="rebirth-home__hero-copy">
          <span className="rebirth-home__eyebrow">صورة اليوم</span>
          <h1 id="rebirth-home-title">اعرف ما يحتاج قرارك، قبل أن يبدأ الزحام.</h1>
          <p>
            لديك <strong>{snapshot.activeTransactions}</strong> معاملة نشطة، منها{' '}
            <strong>{snapshot.urgentTransactions}</strong> عاجلة و{' '}
            <strong>{snapshot.overdueFollowups}</strong> متابعة متأخرة.
          </p>
          <button
            className="rebirth-home__hero-action ui-pressable"
            type="button"
            onClick={() => onNavigate(ROUTES.appToday)}
          >
            افتح عمل اليوم <span aria-hidden="true">←</span>
          </button>
        </div>

        <div className="rebirth-home__hero-score" aria-label={`${snapshot.activeTransactions} معاملة نشطة`}>
          <span className="rebirth-home__hero-score-ring" aria-hidden="true" />
          <strong>{snapshot.activeTransactions}</strong>
          <span>نشطة الآن</span>
        </div>

        <div className="rebirth-home__hero-stats" aria-label="ملخص العمل">
          <div><strong>{snapshot.urgentTransactions}</strong><span>عاجلة</span></div>
          <div><strong>{snapshot.openFollowups}</strong><span>متابعات</span></div>
          <div><strong>{snapshot.criticalBlockers}</strong><span>عوائق حرجة</span></div>
        </div>
      </section>

      <section className="rebirth-home__section" aria-labelledby="rebirth-home-focus-title">
        <header className="rebirth-home__section-head">
          <div>
            <span className="rebirth-home__eyebrow">تركيزك الآن</span>
            <h2 id="rebirth-home-focus-title">الأولوية قبل القائمة</h2>
          </div>
          <button className="rebirth-home__text-action ui-pressable" type="button" onClick={() => onNavigate(ROUTES.appTransactions)}>
            كل المعاملات
          </button>
        </header>

        {priorities.length ? (
          <div className="rebirth-home__priority-mosaic">
            {priorities.map((item, index) => (
              <PriorityCard
                key={item.id}
                item={item}
                index={index}
                onOpen={() => onNavigate(item.destination)}
              />
            ))}
          </div>
        ) : (
          <div className="rebirth-home__clear-state">
            <span aria-hidden="true">✓</span>
            <div><strong>لا توجد أولوية حرجة الآن.</strong><small>لوحة اليوم خالية من عناصر تستدعي تدخلاً مباشرًا.</small></div>
          </div>
        )}
      </section>

      <section className="rebirth-home__finance" aria-labelledby="rebirth-home-finance-title">
        <div className="rebirth-home__finance-heading">
          <span className="rebirth-home__finance-kicker">التحصيل النشط</span>
          <h2 id="rebirth-home-finance-title">{formatMoney(snapshot.finance.collectedAgainstActive)}</h2>
          <p>من أصل {formatMoney(snapshot.finance.activeFees)} ضمن المعاملات النشطة.</p>
        </div>

        <div className="rebirth-home__finance-meter" aria-label={`نسبة التحصيل ${Math.round(percent)} بالمئة`}>
          <div><span style={{ inlineSize: `${percent}%` }} /></div>
          <strong>{Math.round(percent)}%</strong>
        </div>

        <div className="rebirth-home__finance-foot">
          <div><small>المتبقي</small><strong>{formatMoney(snapshot.finance.outstandingActive)}</strong></div>
          <div><small>دقة الأرقام</small><strong>{snapshot.finance.precisionSafe ? 'موثوقة' : 'تحتاج مراجعة'}</strong></div>
        </div>
      </section>

      <section className="rebirth-home__section rebirth-home__section--pulse" aria-labelledby="rebirth-home-pulse-title">
        <header className="rebirth-home__section-head">
          <div>
            <span className="rebirth-home__eyebrow">نبض التشغيل</span>
            <h2 id="rebirth-home-pulse-title">ما الذي يتحرك خلف الأرقام؟</h2>
          </div>
        </header>
        <div className="rebirth-home__signal-stack">
          {snapshot.signals.map((signal, index) => (
            <article className="rebirth-home__signal" data-tone={signal.tone} key={signal.id}>
              <span className="rebirth-home__signal-index" aria-hidden="true">0{index + 1}</span>
              <div className="rebirth-home__signal-copy">
                <span><strong>{signal.label}</strong><small>{toneLabel(signal.tone)}</small></span>
                <p>{signal.detail}</p>
              </div>
              <strong className="rebirth-home__signal-value">{signal.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="rebirth-home__closing" aria-label="الخطوة التالية">
        <div>
          <span className="rebirth-home__eyebrow">الخطوة التالية</span>
          <h2>حوّل الإشارات إلى عمل.</h2>
          <p>ابدأ من المتأخر والعاجل، ثم أكمل بقية اليوم بترتيب واضح.</p>
        </div>
        <button className="rebirth-home__closing-action ui-pressable" type="button" onClick={() => onNavigate(ROUTES.appToday)}>
          العمل اليومي
        </button>
      </section>
    </div>
  );
}

export function RebirthHomeDashboard(props: RebirthHomeDashboardProps) {
  if (props.state.status === 'loading') return <LoadingHome />;
  if (props.state.status === 'error') return <ErrorHome message={props.state.errorMessage} onRetry={props.onRetry} />;
  return <ReadyHome snapshot={props.state.snapshot} onNavigate={props.onNavigate} />;
}
