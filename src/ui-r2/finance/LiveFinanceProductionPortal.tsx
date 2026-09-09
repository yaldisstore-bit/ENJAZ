import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
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
export function LiveFinanceProductionPortal(){
  const finance=useLiveRecordsPortal('finance',SHELL,'[data-operational-domain="finance"]'),risk=useLiveRecordsPortal('risk',SHELL,'[data-live-deferred="true"]'),factory=useDataLayerFactory(),userId=useCurrentUserId();
  useEffect(()=>{if(!risk.active||!risk.target)return;const t=risk.target,q=document.querySelector<HTMLTemplateElement>('#enjaz-risk-template');if(!q)return;t.className='r2-screen r2-oi-workspace';t.removeAttribute('data-live-deferred');t.dataset.operationalDomain='risk';t.dataset.riskStage='9.1';t.dataset.riskAuthority='read_only_derived_intelligence';t.dataset.riskWriteAuthority='none';t.replaceChildren(q.content.cloneNode(true));let on=true,b=t.querySelector<HTMLElement>('[data-risk-body]');void loadHomeDashboard(factory,userId??'').then(({snapshot:s})=>{if(!on||!b)return;const a=s.priorities.filter(x=>/^(blocker|followup|stalled):/.test(x.id));b.textContent=a.length?a.map(x=>`${x.title}: ${x.reason} [${x.id}]`).join('\n'):b.dataset.empty??''}).catch(()=>{if(on&&b)b.textContent=b.dataset.error??''});return()=>{on=false}},[risk.active,risk.target,factory,userId]);
  return finance.active&&finance.target?createPortal(<div className="r2-finance-phase73-stack"><ConnectedPhase74FinancialReportsExperience/><ConnectedPhase73FinancialIntelligenceExperience/><ConnectedPhase72FinanceExperience/></div>,finance.target):null;
}
