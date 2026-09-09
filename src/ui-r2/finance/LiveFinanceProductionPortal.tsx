import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import type { HomeDashboardSnapshot } from '../../features/home/homeDashboardModel.ts';
import { loadHomeDashboard } from '../../features/home/homeDashboardService.ts';
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
  useEffect(()=>{let on=true;void loadHomeDashboard(factory,userId??'').then(x=>on&&setData(x.snapshot)).catch(()=>on&&setFailed(true));return()=>{on=false}},[factory,userId]);
  const items=(data?.priorities??[]).filter(x=>/^(blocker|followup|stalled):/.test(x.id));
  return <div className="r2-screen r2-oi-workspace" data-operational-domain="risk" data-risk-stage="9.1" data-risk-authority="read_only_derived_intelligence" data-risk-write-authority="none">
    <header className="r2-oi-header"><div><p className="r2-eyebrow">Phase 9.1 · Read Only</p><h1>المخاطر والرؤى</h1><p>إشارات مشتقة من أدلة تشغيلية معتمدة فقط. لا توجد write authority داخل Smart Risk.</p></div></header>
    {failed?<section className="r2-oi-panel" role="alert">تعذر تحميل المخاطر بأمان؛ لم تُعرض نتيجة جزئية.</section>:!data?<section className="r2-oi-panel">جارٍ التحميل…</section>:<section className="r2-oi-panel"><h2>{items.length} إشارة</h2>{items.length===0?<p>لا توجد إشارة تحتاج تصعيدًا الآن</p>:<div className="r2-risk-signals">{items.map(x=><div key={x.id} data-risk-code={x.id.split(':')[0]} data-risk-severity={x.level}><strong>{x.companyLabel??x.title}</strong><p>{x.reason}</p><small>الدليل: Home Dashboard · {x.id}</small></div>)}</div>}<p className="r2-oi-truth">المصدر: {data.activeTransactions} معاملات · {data.criticalBlockers} حواجز حرجة · {data.overdueFollowups} متابعات متأخرة · {data.stalledTransactions} متلكئة.</p></section>}
  </div>;
}
export function LiveFinanceProductionPortal(){
  const finance=useLiveRecordsPortal('finance',SHELL,'[data-operational-domain="finance"]'),risk=useLiveRecordsPortal('risk',SHELL,'[data-live-deferred="true"]');
  return <>{finance.active&&finance.target&&createPortal(<div className="r2-finance-phase73-stack"><ConnectedPhase74FinancialReportsExperience/><ConnectedPhase73FinancialIntelligenceExperience/><ConnectedPhase72FinanceExperience/></div>,finance.target)}{risk.active&&risk.target&&createPortal(<Risk/>,risk.target)}</>;
}
