import { createPortal } from 'react-dom';
import { useLiveRecordsPortal } from '../records/LiveCompaniesProductionPortal.tsx';
import { ConnectedPhase72FinanceExperience } from './Phase72FinanceExperience.tsx';
import { ConnectedPhase73FinancialIntelligenceExperience } from './Phase73FinancialIntelligenceExperience.tsx';
import { ConnectedPhase74FinancialReportsExperience } from './Phase74FinancialReportsExperience.tsx';
import './finance.css';
import './phase72.css';
import './phase72-mobile-hardening.css';
import './phase73.css';

const FINANCE_SHELL = '.r2-shell[data-r2-runtime-mode="live"][data-destination]';
const FINANCE_PREVIEW = '[data-operational-domain="finance"]';

export function LiveFinanceProductionPortal() {
  const { active, target } = useLiveRecordsPortal('finance', FINANCE_SHELL, FINANCE_PREVIEW);
  if (!active || !target) return null;
  return createPortal(<div className="r2-finance-phase73-stack"><ConnectedPhase74FinancialReportsExperience /><ConnectedPhase73FinancialIntelligenceExperience /><ConnectedPhase72FinanceExperience /></div>, target);
}
