import { createPortal } from 'react-dom';
import type { RegulatoryKnowledgeGateway } from '../../features/regulatory/regulatoryKnowledgeCommands.ts';
import { RegulatoryKnowledgeCenter } from './RegulatoryKnowledgeCenter.tsx';
import {LIVE_PLACEHOLDER,LIVE_SHELL,useLiveRecordsPortal} from '../runtime/useLiveRecordsPortal.ts';


export function LiveRegulatoryKnowledgePortal({gateway,workspace}:Readonly<{gateway:RegulatoryKnowledgeGateway;workspace:Promise<string|null>}>){
  const {active,target}=useLiveRecordsPortal('knowledge',LIVE_SHELL,LIVE_PLACEHOLDER);
  return active&&target?createPortal(<RegulatoryKnowledgeCenter gateway={gateway} workspace={workspace}/>,target):null;
}
