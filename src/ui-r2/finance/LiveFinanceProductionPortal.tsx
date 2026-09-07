import { createPortal } from 'react-dom';
import { useLiveRecordsPortal } from '../records/LiveCompaniesProductionPortal.tsx';
import { ConnectedPhase72FinanceExperience } from './Phase72FinanceExperience.tsx';
import './finance.css';
import './phase72.css';

const FINANCE_SHELL = '.r2-shell[data-r2-runtime-mode="live"][data-destination]';
const FINANCE_PREVIEW = '[data-operational-domain="finance"]';

export function LiveFinanceProductionPortal() {
  const { active, target } = useLiveRecordsPortal('finance', FINANCE_SHELL, FINANCE_PREVIEW);
  if (!active || !target) return null;
  return createPortal(<ConnectedPhase72FinanceExperience />, target);
}
