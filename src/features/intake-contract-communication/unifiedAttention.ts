import type {EnjazSupabaseClient} from '../../core/supabase/client.ts';
import {DataAccessError,normalizeDataFailure,normalizeThrownDataFailure,type DataFailureLike} from '../../data/contracts/DataAccessError.ts';

export type UnifiedAttentionKind='intake_followup'|'client_approval'|'contract_renewal';
export type UnifiedAttentionFilter='all'|UnifiedAttentionKind;
export type UnifiedAttentionState='open'|'responded'|'revoked'|'expired'|'awaiting_client'|'decision_ready'|'reconciled'|'active'|'completed'|'cancelled';
export type UnifiedAttentionLevel='terminal'|'response_ready'|'waiting_external'|'action_required'|'conflict'|'overdue'|'due_today'|'upcoming';
export type UnifiedAttentionOwnerSurface='intake_review'|'documents'|'calendar';

export interface UnifiedAttentionItem{
 readonly id:string;readonly kind:UnifiedAttentionKind;readonly authority:'intake_submissions'|'client_portal_requests'|'renewals';
 readonly evidenceAuthority:'intake_followup_requests'|'contract_approval_bridge_bindings'|'contract_renewal_communication_evidence';
 readonly canonicalId:string;readonly title:string;readonly state:UnifiedAttentionState;readonly attentionState:UnifiedAttentionLevel;
 readonly stale:boolean;readonly mode:'secure_link'|'client_portal'|'canonical_renewal';readonly requestKind:'information'|'document'|'approval'|'renewal';
 readonly dueAt:string|null;readonly decision:'approved'|'rejected'|null;readonly communicationEvidence:boolean;
 readonly companyId:string|null;readonly transactionId:string|null;readonly contractRevisionId:string|null;
 readonly sourceVersion:number;readonly canonicalVersion:number;readonly ownerSurface:UnifiedAttentionOwnerSurface;
}
export interface UnifiedAttentionView{
 readonly schema:'enjaz.intake-contract-attention.v1';readonly workspaceId:string;readonly workspaceTimezone:string;
 readonly kind:UnifiedAttentionFilter;readonly includeTerminal:boolean;readonly generatedAt:string;readonly items:readonly UnifiedAttentionItem[];
}
export interface UnifiedAttentionGateway{list(input:Readonly<{workspaceId:string;kind?:UnifiedAttentionFilter;includeTerminal?:boolean;limit?:number}>):Promise<UnifiedAttentionView>}

interface RpcResponse{readonly data:unknown;readonly error:DataFailureLike|null}
interface RpcLike{rpc(name:string,args:Readonly<Record<string,unknown>>):PromiseLike<RpcResponse>}
const U=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,K=['intake_followup','client_approval','contract_renewal'] as const,F=['all',...K] as const,S=['open','responded','revoked','expired','awaiting_client','decision_ready','reconciled','active','completed','cancelled'] as const,A=['terminal','response_ready','waiting_external','action_required','conflict','overdue','due_today','upcoming'] as const,O=['intake_review','documents','calendar'] as const;
const bad=(validation=false):never=>{throw new DataAccessError('Invalid unified attention data',validation?'DATA_VALIDATION_FAILED':'DATA_OPERATION_FAILED')};
const rec=(v:unknown)=>{if(!v||typeof v!=='object'||Array.isArray(v))bad();return v as Readonly<Record<string,unknown>>};
const id=(v:unknown)=>{if(typeof v!=='string'||!U.test(v))bad();return v};
const str=(v:unknown,max=320)=>{if(typeof v!=='string'||!v.trim()||v.length>max)bad();return v.trim()};
const one=<T extends readonly string[]>(v:unknown,a:T)=>{if(typeof v!=='string'||!a.includes(v))bad();return v as T[number]};
const ver=(v:unknown)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1)bad();return n};
const optId=(v:unknown)=>v===null?null:id(v);
const time=(v:unknown)=>{if(v===null)return null;if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))bad();return v};
function item(v:unknown):UnifiedAttentionItem{const r=rec(v),kind=one(r.kind,K),decision=r.decision===null?null:one(r.decision,['approved','rejected'] as const);return Object.freeze({id:id(r.id),kind,authority:one(r.authority,['intake_submissions','client_portal_requests','renewals'] as const),evidenceAuthority:one(r.evidenceAuthority,['intake_followup_requests','contract_approval_bridge_bindings','contract_renewal_communication_evidence'] as const),canonicalId:id(r.canonicalId),title:str(r.title),state:one(r.state,S),attentionState:one(r.attentionState,A),stale:r.stale===true,mode:one(r.mode,['secure_link','client_portal','canonical_renewal'] as const),requestKind:one(r.requestKind,['information','document','approval','renewal'] as const),dueAt:time(r.dueAt),decision,communicationEvidence:r.communicationEvidence===true,companyId:optId(r.companyId),transactionId:optId(r.transactionId),contractRevisionId:optId(r.contractRevisionId),sourceVersion:ver(r.sourceVersion),canonicalVersion:ver(r.canonicalVersion),ownerSurface:one(r.ownerSurface,O)})}
function view(v:unknown):UnifiedAttentionView{const r=rec(v);if(r.schema!=='enjaz.intake-contract-attention.v1'||typeof r.includeTerminal!=='boolean'||!Array.isArray(r.items))bad();return Object.freeze({schema:'enjaz.intake-contract-attention.v1',workspaceId:id(r.workspaceId),workspaceTimezone:str(r.workspaceTimezone,120),kind:one(r.kind,F),includeTerminal:r.includeTerminal,generatedAt:time(r.generatedAt)!,items:Object.freeze(r.items.map(item))})}

export function createUnifiedAttentionGateway(client:EnjazSupabaseClient,timeoutMs=15000):UnifiedAttentionGateway{
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw new Error('Invalid unified attention timeout');
 const c=client as unknown as RpcLike;
 return Object.freeze({async list(input){if(!U.test(input.workspaceId))bad(true);const kind=input.kind??'all';if(!F.includes(kind))bad(true);const limit=input.limit??200;if(!Number.isSafeInteger(limit)||limit<1||limit>500)bad(true);let timer:ReturnType<typeof setTimeout>|undefined;try{const result=await Promise.race([Promise.resolve(c.rpc('list_unified_intake_contract_attention_v1',{p_workspace_id:input.workspaceId,p_kind:kind,p_include_terminal:input.includeTerminal??false,p_limit:limit})),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new DataAccessError('Unified attention read timed out','DATA_UNAVAILABLE')),timeoutMs)})]);if(result.error)throw normalizeDataFailure(result.error);return view(result.data)}catch(e){throw normalizeThrownDataFailure(e,'read')}finally{if(timer)clearTimeout(timer)}}});
}
