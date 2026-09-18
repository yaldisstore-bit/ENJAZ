import { createPortal } from 'react-dom';
import { ConnectedCompanies } from './ConnectedCompanies.tsx';
import {LIVE_SHELL,useLiveRecordsPortal} from '../runtime/useLiveRecordsPortal.ts';
import './companies.css';

const COMPANY_PREVIEW = '[data-records-stage="R2.0-6"][data-records-domain="companies"]';
export function LiveCompaniesProductionPortal() {
  const { active, target } = useLiveRecordsPortal('companies',LIVE_SHELL,COMPANY_PREVIEW);
  if (!active || !target) return null;
  return createPortal(<ConnectedCompanies />, target);
}
