import { createPortal } from 'react-dom';
import { useLiveRecordsPortal } from '../runtime/useLiveRecordsPortal.ts';
import { LiveUnifiedCalendarExperience } from './LiveUnifiedCalendarExperience.tsx';

const SHELL='.r2-shell[data-r2-runtime-mode="live"][data-destination]';
const PREVIEW='[data-live-deferred="true"]';

export function LiveUnifiedCalendarProductionPortal({workspace}:{readonly workspace:Promise<string|null>}){
  const {active,target}=useLiveRecordsPortal('calendar',SHELL,PREVIEW);
  if(!active||!target)return null;
  return createPortal(<LiveUnifiedCalendarExperience workspace={workspace}/>,target);
}
