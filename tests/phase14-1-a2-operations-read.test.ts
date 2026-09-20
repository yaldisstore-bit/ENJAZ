import test from 'node:test';
import assert from 'node:assert/strict';
import type { CrossDomainJourneyReadProof } from '../src/features/journeys/crossDomainJourneyReadProof.ts';
import {
  verifyCrossDomainOperationsRead, CrossDomainOperationsProofError,
  type CrossDomainOperationsReaders,
} from '../src/features/journeys/crossDomainJourneyOperationsProof.ts';

const W='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const T='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const V='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const E='ffffffff-ffff-4fff-8fff-ffffffffffff';
const R='11111111-1111-4111-8111-111111111111';
const source=():CrossDomainJourneyReadProof=>({
  workspaceId:W, company:{id:C}, transaction:{id:T},
  procedures:[],followups:[],payments:[],reversals:[],documents:[],
  proofKind:'AUTHENTICATED_INTERNAL_READ_ONLY',
  atomicMultiDomainSnapshotCertified:false,clientVisibilityCertified:false,
}) as unknown as CrossDomainJourneyReadProof;
const assignment=(patch:Record<string,unknown>={})=>({id:A,transactionId:T,assignedUserId:W,...patch});
const visit=(patch:Record<string,unknown>={})=>({id:V,transactionId:T,assignmentId:A,...patch});
const engagement=(patch:Record<string,unknown>={})=>({id:E,companyId:C,transactionIds:[T],...patch});
const revision=(patch:Record<string,unknown>={})=>({
  id:R,workspaceId:W,engagementId:E,revision:1,supersedesRevision:null,...patch,
});
type Options={
  field?:Record<string,unknown>;gov?:Record<string,unknown>;finance?:Record<string,unknown>;
  revisions?:readonly Record<string,unknown>[];calls?:string[];
};
function gateway(x:Options={}):CrossDomainOperationsReaders {
  const calls=x.calls??[];
  return {
    field:{ async loadContext(ws:string){
      calls.push('field:'+ws);
      return {
        authority:'field_assignments_visits_evidence_receipts',
        transactionWriteAuthority:'none',financeWriteAuthority:'none',
        assignments:[assignment()],visits:[visit()],...x.field,
      };
    } },
    governance:{ async loadContext(ws:string,companyId:string){
      calls.push('governance:'+ws+':'+companyId);
      return {companyId:C,...x.gov};
    } },
    finance:{ async loadContext(ws:string){
      calls.push('finance:'+ws);
      return {engagements:[engagement()],...x.finance};
    } },
    contracts:{ async list(ws:string,engagementId:string){
      calls.push('contracts:'+ws+':'+engagementId);
      return x.revisions??[revision()];
    } },
  } as unknown as CrossDomainOperationsReaders;
}
const reason=(code:CrossDomainOperationsProofError['reason'])=>
  (error:unknown)=>error instanceof CrossDomainOperationsProofError&&error.reason===code;

test('A2 joins existing field/governance/engagement/contract READ gateways without write authority',async()=>{
  const calls:string[]=[];
  const proof=await verifyCrossDomainOperationsRead(source(),gateway({calls}));
  assert.equal(proof.linkedAssignmentCount,1);
  assert.equal(proof.linkedVisitCount,1);
  assert.equal(proof.linkedEngagementCount,1);
  assert.equal(proof.linkedContractRevisionCount,1);
  assert.equal(proof.governanceObserved,true);
  assert.equal(proof.governanceActionAuthorized,false);
  assert.equal(proof.fieldActionAuthorized,false);
  assert.equal(proof.engagementSignatureCertified,false);
  assert.equal(proof.durableMultiDomainJourneyCertified,false);
  assert.ok(calls.includes('field:'+W));
  assert.ok(calls.includes('governance:'+W+':'+C));
  assert.ok(calls.includes('finance:'+W));
  assert.ok(calls.includes('contracts:'+W+':'+E));
  assert.ok(!calls.some(c=>/create|update|delete|write|transition/i.test(c)));
});

test('A2 denies a field gateway that manufactures finance or transaction writes',async()=>{
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    field:{transactionWriteAuthority:'unrestricted'},
  })),reason('FIELD_AUTHORITY'));
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    field:{financeWriteAuthority:'generic_write'},
  })),reason('FIELD_AUTHORITY'));
});

test('A2 denies governance context belonging to another company',async()=>{
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    gov:{companyId:W},
  })),reason('GOVERNANCE_LINK_DRIFT'));
});

test('A2 denies a field visit assigned to a different transaction or orphan assignment',async()=>{
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    field:{visits:[visit({transactionId:C})]},
  })),reason('FIELD_LINK_DRIFT'));
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    field:{visits:[visit({assignmentId:C})]},
  })),reason('FIELD_LINK_DRIFT'));
});

test('A2 rejects duplicate assignment and visit identities',async()=>{
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    field:{assignments:[assignment(),assignment()]},
  })),reason('FIELD_DUPLICATE'));
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    field:{visits:[visit(),visit()]},
  })),reason('FIELD_DUPLICATE'));
});

test('A2 retainer and contracts cannot join another company or workspace',async()=>{
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    finance:{engagements:[engagement({companyId:W})]},
  })),reason('ENGAGEMENT_LINK_DRIFT'));
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    revisions:[revision({workspaceId:C})],
  })),reason('CONTRACT_LINK_DRIFT'));
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    revisions:[revision({engagementId:W})],
  })),reason('CONTRACT_LINK_DRIFT'));
});

test('A2 duplicate and non-causal contract revisions are rejected; optional engagement is not inferred',async()=>{
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    revisions:[revision(),revision({id:C})],
  })),reason('CONTRACT_DUPLICATE'));
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    revisions:[revision({revision:2,supersedesRevision:2})],
  })),reason('CONTRACT_LINK_DRIFT'));
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    revisions:[revision({revision:2,supersedesRevision:1})],
  })),reason('CONTRACT_LINK_DRIFT'));
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    revisions:[revision(),revision({id:C,revision:3,supersedesRevision:2})],
  })),reason('CONTRACT_LINK_DRIFT'));
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    revisions:[revision(),revision({id:C,revision:3,supersedesRevision:1})],
  })),reason('CONTRACT_LINK_DRIFT'));
  const complete=await verifyCrossDomainOperationsRead(source(),gateway({
    revisions:[revision({id:C,revision:2,supersedesRevision:1}),revision({status:'superseded'})],
  }));
  assert.equal(complete.linkedContractRevisionCount,2);
  await assert.rejects(verifyCrossDomainOperationsRead(source(),gateway({
    revisions:[revision({status:'effective'}),revision({id:C,revision:2,supersedesRevision:1,status:'draft'})],
  })),reason('CONTRACT_LINK_DRIFT'));
  const formallySuperseded=await verifyCrossDomainOperationsRead(source(),gateway({
    revisions:[revision({status:'superseded'}),revision({id:C,revision:2,supersedesRevision:1,status:'draft'})],
  }));
  assert.equal(formallySuperseded.linkedContractRevisionCount,2);
  const calls:string[]=[];
  const empty=await verifyCrossDomainOperationsRead(source(),gateway({
    finance:{engagements:[]},field:{assignments:[],visits:[]},calls,
  }));
  assert.equal(empty.linkedEngagementCount,0);
  assert.equal(empty.linkedContractRevisionCount,0);
  assert.ok(!calls.some(c=>c.startsWith('contracts:')));
});
