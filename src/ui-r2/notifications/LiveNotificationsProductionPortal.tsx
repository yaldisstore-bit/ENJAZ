import { createPortal } from 'react-dom';
import { useLiveRecordsPortal } from '../records/LiveCompaniesProductionPortal.tsx';
import { LiveNotificationExperience } from './LiveNotificationExperience.tsx';

const SHELL = '.r2-shell[data-r2-runtime-mode="live"][data-destination]';
const PREVIEW = '[data-core-connected="today"]';

export function LiveNotificationsProductionPortal() {
  const { active, target } = useLiveRecordsPortal('today.notifications', SHELL, PREVIEW);
  if (!active || !target) return null;
  return createPortal(<LiveNotificationExperience />, target);
}
