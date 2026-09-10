import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';
import { createSavedViewDraft, parseEnjazSavedViewDefinition, parseGlobalSearchResultReference, type EnjazSavedViewDefinition, type GlobalSearchResultReference, type SavedViewDomain, type SavedViewVisibility } from './searchSavedViewContract.ts';

export type SavedViewRecord = Readonly<{id:string;workspaceId:string;ownerUserId:string;name:string;domain:SavedViewDomain;visibility:SavedViewVisibility;teamId:string|null;definition:EnjazSavedViewDefinition;version:number;createdAt:string;updatedAt:string}>;
export type SavedViewWriteResult = Readonly<{savedViewId:string;version:number;replayed:boolean;wasCreated?:boolean;deleted?:boolean}>;
export type SaveSavedViewInput = Readonly<{workspaceId:string;savedViewId:string|null;expectedVersion:number|null;operationId:string;name:string;visibility?:SavedViewVisibility;teamId?:string|null;definition:EnjazSavedViewDefinition}>;
export interface SearchIntelligenceGateway {
  listSavedViews(workspaceId:string):Promise<readonly SavedViewRecord[]>;
  saveSavedView(input:SaveSavedViewInput):Promise<SavedViewWriteResult>;
  deleteSavedView(workspaceId:string,savedViewId:string,expectedVersion:number,operationId:string):Promise<SavedViewWriteResult>;
  globalSearch(workspaceId:string,query:string,limitPerDomain?:number):Promise<readonly GlobalSearchResultReference[]>;
}

type RpcResponse={readonly data:unknown;readonly error:DataFailureLike|null};
type RpcClient={rpc(name:string,args:Readonly<Record<string,unknown>>):PromiseLike<RpcResponse>};
const fail=(message:string,code:'DATA_OPERATION_FAILED'|'DATA_VALIDATION_FAILED'='DATA_OPERATION_FAILED')=>new DataAccessError(message,code);
const object=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const positive=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>0;

async function rpc(client:RpcClient,name:string,args:Readonly<Record<string,unknown>>,write=false,timeout=15_000):Promise<unknown>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new DataAccessError(write?'Write outcome unknown':'Read timed out',write?'DATA_OUTCOME_UNKNOWN':'DATA_UNAVAILABLE')),timeout)});
  try{
    const response=await Promise.race([Promise.resolve(client.rpc(name,args)),deadline]);
    if(response.error)throw normalizeDataFailure(response.error);
    return response.data;
  }catch(error){throw normalizeThrownDataFailure(error,write?'write':'read')}
  finally{if(timer!==undefined)clearTimeout(timer)}
}
function parseView(value:unknown):SavedViewRecord{
  const row=object(value),definition=parseEnjazSavedViewDefinition(row?.definition);
  if(!row||!definition||definition.domain!==row.domain||typeof row.id!=='string'||typeof row.workspaceId!=='string'||typeof row.ownerUserId!=='string'||typeof row.name!=='string'||!positive(row.version)||(row.visibility!=='personal'&&row.visibility!=='team'&&row.visibility!=='workspace')||(row.teamId!==null&&typeof row.teamId!=='string')||typeof row.createdAt!=='string'||typeof row.updatedAt!=='string')throw fail('Invalid saved view');
  return Object.freeze({id:row.id,workspaceId:row.workspaceId,ownerUserId:row.ownerUserId,name:row.name,domain:definition.domain,visibility:row.visibility,teamId:row.teamId,definition,version:Number(row.version),createdAt:row.createdAt,updatedAt:row.updatedAt});
}
function parseWrite(value:unknown):SavedViewWriteResult{
  const row=object(value);
  if(!row||typeof row.savedViewId!=='string'||!positive(row.version)||typeof row.replayed!=='boolean')throw fail('Invalid saved-view write result');
  return Object.freeze({savedViewId:row.savedViewId,version:Number(row.version),replayed:row.replayed,...(typeof row.wasCreated==='boolean'?{wasCreated:row.wasCreated}:{}),...(typeof row.deleted==='boolean'?{deleted:row.deleted}:{})});
}

export function createSearchIntelligenceGateway(client:EnjazSupabaseClient,timeout=15_000):SearchIntelligenceGateway{
  if(!positive(timeout)||timeout>120_000)throw new Error('Invalid RPC timeout');
  const c=client as unknown as RpcClient;
  return Object.freeze({
    async listSavedViews(workspaceId){const data=await rpc(c,'list_saved_views_v1',{p_workspace_id:workspaceId},false,timeout);if(!Array.isArray(data))throw fail('Invalid saved-view list');return Object.freeze(data.map(parseView))},
    async saveSavedView(input){
      const draft=createSavedViewDraft({name:input.name,visibility:input.visibility,definition:input.definition}),teamId=input.teamId??null;
      if((draft.visibility==='team')!==(teamId!==null)||(input.savedViewId===null)!==(input.expectedVersion===null))throw fail('Invalid saved-view boundary','DATA_VALIDATION_FAILED');
      return parseWrite(await rpc(c,'save_saved_view_v1',{p_workspace_id:input.workspaceId,p_saved_view_id:input.savedViewId,p_expected_version:input.expectedVersion,p_operation_id:input.operationId,p_name:draft.name,p_visibility:draft.visibility,p_team_id:teamId,p_definition:draft.definition},true,timeout));
    },
    async deleteSavedView(workspaceId,savedViewId,expectedVersion,operationId){if(!positive(expectedVersion))throw fail('Invalid saved-view version','DATA_VALIDATION_FAILED');return parseWrite(await rpc(c,'delete_saved_view_v1',{p_workspace_id:workspaceId,p_saved_view_id:savedViewId,p_expected_version:expectedVersion,p_operation_id:operationId},true,timeout))},
    async globalSearch(workspaceId,query,limitPerDomain=8){
      const q=query.normalize('NFKC').replace(/\s+/g,' ').trim().slice(0,120);if(q.length<2)return Object.freeze([]);if(!positive(limitPerDomain)||limitPerDomain>10)throw fail('Invalid search limit','DATA_VALIDATION_FAILED');
      const data=await rpc(c,'global_search_v1',{p_workspace_id:workspaceId,p_query:q,p_limit_per_domain:limitPerDomain},false,timeout);if(!Array.isArray(data))throw fail('Invalid search result');
      const out=data.map(parseGlobalSearchResultReference);if(out.some(x=>x===null))throw fail('Global-search contract drifted');return Object.freeze(out as GlobalSearchResultReference[]);
    },
  });
}
