import { useEffect, useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import type { GlobalSearchResultReference, SavedViewDefinition, SavedViewDomain, SavedViewRecord } from './searchIntelligenceCommands.ts';
import { useSearchIntelligenceGateway } from './SearchIntelligenceContext.tsx';

export type SearchIntelligenceLoadState='idle'|'loading'|'ready'|'error';
const message=(e:unknown,f:string)=>e instanceof Error&&e.message.trim()?e.message:f;

export function useSavedViews(domain:SavedViewDomain){
 const userId=useCurrentUserId(),factory=useDataLayerFactory(),gateway=useSearchIntelligenceGateway(),[attempt,setAttempt]=useState(0),[busyId,setBusyId]=useState<string|null>(null),[state,setState]=useState<{workspaceId:string|null;items:readonly SavedViewRecord[];status:SearchIntelligenceLoadState;errorMessage:string|null}>({workspaceId:null,items:[],status:'loading',errorMessage:null});
 const reload=()=>setAttempt(x=>x+1);
 useEffect(()=>{let active=true;if(!userId){setState({workspaceId:null,items:[],status:'error',errorMessage:'انتهت جلسة المستخدم.'});return()=>{active=false}}setState(s=>({...s,status:'loading',errorMessage:null}));void factory.resolveWorkspaceId(userId).then(async workspaceId=>{if(!workspaceId)throw new Error('تعذر تحديد مساحة العمل الحالية.');const items=await gateway.listSavedViews(workspaceId);if(active)setState({workspaceId,items:items.filter(x=>x.domain===domain),status:'ready',errorMessage:null})}).catch(e=>{if(active)setState({workspaceId:null,items:[],status:'error',errorMessage:message(e,'تعذر تحميل المناظر المحفوظة.')})});return()=>{active=false}},[attempt,domain,factory,gateway,userId]);
 const mutate=async(id:string,fallback:string,run:()=>Promise<unknown>)=>{setBusyId(id);setState(s=>({...s,errorMessage:null}));try{await run();reload()}catch(e){setState(s=>({...s,errorMessage:message(e,fallback)}));throw e}finally{setBusyId(null)}};
 const createPersonal=(name:string,definition:SavedViewDefinition)=>state.workspaceId?mutate('new','تعذر حفظ المنظر.',()=>gateway.saveSavedView({workspaceId:state.workspaceId!,savedViewId:null,expectedVersion:null,operationId:crypto.randomUUID(),name,visibility:'personal',teamId:null,definition})):Promise.reject(new Error('مساحة العمل غير جاهزة.'));
 const rename=(item:SavedViewRecord,name:string)=>state.workspaceId&&item.ownerUserId===userId?mutate(item.id,'تعذر إعادة تسمية المنظر.',()=>gateway.saveSavedView({workspaceId:state.workspaceId!,savedViewId:item.id,expectedVersion:item.version,operationId:crypto.randomUUID(),name,visibility:item.visibility,teamId:item.teamId,definition:item.definition})):Promise.reject(new Error('لا تملك صلاحية إعادة تسمية هذا المنظر.'));
 const remove=(item:SavedViewRecord)=>state.workspaceId&&item.ownerUserId===userId?mutate(item.id,'تعذر حذف المنظر.',()=>gateway.deleteSavedView(state.workspaceId!,item.id,item.version,crypto.randomUUID())):Promise.reject(new Error('لا تملك صلاحية حذف هذا المنظر.'));
 return {...state,busyId,userId,retry:reload,createPersonal,rename,remove};
}

export function useGlobalSearch(query:string,limitPerDomain=8){
 const userId=useCurrentUserId(),factory=useDataLayerFactory(),gateway=useSearchIntelligenceGateway(),normalized=query.normalize('NFKC').replace(/\s+/g,' ').trim().slice(0,120),[state,setState]=useState<{status:SearchIntelligenceLoadState;results:readonly GlobalSearchResultReference[];errorMessage:string|null}>({status:'idle',results:[],errorMessage:null});
 useEffect(()=>{let active=true,timer:ReturnType<typeof setTimeout>|undefined;if(!userId||normalized.length<2){setState({status:'idle',results:[],errorMessage:null});return()=>{active=false}}setState(s=>({...s,status:'loading',errorMessage:null}));timer=setTimeout(()=>{void factory.resolveWorkspaceId(userId).then(async workspaceId=>{if(!workspaceId)throw new Error('تعذر تحديد مساحة العمل الحالية.');const results=await gateway.globalSearch(workspaceId,normalized,limitPerDomain);if(active)setState({status:'ready',results,errorMessage:null})}).catch(e=>{if(active)setState({status:'error',results:[],errorMessage:message(e,'تعذر تنفيذ البحث الشامل.')})})},160);return()=>{active=false;if(timer!==undefined)clearTimeout(timer)}},[factory,gateway,limitPerDomain,normalized,userId]);
 return {...state,query:normalized};
}
