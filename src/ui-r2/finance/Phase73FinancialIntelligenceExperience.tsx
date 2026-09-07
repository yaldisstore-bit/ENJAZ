import { useEffect, useMemo, useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { buildFinancialIntelligenceSnapshot, type FinanceIntelligenceSnapshot } from '../../features/finance/financeIntelligence.ts';
import { formatFinanceMoney } from '../../features/finance/financeModel.ts';
import { loadFinanceSource } from '../../features/finance/financeService.ts';
import './phase73.css';

const LABELS = {
  healthy: 'مستقرة', watch: 'تحت المراقبة', high_risk: 'تحتاج تدخل',
  critical: 'أولوية حرجة', high: 'أولوية عالية', info: 'معلومة',
} as const;

function pct(bps: number) { return `${(bps / 100).toFixed(bps % 100 ? 1 : 0)}%`; }
function money(value: bigint) { return formatFinanceMoney(value); }

export function FinancialIntelligencePanel({ intelligence: x }: { readonly intelligence: FinanceIntelligenceSnapshot }) {
  const maxAging = useMemo(() => x.aging.reduce((m, v) => v.outstandingCents > m ? v.outstandingCents : m, 0n), [x.aging]);
  const maxTrend = useMemo(() => x.trends.reduce((m, v) => v.collectedCents > m ? v.collectedCents : m, 0n), [x.trends]);
  return <section className="r2-f73-intelligence" data-finance-intelligence="authoritative-derived" aria-labelledby="r2-f73-title">
    <header className="r2-f73-hero"><div><p className="r2-eyebrow">Phase 7.3 · Financial Intelligence · M13 finance anchor</p><h1 id="r2-f73-title">الرؤية المالية</h1><p>تحليل مشتق من مصادر المالية المعتمدة فقط؛ لا يوجد رصيد أو مخزن مالي موازٍ.</p></div><div className="r2-f73-asof"><small>آخر احتساب</small><strong>{new Intl.DateTimeFormat('ar-IQ',{dateStyle:'medium',timeStyle:'short'}).format(new Date(x.asOf))}</strong><span>Read-only intelligence</span></div></header>

    <section className="r2-f73-kpis" aria-label="ملخص الذكاء المالي">
      <article><span>الرصيد المفتوح</span><strong dir="ltr">{money(x.totalOutstandingCents)}</strong><small>{x.counts.receivables} معاملة</small></article>
      <article><span>بحاجة متابعة</span><strong>{x.counts.attention}</strong><small>تجاوزت 30 يوماً تشغيلياً</small></article>
      <article><span>الرصيد الدائن</span><strong dir="ltr">{money(x.totalCreditCents)}</strong><small>لا يُسوّى تلقائياً</small></article>
      <article><span>إشارات مالية</span><strong>{x.counts.signals}</strong><small>قواعد تفسيرية قابلة للمراجعة</small></article>
    </section>

    <aside className="r2-f73-disclosure" role="note"><strong>قاعدة Aging</strong><span>{x.agingDisclosure}</span></aside>

    <section className="r2-f73-grid r2-f73-grid--primary">
      <article className="r2-f73-card r2-f73-card--aging"><header><div><p className="r2-eyebrow">Receivables aging</p><h2>عمر الأرصدة المفتوحة</h2></div><b dir="ltr">{money(x.totalOutstandingCents)}</b></header><div className="r2-f73-aging-list">{x.aging.map(v=><div className="r2-f73-aging-row" key={v.key} data-aging-bucket={v.key}><div><strong>{v.label}</strong><span>{v.receivableCount} رصيد</span></div><div className="r2-f73-meter" aria-hidden="true"><i style={{width:`${maxAging?Math.max(v.outstandingCents?6:0,Number(v.outstandingCents*100n/maxAging)):0}%`}}/></div><b dir="ltr">{money(v.outstandingCents)}</b></div>)}</div></article>

      <article className="r2-f73-card r2-f73-card--trend"><header><div><p className="r2-eyebrow">Collection trend</p><h2>اتجاه التحصيل</h2></div><span>{x.runRate.confidence==='directional'?'عينة اتجاهية':'عينة غير كافية'}</span></header><div className="r2-f73-runrate"><div><span>آخر 30 يوم</span><strong dir="ltr">{money(x.runRate.recent30CollectedCents)}</strong></div><div><span>30 يوم السابقة</span><strong dir="ltr">{money(x.runRate.previous30CollectedCents)}</strong></div><div><span>التغير</span><strong dir="ltr">{x.runRate.changeBps===null?'—':`${x.runRate.changeBps>=0?'+':''}${(x.runRate.changeBps/100).toFixed(1)}%`}</strong></div></div><div className="r2-f73-chart" aria-label="تحصيل آخر ستة أشهر">{x.trends.map(v=><div key={v.monthKey} className="r2-f73-chart__column"><div className="r2-f73-chart__bar"><i style={{height:`${maxTrend?Math.max(v.collectedCents?4:0,Number(v.collectedCents*100n/maxTrend)):4}%`}}/></div><b dir="ltr">{money(v.collectedCents)}</b><span>{v.monthLabel}</span></div>)}</div><footer><strong dir="ltr">{money(x.runRate.projectedNext30AtSameRunRateCents)}</strong><span>Run-rate لـ30 يوماً إذا استمر المتوسط الحالي؛ ليس توقعاً مضموناً ولا يُكتب إلى قاعدة البيانات.</span></footer></article>
    </section>

    <section className="r2-f73-grid">
      <article className="r2-f73-card"><header><div><p className="r2-eyebrow">Collection attention</p><h2>أولوية التحصيل</h2></div><span>{x.attentionQueue.length} إجمالي</span></header>{x.attentionQueue.length?<div className="r2-f73-attention-list">{x.attentionQueue.slice(0,8).map(v=><div key={v.transactionId} className="r2-f73-attention" data-level={v.level}><div><span>{LABELS[v.level]}</span><strong>{v.companyLabel}</strong><small>{v.transactionLabel} · {v.ageDays} يوم</small></div><b dir="ltr">{money(v.outstandingCents)}</b><p>{v.reason}</p></div>)}</div>:<div className="r2-f73-empty"><strong>لا توجد أرصدة تتجاوز 30 يوماً</strong></div>}</article>

      <article className="r2-f73-card"><header><div><p className="r2-eyebrow">Company health</p><h2>الصحة المالية للشركات</h2></div><span>{x.companyHealth.length} شركة</span></header>{x.companyHealth.length?<div className="r2-f73-health-list">{x.companyHealth.slice(0,6).map(v=><div className="r2-f73-health" key={v.companyId} data-health-band={v.band}><div className="r2-f73-health__score"><strong>{v.healthScore}</strong><span>/100</span></div><div className="r2-f73-health__main"><div><strong>{v.companyLabel}</strong><span>{LABELS[v.band]}</span></div><div className="r2-f73-meter"><i style={{width:`${v.healthScore}%`}}/></div><small>تحصيل {pct(v.collectionRateBps)} · مفتوح {money(v.outstandingCents)}</small></div></div>)}</div>:<div className="r2-f73-empty"><strong>لا توجد بيانات مالية للشركات بعد</strong></div>}</article>
    </section>

    <section className="r2-f73-card r2-f73-signals"><header><div><p className="r2-eyebrow">Explainable signals</p><h2>الإشارات والتفسير</h2></div><span>لا توجد Black Box</span></header><div>{x.signals.map(v=><article key={v.id} data-severity={v.severity}><span>{v.severity==='watch'?'مراقبة':LABELS[v.severity]}</span><div><strong>{v.title}</strong><p>{v.explanation}</p></div>{v.amountCents!==null&&<b dir="ltr">{money(v.amountCents)}</b>}</article>)}</div></section>
  </section>;
}

export function ConnectedPhase73FinancialIntelligenceExperience() {
  const userId=useCurrentUserId(), factory=useDataLayerFactory();
  const [attempt,setAttempt]=useState(0);
  const [state,setState]=useState<{status:'loading'|'ready'|'error';data:FinanceIntelligenceSnapshot|null;error:string}>({status:'loading',data:null,error:''});
  useEffect(()=>{let active=true; setState({status:'loading',data:null,error:''}); (async()=>{try{if(!userId)throw new Error('انتهت الجلسة.'); const loaded=await loadFinanceSource(factory,userId); const data=buildFinancialIntelligenceSnapshot(loaded.source); if(active)setState({status:'ready',data,error:''});}catch(e){if(active)setState({status:'error',data:null,error:e instanceof Error?e.message:'تعذر بناء الرؤية المالية.'});}})(); return()=>{active=false};},[attempt,factory,userId]);
  if(state.status==='loading')return <div className="r2-screen r2-finance-phase73"><header className="r2-f73-hero"><div><p className="r2-eyebrow">Phase 7.3 · Financial Intelligence</p><h1>الرؤية المالية</h1><p>جارٍ بناء المؤشرات من المصادر المعتمدة…</p></div></header><div className="r2-finance-loading" aria-live="polite"><span/><span/><span/></div></div>;
  if(state.status==='error'||!state.data)return <div className="r2-screen r2-finance-phase73"><header className="r2-f73-hero"><div><p className="r2-eyebrow">Phase 7.3 · Fail closed</p><h1>لم تُبنَ الرؤية المالية</h1><p>{state.error}</p></div></header><button className="r2-finance-retry" type="button" onClick={()=>setAttempt(v=>v+1)}>إعادة التحقق</button></div>;
  return <div className="r2-screen r2-finance-phase73" data-finance-stage="7.3" data-m13-finance-anchor="true"><FinancialIntelligencePanel intelligence={state.data}/></div>;
}
