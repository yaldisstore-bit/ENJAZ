import { createPortal } from 'react-dom';
import {useLiveRecordsPortal} from '../runtime/useLiveRecordsPortal.ts';
import { LiveUnifiedCalendarExperience } from './LiveUnifiedCalendarExperience.tsx';


export function LiveUnifiedCalendarProductionPortal({workspace}:{readonly workspace:Promise<string|null>}){
  const {active,target}=useLiveRecordsPortal('calendar');
  if(!active||!target)return null;
  return createPortal(<LiveUnifiedCalendarExperience workspace={workspace}/>,target);
}
