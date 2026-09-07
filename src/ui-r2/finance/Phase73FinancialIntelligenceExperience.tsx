import { useEffect, useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { buildFinancialIntelligenceSnapshot, type FinanceIntelligenceSnapshot } from '../../features/finance/financeIntelligence.ts';
import { formatFinanceMoney } from '../../features/finance/financeModel.ts';
import { loadFinanceSource } from '../../features/finance/financeService.ts';
import './phase73.css';

const m=formatFinanceMoney;

export function FinancialIntelligencePanel({intelligence:x}:{readonly intelligence:FinanceIntelligenceSnapshot}){
 return <section className="r2-f73-intelligence" data-finance-intelligence="authoritative-derived">
  <header className="r2-f73-hero"><div><p className="r2-eyebrow">Phase 7.3 · Financial Intelligence · M13 finance anchor</p><h1>الرؤية المالية</h1><p>تحليل مشتق من مصادر المالية المعتمدة فقط؛ لا يوجد رصيد أو مخزن مالي موازٍ.</p></div></header>
  <section className="r2-f73-kpis" aria-label="ملخص الذكاء المالي"><article><span>الرصيد المفتوح</span><strong dir="ltr">{m(x.totalOutstandingCents)}</strong></article><article><span>بحاجة متابعة</span><strong>{x.counts.attention}</strong></article><article><span>الرصيد الدائن</span><strong dir="ltr">{m(x.totalCreditCents)}</strong></article><article><span>إشارات مالية</span><strong>{x.counts.signals}</strong></article></section>
  <aside className="r2-f73-disclosure" role="note">{x.agingDisclosure}</aside>
  <section className="r2-f73-grid r2-f73-grid--primary">
   <article className="r2-f73-card r2-f73-card--aging"><header><h2>عمر الأرصدة المفتوحة</h2></header><div className="r2-f73-aging-list">{x.aging.map(v=><div className="r2-f73-aging-row" data-aging-bucket={v.key} key={v.key}><div><strong>{v.label}</strong><span>{v.receivableCount} رصيد</span></div><b dir="ltr">{m(v.outstandingCents)}</b></div>)}</div></article>
   <article className="r2-f73-card r2-f73-card--trend"><header><h2>اتجاه التحصيل</h2></header><div className="r2-f73-chart">{x.trends.map(v=><div className="r2-f73-chart__column" key={v.monthKey}><strong>{v.monthLabel}</strong><b dir="ltr">{m(v.collectedCents)}</b></div>)}</div><footer><strong dir="ltr">{m(x.runRate.projectedNext30AtSameRunRateCents)}</strong><span>Run-rate للـ30 يوماً القادمة إذا استمر المتوسط الحالي؛ ليس توقعاً مضموناً ولا يُكتب إلى قاعدة البيانات.</span></footer></article>
  </section>
  <section className="r2-f73-grid">
   <article className="r2-f73-card"><header><h2>أولوية التحصيل</h2></header>{x.attentionQueue.length?<div className="r2-f73-attention-list">{x.attentionQueue.slice(0,8).map(v=><div className="r2-f73-attention" data-level={v.level} key={v.transactionId}><div><strong>{v.companyLabel}</strong><small>{v.transactionLabel} · {v.ageDays} يوم</small></div><b dir="ltr">{m(v.outstandingCents)}</b><p>{v.reason}</p></div>)}</div>:<div className="r2-f73-empty">لا توجد أرصدة تتجاوز 30 يوماً</div>}</article>
   <article className="r2-f73-card"><header><h2>الصحة المالية للشركات</h2></header>{x.companyHealth.length?<div className="r2-f73-health-list">{x.companyHealth.slice(0,6).map(v=><div className="r2-f73-health" data-health-band={v.band} key={v.companyId}><div className="r2-f73-health__score"><strong>{v.healthScore}</strong><span>/100</span></div><div className="r2-f73-health__main"><strong>{v.companyLabel}</strong><small>مفتوح {m(v.outstandingCents)} · تحصيل {(v.collectionRateBps/100).toFixed(0)}%</small></div></div>)}</div>:<div className="r2-f73-empty">لا توجد بيانات مالية للشركات بعد</div>}</article>
  </section>
  <section className="r2-f73-card r2-f73-signals"><header><h2>الإشارات والتفسير</h2></header><div>{x.signals.map(v=><article data-severity={v.severity} key={v.id}><div><strong>{v.title}</strong><p>{v.explanation}</p></div>{v.amountCents!==null&&<b dir="ltr">{m(v.amountCents)}</b>}</article>)}</div></section>
 </section>
}

type State={loading:boolean;data:FinanceIntelligenceSnapshot|null;error:string};
export function ConnectedPhase73FinancialIntelligenceExperience(){
 const userId=useCurrentUserId(),factory=useDataLayerFactory(),[retry,setRetry]=useState(0),[s,setS]=useState<State>({loading:true,data:null,error:''});
 useEffect(()=>{let live=true;setS({loading:true,data:null,error:''});(async()=>{try{if(!userId)throw new Error('انتهت الجلسة.');const {source}=await loadFinanceSource(factory,userId),data=buildFinancialIntelligenceSnapshot(source);if(live)setS({loading:false,data,error:''})}catch(e){if(live)setS({loading:false,data:null,error:e instanceof Error?e.message:'تعذر بناء الرؤية المالية.'})}})();return()=>{live=false}},[factory,userId,retry]);
 if(s.loading)return <div className="r2-screen r2-finance-phase73"><h1>الرؤية المالية</h1><p>جارٍ بناء المؤشرات من المصادر المعتمدة…</p></div>;
 if(!s.data)return <div className="r2-screen r2-finance-phase73"><h1>لم تُبنَ الرؤية المالية</h1><p>{s.error}</p><button className="r2-finance-retry" type="button" onClick={()=>setRetry(v=>v+1)}>إعادة التحقق</button></div>;
 return <div className="r2-screen r2-finance-phase73" data-finance-stage="7.3" data-m13-finance-anchor="true"><FinancialIntelligencePanel intelligence={s.data}/></div>
}
