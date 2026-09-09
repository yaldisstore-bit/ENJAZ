import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export type OrganizationStatus='active'|'inactive';
export type OrganizationScopeType='branch'|'department'|'team';
export type OrganizationScopeRole='member'|'lead'|'manager';
export type OrganizationActorType='owner'|'workforce';

export interface OrganizationActor{readonly userId:string;readonly actorType:OrganizationActorType;readonly organizationMemberId:string|null}
export interface OrganizationMember{readonly id:string;readonly userId:string;readonly status:OrganizationStatus;readonly validFrom:string;readonly validUntil:string|null;readonly version:number}
export interface OrganizationBranch{readonly id:string;readonly name:string;readonly code:string|null;readonly address:string|null;readonly status:OrganizationStatus;readonly version:number;readonly accessSourceMembershipId:string|null}
export interface OrganizationDepartment{readonly id:string;readonly branchId:string|null;readonly name:string;readonly code:string|null;readonly status:OrganizationStatus;readonly version:number;readonly accessSourceMembershipId:string|null}
export interface OrganizationTeam{readonly id:string;readonly departmentId:string;readonly name:string;readonly code:string|null;readonly status:OrganizationStatus;readonly version:number;readonly accessSourceMembershipId:string|null}
export interface OrganizationScopeMembership{readonly id:string;readonly organizationMemberId:string;readonly scopeType:OrganizationScopeType;readonly branchId:string|null;readonly departmentId:string|null;readonly teamId:string|null;readonly scopeRole:OrganizationScopeRole;readonly status:OrganizationStatus;readonly validFrom:string;readonly validUntil:string|null;readonly version:number}
export interface OrganizationTransaction{readonly transactionId:string;readonly companyId:string;readonly companyName:string;readonly type:string;readonly status:string;readonly priority:string;readonly updatedAt:string;readonly ownershipId:string;readonly ownershipVersion:number;readonly scopeType:OrganizationScopeType;readonly branchId:string|null;readonly departmentId:string|null;readonly teamId:string|null;readonly accessSourceMembershipId:string|null}
export interface OrganizationOwnershipEvent{readonly id:string;readonly transactionId:string;readonly eventType:'assigned'|'transferred';readonly fromScopeType:OrganizationScopeType|null;readonly fromBranchId:string|null;readonly fromDepartmentId:string|null;readonly fromTeamId:string|null;readonly toScopeType:OrganizationScopeType;readonly toBranchId:string|null;readonly toDepartmentId:string|null;readonly toTeamId:string|null;readonly reason:string;readonly actorUserId:string;readonly createdAt:string}
export interface OrganizationContext{
  readonly authority:'organization_structure_scoped_ownership';
  readonly workspaceTrustAuthority:'legacy_owner_only_unchanged';
  readonly workforceAuthority:'organization_members_and_scope_memberships';
  readonly legacyWorkspaceWideAccessForWorkforce:'forbidden';
  readonly transactionLifecycleWriteAuthority:'none';
  readonly financeLedgerWriteAuthority:'none';
  readonly actor:OrganizationActor;
  readonly members:readonly OrganizationMember[];
  readonly branches:readonly OrganizationBranch[];
  readonly departments:readonly OrganizationDepartment[];
  readonly teams:readonly OrganizationTeam[];
  readonly scopeMemberships:readonly OrganizationScopeMembership[];
  readonly transactions:readonly OrganizationTransaction[];
  readonly ownershipEvents:readonly OrganizationOwnershipEvent[];
}
export interface OrganizationAccessExplanation{readonly allowed:boolean;readonly actorType:OrganizationActorType;readonly source:string|null;readonly sourceMembershipId:string|null;readonly sourceScopeType?:OrganizationScopeType;readonly sourceRole?:OrganizationScopeRole;readonly sourceBranchId?:string|null;readonly sourceDepartmentId?:string|null;readonly sourceTeamId?:string|null}
export interface OrganizationScopeTarget{readonly scopeType:OrganizationScopeType;readonly branchId:string|null;readonly departmentId:string|null;readonly teamId:string|null}

export interface OrganizationGateway{
  loadContext(workspaceId:string):Promise<OrganizationContext>;
  setMember(input:Readonly<{workspaceId:string;userId:string;status:OrganizationStatus;validUntil:string|null}>):Promise<Readonly<Record<string,unknown>>>;
  saveBranch(input:Readonly<{workspaceId:string;branchId:string|null;expectedVersion:number|null;name:string;code:string|null;address:string|null;status:OrganizationStatus}>):Promise<Readonly<Record<string,unknown>>>;
  saveDepartment(input:Readonly<{workspaceId:string;departmentId:string|null;expectedVersion:number|null;branchId:string|null;name:string;code:string|null;status:OrganizationStatus}>):Promise<Readonly<Record<string,unknown>>>;
  saveTeam(input:Readonly<{workspaceId:string;teamId:string|null;expectedVersion:number|null;departmentId:string;name:string;code:string|null;status:OrganizationStatus}>):Promise<Readonly<Record<string,unknown>>>;
  setScopeMembership(input:Readonly<{workspaceId:string;membershipId:string|null;expectedVersion:number|null;userId:string;target:OrganizationScopeTarget;scopeRole:OrganizationScopeRole;status:OrganizationStatus;validFrom:string|null;validUntil:string|null}>):Promise<Readonly<Record<string,unknown>>>;
  assignTransaction(input:Readonly<{workspaceId:string;transactionId:string;expectedVersion:number|null;target:OrganizationScopeTarget;reason:string}>):Promise<Readonly<Record<string,unknown>>>;
  explainAccess(workspaceId:string,target:OrganizationScopeTarget):Promise<OrganizationAccessExplanation>;
}

interface RpcResponse{readonly data:unknown;readonly error:DataFailureLike|null}
interface RpcLike{rpc(name:string,args:Readonly<Record<string,unknown>>):PromiseLike<RpcResponse>}
const TIMEOUT=15000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE=/^[A-Za-z0-9_.-]{1,48}$/;
const STATUSES=['active','inactive'] as const,SCOPES=['branch','department','team'] as const,ROLES=['member','lead','manager'] as const,ACTORS=['owner','workforce'] as const;

function fail(validation=false):never{throw new DataAccessError('Invalid organization data',validation?'DATA_VALIDATION_FAILED':'DATA_OPERATION_FAILED')}
function record(v:unknown):Readonly<Record<string,unknown>>{if(!v||typeof v!=='object'||Array.isArray(v))fail();return v as Readonly<Record<string,unknown>>}
function array(v:unknown):readonly unknown[]{if(!Array.isArray(v))fail();return v}
function text(v:unknown,max=2400):string{if(typeof v!=='string'||!v.trim()||v.length>max)fail();return v.trim()}
function optionalText(v:unknown,max=2400):string|null{return v===null||v===undefined||v===''?null:text(v,max)}
function id(v:unknown):string{const s=text(v,64);if(!UUID.test(s))fail(true);return s}
function optionalId(v:unknown):string|null{return v===null||v===undefined||v===''?null:id(v)}
function version(v:unknown,nullable=false):number|null{if(nullable&&(v===null||v===undefined))return null;if(typeof v!=='number'||!Number.isSafeInteger(v)||v<1)fail(true);return v}
function one<T extends string>(v:unknown,allowed:readonly T[]):T{if(!allowed.includes(v as T))fail();return v as T}
function iso(v:unknown,nullable=false):string|null{if(nullable&&(v===null||v===undefined||v===''))return null;if(typeof v!=='string'||!v.trim()||!Number.isFinite(Date.parse(v)))fail(true);return v}
function bool(v:unknown):boolean{if(typeof v!=='boolean')fail();return v}
function payload(v:unknown){return Object.freeze({...record(v)})}
function status(v:unknown){return one(v,STATUSES)}
function scope(v:unknown){return one(v,SCOPES)}
function role(v:unknown){return one(v,ROLES)}
function target(v:OrganizationScopeTarget){
  const scopeType=scope(v.scopeType),branchId=optionalId(v.branchId),departmentId=optionalId(v.departmentId),teamId=optionalId(v.teamId);
  const valid=(scopeType==='branch'&&branchId!==null&&departmentId===null&&teamId===null)||(scopeType==='department'&&branchId===null&&departmentId!==null&&teamId===null)||(scopeType==='team'&&branchId===null&&departmentId===null&&teamId!==null);
  if(!valid)fail(true);
  return Object.freeze({scopeType,branchId,departmentId,teamId});
}
function parseMember(v:unknown):OrganizationMember{const r=record(v);return Object.freeze({id:id(r.id),userId:id(r.userId),status:status(r.status),validFrom:iso(r.validFrom)!,validUntil:iso(r.validUntil,true),version:version(r.version)!})}
function parseBranch(v:unknown):OrganizationBranch{const r=record(v);return Object.freeze({id:id(r.id),name:text(r.name,180),code:optionalText(r.code,48),address:optionalText(r.address,800),status:status(r.status),version:version(r.version)!,accessSourceMembershipId:optionalId(r.accessSourceMembershipId)})}
function parseDepartment(v:unknown):OrganizationDepartment{const r=record(v);return Object.freeze({id:id(r.id),branchId:optionalId(r.branchId),name:text(r.name,180),code:optionalText(r.code,48),status:status(r.status),version:version(r.version)!,accessSourceMembershipId:optionalId(r.accessSourceMembershipId)})}
function parseTeam(v:unknown):OrganizationTeam{const r=record(v);return Object.freeze({id:id(r.id),departmentId:id(r.departmentId),name:text(r.name,180),code:optionalText(r.code,48),status:status(r.status),version:version(r.version)!,accessSourceMembershipId:optionalId(r.accessSourceMembershipId)})}
function parseScopeMembership(v:unknown):OrganizationScopeMembership{const r=record(v),t=target({scopeType:scope(r.scopeType),branchId:optionalId(r.branchId),departmentId:optionalId(r.departmentId),teamId:optionalId(r.teamId)});return Object.freeze({id:id(r.id),organizationMemberId:id(r.organizationMemberId),...t,scopeRole:role(r.scopeRole),status:status(r.status),validFrom:iso(r.validFrom)!,validUntil:iso(r.validUntil,true),version:version(r.version)!})}
function parseTransaction(v:unknown):OrganizationTransaction{const r=record(v),t=target({scopeType:scope(r.scopeType),branchId:optionalId(r.branchId),departmentId:optionalId(r.departmentId),teamId:optionalId(r.teamId)});return Object.freeze({transactionId:id(r.transactionId),companyId:id(r.companyId),companyName:text(r.companyName,400),type:text(r.type,180),status:text(r.status,64),priority:text(r.priority,64),updatedAt:iso(r.updatedAt)!,ownershipId:id(r.ownershipId),ownershipVersion:version(r.ownershipVersion)!,...t,accessSourceMembershipId:optionalId(r.accessSourceMembershipId)})}
function parseEvent(v:unknown):OrganizationOwnershipEvent{const r=record(v),to=target({scopeType:scope(r.toScopeType),branchId:optionalId(r.toBranchId),departmentId:optionalId(r.toDepartmentId),teamId:optionalId(r.toTeamId)});const eventType=one(r.eventType,['assigned','transferred'] as const);let fromScopeType:OrganizationScopeType|null=null,fromBranchId:string|null=null,fromDepartmentId:string|null=null,fromTeamId:string|null=null;if(eventType==='transferred'){const from=target({scopeType:scope(r.fromScopeType),branchId:optionalId(r.fromBranchId),departmentId:optionalId(r.fromDepartmentId),teamId:optionalId(r.fromTeamId)});fromScopeType=from.scopeType;fromBranchId=from.branchId;fromDepartmentId=from.departmentId;fromTeamId=from.teamId}else if(r.fromScopeType!==null||r.fromBranchId!==null||r.fromDepartmentId!==null||r.fromTeamId!==null)fail();return Object.freeze({id:id(r.id),transactionId:id(r.transactionId),eventType,fromScopeType,fromBranchId,fromDepartmentId,fromTeamId,toScopeType:to.scopeType,toBranchId:to.branchId,toDepartmentId:to.departmentId,toTeamId:to.teamId,reason:text(r.reason,1200),actorUserId:id(r.actorUserId),createdAt:iso(r.createdAt)!})}
function parseContext(v:unknown):OrganizationContext{const r=record(v);if(r.authority!=='organization_structure_scoped_ownership'||r.workspaceTrustAuthority!=='legacy_owner_only_unchanged'||r.workforceAuthority!=='organization_members_and_scope_memberships'||r.legacyWorkspaceWideAccessForWorkforce!=='forbidden'||r.transactionLifecycleWriteAuthority!=='none'||r.financeLedgerWriteAuthority!=='none')fail();const a=record(r.actor);return Object.freeze({authority:r.authority,workspaceTrustAuthority:r.workspaceTrustAuthority,workforceAuthority:r.workforceAuthority,legacyWorkspaceWideAccessForWorkforce:r.legacyWorkspaceWideAccessForWorkforce,transactionLifecycleWriteAuthority:r.transactionLifecycleWriteAuthority,financeLedgerWriteAuthority:r.financeLedgerWriteAuthority,actor:Object.freeze({userId:id(a.userId),actorType:one(a.actorType,ACTORS),organizationMemberId:optionalId(a.organizationMemberId)}),members:Object.freeze(array(r.members).map(parseMember)),branches:Object.freeze(array(r.branches).map(parseBranch)),departments:Object.freeze(array(r.departments).map(parseDepartment)),teams:Object.freeze(array(r.teams).map(parseTeam)),scopeMemberships:Object.freeze(array(r.scopeMemberships).map(parseScopeMembership)),transactions:Object.freeze(array(r.transactions).map(parseTransaction)),ownershipEvents:Object.freeze(array(r.ownershipEvents).map(parseEvent))})}
function parseExplanation(v:unknown):OrganizationAccessExplanation{const r=record(v),allowed=bool(r.allowed),actorType=one(r.actorType,ACTORS),source=r.source===null?null:text(r.source,80),sourceMembershipId=optionalId(r.sourceMembershipId);if(actorType==='owner'&&(!allowed||source!=='workspace_owner'||sourceMembershipId!==null))fail();if(actorType==='workforce'&&allowed&&sourceMembershipId===null)fail();const out:OrganizationAccessExplanation={allowed,actorType,source,sourceMembershipId};if(r.sourceScopeType!==undefined)Object.assign(out,{sourceScopeType:scope(r.sourceScopeType),sourceRole:role(r.sourceRole),sourceBranchId:optionalId(r.sourceBranchId),sourceDepartmentId:optionalId(r.sourceDepartmentId),sourceTeamId:optionalId(r.sourceTeamId)});return Object.freeze(out)}

async function settle<T>(p:PromiseLike<T>,write:boolean,t:number):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new DataAccessError('Organization request timeout',write?'DATA_OUTCOME_UNKNOWN':'DATA_UNAVAILABLE')),t)});try{return await Promise.race([Promise.resolve(p),deadline])}catch(e){throw normalizeThrownDataFailure(e,write?'write':'read')}finally{if(timer)clearTimeout(timer)}}
async function rpc(c:RpcLike,n:string,a:Readonly<Record<string,unknown>>,write:boolean,t:number){const r=await settle(c.rpc(n,a),write,t);if(r.error)throw normalizeDataFailure(r.error);return r.data}
function nullableCode(v:string|null){if(v===null||v.trim()==='')return null;const x=v.trim();if(!CODE.test(x))fail(true);return x}
function bounded(v:string,max:number,required=true){const x=v.trim();if((required&&!x)||x.length>max)fail(true);return x||null}

export function createOrganizationGateway(client:EnjazSupabaseClient,timeoutMs=TIMEOUT):OrganizationGateway{
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw new Error('Invalid organization timeout');
  const c=client as unknown as RpcLike;
  return Object.freeze({
    async loadContext(workspaceId){return parseContext(await rpc(c,'get_organization_context_v1',{p_workspace_id:id(workspaceId)},false,timeoutMs))},
    async setMember(x){return payload(await rpc(c,'set_organization_member_v1',{p_workspace_id:id(x.workspaceId),p_user_id:id(x.userId),p_status:status(x.status),p_valid_until:iso(x.validUntil,true)},true,timeoutMs))},
    async saveBranch(x){return payload(await rpc(c,'save_organization_branch_v1',{p_workspace_id:id(x.workspaceId),p_branch_id:optionalId(x.branchId),p_expected_version:version(x.expectedVersion,true),p_name:bounded(x.name,180),p_code:nullableCode(x.code),p_address:x.address===null?null:bounded(x.address,800,false),p_status:status(x.status)},true,timeoutMs))},
    async saveDepartment(x){return payload(await rpc(c,'save_organization_department_v1',{p_workspace_id:id(x.workspaceId),p_department_id:optionalId(x.departmentId),p_expected_version:version(x.expectedVersion,true),p_branch_id:optionalId(x.branchId),p_name:bounded(x.name,180),p_code:nullableCode(x.code),p_status:status(x.status)},true,timeoutMs))},
    async saveTeam(x){return payload(await rpc(c,'save_organization_team_v1',{p_workspace_id:id(x.workspaceId),p_team_id:optionalId(x.teamId),p_expected_version:version(x.expectedVersion,true),p_department_id:id(x.departmentId),p_name:bounded(x.name,180),p_code:nullableCode(x.code),p_status:status(x.status)},true,timeoutMs))},
    async setScopeMembership(x){const t=target(x.target),from=iso(x.validFrom,true),until=iso(x.validUntil,true);if(from&&until&&Date.parse(until)<=Date.parse(from))fail(true);return payload(await rpc(c,'set_organization_scope_membership_v1',{p_workspace_id:id(x.workspaceId),p_membership_id:optionalId(x.membershipId),p_expected_version:version(x.expectedVersion,true),p_user_id:id(x.userId),p_scope_type:t.scopeType,p_branch_id:t.branchId,p_department_id:t.departmentId,p_team_id:t.teamId,p_scope_role:role(x.scopeRole),p_status:status(x.status),p_valid_from:from,p_valid_until:until},true,timeoutMs))},
    async assignTransaction(x){const t=target(x.target);return payload(await rpc(c,'assign_transaction_organization_v1',{p_workspace_id:id(x.workspaceId),p_transaction_id:id(x.transactionId),p_expected_version:version(x.expectedVersion,true),p_scope_type:t.scopeType,p_branch_id:t.branchId,p_department_id:t.departmentId,p_team_id:t.teamId,p_reason:bounded(x.reason,1200)},true,timeoutMs))},
    async explainAccess(workspaceId,targetInput){const t=target(targetInput);return parseExplanation(await rpc(c,'explain_organization_access_v1',{p_workspace_id:id(workspaceId),p_scope_type:t.scopeType,p_branch_id:t.branchId,p_department_id:t.departmentId,p_team_id:t.teamId},false,timeoutMs))}
  });
}
