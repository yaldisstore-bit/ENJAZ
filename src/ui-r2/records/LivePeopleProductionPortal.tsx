import { createPortal } from 'react-dom';
import { ConnectedPeople } from './ConnectedPeople.tsx';
import { useLiveRecordsPortal } from './LiveCompaniesProductionPortal.tsx';
import './people.css';

const PEOPLE_PREVIEW = '[data-records-stage="R2.0-6"][data-records-domain="people"]';
export function LivePeopleProductionPortal() {
  const { active, target } = useLiveRecordsPortal('people', PEOPLE_PREVIEW);
  if (!active || !target) return null;
  return createPortal(<ConnectedPeople />, target);
}
