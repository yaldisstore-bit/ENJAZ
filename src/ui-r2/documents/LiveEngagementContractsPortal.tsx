import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import type {DocumentFactoryGateway} from '../../features/documents/documentFactoryCommands.ts';
import type {EngagementContractGateway} from '../../features/engagements/engagementContractCommands.ts';
import type {DocumentFactoryFactory,EngagementContractFactory} from '../runtime/UiR2ProductionRoot.tsx';
import {EngagementContractPanel} from './EngagementContractPanel.tsx';
import {useLiveRecordsPortal} from '../runtime/useLiveRecordsPortal.ts';

export function LiveEngagementContractsPortal({engagementContractFactory,documentFactoryFactory,workspace}:{engagementContractFactory:EngagementContractFactory;documentFactoryFactory:DocumentFactoryFactory;workspace:Promise<string|null>}){
  const{active,target}=useLiveRecordsPortal('documents',':not(*)'),[contracts,setContracts]=useState<EngagementContractGateway|null>(null),[documentFactory,setDocumentFactory]=useState<DocumentFactoryGateway|null>(null),[workspaceId,setWorkspaceId]=useState<string|null>(null);
  useEffect(()=>{let live=true;void workspace.then(value=>{if(live)setWorkspaceId(value)});return()=>{live=false}},[workspace]);
  useEffect(()=>{if(!active||contracts)return;let live=true;void engagementContractFactory().then(gateway=>{if(live)setContracts(gateway)}).catch(()=>undefined);return()=>{live=false}},[active,engagementContractFactory,contracts]);
  useEffect(()=>{if(!active||documentFactory)return;let live=true;void documentFactoryFactory().then(gateway=>{if(live)setDocumentFactory(gateway)}).catch(()=>undefined);return()=>{live=false}},[active,documentFactoryFactory,documentFactory]);
  if(!active||!target||!contracts||!documentFactory||!workspaceId)return null;
  return createPortal(<EngagementContractPanel gateway={contracts} documentFactoryGateway={documentFactory} workspaceId={workspaceId}/>,target);
}
