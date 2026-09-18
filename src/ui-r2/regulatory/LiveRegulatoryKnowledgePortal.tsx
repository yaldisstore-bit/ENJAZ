import { createPortal } from 'react-dom';
import type { RegulatoryKnowledgeGateway } from '../../features/regulatory/regulatoryKnowledgeCommands.ts';
import { RegulatoryKnowledgeCenter } from './RegulatoryKnowledgeCenter.tsx';
import {useLiveRecordsPortal} from '../runtime/useLiveRecordsPortal.ts';


export function LiveRegulatoryKnowledgePortal({gateway,workspace}:Readonly<{gateway:RegulatoryKnowledgeGateway;workspace:Promise<string|null>}>){
  const {active,target}=useLiveRecordsPortal('knowledge');
  return active&&target?createPortal(<RegulatoryKnowledgeCenter gateway={gateway} workspace={workspace}/>,target):null;
}
