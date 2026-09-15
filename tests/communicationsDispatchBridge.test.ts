import test from 'node:test';
import assert from 'node:assert/strict';
import type { EnjazDataLayerFactory } from '../src/data/createDataLayer.ts';
import { CommunicationsHubCommandError } from '../src/features/communications/communicationsHubService.ts';
import { sendQueuedCommunication } from '../src/features/communications/communicationsDispatchBridge.ts';

const WORKSPACE='11111111-1111-4111-8111-111111111111';
const USER='22222222-2222-4222-8222-222222222222';
const COMMAND='33333333-3333-4333-8333-333333333333';

test('staff send calls the communications user edge function without browser internal key',async()=>{
  let called=false;
  const factory={
    async resolveWorkspaceId(userId:string){assert.equal(userId,USER);return WORKSPACE;},
    forWorkspace(){throw new Error('raw repositories forbidden');},
    async edge(name:string,init:RequestInit={}){
      called=true;
      assert.equal(name,'enjaz-communications-user');
      assert.deepEqual(JSON.parse(String(init.body)),{workspaceId:WORKSPACE,commandId:COMMAND});
      assert.equal(new Headers(init.headers).get('x-enjaz-communications-key'),null);
      return new Response(JSON.stringify({ok:true,dispatch:{status:'dispatched'}}),{status:200,headers:{'Content-Type':'application/json'}});
    },
  } as unknown as EnjazDataLayerFactory;
  await sendQueuedCommunication(factory,USER,COMMAND);
  assert.equal(called,true);
});

test('staff send fails closed when edge capability is unavailable',async()=>{
  const factory={async resolveWorkspaceId(){return WORKSPACE;},forWorkspace(){throw new Error('unused');}} as unknown as EnjazDataLayerFactory;
  await assert.rejects(()=>sendQueuedCommunication(factory,USER,COMMAND),(error:unknown)=>{
    assert.ok(error instanceof CommunicationsHubCommandError);
    assert.equal(error.code,'COMMUNICATIONS_EDGE_UNAVAILABLE');
    return true;
  });
});
