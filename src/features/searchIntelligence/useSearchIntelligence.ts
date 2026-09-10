import { useEffect, useState } from 'react';
import type { GlobalSearchResultReference, SavedViewDefinition, SavedViewDomain, SavedViewRecord, SearchIntelligenceGateway } from './searchIntelligenceCommands.ts';

export type SearchIntelligenceLoadState='idle'|'loading'|'ready'|'error';
type Workspace=Promise<string|null>;
const message=(e:unknown)=>e instanceof Error&&e.message.trim()?e.message:'تعذر التنفيذ.';
async function workspaceId(workspace:Workspace){const id=await workspace;if(!id)throw new Error('تعذر تحديد مساحة العمل.');return id}

export function useSavedViews(domain:SavedViewDomain,gateway:SearchIntelligenceGateway,workspace:Workspace){
 const [attempt,setAttempt]=useState(0),[busyId,setBusyId]=useState<string|null>(null),[state,setState]=useState<{items:readonly SavedViewRecord[];status:SearchIntelligenceLoadState;errorMessage:string|null}>({items:[],status:'loading',errorMessage:null}),reload=()=>setAttempt(x=>x+1);
 useEffect(()=>{let active=true;setState(s=>({...s,status:'loading',errorMessage:null}));void workspaceId(workspace).then(id=>gateway.listSavedViews(id)).then(items=>{if(active)setState({items:items.filter(x=>x.domain===domain),status:'ready',errorMessage:null})}).catch(e=>{if(active)setState({items:[],status:'error',errorMessage:message(e)})});return()=>{active=false}},[attempt,domain,gateway,workspace]);
 const mutate=async(id:string,run:(workspaceId:string)=>Promise<unknown>)=>{setBusyId(id);setState(s=>({...s,errorMessage:null}));try{await run(await workspaceId(workspace));reload()}catch(e){setState(s=>({...s,errorMessage:message(e)}));throw e}finally{setBusyId(null)}};
 const createPersonal=(name:string,definition:SavedViewDefinition)=>mutate('new',id=>gateway.saveSavedView({workspaceId:id,savedViewId:null,expectedVersion:null,operationId:crypto.randomUUID(),name,visibility:'personal',teamId:null,definition}));
 const rename=(item:SavedViewRecord,name:string)=>mutate(item.id,id=>gateway.saveSavedView({workspaceId:id,savedViewId:item.id,expectedVersion:item.version,operationId:crypto.randomUUID(),name,visibility:item.visibility,teamId:item.teamId,definition:item.definition}));
 const remove=(item:SavedViewRecord)=>mutate(item.id,id=>gateway.deleteSavedView(id,item.id,item.version,crypto.randomUUID()));
 return {...state,busyId,retry:reload,createPersonal,rename,remove};
}

export function useGlobalSearch(query:string,gateway:SearchIntelligenceGateway,workspace:Workspace,limitPerDomain=8){
 const normalized=query.normalize('NFKC').replace(/\s+/g,' ').trim().slice(0,120),[state,setState]=useState<{status:SearchIntelligenceLoadState;results:readonly GlobalSearchResultReference[];errorMessage:string|null}>({status:'idle',results:[],errorMessage:null});
 useEffect(()=>{let active=true,timer:ReturnType<typeof setTimeout>|undefined;if(normalized.length<2){setState({status:'idle',results:[],errorMessage:null});return()=>{active=false}}setState(s=>({...s,status:'loading',errorMessage:null}));timer=setTimeout(()=>{void workspaceId(workspace).then(id=>gateway.globalSearch(id,normalized,limitPerDomain)).then(results=>{if(active)setState({status:'ready',results,errorMessage:null})}).catch(e=>{if(active)setState({status:'error',results:[],errorMessage:message(e)})})},160);return()=>{active=false;if(timer!==undefined)clearTimeout(timer)}},[gateway,limitPerDomain,normalized,workspace]);
 return state;
}
