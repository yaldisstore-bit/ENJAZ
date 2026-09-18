import { createPortal } from 'react-dom';
import {LIVE_PLACEHOLDER,LIVE_SHELL,useLiveRecordsPortal} from '../runtime/useLiveRecordsPortal.ts';
import { LiveUnifiedCalendarExperience } from './LiveUnifiedCalendarExperience.tsx';


export function LiveUnifiedCalendarProductionPortal({workspace}:{readonly workspace:Promise<string|null>}){
  const {active,target}=useLiveRecordsPortal('calendar',LIVE_SHELL,LIVE_PLACEHOLDER);
  if(!active||!target)return null;
  return createPortal(<LiveUnifiedCalendarExperience workspace={workspace}/>,target);
}
