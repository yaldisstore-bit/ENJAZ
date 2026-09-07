import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { useFinanceCommandGateway } from '../../features/finance/FinanceCommandContext.tsx';
import {
  buildFinancialIntelligenceSnapshot,
  type CompanyFinancialHealth,
  type FinanceAttentionItem,
  type FinanceIntelligenceSignal,
  type FinanceIntelligenceSnapshot,
  type FinanceTrendPeriod,
} from '../../features/finance/financeIntelligence.ts';
import { buildFinanceLedgerSnapshot, financeMoneyToCents, formatFinanceMoney, type FinanceLedgerSnapshot } from '../../features/finance/financeModel.ts';
import { loadFinanceSource } from '../../features/finance/financeService.ts';
import type { FinancePaymentContext } from '../../features/finance/financeCommands.ts';
import { Phase72FinanceExperience, type FinanceTransactionOption } from './Phase72FinanceExperience.tsx';
import './phase73.css';

function percentBps(value: number): string {
  return `${Math.max(0, Math.min(100, value / 100)).toFixed(value % 100 === 0 ? 0 : 1)}%`;
}

function healthBandLabel(item: CompanyFinancialHealth): string {
  if (item.band === 'healthy') return 'مستقرة';
  if (item.band === 'watch') return 'تحت المراقبة';
  return 'تحتاج تدخل';
}

function attentionLabel(item: FinanceAttentionItem): string {
  if (item.level === 'critical') return 'أولوية حرجة';
  if (item.level === 'high') return 'أولوية عالية';
  return 'متابعة';
}

function signalLabel(signal: FinanceIntelligenceSignal): string {
  if (signal.severity === 'high') return 'مرتفع';
  if (signal.severity === 'watch') return 'مراقبة';
  return 'معلومة';
}

function trendHeight(period: FinanceTrendPeriod, max: bigint): string {
  if (max <= 0n || period.collectedCents <= 0n) return '4%';
  return `${Math.max(4, Number((period.collectedCents * 100n) / max))}%`;
}

export function FinancialIntelligencePanel({ intelligence }: { readonly intelligence: FinanceIntelligenceSnapshot }) {
  const maxAging = useMemo(() => intelligence.aging.reduce((max, item) => item.outstandingCents > max ? item.outstandingCents : max, 0n), [intelligence.aging]);
  const maxTrend = useMemo(() => intelligence.trends.reduce((max, item) => item.collectedCents > max ? item.collectedCents : max, 0n), [intelligence.trends]);
  const riskiestCompanies = intelligence.companyHealth.slice(0, 6);
  const attention = intelligence.attentionQueue.slice(0, 8);

  return (
    <section className="r2-f73-intelligence" data-finance-intelligence="authoritative-derived" aria-labelledby="r2-f73-title">
      <header className="r2-f73-hero">
        <div>
          <p className="r2-eyebrow">Phase 7.3 · Financial Intelligence · M13 finance anchor</p>
          <h1 id="r2-f73-title">الرؤية المالية</h1>
          <p>قراءة تفسيرية فوق نفس مصادر المالية المعتمدة: الأتعاب، الدفعات، العكوسات، القيود والخزائن. لا توجد أموال أو أرصدة موازية داخل هذه الشاشة.</p>
        </div>
        <div className="r2-f73-asof"><small>آخر احتساب</small><strong>{new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(intelligence.asOf))}</strong><span>Read-only intelligence</span></div>
      </header>

      <section className="r2-f73-kpis" aria-label="ملخص الذكاء المالي">
        <article><span>الرصيد المفتوح</span><strong dir="ltr">{formatFinanceMoney(intelligence.totalOutstandingCents)}</strong><small>{intelligence.counts.receivables} معاملة برصيد مفتوح</small></article>
        <article><span>بحاجة متابعة</span><strong>{intelligence.counts.attention}</strong><small>أرصدة تجاوز عمرها التشغيلي 30 يوماً</small></article>
        <article><span>الرصيد الدائن</span><strong dir="ltr">{formatFinanceMoney(intelligence.totalCreditCents)}</strong><small>لا يُحوّل تلقائياً إلى تخفيض أو استرداد</small></article>
        <article><span>إشارات مالية</span><strong>{intelligence.counts.signals}</strong><small>قواعد تفسيرية قابلة للمراجعة وليست AI تخمينية</small></article>
      </section>

      <aside className="r2-f73-disclosure" role="note"><strong>قاعدة Aging واضحة</strong><span>{intelligence.agingDisclosure}</span></aside>

      <section className="r2-f73-grid r2-f73-grid--primary">
        <article className="r2-f73-card r2-f73-card--aging" aria-labelledby="r2-f73-aging-title">
          <header><div><p className="r2-eyebrow">Receivables aging</p><h2 id="r2-f73-aging-title">عمر الأرصدة المفتوحة</h2></div><b dir="ltr">{formatFinanceMoney(intelligence.totalOutstandingCents)}</b></header>
          <div className="r2-f73-aging-list">{intelligence.aging.map((item) => {
            const width = maxAging > 0n ? Number((item.outstandingCents * 100n) / maxAging) : 0;
            return <div className="r2-f73-aging-row" key={item.key} data-aging-bucket={item.key}><div><strong>{item.label}</strong><span>{item.receivableCount} رصيد</span></div><div className="r2-f73-meter" aria-hidden="true"><i style={{ width: `${Math.max(item.outstandingCents > 0n ? 6 : 0, width)}%` }} /></div><b dir="ltr">{formatFinanceMoney(item.outstandingCents)}</b></div>;
          })}</div>
        </article>

        <article className="r2-f73-card r2-f73-card--trend" aria-labelledby="r2-f73-trend-title">
          <header><div><p className="r2-eyebrow">Collection trend</p><h2 id="r2-f73-trend-title">اتجاه التحصيل</h2></div><span>{intelligence.runRate.confidence === 'directional' ? 'عينة اتجاهية' : 'عينة غير كافية'}</span></header>
          <div className="r2-f73-runrate">
            <div><span>آخر 30 يوم</span><strong dir="ltr">{formatFinanceMoney(intelligence.runRate.recent30CollectedCents)}</strong></div>
            <div><span>30 يوم السابقة</span><strong dir="ltr">{formatFinanceMoney(intelligence.runRate.previous30CollectedCents)}</strong></div>
            <div><span>التغير</span><strong dir="ltr">{intelligence.runRate.changeBps === null ? '—' : `${intelligence.runRate.changeBps >= 0 ? '+' : ''}${(intelligence.runRate.changeBps / 100).toFixed(1)}%`}</strong></div>
          </div>
          <div className="r2-f73-chart" aria-label="تحصيل آخر ستة أشهر">{intelligence.trends.map((period) => <div key={period.monthKey} className="r2-f73-chart__column"><div className="r2-f73-chart__bar"><i style={{ height: trendHeight(period, maxTrend) }} /></div><b dir="ltr">{formatFinanceMoney(period.collectedCents)}</b><span>{period.monthLabel}</span></div>)}</div>
          <footer><strong dir="ltr">{formatFinanceMoney(intelligence.runRate.projectedNext30AtSameRunRateCents)}</strong><span>Run-rate لـ30 يوماً إذا استمر نفس متوسط آخر 30 يوماً؛ ليس توقعاً مضموناً ولا يكتب أي رقم إلى قاعدة البيانات.</span></footer>
        </article>
      </section>

      <section className="r2-f73-grid">
        <article className="r2-f73-card" aria-labelledby="r2-f73-attention-title">
          <header><div><p className="r2-eyebrow">Collection attention</p><h2 id="r2-f73-attention-title">أولوية التحصيل</h2></div><span>{intelligence.attentionQueue.length} إجمالي</span></header>
          {attention.length ? <div className="r2-f73-attention-list">{attention.map((item) => <div key={item.transactionId} className="r2-f73-attention" data-level={item.level}><div><span>{attentionLabel(item)}</span><strong>{item.companyLabel}</strong><small>{item.transactionLabel} · {item.ageDays} يوم</small></div><b dir="ltr">{formatFinanceMoney(item.outstandingCents)}</b><p>{item.reason}</p></div>)}</div> : <div className="r2-f73-empty"><strong>لا توجد أرصدة تتجاوز 30 يوماً</strong><span>ستظهر هنا الأرصدة التي تتطلب متابعة حسب عمر الرصيد التشغيلي.</span></div>}
        </article>

        <article className="r2-f73-card" aria-labelledby="r2-f73-health-title">
          <header><div><p className="r2-eyebrow">Company health</p><h2 id="r2-f73-health-title">الصحة المالية للشركات</h2></div><span>{intelligence.companyHealth.length} شركة</span></header>
          {riskiestCompanies.length ? <div className="r2-f73-health-list">{riskiestCompanies.map((item) => <div className="r2-f73-health" key={item.companyId} data-health-band={item.band}><div className="r2-f73-health__score"><strong>{item.healthScore}</strong><span>/100</span></div><div className="r2-f73-health__main"><div><strong>{item.companyLabel}</strong><span>{healthBandLabel(item)}</span></div><div className="r2-f73-meter"><i style={{ width: `${item.healthScore}%` }} /></div><small>تحصيل {percentBps(item.collectionRateBps)} · مفتوح {formatFinanceMoney(item.outstandingCents)}</small></div></div>)}</div> : <div className="r2-f73-empty"><strong>لا توجد بيانات مالية للشركات بعد</strong><span>عند ظهور أتعاب أو أرصدة سيُبنى التقييم التفسيري هنا.</span></div>}
        </article>
      </section>

      <section className="r2-f73-card r2-f73-signals" aria-labelledby="r2-f73-signals-title">
        <header><div><p className="r2-eyebrow">Explainable signals</p><h2 id="r2-f73-signals-title">الإشارات والتفسير</h2></div><span>لا توجد Black Box</span></header>
        <div>{intelligence.signals.map((signal) => <article key={signal.id} data-severity={signal.severity}><span>{signalLabel(signal)}</span><div><strong>{signal.title}</strong><p>{signal.explanation}</p></div>{signal.amountCents !== null && <b dir="ltr">{formatFinanceMoney(signal.amountCents)}</b>}</article>)}</div>
      </section>
    </section>
  );
}

type ConnectedState = Readonly<{
  status: 'loading' | 'ready' | 'error';
  workspaceId: string | null;
  snapshot: FinanceLedgerSnapshot | null;
  intelligence: FinanceIntelligenceSnapshot | null;
  context: FinancePaymentContext | null;
  transactions: readonly FinanceTransactionOption[];
  error: string | null;
}>;

function initialState(): ConnectedState {
  return Object.freeze({ status: 'loading', workspaceId: null, snapshot: null, intelligence: null, context: null, transactions: Object.freeze([]), error: null });
}

function userError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'تعذر بناء الرؤية المالية من المصادر المعتمدة.';
}

export function ConnectedPhase73FinancialIntelligenceExperience() {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const commandGateway = useFinanceCommandGateway();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ConnectedState>(() => initialState());

  const reload = useCallback(async () => {
    if (!userId) { setState(Object.freeze({ ...initialState(), status: 'error', error: 'انتهت الجلسة.' })); return; }
    setState((current) => Object.freeze({ ...current, status: 'loading', error: null }));
    try {
      const loaded = await loadFinanceSource(factory, userId);
      const snapshot = buildFinanceLedgerSnapshot(loaded.source);
      const intelligence = buildFinancialIntelligenceSnapshot(loaded.source);
      const context = await commandGateway.loadContext(loaded.workspaceId);
      const receivableById = new Map(snapshot.receivables.map((item) => [item.transactionId, item] as const));
      const companiesById = new Map(loaded.source.companies.map((item) => [item.id, item] as const));
      const transactions = loaded.source.transactions
        .filter((item) => item.deleted_at === null)
        .map((item): FinanceTransactionOption => {
          const receivable = receivableById.get(item.id);
          const company = companiesById.get(item.company_id);
          const feeCents = receivable?.feeCents ?? financeMoneyToCents(item.current_fee, 'transaction_fee', item.id);
          return Object.freeze({
            id: item.id,
            companyId: item.company_id,
            title: item.legacy_id?.trim() ? `معاملة ${item.legacy_id.trim()}` : item.type,
            companyLabel: company?.display_name?.trim() || company?.legal_name?.trim() || 'شركة غير متاحة',
            feeCents,
            collectedCents: receivable?.collectedCents ?? feeCents,
            outstandingCents: receivable?.outstandingCents ?? 0n,
          });
        });
      setState(Object.freeze({ status: 'ready', workspaceId: loaded.workspaceId, snapshot, intelligence, context, transactions: Object.freeze(transactions), error: null }));
    } catch (caught) {
      setState(Object.freeze({ status: 'error', workspaceId: null, snapshot: null, intelligence: null, context: null, transactions: Object.freeze([]), error: userError(caught) }));
    }
  }, [commandGateway, factory, userId]);

  useEffect(() => { void reload(); }, [attempt, reload]);

  if (state.status === 'loading') return <div className="r2-screen r2-finance-phase73"><header className="r2-f73-hero"><div><p className="r2-eyebrow">Phase 7.3 · Financial Intelligence</p><h1>الرؤية المالية</h1><p>جارٍ بناء المؤشرات من المصادر المالية المعتمدة…</p></div></header><div className="r2-finance-loading" aria-live="polite"><span /><span /><span /></div></div>;
  if (state.status === 'error' || !state.workspaceId || !state.snapshot || !state.intelligence || !state.context) return <div className="r2-screen r2-finance-phase73"><header className="r2-f73-hero"><div><p className="r2-eyebrow">Phase 7.3 · Fail closed</p><h1>لم تُبنَ الرؤية المالية</h1><p>{state.error ?? 'تعذر تحميل المصادر المالية.'}</p></div></header><button className="r2-finance-retry" type="button" onClick={() => setAttempt((value) => value + 1)}>إعادة التحقق</button></div>;

  return <div className="r2-screen r2-finance-phase73" data-finance-stage="7.3" data-m13-finance-anchor="true"><FinancialIntelligencePanel intelligence={state.intelligence} /><section className="r2-f73-operations" aria-label="عمليات المالية والتحصيل"><div className="r2-f73-operations__title"><p className="r2-eyebrow">Phase 7.2 preserved</p><h2>التحصيل والإيصالات</h2><span>جميع أوامر الدفع والعكس والخزائن والعقود بقيت فعالة تحت نفس الحراس.</span></div><Phase72FinanceExperience snapshot={state.snapshot} context={state.context} transactions={state.transactions} commandGateway={commandGateway} workspaceId={state.workspaceId} onChanged={reload} /></section></div>;
}
