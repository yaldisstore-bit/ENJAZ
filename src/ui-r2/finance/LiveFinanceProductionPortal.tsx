import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { loadHomeDashboard, type HomeDashboardSnapshot } from '../../features/home/homeDashboardService.ts';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { useLiveRecordsPortal } from '../records/LiveCompaniesProductionPortal.tsx';
import { ConnectedPhase72FinanceExperience } from './Phase72FinanceExperience.tsx';
import { ConnectedPhase73FinancialIntelligenceExperience } from './Phase73FinancialIntelligenceExperience.tsx';
import { ConnectedPhase74FinancialReportsExperience } from './Phase74FinancialReportsExperience.tsx';
import './finance.css';
import './phase72.css';
import './phase72-mobile-hardening.css';
import './phase73.css';

const SHELL='.r2-shell[data-r2-runtime-mode="live"][data-destination]';
function Risk(){
  const factory=useDataLayerFactory(),userId=useCurrentUserId(),[data,setData]=useState<HomeDashboardSnapshot|null>(null),[failed,setFailed]=useState(false);
  useEffect(()=>{let live=true;setData(null);setFailed(false);void loadHomeDashboard(factory,userId??'').then(x=>{if(live)setData(x.snapshot)}).catch(()=>{if(live)setFailed(true)});return()=>{live=false}},[factory,userId]);
  const items=(data?.priorities??[]).filter(x=>x.id.startsWith('blocker:')||x.id.startsWith('followup:')||x.id.startsWith('stalled:'));
  return <div className="r2-screen r2-oi-workspace r2-oi-risk" data-operational-domain="risk" data-risk-stage="9.1" data-risk-authority="read_only_derived_intelligence" data-risk-write-authority="none" data-risk-signal-count={items.length}>
    <header className="r2-oi-header"><div><p className="r2-eyebrow">Phase 9.1 · ذكاء قابل للتفسير</p><h1>المخاطر والرؤى</h1><p>لا تظهر إشارة إلا من دليل تشغيلي معتمد، ولا توجد write authority داخل Smart Risk.</p></div><span className="r2-oi-stage">Smart Risk · Read Only</span></header>
    {failed?<section className="r2-oi-panel" role="alert"><strong>تعذر تحميل صورة المخاطر بأمان.</strong><p>لم يعرض إنجاز نتيجة جزئية أو مخاطر مفبركة.</p></section>:!data?<section className="r2-oi-panel" aria-live="polite"><strong>جارٍ بناء صورة المخاطر من المصادر المعتمدة…</strong></section>:<>
      <section className="r2-operations-pulse" aria-label="ملخص المخاطر"><div><span>حرجة</span><strong>{items.filter(x=>x.level==='critical').length}</strong><small>أعلى أثر مثبت</small></div><div><span>مرتفعة</span><strong>{items.filter(x=>x.level==='high').length}</strong><small>تحتاج مراجعة</small></div><div><span>الإجمالي</span><strong>{items.length}</strong><small>إشارات مفسرة</small></div></section>
      <section className="r2-oi-panel"><div className="r2-oi-section-head"><div><p className="r2-eyebrow">Explainable signals</p><h2>لماذا ظهرت؟</h2></div><span>{items.length} إشارة</span></div>{items.length===0?<div className="r2-risk-signals"><div><strong>لا توجد إشارة تحتاج تصعيدًا الآن</strong><p>لم يوجد دليل تشغيلي يبرر risk signal ضمن المصادر المتصلة.</p></div></div>:<div className="r2-risk-signals">{items.map(x=><div key={x.id} data-risk-code={x.id.startsWith('blocker:')?'open_critical_blocker':x.id.startsWith('followup:')?'deadline_overdue':'transaction_stalled'} data-risk-severity={x.level}><div className="r2-oi-section-head"><div><p className="r2-eyebrow">{x.level==='critical'?'حرج':x.level==='high'?'مرتفع':'متوسط'}</p><strong>{x.companyLabel??x.title}</strong></div></div><p>{x.reason}</p><p><strong>الدليل:</strong> Home Dashboard · {x.id}</p></div>)}</div>}</section>
      <p className="r2-oi-truth" role="note">المصدر الحالي: {data.activeTransactions} معاملات فعّالة · {data.criticalBlockers} حواجز حرجة · {data.overdueFollowups} متابعات متأخرة · {data.stalledTransactions} معاملات متلكئة. لا توجد write authority داخل Smart Risk.</p>
    </>}
  </div>;
}
export function LiveFinanceProductionPortal(){
  const finance=useLiveRecordsPortal('finance',SHELL,'[data-operational-domain="finance"]'),risk=useLiveRecordsPortal('risk',SHELL,'[data-live-deferred="true"]');
  return <>{finance.active&&finance.target&&createPortal(<div className="r2-finance-phase73-stack"><ConnectedPhase74FinancialReportsExperience/><ConnectedPhase73FinancialIntelligenceExperience/><ConnectedPhase72FinanceExperience/></div>,finance.target)}{risk.active&&risk.target&&createPortal(<Risk/>,risk.target)}</>;
}
