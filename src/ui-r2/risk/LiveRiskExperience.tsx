import { useEffect, useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useFieldOperationsCommandGateway } from '../../features/field-operations/FieldOperationsCommandContext.tsx';
import type { RiskRecommendation, RiskSeverity, RiskSignal } from '../../features/risk/riskEngine.ts';
import { loadSmartRisk, type SmartRiskLiveResult } from '../../features/risk/riskService.ts';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import type { R2DestinationId } from '../architecture/navigation-contract.ts';

type LoadState = 'loading' | 'ready' | 'error';
type Props = Readonly<{ navigate: (id: R2DestinationId) => void }>;

const DESTINATION: Readonly<Record<RiskRecommendation['destination'], R2DestinationId>> = {
  '/app/transactions': 'transactions',
  '/app/workflow': 'workflow',
  '/app/finance': 'finance',
  '/app/operations': 'operations',
  '/app/companies': 'companies',
};

const SEVERITY_LABEL: Readonly<Record<RiskSeverity, string>> = {
  critical: 'حرج',
  high: 'مرتفع',
  medium: 'متوسط',
  low: 'مراقبة',
};

function entityLabel(signal: RiskSignal): string {
  return signal.entity.label?.trim() || `${signal.entity.type} · ${signal.entity.id.slice(0, 8)}`;
}

function evidenceLabel(signal: RiskSignal): string {
  return signal.evidence.slice(0, 2).map((evidence) => `${evidence.sourceDomain} · ${evidence.field}: ${String(evidence.observedValue)}`).join(' — ');
}

export function LiveRiskExperience({ navigate }: Props) {
  const userId = useCurrentUserId();
  const dataFactory = useDataLayerFactory();
  const fieldOperations = useFieldOperationsCommandGateway();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [result, setResult] = useState<SmartRiskLiveResult | null>(null);

  useEffect(() => {
    let live = true;
    setLoadState('loading');
    setResult(null);
    void (async () => {
      try {
        if (!userId) throw new Error('NO_SESSION');
        const next = await loadSmartRisk({ dataFactory, fieldOperations }, userId);
        if (!live) return;
        setResult(next);
        setLoadState('ready');
      } catch {
        if (!live) return;
        setLoadState('error');
      }
    })();
    return () => { live = false; };
  }, [dataFactory, fieldOperations, userId]);

  let critical = 0;
  let high = 0;
  let now = 0;
  for (const signal of result?.signals ?? []) {
    if (signal.severity === 'critical') critical += 1;
    else if (signal.severity === 'high') high += 1;
    if (signal.urgency === 'now') now += 1;
  }

  const primary = result?.signals[0] ?? null;

  return <div className="r2-screen r2-oi-workspace r2-oi-risk" data-operational-domain="risk" data-risk-stage="9.1" data-risk-authority="read_only_derived_intelligence" data-risk-write-authority="none" data-risk-signal-count={result?.signals.length ?? 0}>
    <header className="r2-oi-header">
      <div><p className="r2-eyebrow">Phase 9.1 · ذكاء قابل للتفسير</p><h1>المخاطر والرؤى</h1><p>تظهر الإشارة فقط بدليل ومصدر معتمد. الشاشة للقراءة فقط ولا تغيّر أي سجل.</p></div>
      <span className="r2-oi-stage">Smart Risk · Read Only</span>
    </header>

    {loadState === 'loading' && <section className="r2-oi-panel" aria-live="polite"><strong>جارٍ بناء صورة المخاطر من المصادر المعتمدة…</strong></section>}
    {loadState === 'error' && <section className="r2-oi-panel" role="alert"><strong>تعذر تحميل صورة المخاطر بأمان.</strong><p>لا يعرض إنجاز مخاطر جزئية أو مفبركة. أعد المحاولة.</p></section>}

    {loadState === 'ready' && result && <>
      <section className="r2-operations-pulse" aria-label="ملخص المخاطر">
        <div><span>حرجة</span><strong>{critical}</strong><small>أعلى أثر مثبت</small></div>
        <div><span>مرتفعة</span><strong>{high}</strong><small>تحتاج مراجعة قريبة</small></div>
        <div><span>الآن</span><strong>{now}</strong><small>إشارات ذات urgency=now</small></div>
      </section>

      {primary && <section className="r2-command-focus" aria-label="أولوية المخاطر">
        <div className="r2-command-focus__primary"><p className="r2-eyebrow">أعلى أولوية مثبتة</p><h2>{entityLabel(primary)}</h2><p>{primary.explanation}</p></div>
        <div className="r2-command-signal"><span>{SEVERITY_LABEL[primary.severity]}</span><strong>{primary.components[0]?.explanation ?? primary.explanation}</strong><small>{evidenceLabel(primary)}</small></div>
      </section>}

      <section className="r2-oi-panel">
        <div className="r2-oi-section-head"><div><p className="r2-eyebrow">Explainable signals</p><h2>لماذا ظهرت؟</h2></div><span>{result.signals.length} إشارة</span></div>
        {result.signals.length === 0 ? <div className="r2-risk-signals"><div><strong>لا توجد إشارة تحتاج تصعيدًا الآن</strong><p>لا يوجد دليل يبرر إنشاء إشارة مخاطر حاليًا.</p></div></div> : <div className="r2-risk-signals">
          {result.signals.map((signal) => <div key={`${signal.code}:${signal.entity.type}:${signal.entity.id}:${signal.evidence[0]?.sourceObjectId ?? ''}`} data-risk-code={signal.code} data-risk-severity={signal.severity} data-risk-urgency={signal.urgency}>
            <div className="r2-oi-section-head"><div><p className="r2-eyebrow">{SEVERITY_LABEL[signal.severity]} · {signal.urgency === 'now' ? 'الآن' : signal.urgency === 'soon' ? 'قريبًا' : 'مراقبة'}</p><strong>{entityLabel(signal)}</strong></div><span>{signal.code}</span></div>
            <p>{signal.explanation}</p>
            <p><strong>المكونات:</strong> {signal.components.map((component) => component.explanation).join(' · ')}</p>
            <p><strong>الدليل:</strong> {evidenceLabel(signal)}</p>
            <button type="button" className="r2-action r2-action--secondary" onClick={() => navigate(DESTINATION[signal.recommendation.destination])}>{signal.recommendation.label}</button>
          </div>)}
        </div>}
      </section>

      <p className="r2-oi-truth" role="note">المصادر: {result.sourceCounts.transactions} معاملات · {result.sourceCounts.blockers} حواجز · {result.sourceCounts.financeAnomalies} مالية · {result.sourceCounts.workloadOwners} عبء عمل. لا توجد write authority داخل Smart Risk.</p>
    </>}
  </div>;
}
