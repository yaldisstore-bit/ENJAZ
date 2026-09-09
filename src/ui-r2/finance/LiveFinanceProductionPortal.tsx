import { createPortal } from 'react-dom';
import { useLiveRecordsPortal } from '../records/LiveCompaniesProductionPortal.tsx';
import { LiveRiskExperience } from '../risk/LiveRiskExperience.tsx';
import { ConnectedPhase72FinanceExperience } from './Phase72FinanceExperience.tsx';
import { ConnectedPhase73FinancialIntelligenceExperience } from './Phase73FinancialIntelligenceExperience.tsx';
import { ConnectedPhase74FinancialReportsExperience } from './Phase74FinancialReportsExperience.tsx';
import './finance.css';
import './phase72.css';
import './phase72-mobile-hardening.css';
import './phase73.css';

const SHELL='.r2-shell[data-r2-runtime-mode="live"][data-destination]';
export function LiveFinanceProductionPortal(){
  const finance=useLiveRecordsPortal('finance',SHELL,'[data-operational-domain="finance"]');
  const risk=useLiveRecordsPortal('risk',SHELL,'[data-live-deferred="true"]');
  return <>{finance.active&&finance.target&&createPortal(<div className="r2-finance-phase73-stack"><ConnectedPhase74FinancialReportsExperience/><ConnectedPhase73FinancialIntelligenceExperience/><ConnectedPhase72FinanceExperience/></div>,finance.target)}{risk.active&&risk.target&&createPortal(<LiveRiskExperience navigate={(id)=>{const u=new URL(window.location.href);u.searchParams.set('dest',id);window.history.pushState({r2:true,destinationId:id},'',u);window.dispatchEvent(new PopStateEvent('popstate'));}}/>,risk.target)}</>;
}
