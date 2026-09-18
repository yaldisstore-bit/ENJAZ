import { createPortal } from 'react-dom';
import { ConnectedCompanies } from './ConnectedCompanies.tsx';
import { useLiveRecordsPortal } from '../runtime/useLiveRecordsPortal.ts';
import './companies.css';

const COMPANY_SHELL = '.r2-shell[data-r2-runtime-mode="live"][data-destination]';
const COMPANY_PREVIEW = '[data-records-stage="R2.0-6"][data-records-domain="companies"]';
export function LiveCompaniesProductionPortal() {
  const { active, target } = useLiveRecordsPortal('companies', COMPANY_SHELL, COMPANY_PREVIEW);
  if (!active || !target) return null;
  return createPortal(<ConnectedCompanies />, target);
}
