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
  useEffect(()=>{const t=risk.target;if(!risk.active||!t)return;const q=document.getElementById('enjaz-risk-template') as HTMLTemplateElement;if(!q)return;t.removeAttribute('data-live-deferred');t.replaceChildren(q.content.cloneNode(true));const b=t.querySelector<HTMLElement>('[data-risk-body]')!;void loadHomeDashboard(factory,userId??'').then(x=>{const a=x.snapshot.priorities.filter(v=>v.id.startsWith('blocker:')||v.id.startsWith('followup:')||v.id.startsWith('stalled:'));b.textContent=a.length?a.map(v=>`${v.title}: ${v.reason} [${v.id}]`).join('\n'):b.dataset.empty!}).catch(()=>{b.textContent=b.dataset.error!})},[risk.active,risk.target,factory,userId]);
  return finance.active&&finance.target?createPortal(<div className="r2-finance-phase73-stack"><ConnectedPhase74FinancialReportsExperience/><ConnectedPhase73FinancialIntelligenceExperience/><ConnectedPhase72FinanceExperience/></div>,finance.target):null;
}
