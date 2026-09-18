import test from 'node:test';
import assert from 'node:assert/strict';
import {DataAccessError} from '../src/data/contracts/DataAccessError.ts';
import {createEngagementContractGateway} from '../src/features/engagements/engagementContractCommands.ts';

const W='11111111-1111-4111-8111-111111111111',I='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
const payload={schema:'enjaz.intake-contract-attention.v1',workspaceId:W,workspaceTimezone:'Asia/Baghdad',kind:'all',includeTerminal:false,generatedAt:'2026-09-18T05:00:00Z',items:[{id:I,kind:'intake_followup',authority:'intake_submissions',evidenceAuthority:'intake_followup_requests',canonicalId:C,title:'استكمال بيانات',state:'open',attentionState:'waiting_external',stale:false,mode:'secure_link',requestKind:'information',dueAt:'2026-09-19T05:00:00Z',decision:null,communicationEvidence:false,companyId:null,transactionId:null,contractRevisionId:null,sourceVersion:1,canonicalVersion:1,ownerSurface:'intake_review'}]};

test('unified attention calls projection RPC and parses staff-safe items',async()=>{
 let call:any=null;const client={rpc:(name:string,args:any)=>{call={name,args};return Promise.resolve({data:payload,error:null})}} as any;
 const out=await createEngagementContractGateway(client).listAttention(W);
 assert.equal(call.name,'list_unified_intake_contract_attention_v1');
 assert.deepEqual(call.args,{p_workspace_id:W,p_kind:'all',p_include_terminal:false,p_limit:200});
 assert.equal(out.items[0]?.kind,'intake_followup');assert.equal(out.items[0]?.ownerSurface,'intake_review');
});
test('filter and terminal options are carried to governed read RPC',async()=>{
 let args:any;const client={rpc:(_n:string,a:any)=>{args=a;return Promise.resolve({data:{...payload,kind:'contract_renewal',includeTerminal:true,items:[]},error:null})}} as any;
 await createEngagementContractGateway(client).listAttention(W,'contract_renewal',true,50);
 assert.equal(args.p_kind,'contract_renewal');assert.equal(args.p_include_terminal,true);assert.equal(args.p_limit,50);
});
test('invalid ids and limits fail before network',async()=>{
 let calls=0;const gateway=createEngagementContractGateway({rpc:()=>{calls++;return Promise.resolve({data:payload,error:null})} as any} as any);
 await assert.rejects(()=>gateway.listAttention('bad'),e=>e instanceof DataAccessError&&e.dataCode==='DATA_VALIDATION_FAILED');
 await assert.rejects(()=>gateway.listAttention(W,'all',false,501),e=>e instanceof DataAccessError&&e.dataCode==='DATA_VALIDATION_FAILED');
 assert.equal(calls,0);
});
test('malformed projection fails closed',async()=>{
 const client={rpc:()=>Promise.resolve({data:{...payload,items:[{...payload.items[0],ownerSurface:'shadow'}]},error:null})} as any;
 await assert.rejects(()=>createEngagementContractGateway(client).listAttention(W),e=>e instanceof DataAccessError);
});
