import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';
import type { OrganizationScopeType } from './organizationCommands.ts';

export interface OrganizationAssignableTransaction{
  readonly transactionId:string;
  readonly companyId:string;
  readonly companyName:string;
  readonly type:string;
  readonly status:string;
  readonly priority:string;
  readonly updatedAt:string;
  readonly ownershipId:string|null;
  readonly ownershipVersion:number|null;
  readonly scopeType:OrganizationScopeType|null;
  readonly branchId:string|null;
  readonly departmentId:string|null;
  readonly teamId:string|null;
}
export interface OrganizationAssignmentCatalog{list(workspaceId:string):Promise<readonly OrganizationAssignableTransaction[]>}
interface RpcResponse{readonly data:unknown;readonly error:DataFailureLike|null}
interface RpcLike{rpc(name:string,args:Readonly<Record<string,unknown>>):PromiseLike<RpcResponse>}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCOPES=['branch','department','team'] as const;
function bad(validation=false):never{throw new DataAccessError('Invalid organization assignment catalog',validation?'DATA_VALIDATION_FAILED':'DATA_OPERATION_FAILED')}
function id(v:unknown){if(typeof v!=='string'||!UUID.test(v))bad();return v}
function oid(v:unknown){return v===null?null:id(v)}
function text(v:unknown,max=400){if(typeof v!=='string'||!v.trim()||v.length>max)bad();return v.trim()}
function iso(v:unknown){if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))bad();return v}
function ver(v:unknown){if(v===null)return null;if(typeof v!=='number'||!Number.isSafeInteger(v)||v<1)bad();return v}
function scope(v:unknown):OrganizationScopeType|null{if(v===null)return null;if(!SCOPES.includes(v as OrganizationScopeType))bad();return v as OrganizationScopeType}
function parse(v:unknown):OrganizationAssignableTransaction{if(!v||typeof v!=='object'||Array.isArray(v))bad();const r=v as Record<string,unknown>,s=scope(r.scopeType),branchId=oid(r.branchId),departmentId=oid(r.departmentId),teamId=oid(r.teamId),ownershipId=oid(r.ownershipId),ownershipVersion=ver(r.ownershipVersion);if(ownershipId===null){if(ownershipVersion!==null||s!==null||branchId!==null||departmentId!==null||teamId!==null)bad()}else{const valid=(s==='branch'&&branchId!==null&&departmentId===null&&teamId===null)||(s==='department'&&branchId===null&&departmentId!==null&&teamId===null)||(s==='team'&&branchId===null&&departmentId===null&&teamId!==null);if(!valid||ownershipVersion===null)bad()}return Object.freeze({transactionId:id(r.transactionId),companyId:id(r.companyId),companyName:text(r.companyName),type:text(r.type,180),status:text(r.status,64),priority:text(r.priority,64),updatedAt:iso(r.updatedAt),ownershipId,ownershipVersion,scopeType:s,branchId,departmentId,teamId})}
async function settle<T>(p:PromiseLike<T>,timeoutMs:number):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new DataAccessError('Organization assignment catalog timeout','DATA_UNAVAILABLE')),timeoutMs)});try{return await Promise.race([Promise.resolve(p),deadline])}catch(e){throw normalizeThrownDataFailure(e,'read')}finally{if(timer)clearTimeout(timer)}}

export function createOrganizationAssignmentCatalog(client:EnjazSupabaseClient,timeoutMs=15000):OrganizationAssignmentCatalog{
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw new Error('Invalid organization catalog timeout');
  const c=client as unknown as RpcLike;
  const catalog:OrganizationAssignmentCatalog={
    async list(workspaceId){if(!UUID.test(workspaceId))bad(true);const response=await settle(c.rpc('list_organization_assignable_transactions_v1',{p_workspace_id:workspaceId}),timeoutMs);if(response.error)throw normalizeDataFailure(response.error);if(!Array.isArray(response.data))bad();return Object.freeze(response.data.map(parse));}
  };
  return Object.freeze(catalog);
}
