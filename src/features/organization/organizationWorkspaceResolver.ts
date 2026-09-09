import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';
import type { OrganizationActorType } from './organizationCommands.ts';

export interface OrganizationWorkspaceAccess{readonly workspaceId:string;readonly workspaceName:string;readonly actorType:OrganizationActorType;readonly organizationMemberId:string|null}
export interface OrganizationWorkspaceResolver{listWorkspaces():Promise<readonly OrganizationWorkspaceAccess[]>}
interface RpcResponse{readonly data:unknown;readonly error:DataFailureLike|null}
interface RpcLike{rpc(name:string,args?:Readonly<Record<string,unknown>>):PromiseLike<RpcResponse>}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail():never{throw new DataAccessError('Invalid organization workspace response','DATA_OPERATION_FAILED')}
function row(v:unknown):OrganizationWorkspaceAccess{if(!v||typeof v!=='object'||Array.isArray(v))fail();const r=v as Record<string,unknown>;if(typeof r.workspaceId!=='string'||!UUID.test(r.workspaceId)||typeof r.workspaceName!=='string'||!r.workspaceName.trim()||(r.actorType!=='owner'&&r.actorType!=='workforce')||(r.organizationMemberId!==null&&(typeof r.organizationMemberId!=='string'||!UUID.test(r.organizationMemberId))))fail();if(r.actorType==='owner'&&r.organizationMemberId!==null)fail();if(r.actorType==='workforce'&&r.organizationMemberId===null)fail();return Object.freeze({workspaceId:r.workspaceId,workspaceName:r.workspaceName.trim(),actorType:r.actorType,organizationMemberId:r.organizationMemberId as string|null})}
async function settle<T>(p:PromiseLike<T>,timeoutMs:number):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new DataAccessError('Organization workspace resolution timeout','DATA_UNAVAILABLE')),timeoutMs)});try{return await Promise.race([Promise.resolve(p),deadline])}catch(e){throw normalizeThrownDataFailure(e,'read')}finally{if(timer)clearTimeout(timer)}}

export function createOrganizationWorkspaceResolver(client:EnjazSupabaseClient,timeoutMs=15000):OrganizationWorkspaceResolver{
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw new Error('Invalid organization workspace timeout');
  const c=client as unknown as RpcLike;
  return Object.freeze({async listWorkspaces(){const response=await settle(c.rpc('list_organization_workspaces_v1',{}),timeoutMs);if(response.error)throw normalizeDataFailure(response.error);if(!Array.isArray(response.data))fail();return Object.freeze(response.data.map(row));}});
}
