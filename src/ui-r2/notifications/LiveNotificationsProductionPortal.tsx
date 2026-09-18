import { createPortal } from 'react-dom';
import { useLiveRecordsPortal } from '../runtime/useLiveRecordsPortal.ts';
import { LiveNotificationExperience } from './LiveNotificationExperience.tsx';

const PREVIEW = '[data-core-connected="today"]';

export function LiveNotificationsProductionPortal() {
  const { active, target } = useLiveRecordsPortal('today.notifications',PREVIEW);
  if (!active || !target) return null;
  return createPortal(<LiveNotificationExperience />, target);
}
