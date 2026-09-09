import test from 'node:test';
import assert from 'node:assert/strict';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import { createOrganizationGateway } from '../src/features/organization/organizationCommands.ts';

const WORKSPACE='11111111-1111-4111-8111-111111111111';
const USER='22222222-2222-4222-8222-222222222222';
const MEMBER='33333333-3333-4333-8333-333333333333';
const BRANCH='44444444-4444-4444-8444-444444444444';
const DEPARTMENT='55555555-5555-4555-8555-555555555555';
const TEAM='66666666-6666-4666-8666-666666666666';
const SCOPE='77777777-7777-4777-8777-777777777777';
const TRANSACTION='88888888-8888-4888-8888-888888888888';
const COMPANY='99999999-9999-4999-8999-999999999999';
const OWNERSHIP='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const EVENT='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function clientWith(handler:(name:string,args:Readonly<Record<string,unknown>>)=>unknown){
  return {rpc(name:string,args:Readonly<Record<string,unknown>>){return Promise.resolve({data:handler(name,args),error:null});}} as never;
}

const baseContext={
  authority:'organization_structure_scoped_ownership',
  workspaceTrustAuthority:'legacy_owner_only_unchanged',
  workforceAuthority:'organization_members_and_scope_memberships',
  legacyWorkspaceWideAccessForWorkforce:'forbidden',
  transactionLifecycleWriteAuthority:'none',
  financeLedgerWriteAuthority:'none',
  actor:{userId:USER,actorType:'workforce',organizationMemberId:MEMBER},
  members:[{id:MEMBER,userId:USER,status:'active',validFrom:'2026-09-09T05:00:00Z',validUntil:null,version:1}],
  branches:[{id:BRANCH,name:'فرع بغداد',code:'BGD',address:'اليرموك',status:'active',version:1,accessSourceMembershipId:SCOPE}],
  departments:[{id:DEPARTMENT,branchId:BRANCH,name:'قسم الشركات',code:'COMP',status:'active',version:2,accessSourceMembershipId:SCOPE}],
  teams:[{id:TEAM,departmentId:DEPARTMENT,name:'فريق التسجيل',code:'REG',status:'active',version:3,accessSourceMembershipId:SCOPE}],
  scopeMemberships:[{id:SCOPE,organizationMemberId:MEMBER,scopeType:'branch',branchId:BRANCH,departmentId:null,teamId:null,scopeRole:'manager',status:'active',validFrom:'2026-09-09T05:00:00Z',validUntil:null,version:1}],
  transactions:[{transactionId:TRANSACTION,companyId:COMPANY,companyName:'شركة اختبار',type:'تسجيل شركة',status:'active',priority:'high',updatedAt:'2026-09-09T05:10:00Z',ownershipId:OWNERSHIP,ownershipVersion:2,scopeType:'team',branchId:null,departmentId:null,teamId:TEAM,accessSourceMembershipId:SCOPE}],
  ownershipEvents:[{id:EVENT,transactionId:TRANSACTION,eventType:'transferred',fromScopeType:'department',fromBranchId:null,fromDepartmentId:DEPARTMENT,fromTeamId:null,toScopeType:'team',toBranchId:null,toDepartmentId:null,toTeamId:TEAM,reason:'نقل إلى فريق التنفيذ',actorUserId:USER,createdAt:'2026-09-09T05:12:00Z'}]
};

test('parses scoped organization context and rejects legacy/finance authority drift',async()=>{
  const gateway=createOrganizationGateway(clientWith(()=>baseContext));
  const parsed=await gateway.loadContext(WORKSPACE);
  assert.equal(parsed.actor.actorType,'workforce');
  assert.equal(parsed.branches[0]?.accessSourceMembershipId,SCOPE);
  assert.equal(parsed.transactions[0]?.teamId,TEAM);
  assert.equal(parsed.transactionLifecycleWriteAuthority,'none');
  assert.equal(parsed.financeLedgerWriteAuthority,'none');
  const bad=createOrganizationGateway(clientWith(()=>({...baseContext,legacyWorkspaceWideAccessForWorkforce:'allowed'})));
  await assert.rejects(()=>bad.loadContext(WORKSPACE),(error:unknown)=>error instanceof DataAccessError);
});

test('scope target validation is exact and happens before network',async()=>{
  let calls=0;
  const gateway=createOrganizationGateway(clientWith(()=>{calls+=1;return {membershipId:SCOPE,version:1,status:'active',wasCreated:true};}));
  await assert.rejects(()=>gateway.setScopeMembership({workspaceId:WORKSPACE,membershipId:null,expectedVersion:null,userId:USER,target:{scopeType:'branch',branchId:BRANCH,departmentId:DEPARTMENT,teamId:null},scopeRole:'member',status:'active',validFrom:null,validUntil:null}),(error:unknown)=>error instanceof DataAccessError&&error.dataCode==='DATA_VALIDATION_FAILED');
  assert.equal(calls,0);
});

test('branch membership command preserves explicit downward source and owner-only RPC surface',async()=>{
  let capturedName='';let captured:Readonly<Record<string,unknown>>={};
  const gateway=createOrganizationGateway(clientWith((name,args)=>{capturedName=name;captured={...args};return {membershipId:SCOPE,version:2,status:'active',wasCreated:false};}));
  await gateway.setScopeMembership({workspaceId:WORKSPACE,membershipId:SCOPE,expectedVersion:1,userId:USER,target:{scopeType:'branch',branchId:BRANCH,departmentId:null,teamId:null},scopeRole:'manager',status:'active',validFrom:'2026-09-09T05:00:00Z',validUntil:null});
  assert.equal(capturedName,'set_organization_scope_membership_v1');
  assert.equal(captured.p_scope_type,'branch');
  assert.equal(captured.p_branch_id,BRANCH);
  assert.equal(captured.p_department_id,null);
  assert.equal(captured.p_team_id,null);
  assert.equal(captured.p_scope_role,'manager');
  assert.equal(captured.p_expected_version,1);
});

test('transaction organizational assignment never invents lifecycle or finance payload fields',async()=>{
  let capturedName='';let captured:Readonly<Record<string,unknown>>={};
  const gateway=createOrganizationGateway(clientWith((name,args)=>{capturedName=name;captured={...args};return {ownershipId:OWNERSHIP,version:3,scopeType:'team',branchId:null,departmentId:null,teamId:TEAM,wasCreated:false,wasNoop:false};}));
  await gateway.assignTransaction({workspaceId:WORKSPACE,transactionId:TRANSACTION,expectedVersion:2,target:{scopeType:'team',branchId:null,departmentId:null,teamId:TEAM},reason:'نقل إلى الفريق المختص'});
  assert.equal(capturedName,'assign_transaction_organization_v1');
  assert.equal(captured.p_expected_version,2);
  assert.equal(captured.p_team_id,TEAM);
  assert.equal('p_status' in captured,false);
  assert.equal('p_fee' in captured,false);
  assert.equal('p_payment_id' in captured,false);
});

test('write version and code validation fail before RPC',async()=>{
  let calls=0;
  const gateway=createOrganizationGateway(clientWith(()=>{calls+=1;return {};}));
  await assert.rejects(()=>gateway.saveBranch({workspaceId:WORKSPACE,branchId:BRANCH,expectedVersion:0,name:'فرع',code:'BAD CODE',address:null,status:'active'}),(error:unknown)=>error instanceof DataAccessError&&error.dataCode==='DATA_VALIDATION_FAILED');
  assert.equal(calls,0);
});

test('access explanation requires a concrete source membership for workforce access',async()=>{
  const gateway=createOrganizationGateway(clientWith((name)=>{
    assert.equal(name,'explain_organization_access_v1');
    return {allowed:true,actorType:'workforce',source:'explicit_or_downward_inherited',sourceMembershipId:SCOPE,sourceScopeType:'branch',sourceRole:'manager',sourceBranchId:BRANCH,sourceDepartmentId:null,sourceTeamId:null};
  }));
  const explanation=await gateway.explainAccess(WORKSPACE,{scopeType:'team',branchId:null,departmentId:null,teamId:TEAM});
  assert.equal(explanation.allowed,true);
  assert.equal(explanation.sourceMembershipId,SCOPE);
  assert.equal(explanation.sourceScopeType,'branch');
});

test('workforce access claim without source membership is rejected',async()=>{
  const gateway=createOrganizationGateway(clientWith(()=>({allowed:true,actorType:'workforce',source:'explicit_or_downward_inherited',sourceMembershipId:null})));
  await assert.rejects(()=>gateway.explainAccess(WORKSPACE,{scopeType:'department',branchId:null,departmentId:DEPARTMENT,teamId:null}),(error:unknown)=>error instanceof DataAccessError);
});

test('owner access explanation is explicit and does not fabricate a scope membership',async()=>{
  const gateway=createOrganizationGateway(clientWith(()=>({allowed:true,actorType:'owner',source:'workspace_owner',sourceMembershipId:null})));
  const explanation=await gateway.explainAccess(WORKSPACE,{scopeType:'branch',branchId:BRANCH,departmentId:null,teamId:null});
  assert.equal(explanation.actorType,'owner');
  assert.equal(explanation.source,'workspace_owner');
  assert.equal(explanation.sourceMembershipId,null);
});

test('member validity window is validated before network',async()=>{
  let calls=0;
  const gateway=createOrganizationGateway(clientWith(()=>{calls+=1;return {};}));
  await assert.rejects(()=>gateway.setMember({workspaceId:WORKSPACE,userId:USER,status:'active',validUntil:'not-a-date'}),(error:unknown)=>error instanceof DataAccessError&&error.dataCode==='DATA_VALIDATION_FAILED');
  assert.equal(calls,0);
});
