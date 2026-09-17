import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export type IntakeFollowupMode='secure_link'|'client_portal';
export type IntakeFollowupKind='information'|'document';
export type IntakeFollowupStatus='open'|'responded'|'revoked';
export interface IntakeFollowupField{readonly key:string;readonly label:string;readonly type:string;readonly required:boolean;readonly config:Readonly<Record<string,unknown>>}
export interface IntakeFollowupIssueResult{readonly followupId:string;readonly submissionId:string;readonly mode:IntakeFollowupMode;readonly requestKind:IntakeFollowupKind;readonly status:IntakeFollowupStatus;readonly version:number;readonly submissionVersion:number;readonly portalRequestId:string|null;readonly token:string|null;readonly expiresAt:string;readonly wasDuplicate:boolean}
export interface PublicIntakeFollowupView{readonly publicAuthority:'non_authoritative_followup_input';readonly followupId:string;readonly status:'open'|'responded';readonly title:string;readonly instructions:string|null;readonly expiresAt:string;readonly submissionVersion:number;readonly form:Readonly<{title:string;fields:readonly IntakeFollowupField[]}>;readonly draftPatch:Readonly<Record<string,string>>}
export interface IntakeFollowupWriteResult{readonly followupId:string;readonly submissionId:string;readonly status:'open'|'responded';readonly version:number;readonly submissionVersion:number;readonly authoritative:false;readonly wasDuplicate:boolean}
export interface IntakeFollowupGateway{
  issue(input:Readonly<{workspaceId:string;submissionId:string;expectedSubmissionVersion:number;mode:IntakeFollowupMode;requestKind:IntakeFollowupKind;requestedFields:readonly string[];title:string;instructions:string|null;expiresInHours:number;idempotencyKey:string;portalPrincipalId:string|null;portalTransactionId:string|null;portalRequestId:string|null}>):Promise<IntakeFollowupIssueResult>;
  getPublic(token:string):Promise<PublicIntakeFollowupView>;
  savePublic(token:string,patch:Readonly<Record<string,string>>,finalize:boolean):Promise<IntakeFollowupWriteResult>;
  reconcilePortal(input:Readonly<{workspaceId:string;followupId:string;expectedFollowupVersion:number;expectedSubmissionVersion:number;answerPatch:Readonly<Record<string,string>>}>):Promise<Readonly<{followupId:string;submissionId:string;status:'responded';version:number;submissionVersion:number;portalRequestId:string}>>;
  revoke(input:Readonly<{workspaceId:string;followupId:string;expectedVersion:number;reason:string}>):Promise<Readonly<{followupId:string;status:'revoked';version:number;wasDuplicate:boolean}>>;
}

interface RpcResponse{readonly data:unknown;readonly error:DataFailureLike|null}
interface RpcLike{rpc(name:string,args:Readonly<Record<string,unknown>>):PromiseLike<RpcResponse>}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN=/^[0-9a-f]{64}$/;
const MODES=['secure_link','client_portal'] as const,KINDS=['information','document'] as const,STATUSES=['open','responded','revoked'] as const;
const TIMEOUT=15000;
function bad(validation=false):never{throw new DataAccessError('Invalid intake follow-up data',validation?'DATA_VALIDATION_FAILED':'DATA_OPERATION_FAILED')}
function rec(v:unknown):Readonly<Record<string,unknown>>{if(!v||typeof v!=='object'||Array.isArray(v))bad();return v as Readonly<Record<string,unknown>>}
function str(v:unknown,max=2400){if(typeof v!=='string'||!v.trim()||v.length>max)bad();return v.trim()}
function opt(v:unknown,max=2400){return v===null||v===undefined||v===''?null:str(v,max)}
function id(v:unknown){const s=str(v,64);if(!UUID.test(s))bad(true);return s}
function oid(v:unknown){return v===null||v===undefined||v===''?null:id(v)}
function token(v:unknown){const s=str(v,64);if(!TOKEN.test(s))bad(true);return s}
function ver(v:unknown){const n=typeof v==='number'?v:Number(v);if(!Number.isSafeInteger(n)||n<1)bad(true);return n}
function bool(v:unknown){if(typeof v!=='boolean')bad();return v}
function one<T extends string>(v:unknown,a:readonly T[]):T{if(!a.includes(v as T))bad();return v as T}
function patch(v:unknown):Readonly<Record<string,string>>{const r=rec(v),out:Record<string,string>={};for(const [k,x] of Object.entries(r)){if(!k||k.length>80||typeof x!=='string'||!x.trim()||x.length>2400)bad();out[k]=x.trim()}return Object.freeze(out)}
function fields(v:readonly string[]){if(!Array.isArray(v)||v.length>100)bad(true);const out=v.map(x=>str(x,80));if(new Set(out).size!==out.length)bad(true);return out}
function iso(v:unknown){const s=str(v,64);if(!Number.isFinite(Date.parse(s)))bad();return s}
async function settle<T>(p:PromiseLike<T>,write:boolean,t:number):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new DataAccessError('Intake follow-up timeout',write?'DATA_OUTCOME_UNKNOWN':'DATA_UNAVAILABLE')),t)});try{return await Promise.race([Promise.resolve(p),deadline])}catch(e){throw normalizeThrownDataFailure(e,write?'write':'read')}finally{if(timer)clearTimeout(timer)}}
async function rpc(c:RpcLike,n:string,a:Readonly<Record<string,unknown>>,write:boolean,t:number){const r=await settle(c.rpc(n,a),write,t);if(r.error)throw normalizeDataFailure(r.error);return r.data}
function parseIssue(v:unknown):IntakeFollowupIssueResult{const r=rec(v),mode=one(r.mode,MODES),kind=one(r.requestKind,KINDS),status=one(r.status,STATUSES),tok=opt(r.token,64),portal=oid(r.portalRequestId);if(mode==='secure_link'&&(!tok||!TOKEN.test(tok)||portal!==null))bad();if(mode==='client_portal'&&(tok!==null||portal===null))bad();return Object.freeze({followupId:id(r.followupId),submissionId:id(r.submissionId),mode,requestKind:kind,status,version:ver(r.version),submissionVersion:ver(r.submissionVersion),portalRequestId:portal,token:tok,expiresAt:iso(r.expiresAt),wasDuplicate:bool(r.wasDuplicate)})}
function parseField(v:unknown):IntakeFollowupField{const r=rec(v);return Object.freeze({key:str(r.key,80),label:str(r.label,240),type:str(r.type,40),required:r.required===true,config:Object.freeze({...rec(r.config)})})}
function parsePublic(v:unknown):PublicIntakeFollowupView{const r=rec(v);if(r.publicAuthority!=='non_authoritative_followup_input')bad();const f=rec(r.form),raw=Array.isArray(f.fields)?f.fields:bad();const status=one(r.status,['open','responded'] as const);return Object.freeze({publicAuthority:r.publicAuthority,followupId:id(r.followupId),status,title:str(r.title,320),instructions:opt(r.instructions),expiresAt:iso(r.expiresAt),submissionVersion:ver(r.submissionVersion),form:Object.freeze({title:str(f.title,240),fields:Object.freeze(raw.map(parseField))}),draftPatch:patch(r.draftPatch)})}
function parseWrite(v:unknown):IntakeFollowupWriteResult{const r=rec(v);if(r.authoritative!==false)bad();return Object.freeze({followupId:id(r.followupId),submissionId:id(r.submissionId),status:one(r.status,['open','responded'] as const),version:ver(r.version),submissionVersion:ver(r.submissionVersion),authoritative:false,wasDuplicate:bool(r.wasDuplicate)})}

export function createIntakeFollowupGateway(client:EnjazSupabaseClient,timeoutMs=TIMEOUT):IntakeFollowupGateway{
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw new Error('Invalid intake follow-up timeout');
  const c=client as unknown as RpcLike;
  return {
    async issue(x){
      const mode=one(x.mode,MODES),kind=one(x.requestKind,KINDS),requested=fields(x.requestedFields);
      if(kind==='information'&&!requested.length)bad(true);
      if(mode==='secure_link'&&kind==='document')bad(true);
      if(!Number.isSafeInteger(x.expiresInHours)||x.expiresInHours<1||x.expiresInHours>720)bad(true);
      const principal=oid(x.portalPrincipalId),transaction=oid(x.portalTransactionId),request=oid(x.portalRequestId);
      if(mode==='client_portal'&&(!principal||!transaction||!request))bad(true);
      if(mode==='secure_link'&&(principal||transaction||request))bad(true);
      return parseIssue(await rpc(c,'issue_intake_followup_v1',{p_workspace_id:id(x.workspaceId),p_submission_id:id(x.submissionId),p_expected_submission_version:ver(x.expectedSubmissionVersion),p_mode:mode,p_request_kind:kind,p_requested_fields:requested,p_title:str(x.title,320),p_instructions:x.instructions?.trim()||null,p_expires_in_hours:x.expiresInHours,p_idempotency_key:id(x.idempotencyKey),p_portal_principal_id:principal,p_portal_transaction_id:transaction,p_portal_request_id:request},true,timeoutMs));
    },
    async getPublic(raw){return parsePublic(await rpc(c,'get_public_intake_followup_v1',{p_token:token(raw)},false,timeoutMs))},
    async savePublic(raw,answerPatch,finalize){return parseWrite(await rpc(c,'save_public_intake_followup_v1',{p_token:token(raw),p_patch:patch(answerPatch),p_finalize:finalize},true,timeoutMs))},
    async reconcilePortal(x){const r=rec(await rpc(c,'reconcile_portal_intake_followup_v1',{p_workspace_id:id(x.workspaceId),p_followup_id:id(x.followupId),p_expected_followup_version:ver(x.expectedFollowupVersion),p_expected_submission_version:ver(x.expectedSubmissionVersion),p_answer_patch:patch(x.answerPatch)},true,timeoutMs));if(r.status!=='responded')bad();return Object.freeze({followupId:id(r.followupId),submissionId:id(r.submissionId),status:'responded' as const,version:ver(r.version),submissionVersion:ver(r.submissionVersion),portalRequestId:id(r.portalRequestId)})},
    async revoke(x){const r=rec(await rpc(c,'revoke_intake_followup_v1',{p_workspace_id:id(x.workspaceId),p_followup_id:id(x.followupId),p_expected_version:ver(x.expectedVersion),p_reason:str(x.reason,800)},true,timeoutMs));if(r.status!=='revoked')bad();return Object.freeze({followupId:id(r.followupId),status:'revoked' as const,version:ver(r.version),wasDuplicate:bool(r.wasDuplicate)})},
  };
}
