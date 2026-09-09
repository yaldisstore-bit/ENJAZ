import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useFieldOperationsCommandGateway } from '../../features/field-operations/FieldOperationsCommandContext.tsx';
import { loadSmartRisk } from '../../features/risk/riskService.ts';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { useLiveRecordsPortal } from '../records/LiveCompaniesProductionPortal.tsx';
import { ConnectedPhase72FinanceExperience } from './Phase72FinanceExperience.tsx';
import { ConnectedPhase73FinancialIntelligenceExperience } from './Phase73FinancialIntelligenceExperience.tsx';
import { ConnectedPhase74FinancialReportsExperience } from './Phase74FinancialReportsExperience.tsx';
import './finance.css';
import './phase72.css';
import './phase72-mobile-hardening.css';
import './phase73.css';

const SHELL='.r2-shell[data-r2-runtime-mode=live][data-destination]';
export function LiveFinanceProductionPortal(){
  const finance=useLiveRecordsPortal('finance',SHELL,'[data-operational-domain=finance]'),risk=useLiveRecordsPortal('risk',SHELL,'[data-live-deferred]'),factory=useDataLayerFactory(),fieldOperations=useFieldOperationsCommandGateway(),userId=useCurrentUserId();
  useEffect(()=>{if(!risk.active||!userId)return;const t=risk.target!;t.replaceChildren((document.getElementById('enjaz-risk-template') as HTMLTemplateElement).content.cloneNode(true));const b=t.querySelector<HTMLElement>('[data-risk-body]')!;loadSmartRisk({dataFactory:factory,fieldOperations},userId).then(x=>{t.dataset.riskEngine='smart-risk-v1';t.dataset.riskSignalCount=String(x.signals.length);let s='';for(const v of x.signals)s+=`${v.code}: ${v.explanation} [${v.evidence.map(e=>e.sourceDomain).join('، ')}]\n`;b.textContent=s||b.dataset.empty!},()=>b.textContent=b.dataset.error!)},[risk.active,factory,fieldOperations,userId]);
  return finance.active&&finance.target?createPortal(<div className="r2-finance-phase73-stack"><ConnectedPhase74FinancialReportsExperience/><ConnectedPhase73FinancialIntelligenceExperience/><ConnectedPhase72FinanceExperience/></div>,finance.target):null;
}
