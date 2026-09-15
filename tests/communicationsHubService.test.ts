import test from 'node:test';
import assert from 'node:assert/strict';
import type { EnjazDataLayerFactory } from '../src/data/createDataLayer.ts';
import {
  CommunicationsHubCommandError,
  loadCommunicationsHub,
  markCommunicationConversationRead,
  relinkCommunicationToConversation,
  retryCommunicationOutbound,
  type CommunicationConversation,
  type CommunicationReviewItem,
} from '../src/features/communications/communicationsHubService.ts';

const WORKSPACE='11111111-1111-4111-8111-111111111111';
const USER='22222222-2222-4222-8222-222222222222';
const CONVERSATION='33333333-3333-4333-8333-333333333333';
const COMMUNICATION='44444444-4444-4444-8444-444444444444';
const COMMAND='55555555-5555-4555-8555-555555555555';

function snapshot(){
  return {
    workspaceId:WORKSPACE,actorUserId:USER,canGovern:true,query:null,selectedConversationId:CONVERSATION,
    summary:{conversationCount:1,unreadCount:1,reviewCount:1,failedCount:1,reconciliationCount:0,awaitingApprovalCount:0,slaMinutes:240},
    providerAccounts:[{id:'66666666-6666-4666-8666-666666666666',channel:'email',provider:'resend',displayName:'Email',capabilities:['send','receive'],enabled:true}],
    conversations:[{
      id:CONVERSATION,subject:'Client case',status:'open',companyId:null,companyLabel:'ACME',contactId:null,contactLabel:'Client',transactionId:null,transactionLabel:null,
      updatedAt:'2026-09-15T12:00:00Z',unreadCount:1,awaitingParty:'staff',unansweredSince:'2026-09-15T12:00:00Z',unansweredMinutes:300,slaBreached:true,
      transportStatus:'received',outboundStatus:null,approvalStatus:null,canRetry:false,needsReview:true,needsAttention:true,
      latestMessage:{id:COMMUNICATION,channel:'email',direction:'incoming',summary:'Need answer',subject:'Hello',occurredAt:'2026-09-15T12:00:00Z',linkStatus:'review_required'},
    }],
    timeline:[{
      id:COMMUNICATION,channel:'email',direction:'incoming',subject:'Hello',bodyText:'Need answer now',summary:'Need answer',occurredAt:'2026-09-15T12:00:00Z',
      linkStatus:'review_required',linkVersion:2,transportStatus:'received',transportErrorCode:null,outboundCommandId:null,outboundStatus:null,approvalStatus:null,outboundVersion:null,canRetry:false,attachmentCount:1,
    }],
    reviewQueue:[{communicationId:COMMUNICATION,conversationId:CONVERSATION,channel:'email',subject:'Hello',summary:'Need answer',occurredAt:'2026-09-15T12:00:00Z',linkStatus:'review_required',linkVersion:2}],
  };
}

type Call={name:string;args:Record<string,unknown>};
function factory(handler:(call:Call)=>Promise<{data:unknown|null;error:unknown|null}>):{factory:EnjazDataLayerFactory;calls:Call[]}{
  const calls:Call[]=[];
  const value={
    async resolveWorkspaceId(userId:string){assert.equal(userId,USER);return WORKSPACE;},
    forWorkspace(){throw new Error('raw repositories must not be used by communications hub service');},
    async rpc(name:string,args:Record<string,unknown>={}){const call={name,args};calls.push(call);return handler(call);},
  } as unknown as EnjazDataLayerFactory;
  return {factory:value,calls};
}

test('loads canonical communications hub through governed RPC only',async()=>{
  const f=factory(async(call)=>({data:call.name==='get_communications_hub_v1'?snapshot():null,error:null}));
  const hub=await loadCommunicationsHub(f.factory,USER,' Need Answer ',CONVERSATION);
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0]?.name,'get_communications_hub_v1');
  assert.deepEqual(f.calls[0]?.args,{p_workspace_id:WORKSPACE,p_query:'Need Answer',p_conversation_id:CONVERSATION,p_limit:60});
  assert.equal(hub.conversations[0]?.awaitingParty,'staff');
  assert.equal(hub.conversations[0]?.slaBreached,true);
  assert.equal(hub.timeline[0]?.bodyText,'Need answer now');
  assert.equal(hub.reviewQueue[0]?.linkVersion,2);
  assert.equal(hub.providerAccounts[0]?.provider,'resend');
});

test('mark-read uses governed cursor command instead of direct table mutation',async()=>{
  const f=factory(async()=>({data:{conversationId:CONVERSATION,lastReadAt:'2026-09-15T13:00:00Z',version:1},error:null}));
  await markCommunicationConversationRead(f.factory,USER,CONVERSATION);
  assert.equal(f.calls[0]?.name,'mark_communication_conversation_read_v1');
  assert.equal(f.calls[0]?.args.p_expected_version,null);
});

test('safe retry forwards optimistic command version',async()=>{
  const f=factory(async()=>({data:{commandId:COMMAND,status:'queued',attemptNo:2,version:4},error:null}));
  await retryCommunicationOutbound(f.factory,USER,COMMAND,3);
  assert.deepEqual(f.calls[0],{name:'retry_communication_outbound_v1',args:{p_workspace_id:WORKSPACE,p_command_id:COMMAND,p_expected_version:3}});
});

test('reconciliation-required error is preserved as a governed command error',async()=>{
  const f=factory(async()=>({data:null,error:{message:'ENJAZ_COMMUNICATION_RETRY_RECONCILIATION_REQUIRED'}}));
  await assert.rejects(()=>retryCommunicationOutbound(f.factory,USER,COMMAND,3),(error:unknown)=>{
    assert.ok(error instanceof CommunicationsHubCommandError);
    assert.equal(error.code,'ENJAZ_COMMUNICATION_RETRY_RECONCILIATION_REQUIRED');
    return true;
  });
});

test('manual relink forwards exact target authority and optimistic link version',async()=>{
  const f=factory(async()=>({data:{communicationId:COMMUNICATION,linkVersion:3},error:null}));
  const review:CommunicationReviewItem={communicationId:COMMUNICATION,conversationId:null,channel:'email',subject:'Hello',summary:'Need answer',occurredAt:'2026-09-15T12:00:00Z',linkStatus:'review_required',linkVersion:2};
  const target:CommunicationConversation={id:CONVERSATION,subject:'Target',status:'open',companyId:'77777777-7777-4777-8777-777777777777',companyLabel:'ACME',contactId:'88888888-8888-4888-8888-888888888888',contactLabel:'Client',transactionId:'99999999-9999-4999-8999-999999999999',transactionLabel:'Case',updatedAt:'2026-09-15T12:00:00Z',latestMessage:null,unreadCount:0,awaitingParty:null,unansweredSince:null,unansweredMinutes:null,slaBreached:false,transportStatus:null,outboundStatus:null,approvalStatus:null,canRetry:false,needsReview:false,needsAttention:false};
  await relinkCommunicationToConversation(f.factory,USER,review,target,'manual review');
  assert.equal(f.calls[0]?.name,'relink_communication_v1');
  assert.equal(f.calls[0]?.args.p_expected_version,2);
  assert.equal(f.calls[0]?.args.p_conversation_id,CONVERSATION);
  assert.equal(f.calls[0]?.args.p_company_id,target.companyId);
  assert.equal(f.calls[0]?.args.p_contact_id,target.contactId);
  assert.equal(f.calls[0]?.args.p_transaction_id,target.transactionId);
});
