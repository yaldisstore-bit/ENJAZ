import { createPortal } from 'react-dom';
import { BusinessIntelligenceCenter } from './BusinessIntelligenceCenter.tsx';
import {LIVE_PLACEHOLDER,LIVE_SHELL,useLiveRecordsPortal} from '../runtime/useLiveRecordsPortal.ts';


export function LiveBusinessIntelligencePortal(){
 const {active,target}=useLiveRecordsPortal('insights',LIVE_SHELL,LIVE_PLACEHOLDER);
 return active&&target?createPortal(<BusinessIntelligenceCenter/>,target):null;
}
