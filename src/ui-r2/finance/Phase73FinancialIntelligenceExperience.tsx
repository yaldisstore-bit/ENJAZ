import { useEffect,useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { buildFinancialIntelligenceSnapshot,type FinanceIntelligenceSnapshot } from '../../features/finance/financeIntelligence.ts';
import { formatFinanceMoney as m } from '../../features/finance/financeModel.ts';
import { loadFinanceSource } from '../../features/finance/financeService.ts';
import './phase73.css';

export function FinancialIntelligencePanel({intelligence:x}:{readonly intelligence:FinanceIntelligenceSnapshot}){
 return <section className="r2-f73-intelligence" data-finance-intelligence="authoritative-derived">
  <header className="r2-f73-hero"><p className="r2-eyebrow">Phase 7.3 · Financial Intelligence · M13 finance anchor</p><h1>الرؤية المالية</h1></header>
  <section className="r2-f73-kpis"><article>مفتوح <b dir="ltr">{m(x.totalOutstandingCents)}</b></article><article>متابعة <b>{x.counts.attention}</b></article><article>دائن <b dir="ltr">{m(x.totalCreditCents)}</b></article><article>إشارات <b>{x.counts.signals}</b></article></section>
  <aside className="r2-f73-disclosure">{x.agingDisclosure}</aside>
  <section className="r2-f73-grid r2-f73-grid--primary">
   <article className="r2-f73-card r2-f73-card--aging"><h2>عمر الأرصدة المفتوحة</h2>{x.aging.map(v=><div className="r2-f73-aging-row" data-aging-bucket={v.key} key={v.key}><span>{v.label} · {v.receivableCount}</span><b dir="ltr">{m(v.outstandingCents)}</b></div>)}</article>
   <article className="r2-f73-card r2-f73-card--trend"><h2>اتجاه التحصيل</h2><div className="r2-f73-chart">{x.trends.map(v=><div className="r2-f73-chart__column" key={v.monthKey}><span>{v.monthLabel}</span><b dir="ltr">{m(v.collectedCents)}</b></div>)}</div><p>Run-rate: {m(x.runRate.projectedNext30AtSameRunRateCents)}؛ ليس توقعاً مضموناً.</p></article>
  </section>
  <section className="r2-f73-grid">
   <article className="r2-f73-card"><h2>أولوية التحصيل</h2>{x.attentionQueue.length?x.attentionQueue.slice(0,8).map(v=><div className="r2-f73-attention" data-level={v.level} key={v.transactionId}><span>{v.companyLabel} · {v.ageDays} يوم</span><b dir="ltr">{m(v.outstandingCents)}</b></div>):<p>لا توجد أرصدة تتجاوز 30 يوماً</p>}</article>
   <article className="r2-f73-card"><h2>الصحة المالية للشركات</h2>{x.companyHealth.length?x.companyHealth.slice(0,6).map(v=><div className="r2-f73-health" data-health-band={v.band} key={v.companyId}><span>{v.companyLabel} · {v.healthScore}/100</span><b dir="ltr">{m(v.outstandingCents)}</b></div>):<p>لا توجد بيانات مالية للشركات بعد</p>}</article>
  </section>
  <section className="r2-f73-card r2-f73-signals"><h2>الإشارات والتفسير</h2>{x.signals.map(v=><article data-severity={v.severity} key={v.id}><strong>{v.title}</strong><p>{v.explanation}</p></article>)}</section>
 </section>
}

export function ConnectedPhase73FinancialIntelligenceExperience(){
 const user=useCurrentUserId(),factory=useDataLayerFactory(),[data,setData]=useState<FinanceIntelligenceSnapshot|false>();
 useEffect(()=>{let live=true;(async()=>{try{if(!user)throw 0;const r=await loadFinanceSource(factory,user);if(live)setData(buildFinancialIntelligenceSnapshot(r.source))}catch{if(live)setData(false)}})();return()=>{live=false}},[factory,user]);
 if(data===undefined)return <div className="r2-screen r2-finance-phase73"><h1>الرؤية المالية</h1><p>جارٍ بناء المؤشرات…</p></div>;
 if(data===false)return <div className="r2-screen r2-finance-phase73"><h1>لم تُبنَ الرؤية المالية</h1><p>تعذر بناء الرؤية من المصادر المعتمدة.</p></div>;
 return <div className="r2-screen r2-finance-phase73" data-finance-stage="7.3" data-m13-finance-anchor="true"><FinancialIntelligencePanel intelligence={data}/></div>
}
