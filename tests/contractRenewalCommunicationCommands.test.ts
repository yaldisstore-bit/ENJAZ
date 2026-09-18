import test from 'node:test';
import assert from 'node:assert/strict';
import {createContractRenewalCommunicationGateway} from '../src/features/intake-contract-communication/contractRenewalCommunicationCommands.ts';

const W='11111111-1111-4111-8111-111111111111';
const RN='22222222-2222-4222-8222-222222222222';
const RV='33333333-3333-4333-8333-333333333333';
const OP1='44444444-4444-4444-8444-444444444444';
const OP2='55555555-5555-4555-8555-555555555555';
const CM='66666666-6666-4666-8666-666666666666';
const OC='77777777-7777-4777-8777-777777777777';

function clientFor(handler:(name:string,args:Readonly<Record<string,unknown>>)=>unknown){
  return {
    rpc(name:string,args:Readonly<Record<string,unknown>>){
      try{return Promise.resolve({data:handler(name,args),error:null})}
      catch(error){return Promise.resolve({data:null,error:{message:error instanceof Error?error.message:String(error)}})}
    }
  } as never;
}

test('bind renewal uses canonical governed provenance RPC with both versions',async()=>{
  const gateway=createContractRenewalCommunicationGateway(clientFor((name,args)=>{
    assert.equal(name,'bind_contract_renewal_provenance_v1');
    assert.deepEqual(args,{
      p_workspace_id:W,p_renewal_id:RN,p_contract_revision_id:RV,p_operation_id:OP1,
      p_expected_renewal_version:4,p_expected_revision_version:9
    });
    return {schema:'enjaz.contract-renewal-provenance.v1',renewalId:RN,contractRevisionId:RV,dueDate:'2027-01-31',renewalVersion:5,contractRevisionVersion:9,wasDuplicate:false};
  }));
  const result=await gateway.bindRenewal({workspaceId:W,renewalId:RN,contractRevisionId:RV,operationId:OP1,expectedRenewalVersion:4,expectedRevisionVersion:9});
  assert.equal(result.dueDate,'2027-01-31');
  assert.equal(result.renewalVersion,5);
});

test('communication evidence uses canonical M4 communication id only',async()=>{
  const gateway=createContractRenewalCommunicationGateway(clientFor((name,args)=>{
    assert.equal(name,'record_contract_renewal_communication_evidence_v1');
    assert.deepEqual(args,{p_workspace_id:W,p_operation_id:OP2,p_renewal_id:RN,p_contract_revision_id:RV,p_communication_id:CM});
    return {renewalId:RN,contractRevisionId:RV,communicationId:CM,outboundCommandId:OC,outboundStatus:'queued',approvalStatus:'not_required',wasDuplicate:false};
  }));
  const result=await gateway.recordCommunication({workspaceId:W,operationId:OP2,renewalId:RN,contractRevisionId:RV,communicationId:CM});
  assert.equal(result.communicationId,CM);
  assert.equal(result.outboundCommandId,OC);
});

test('invalid ids and versions fail before network',async()=>{
  let calls=0;
  const gateway=createContractRenewalCommunicationGateway(clientFor(()=>{calls++;return {}}));
  await assert.rejects(gateway.bindRenewal({workspaceId:'bad',renewalId:RN,contractRevisionId:RV,operationId:OP1,expectedRenewalVersion:4,expectedRevisionVersion:9}));
  await assert.rejects(gateway.bindRenewal({workspaceId:W,renewalId:RN,contractRevisionId:RV,operationId:OP1,expectedRenewalVersion:0,expectedRevisionVersion:9}));
  await assert.rejects(gateway.recordCommunication({workspaceId:W,operationId:'bad',renewalId:RN,contractRevisionId:RV,communicationId:CM}));
  assert.equal(calls,0);
});

test('duplicate renewal bind and communication evidence are preserved',async()=>{
  let n=0;
  const gateway=createContractRenewalCommunicationGateway(clientFor((name)=>{
    n++;
    if(name==='bind_contract_renewal_provenance_v1')return {schema:'enjaz.contract-renewal-provenance.v1',renewalId:RN,contractRevisionId:RV,dueDate:'2027-01-31',renewalVersion:5,contractRevisionVersion:9,wasDuplicate:true};
    return {renewalId:RN,contractRevisionId:RV,communicationId:CM,outboundCommandId:OC,outboundStatus:'queued',approvalStatus:'not_required',wasDuplicate:true};
  }));
  assert.equal((await gateway.bindRenewal({workspaceId:W,renewalId:RN,contractRevisionId:RV,operationId:OP1,expectedRenewalVersion:4,expectedRevisionVersion:9})).wasDuplicate,true);
  assert.equal((await gateway.recordCommunication({workspaceId:W,operationId:OP2,renewalId:RN,contractRevisionId:RV,communicationId:CM})).wasDuplicate,true);
  assert.equal(n,2);
});

test('malformed server renewal due date is rejected',async()=>{
  const gateway=createContractRenewalCommunicationGateway(clientFor(()=>({schema:'enjaz.contract-renewal-provenance.v1',renewalId:RN,contractRevisionId:RV,dueDate:'bad-date',renewalVersion:5,contractRevisionVersion:9,wasDuplicate:false})));
  await assert.rejects(gateway.bindRenewal({workspaceId:W,renewalId:RN,contractRevisionId:RV,operationId:OP1,expectedRenewalVersion:4,expectedRevisionVersion:9}));
});
