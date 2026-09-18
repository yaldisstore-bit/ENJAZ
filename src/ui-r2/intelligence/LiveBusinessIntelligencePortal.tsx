import { createPortal } from 'react-dom';
import { BusinessIntelligenceCenter } from './BusinessIntelligenceCenter.tsx';
import {useLiveRecordsPortal} from '../runtime/useLiveRecordsPortal.ts';

const SHELL='.r2-shell[data-r2-runtime-mode="live"][data-destination]';
const PLACEHOLDER='[data-live-deferred="true"]';

export function LiveBusinessIntelligencePortal(){
 const {active,target}=useLiveRecordsPortal('insights',SHELL,PLACEHOLDER);
 return active&&target?createPortal(<BusinessIntelligenceCenter/>,target):null;
}
