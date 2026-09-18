import { createPortal } from 'react-dom';
import { ConnectedCompanies } from './ConnectedCompanies.tsx';
import {useLiveRecordsPortal} from '../runtime/useLiveRecordsPortal.ts';
import './companies.css';

const COMPANY_PREVIEW = '[data-records-stage="R2.0-6"][data-records-domain="companies"]';
export function LiveCompaniesProductionPortal() {
  const { active, target } = useLiveRecordsPortal('companies',COMPANY_PREVIEW);
  if (!active || !target) return null;
  return createPortal(<ConnectedCompanies />, target);
}
