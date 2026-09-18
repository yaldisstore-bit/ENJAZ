import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export interface ContractRenewalBindingResult{
  readonly schema:'enjaz.contract-renewal-provenance.v1';
  readonly renewalId:string;
  readonly contractRevisionId:string;
  readonly dueDate:string;
  readonly renewalVersion:number;
  readonly contractRevisionVersion:number;
  readonly wasDuplicate:boolean;
}

export interface ContractRenewalCommunicationEvidenceResult{
  readonly renewalId:string;
  readonly contractRevisionId:string;
  readonly communicationId:string;
  readonly outboundCommandId:string;
  readonly outboundStatus:string;
  readonly approvalStatus:string;
  readonly wasDuplicate:boolean;
}

export interface ContractRenewalCommunicationGateway{
  bindRenewal(input:Readonly<{
    workspaceId:string;
    renewalId:string;
    contractRevisionId:string;
    operationId:string;
    expectedRenewalVersion:number;
    expectedRevisionVersion:number;
  }>):Promise<ContractRenewalBindingResult>;
  recordCommunication(input:Readonly<{
    workspaceId:string;
    operationId:string;
    renewalId:string;
    contractRevisionId:string;
    communicationId:string;
  }>):Promise<ContractRenewalCommunicationEvidenceResult>;
}

interface RpcResponse{readonly data:unknown;readonly error:DataFailureLike|null}
interface RpcLike{rpc(name:string,args:Readonly<Record<string,unknown>>):PromiseLike<RpcResponse>}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const TIMEOUT=15000;
function fail(validation=false):never{throw new DataAccessError('Invalid contract renewal communication data',validation?'DATA_VALIDATION_FAILED':'DATA_OPERATION_FAILED')}
function rec(v:unknown):Readonly<Record<string,unknown>>{if(!v||typeof v!=='object'||Array.isArray(v))fail();return v as Readonly<Record<string,unknown>>}
function id(v:unknown){if(typeof v!=='string'||!UUID.test(v.trim()))fail(true);return v.trim()}
function ver(v:unknown){const n=typeof v==='number'?v:Number(v);if(!Number.isSafeInteger(n)||n<1)fail(true);return n}
function text(v:unknown,max=160){if(typeof v!=='string'||!v.trim()||v.length>max)fail();return v.trim()}
function date(v:unknown){const s=text(v,10);if(!DATE.test(s)||Number.isNaN(Date.parse(s+'T00:00:00Z')))fail();return s}
function bool(v:unknown){if(typeof v!=='boolean')fail();return v}
async function settle<T>(p:PromiseLike<T>,timeoutMs:number):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new DataAccessError('Contract renewal timeout','DATA_OUTCOME_UNKNOWN')),timeoutMs)});
  try{return await Promise.race([Promise.resolve(p),deadline])}
  catch(error){throw normalizeThrownDataFailure(error,'write')}
  finally{if(timer)clearTimeout(timer)}
}
async function rpc(c:RpcLike,name:string,args:Readonly<Record<string,unknown>>,timeoutMs:number){
  const result=await settle(c.rpc(name,args),timeoutMs);
  if(result.error)throw normalizeDataFailure(result.error);
  return result.data;
}
function parseBinding(v:unknown):ContractRenewalBindingResult{
  const r=rec(v);
  if(r.schema!=='enjaz.contract-renewal-provenance.v1')fail();
  return Object.freeze({
    schema:'enjaz.contract-renewal-provenance.v1' as const,
    renewalId:id(r.renewalId),
    contractRevisionId:id(r.contractRevisionId),
    dueDate:date(r.dueDate),
    renewalVersion:ver(r.renewalVersion),
    contractRevisionVersion:ver(r.contractRevisionVersion),
    wasDuplicate:bool(r.wasDuplicate),
  });
}
function parseCommunication(v:unknown):ContractRenewalCommunicationEvidenceResult{
  const r=rec(v);
  return Object.freeze({
    renewalId:id(r.renewalId),
    contractRevisionId:id(r.contractRevisionId),
    communicationId:id(r.communicationId),
    outboundCommandId:id(r.outboundCommandId),
    outboundStatus:text(r.outboundStatus,80),
    approvalStatus:text(r.approvalStatus,80),
    wasDuplicate:bool(r.wasDuplicate),
  });
}

export function createContractRenewalCommunicationGateway(
  client:EnjazSupabaseClient,
  timeoutMs=TIMEOUT
):ContractRenewalCommunicationGateway{
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw new Error('Invalid contract renewal timeout');
  const c=client as unknown as RpcLike;
  const gateway:ContractRenewalCommunicationGateway={
    async bindRenewal(input){
      return parseBinding(await rpc(c,'bind_contract_renewal_provenance_v1',{
        p_workspace_id:id(input.workspaceId),
        p_renewal_id:id(input.renewalId),
        p_contract_revision_id:id(input.contractRevisionId),
        p_operation_id:id(input.operationId),
        p_expected_renewal_version:ver(input.expectedRenewalVersion),
        p_expected_revision_version:ver(input.expectedRevisionVersion),
      },timeoutMs));
    },
    async recordCommunication(input){
      return parseCommunication(await rpc(c,'record_contract_renewal_communication_evidence_v1',{
        p_workspace_id:id(input.workspaceId),
        p_operation_id:id(input.operationId),
        p_renewal_id:id(input.renewalId),
        p_contract_revision_id:id(input.contractRevisionId),
        p_communication_id:id(input.communicationId),
      },timeoutMs));
    },
  };
  return Object.freeze(gateway);
}
