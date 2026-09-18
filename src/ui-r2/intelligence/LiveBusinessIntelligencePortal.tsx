import { createPortal } from 'react-dom';
import { BusinessIntelligenceCenter } from './BusinessIntelligenceCenter.tsx';
import {useLiveRecordsPortal} from '../runtime/useLiveRecordsPortal.ts';


export function LiveBusinessIntelligencePortal(){
 const {active,target}=useLiveRecordsPortal('insights');
 return active&&target?createPortal(<BusinessIntelligenceCenter/>,target):null;
}
