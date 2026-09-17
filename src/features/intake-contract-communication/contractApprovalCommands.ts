import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export type ClientContractDecision='approved'|'rejected';
export type ClientContractDecisionStatus='approved'|'draft';

export interface ClientContractApprovalBindingResult{
  readonly requestId:string;
  readonly revisionId:string;
  readonly revisionVersionAtIssue:number;
  readonly reconciled:boolean;
  readonly wasDuplicate:boolean;
}

export interface ClientContractApprovalReconcileResult{
  readonly requestId:string;
  readonly responseId:string;
  readonly revisionId:string;
  readonly decision:ClientContractDecision;
  readonly status:ClientContractDecisionStatus;
  readonly version:number;
  readonly wasDuplicate:boolean;
}

export interface ContractApprovalGateway{
  bind(input:Readonly<{
    workspaceId:string;
    requestId:string;
    revisionId:string;
    expectedRevisionVersion:number;
  }>):Promise<ClientContractApprovalBindingResult>;
  reconcile(input:Readonly<{
    workspaceId:string;
    requestId:string;
    responseId:string;
    operationId:string;
    expectedRevisionVersion:number;
  }>):Promise<ClientContractApprovalReconcileResult>;
}

interface RpcResponse{readonly data:unknown;readonly error:DataFailureLike|null}
interface RpcLike{rpc(name:string,args:Readonly<Record<string,unknown>>):PromiseLike<RpcResponse>}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMEOUT=15000;
function fail(validation=false):never{throw new DataAccessError('Invalid contract approval bridge data',validation?'DATA_VALIDATION_FAILED':'DATA_OPERATION_FAILED')}
function rec(v:unknown):Readonly<Record<string,unknown>>{if(!v||typeof v!=='object'||Array.isArray(v))fail();return v as Readonly<Record<string,unknown>>}
function id(v:unknown){if(typeof v!=='string'||!UUID.test(v.trim()))fail(true);return v.trim()}
function ver(v:unknown){const n=typeof v==='number'?v:Number(v);if(!Number.isSafeInteger(n)||n<1)fail(true);return n}
function bool(v:unknown){if(typeof v!=='boolean')fail();return v}
function decision(v:unknown):ClientContractDecision{if(v!=='approved'&&v!=='rejected')fail();return v}
function status(v:unknown):ClientContractDecisionStatus{if(v!=='approved'&&v!=='draft')fail();return v}
async function settle<T>(p:PromiseLike<T>,timeoutMs:number):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new DataAccessError('Contract approval timeout','DATA_OUTCOME_UNKNOWN')),timeoutMs)});
  try{return await Promise.race([Promise.resolve(p),deadline])}
  catch(error){throw normalizeThrownDataFailure(error,'write')}
  finally{if(timer)clearTimeout(timer)}
}
async function rpc(c:RpcLike,name:string,args:Readonly<Record<string,unknown>>,timeoutMs:number){
  const result=await settle(c.rpc(name,args),timeoutMs);
  if(result.error)throw normalizeDataFailure(result.error);
  return result.data;
}
function parseBinding(v:unknown):ClientContractApprovalBindingResult{
  const r=rec(v);
  return Object.freeze({
    requestId:id(r.requestId),
    revisionId:id(r.revisionId),
    revisionVersionAtIssue:ver(r.revisionVersionAtIssue),
    reconciled:bool(r.reconciled),
    wasDuplicate:bool(r.wasDuplicate),
  });
}
function parseReconcile(v:unknown):ClientContractApprovalReconcileResult{
  const r=rec(v);
  const d=decision(r.decision),s=status(r.status);
  if((d==='approved'&&s!=='approved')||(d==='rejected'&&s!=='draft'))fail();
  return Object.freeze({
    requestId:id(r.requestId),
    responseId:id(r.responseId),
    revisionId:id(r.revisionId),
    decision:d,
    status:s,
    version:ver(r.version),
    wasDuplicate:bool(r.wasDuplicate),
  });
}

export function createContractApprovalGateway(client:EnjazSupabaseClient,timeoutMs=TIMEOUT):ContractApprovalGateway{
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw new Error('Invalid contract approval timeout');
  const c=client as unknown as RpcLike;
  return Object.freeze({
    async bind(input){
      return parseBinding(await rpc(c,'bind_client_contract_approval_v1',{
        p_workspace_id:id(input.workspaceId),
        p_request_id:id(input.requestId),
        p_revision_id:id(input.revisionId),
        p_expected_revision_version:ver(input.expectedRevisionVersion),
      },timeoutMs));
    },
    async reconcile(input){
      return parseReconcile(await rpc(c,'reconcile_client_contract_approval_v1',{
        p_workspace_id:id(input.workspaceId),
        p_request_id:id(input.requestId),
        p_response_id:id(input.responseId),
        p_operation_id:id(input.operationId),
        p_expected_revision_version:ver(input.expectedRevisionVersion),
      },timeoutMs));
    },
  });
}
