import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export type GovernanceRole = 'director' | 'manager' | 'authorized_person';
export type AuthorityScope = 'full' | 'limited' | 'joint' | 'custom';
export type OwnershipRole = 'shareholder' | 'partner';
export type HolderKind = 'person' | 'company';
export type BeneficialBasis = 'ownership' | 'voting_rights' | 'management_control' | 'other';
export type ResolutionType = 'appointment' | 'removal' | 'ownership' | 'capital' | 'authorization' | 'general' | 'other';
export type CapitalChangeType = 'set' | 'increase' | 'decrease' | 'correction';

export interface GovernanceStake {
  readonly id: string;
  readonly holderKind: HolderKind;
  readonly holderId: string;
  readonly role: OwnershipRole;
  readonly percentage: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
}
export interface BeneficialOwnerView {
  readonly id: string;
  readonly contactId: string;
  readonly displayName: string;
  readonly basis: BeneficialBasis;
  readonly percentage: string | null;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
}
export interface AuthorityView {
  readonly id: string;
  readonly contactId: string;
  readonly displayName: string;
  readonly role: GovernanceRole;
  readonly scope: AuthorityScope;
  readonly powers: readonly string[];
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly endReason: string | null;
}
export interface ResolutionView {
  readonly id: string;
  readonly number: string | null;
  readonly title: string;
  readonly type: ResolutionType;
  readonly effectiveOn: string;
  readonly notes: string | null;
}
export interface GovernanceTimelineEvent {
  readonly id: string;
  readonly type: string;
  readonly effectiveOn: string;
  readonly version: number;
  readonly occurredAt: string;
  readonly details: Readonly<Record<string, unknown>>;
}
export interface GovernanceRisk {
  readonly code: string;
  readonly severity: 'high' | 'medium' | 'low';
  readonly message: string;
}
export interface GovernanceContext {
  readonly companyId: string;
  readonly asOf: string;
  readonly canMutate: boolean;
  readonly versions: Readonly<{ ownership: number; beneficialOwners: number; authority: number; resolutions: number; capital: number }>;
  readonly ownership: Readonly<{ configured: boolean; totalPercentage: string | null; stakes: readonly GovernanceStake[] }>;
  readonly beneficialOwners: readonly BeneficialOwnerView[];
  readonly authorities: readonly AuthorityView[];
  readonly resolutions: readonly ResolutionView[];
  readonly capital: Readonly<{ known: boolean; amount: string | null; source: string; effectiveOn: string | null; version: number }>;
  readonly timeline: readonly GovernanceTimelineEvent[];
  readonly risks: readonly GovernanceRisk[];
}

export interface OwnershipEntryInput { readonly kind: HolderKind; readonly id: string; readonly role: OwnershipRole; readonly percentage: string }
export interface BeneficialOwnerEntryInput { readonly contactId: string; readonly basis: BeneficialBasis; readonly percentage: string | null }
export interface GovernanceCommandGateway {
  loadContext(workspaceId: string, companyId: string, asOf?: string | null): Promise<GovernanceContext>;
  replaceOwnership(input: Readonly<{ workspaceId: string; companyId: string; expectedVersion: number; operationId: string; effectiveFrom: string; entries: readonly OwnershipEntryInput[] }>): Promise<void>;
  replaceBeneficialOwners(input: Readonly<{ workspaceId: string; companyId: string; expectedVersion: number; operationId: string; effectiveFrom: string; entries: readonly BeneficialOwnerEntryInput[] }>): Promise<void>;
  grantAuthority(input: Readonly<{ workspaceId: string; companyId: string; expectedVersion: number; operationId: string; contactId: string; role: GovernanceRole; scope: AuthorityScope; powers: readonly string[]; effectiveFrom: string; expiresOn: string | null }>): Promise<void>;
  revokeAuthority(input: Readonly<{ workspaceId: string; companyId: string; expectedVersion: number; operationId: string; grantId: string; effectiveOn: string; reason: string }>): Promise<void>;
  recordResolution(input: Readonly<{ workspaceId: string; companyId: string; expectedVersion: number; operationId: string; number: string | null; title: string; type: ResolutionType; effectiveOn: string; notes: string | null }>): Promise<void>;
  recordCapital(input: Readonly<{ workspaceId: string; companyId: string; expectedVersion: number; operationId: string; changeType: CapitalChangeType; amountAfter: string; effectiveOn: string; reason: string }>): Promise<void>;
}

interface RpcResponse { readonly data: unknown; readonly error: DataFailureLike | null }
interface RpcClientLike { rpc(name: string, args: Readonly<Record<string, unknown>>): PromiseLike<RpcResponse> }
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const OWNERSHIP=/^(?:0|[1-9]\d{0,2})(?:\.\d{1,6})?$/;
const MONEY=/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/;
const TIMEOUT=15_000;
const rec=(v:unknown):Readonly<Record<string,unknown>>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new DataAccessError('Invalid governance payload','DATA_OPERATION_FAILED');return v as Readonly<Record<string,unknown>>};
const arr=(v:unknown):readonly unknown[]=>{if(!Array.isArray(v))throw new DataAccessError('Invalid governance array','DATA_OPERATION_FAILED');return v};
const txt=(v:unknown,max=10_000):string=>{if(typeof v!=='string'||v.length>max)throw new DataAccessError('Invalid governance text','DATA_OPERATION_FAILED');return v};
const id=(v:unknown):string=>{const x=txt(v,64);if(!UUID.test(x))throw new DataAccessError('Invalid governance id','DATA_OPERATION_FAILED');return x};
const opt=(v:unknown):string|null=>v===null?null:txt(v);
const integer=(v:unknown):number=>{const n=typeof v==='number'?v:Number(v);if(!Number.isSafeInteger(n)||n<0)throw new DataAccessError('Invalid governance version','DATA_OPERATION_FAILED');return n};
const bool=(v:unknown):boolean=>{if(typeof v!=='boolean')throw new DataAccessError('Invalid governance boolean','DATA_OPERATION_FAILED');return v};
function one<T extends string>(v:unknown,allowed:readonly T[]):T{const x=txt(v,80);if(!allowed.includes(x as T))throw new DataAccessError('Invalid governance enum','DATA_OPERATION_FAILED');return x as T}
function inputId(v:string,label:string){if(!UUID.test(v))throw new DataAccessError(`Invalid ${label}`,'DATA_VALIDATION_FAILED')}
function inputDate(v:string,label:string){if(!DATE.test(v))throw new DataAccessError(`Invalid ${label}`,'DATA_VALIDATION_FAILED')}
function inputText(v:string,label:string,max:number){if(!v.trim()||v.length>max)throw new DataAccessError(`Invalid ${label}`,'DATA_VALIDATION_FAILED')}
async function settle<T>(p:PromiseLike<T>,write:boolean):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('governance rpc timeout')),TIMEOUT)});try{return await Promise.race([Promise.resolve(p),deadline])}catch(e){throw normalizeThrownDataFailure(e,write?'write':'read')}finally{if(timer)clearTimeout(timer)}}
async function rpc(client:RpcClientLike,name:string,args:Readonly<Record<string,unknown>>,write:boolean):Promise<unknown>{const out=await settle(client.rpc(name,args),write);if(out.error)throw normalizeDataFailure(out.error);return out.data}

function parseContext(value:unknown):GovernanceContext{
  const r=rec(value); if(r.schema!=='enjaz.governance-context.v1')throw new DataAccessError('Unsupported governance schema','DATA_OPERATION_FAILED');
  const versions=rec(r.versions),ownership=rec(r.ownership),capital=rec(r.capital);
  const stakes=arr(ownership.stakes).map((v):GovernanceStake=>{const x=rec(v),holder=rec(x.holder);return Object.freeze({id:id(x.id),holderKind:one(holder.kind,['person','company'] as const),holderId:id(holder.id),role:one(x.role,['shareholder','partner'] as const),percentage:txt(x.percentage,32),effectiveFrom:txt(x.effectiveFrom,10),effectiveTo:opt(x.effectiveTo)})});
  const beneficialOwners=arr(r.beneficialOwners).map((v):BeneficialOwnerView=>{const x=rec(v);return Object.freeze({id:id(x.id),contactId:id(x.contactId),displayName:txt(x.displayName,500),basis:one(x.basis,['ownership','voting_rights','management_control','other'] as const),percentage:opt(x.percentage),effectiveFrom:txt(x.effectiveFrom,10),effectiveTo:opt(x.effectiveTo)})});
  const authorities=arr(r.authorities).map((v):AuthorityView=>{const x=rec(v);return Object.freeze({id:id(x.id),contactId:id(x.contactId),displayName:txt(x.displayName,500),role:one(x.role,['director','manager','authorized_person'] as const),scope:one(x.scope,['full','limited','joint','custom'] as const),powers:Object.freeze(arr(x.powers).map((p)=>txt(p,200))),effectiveFrom:txt(x.effectiveFrom,10),effectiveTo:opt(x.effectiveTo),endReason:opt(x.endReason)})});
  const resolutions=arr(r.resolutions).map((v):ResolutionView=>{const x=rec(v);return Object.freeze({id:id(x.id),number:opt(x.number),title:txt(x.title,400),type:one(x.type,['appointment','removal','ownership','capital','authorization','general','other'] as const),effectiveOn:txt(x.effectiveOn,10),notes:opt(x.notes)})});
  const timeline=arr(r.timeline).map((v):GovernanceTimelineEvent=>{const x=rec(v);return Object.freeze({id:id(x.id),type:txt(x.type,100),effectiveOn:txt(x.effectiveOn,10),version:integer(x.version),occurredAt:txt(x.occurredAt,80),details:rec(x.details)})});
  const risks=arr(r.risks).map((v):GovernanceRisk=>{const x=rec(v);return Object.freeze({code:txt(x.code,100),severity:one(x.severity,['high','medium','low'] as const),message:txt(x.message,500)})});
  return Object.freeze({companyId:id(r.companyId),asOf:txt(r.asOf,10),canMutate:bool(r.canMutate),versions:Object.freeze({ownership:integer(versions.ownership),beneficialOwners:integer(versions.beneficialOwners),authority:integer(versions.authority),resolutions:integer(versions.resolutions),capital:integer(versions.capital)}),ownership:Object.freeze({configured:bool(ownership.configured),totalPercentage:opt(ownership.totalPercentage),stakes:Object.freeze(stakes)}),beneficialOwners:Object.freeze(beneficialOwners),authorities:Object.freeze(authorities),resolutions:Object.freeze(resolutions),capital:Object.freeze({known:bool(capital.known),amount:opt(capital.amount),source:txt(capital.source,100),effectiveOn:opt(capital.effectiveOn),version:integer(capital.version)}),timeline:Object.freeze(timeline),risks:Object.freeze(risks)});
}

export function createGovernanceCommandGateway(client:EnjazSupabaseClient,timeoutMs=TIMEOUT):GovernanceCommandGateway{
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120_000)throw new Error('Invalid governance timeout');
  const c=client as unknown as RpcClientLike;
  const call=async(name:string,args:Readonly<Record<string,unknown>>,write:boolean)=>{let timer:ReturnType<typeof setTimeout>|undefined;const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('governance rpc timeout')),timeoutMs)});try{const out=await Promise.race([Promise.resolve(c.rpc(name,args)),deadline]);if(out.error)throw normalizeDataFailure(out.error);return out.data}catch(e){throw normalizeThrownDataFailure(e,write?'write':'read')}finally{if(timer)clearTimeout(timer)}};
  const common=(workspaceId:string,companyId:string)=>{inputId(workspaceId,'workspace');inputId(companyId,'company')};
  const op=(operationId:string)=>inputId(operationId,'operation');
  return Object.freeze({
    async loadContext(workspaceId,companyId,asOf=null){common(workspaceId,companyId);if(asOf)inputDate(asOf,'as-of date');return parseContext(await call('get_company_governance_context_v1',{p_workspace_id:workspaceId,p_company_id:companyId,p_as_of:asOf},false))},
    async replaceOwnership(input){common(input.workspaceId,input.companyId);op(input.operationId);inputDate(input.effectiveFrom,'effective date');if(input.entries.length<1||input.entries.length>100)throw new DataAccessError('Invalid ownership entries','DATA_VALIDATION_FAILED');for(const x of input.entries){inputId(x.id,'holder');if(!OWNERSHIP.test(x.percentage)||Number(x.percentage)<=0)throw new DataAccessError('Invalid ownership percentage','DATA_VALIDATION_FAILED')}await call('replace_company_ownership_snapshot_v1',{p_workspace_id:input.workspaceId,p_company_id:input.companyId,p_expected_version:input.expectedVersion,p_operation_id:input.operationId,p_effective_from:input.effectiveFrom,p_entries:input.entries},true)},
    async replaceBeneficialOwners(input){common(input.workspaceId,input.companyId);op(input.operationId);inputDate(input.effectiveFrom,'effective date');if(input.entries.length>100)throw new DataAccessError('Invalid beneficial owners','DATA_VALIDATION_FAILED');for(const x of input.entries){inputId(x.contactId,'contact');if(x.percentage!==null&&(!OWNERSHIP.test(x.percentage)||Number(x.percentage)<=0))throw new DataAccessError('Invalid beneficial percentage','DATA_VALIDATION_FAILED')}await call('replace_company_beneficial_owners_v1',{p_workspace_id:input.workspaceId,p_company_id:input.companyId,p_expected_version:input.expectedVersion,p_operation_id:input.operationId,p_effective_from:input.effectiveFrom,p_entries:input.entries},true)},
    async grantAuthority(input){common(input.workspaceId,input.companyId);op(input.operationId);inputId(input.contactId,'contact');inputDate(input.effectiveFrom,'effective date');if(input.expiresOn)inputDate(input.expiresOn,'expiry date');if(input.powers.length>40||input.powers.some(x=>!x.trim()||x.length>200))throw new DataAccessError('Invalid authority powers','DATA_VALIDATION_FAILED');await call('grant_company_authority_v1',{p_workspace_id:input.workspaceId,p_company_id:input.companyId,p_expected_version:input.expectedVersion,p_operation_id:input.operationId,p_contact_id:input.contactId,p_role:input.role,p_scope:input.scope,p_powers:input.powers,p_effective_from:input.effectiveFrom,p_expires_on:input.expiresOn},true)},
    async revokeAuthority(input){common(input.workspaceId,input.companyId);op(input.operationId);inputId(input.grantId,'grant');inputDate(input.effectiveOn,'effective date');inputText(input.reason,'revocation reason',1000);await call('revoke_company_authority_v1',{p_workspace_id:input.workspaceId,p_company_id:input.companyId,p_expected_version:input.expectedVersion,p_operation_id:input.operationId,p_grant_id:input.grantId,p_effective_on:input.effectiveOn,p_reason:input.reason.trim()},true)},
    async recordResolution(input){common(input.workspaceId,input.companyId);op(input.operationId);inputDate(input.effectiveOn,'effective date');inputText(input.title,'resolution title',400);if(input.number&&input.number.length>120)throw new DataAccessError('Invalid resolution number','DATA_VALIDATION_FAILED');if(input.notes&&input.notes.length>4000)throw new DataAccessError('Invalid resolution notes','DATA_VALIDATION_FAILED');await call('record_company_resolution_v1',{p_workspace_id:input.workspaceId,p_company_id:input.companyId,p_expected_version:input.expectedVersion,p_operation_id:input.operationId,p_resolution_number:input.number,p_title:input.title.trim(),p_resolution_type:input.type,p_effective_on:input.effectiveOn,p_notes:input.notes},true)},
    async recordCapital(input){common(input.workspaceId,input.companyId);op(input.operationId);inputDate(input.effectiveOn,'effective date');inputText(input.reason,'capital reason',1000);if(!MONEY.test(input.amountAfter))throw new DataAccessError('Invalid capital amount','DATA_VALIDATION_FAILED');await call('record_company_capital_event_v1',{p_workspace_id:input.workspaceId,p_company_id:input.companyId,p_expected_version:input.expectedVersion,p_operation_id:input.operationId,p_change_type:input.changeType,p_amount_after:input.amountAfter,p_effective_on:input.effectiveOn,p_reason:input.reason.trim()},true)},
  });
}
