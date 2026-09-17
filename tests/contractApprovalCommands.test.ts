import test from 'node:test';
import assert from 'node:assert/strict';
import {createContractApprovalGateway} from '../src/features/intake-contract-communication/contractApprovalCommands.ts';

const W='11111111-1111-4111-8111-111111111111';
const RQ='22222222-2222-4222-8222-222222222222';
const RV='33333333-3333-4333-8333-333333333333';
const RS='44444444-4444-4444-8444-444444444444';
const OP='55555555-5555-4555-8555-555555555555';

function clientFor(handler:(name:string,args:Readonly<Record<string,unknown>>)=>unknown){
  return {
    rpc(name:string,args:Readonly<Record<string,unknown>>){
      try{return Promise.resolve({data:handler(name,args),error:null})}
      catch(error){return Promise.resolve({data:null,error:{message:error instanceof Error?error.message:String(error)}})}
    }
  } as never;
}

test('bind uses only governed C2 RPC with expected revision version',async()=>{
  let calls=0;
  const gateway=createContractApprovalGateway(clientFor((name,args)=>{
    calls++;
    assert.equal(name,'bind_client_contract_approval_v1');
    assert.deepEqual(args,{p_workspace_id:W,p_request_id:RQ,p_revision_id:RV,p_expected_revision_version:7});
    return {requestId:RQ,revisionId:RV,revisionVersionAtIssue:7,reconciled:false,wasDuplicate:false};
  }));
  const result=await gateway.bind({workspaceId:W,requestId:RQ,revisionId:RV,expectedRevisionVersion:7});
  assert.equal(calls,1);
  assert.equal(result.revisionVersionAtIssue,7);
  assert.equal(result.reconciled,false);
});

test('reconcile carries response, operation and expected version to governed RPC',async()=>{
  const gateway=createContractApprovalGateway(clientFor((name,args)=>{
    assert.equal(name,'reconcile_client_contract_approval_v1');
    assert.deepEqual(args,{p_workspace_id:W,p_request_id:RQ,p_response_id:RS,p_operation_id:OP,p_expected_revision_version:7});
    return {requestId:RQ,responseId:RS,revisionId:RV,decision:'approved',status:'approved',version:8,wasDuplicate:false};
  }));
  const result=await gateway.reconcile({workspaceId:W,requestId:RQ,responseId:RS,operationId:OP,expectedRevisionVersion:7});
  assert.equal(result.decision,'approved');
  assert.equal(result.status,'approved');
  assert.equal(result.version,8);
});

test('rejected client decision can only parse as M16 draft return',async()=>{
  const gateway=createContractApprovalGateway(clientFor(()=>({
    requestId:RQ,responseId:RS,revisionId:RV,decision:'rejected',status:'draft',version:8,wasDuplicate:false
  })));
  const result=await gateway.reconcile({workspaceId:W,requestId:RQ,responseId:RS,operationId:OP,expectedRevisionVersion:7});
  assert.equal(result.status,'draft');
});

test('decision/status mismatch is rejected',async()=>{
  const gateway=createContractApprovalGateway(clientFor(()=>({
    requestId:RQ,responseId:RS,revisionId:RV,decision:'rejected',status:'approved',version:8,wasDuplicate:false
  })));
  await assert.rejects(
    gateway.reconcile({workspaceId:W,requestId:RQ,responseId:RS,operationId:OP,expectedRevisionVersion:7}),
    /Invalid contract approval bridge data/
  );
});

test('invalid ids and versions fail before network',async()=>{
  let calls=0;
  const gateway=createContractApprovalGateway(clientFor(()=>{calls++;return {}}));
  await assert.rejects(gateway.bind({workspaceId:'bad',requestId:RQ,revisionId:RV,expectedRevisionVersion:7}));
  await assert.rejects(gateway.bind({workspaceId:W,requestId:RQ,revisionId:RV,expectedRevisionVersion:0}));
  await assert.rejects(gateway.reconcile({workspaceId:W,requestId:RQ,responseId:RS,operationId:'bad',expectedRevisionVersion:7}));
  assert.equal(calls,0);
});

test('idempotent duplicate result is preserved',async()=>{
  const gateway=createContractApprovalGateway(clientFor(()=>({
    requestId:RQ,responseId:RS,revisionId:RV,decision:'approved',status:'approved',version:8,wasDuplicate:true
  })));
  const result=await gateway.reconcile({workspaceId:W,requestId:RQ,responseId:RS,operationId:OP,expectedRevisionVersion:7});
  assert.equal(result.wasDuplicate,true);
});
