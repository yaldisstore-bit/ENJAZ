import test from 'node:test';
import assert from 'node:assert/strict';
import {DataAccessError} from '../src/data/contracts/DataAccessError.ts';
import {createEngagementContractGateway} from '../src/features/engagements/engagementContractCommands.ts';

const W='11111111-1111-4111-8111-111111111111',I='22222222-2222-4222-8222-222222222222';
const item={id:I,title:'استكمال بيانات',kindLabel:'استكمال بيانات',attentionLabel:'بانتظار الطرف الخارجي',stale:false,dueAt:'2026-09-19T05:00:00Z',decisionLabel:null,communicationEvidence:false,ownerPath:null};
const payload={schema:'enjaz.intake-contract-attention.v1',items:[item]};

test('unified attention uses the fixed governed projection',async()=>{
 let call:any=null;const client={rpc:(name:string,args:any)=>{call={name,args};return Promise.resolve({data:payload,error:null})}} as any;
 const out=await createEngagementContractGateway(client).listAttention(W);
 assert.equal(call.name,'list_unified_intake_contract_attention_v1');
 assert.deepEqual(call.args,{p_workspace_id:W,p_kind:'all',p_include_terminal:true,p_limit:200});
 assert.equal(out[0]?.kindLabel,'استكمال بيانات');
});
test('invalid workspace fails before network',async()=>{
 let calls=0;const client={rpc:()=>{calls++;return Promise.resolve({data:payload,error:null})}} as any;
 await assert.rejects(()=>createEngagementContractGateway(client).listAttention('bad'),e=>e instanceof DataAccessError&&e.dataCode==='DATA_VALIDATION_FAILED');
 assert.equal(calls,0);
});
test('malformed presentation paths fail closed',async()=>{
 const client={rpc:()=>Promise.resolve({data:{...payload,items:[{...item,ownerPath:'/shadow'}]},error:null})} as any;
 await assert.rejects(()=>createEngagementContractGateway(client).listAttention(W),e=>e instanceof DataAccessError);
});
test('malformed projection schema fails closed',async()=>{
 const client={rpc:()=>Promise.resolve({data:{...payload,schema:'shadow'},error:null})} as any;
 await assert.rejects(()=>createEngagementContractGateway(client).listAttention(W),e=>e instanceof DataAccessError);
});
