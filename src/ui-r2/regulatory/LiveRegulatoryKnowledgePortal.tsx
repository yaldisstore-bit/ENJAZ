import { createPortal } from 'react-dom';
import type { RegulatoryKnowledgeGateway } from '../../features/regulatory/regulatoryKnowledgeCommands.ts';
import { RegulatoryKnowledgeCenter } from './RegulatoryKnowledgeCenter.tsx';
import {useLiveRecordsPortal} from '../runtime/useLiveRecordsPortal.ts';

const SHELL='.r2-shell[data-r2-runtime-mode="live"][data-destination]';
const PLACEHOLDER='[data-live-deferred="true"]';

export function LiveRegulatoryKnowledgePortal({gateway,workspace}:Readonly<{gateway:RegulatoryKnowledgeGateway;workspace:Promise<string|null>}>){
  const {active,target}=useLiveRecordsPortal('knowledge',SHELL,PLACEHOLDER);
  return active&&target?createPortal(<RegulatoryKnowledgeCenter gateway={gateway} workspace={workspace}/>,target):null;
}
