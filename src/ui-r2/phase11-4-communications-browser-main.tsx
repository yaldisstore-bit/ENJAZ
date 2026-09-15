import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { EnjazDataLayerFactory } from '../data/createDataLayer.ts';
import { DataLayerProvider } from '../data/react/DataLayerContext.tsx';
import { CurrentUserIdProvider } from '../shared/session/CurrentUserIdContext.tsx';
import { ConnectedCoreWorkRouter } from './core-work/CoreWorkConnected.tsx';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './core-work/core-work.css';

const WORKSPACE='11111111-1111-4111-8111-111111111111';
const USER='22222222-2222-4222-8222-222222222222';
const CONVERSATION='33333333-3333-4333-8333-333333333333';
const REVIEW_COMMUNICATION='44444444-4444-4444-8444-444444444444';
const FAILED_COMMUNICATION='55555555-5555-4555-8555-555555555555';
const RECON_COMMUNICATION='66666666-6666-4666-8666-666666666666';
const COMMAND='77777777-7777-4777-8777-777777777777';
const COMPANY='88888888-8888-4888-8888-888888888888';
const CONTACT='99999999-9999-4999-8999-999999999999';
const TRANSACTION='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

let read=false;
let retried=false;
let relinked=false;
let search='';

function hub(selectedConversationId:string|null){
  const matches=!search || 'شركة الرافدين أحمد معاملة تأسيس client reply unique incoming'.toLowerCase().includes(search.toLowerCase());
  const conversations=matches?[{
    id:CONVERSATION,subject:'مراسلات معاملة التأسيس',status:'open',companyId:COMPANY,companyLabel:'شركة الرافدين القانونية',contactId:CONTACT,contactLabel:'أحمد كريم',transactionId:TRANSACTION,transactionLabel:'معاملة تأسيس شركة',
    updatedAt:'2026-09-15T15:05:00.000Z',unreadCount:read?0:1,awaitingParty:'staff',unansweredSince:'2026-09-15T15:05:00.000Z',unansweredMinutes:315,slaBreached:true,
    transportStatus:'received',outboundStatus:null,approvalStatus:null,canRetry:false,needsReview:!relinked,needsAttention:!read||!relinked,
    latestMessage:{id:REVIEW_COMMUNICATION,channel:'email',direction:'incoming',summary:'Client reply unique incoming',subject:'المستندات المطلوبة',occurredAt:'2026-09-15T15:05:00.000Z',linkStatus:relinked?'linked':'review_required'},
  }]:[];
  const timeline=selectedConversationId===CONVERSATION?[
    {id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',channel:'whatsapp',direction:'incoming',subject:null,bodyText:'مرحباً، أرسلت المستندات المطلوبة وأحتاج تأكيد الاستلام.',summary:'المستندات وصلت',occurredAt:'2026-09-15T14:40:00.000Z',linkStatus:'linked',linkVersion:1,transportStatus:'received',transportErrorCode:null,outboundCommandId:null,outboundStatus:null,approvalStatus:null,outboundVersion:null,canRetry:false,attachmentCount:2},
    {id:FAILED_COMMUNICATION,channel:'sms',direction:'outgoing',subject:null,bodyText:'تم استلام المستندات وسنراجعها اليوم.',summary:'تأكيد الاستلام',occurredAt:'2026-09-15T14:45:00.000Z',linkStatus:'linked',linkVersion:1,transportStatus:retried?'queued':'failed',transportErrorCode:retried?null:'PROVIDER_REJECTED',outboundCommandId:COMMAND,outboundStatus:retried?'queued':'failed',approvalStatus:'not_required',outboundVersion:retried?4:3,canRetry:!retried,attachmentCount:0},
    {id:RECON_COMMUNICATION,channel:'email',direction:'outgoing',subject:'نسخة المستند',bodyText:'هذه نسخة المستند المرسل سابقاً.',summary:'مستند مرسل',occurredAt:'2026-09-15T14:50:00.000Z',linkStatus:'linked',linkVersion:1,transportStatus:'failed',transportErrorCode:'NETWORK_TIMEOUT',outboundCommandId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',outboundStatus:'reconciliation_required',approvalStatus:'not_required',outboundVersion:5,canRetry:false,attachmentCount:1},
    {id:REVIEW_COMMUNICATION,channel:'email',direction:'incoming',subject:'المستندات المطلوبة',bodyText:'Client reply unique incoming — هل يمكن ربط هذه الرسالة بمعاملة التأسيس؟',summary:'Client reply unique incoming',occurredAt:'2026-09-15T15:05:00.000Z',linkStatus:relinked?'linked':'review_required',linkVersion:relinked?3:2,transportStatus:'received',transportErrorCode:null,outboundCommandId:null,outboundStatus:null,approvalStatus:null,outboundVersion:null,canRetry:false,attachmentCount:0},
  ]:[];
  return {
    workspaceId:WORKSPACE,actorUserId:USER,canGovern:true,query:search||null,selectedConversationId,
    summary:{conversationCount:1,unreadCount:read?0:1,reviewCount:relinked?0:1,failedCount:retried?0:1,reconciliationCount:1,awaitingApprovalCount:0,slaMinutes:240},
    providerAccounts:[{id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',channel:'email',provider:'resend',displayName:'البريد الرسمي',capabilities:['send','receive'],enabled:true}],
    conversations,timeline,
    reviewQueue:relinked?[]:[{communicationId:REVIEW_COMMUNICATION,conversationId:CONVERSATION,channel:'email',subject:'المستندات المطلوبة',summary:'Client reply unique incoming',occurredAt:'2026-09-15T15:05:00.000Z',linkStatus:'review_required',linkVersion:2}],
  };
}

const factory=Object.freeze({
  async resolveWorkspaceId(userId:string){if(userId!==USER)throw new Error('Unexpected browser user');return WORKSPACE;},
  forWorkspace(){throw new Error('Phase 11.4-D browser certificate must not use raw repositories');},
  async rpc(functionName:string,args:Record<string,unknown>={}){
    if(args.p_workspace_id!==WORKSPACE)return {data:null,error:{message:'ENJAZ_COMMUNICATION_WORKSPACE_FORBIDDEN'}};
    if(functionName==='get_communications_hub_v1'){
      search=typeof args.p_query==='string'?args.p_query:'';
      return {data:hub(typeof args.p_conversation_id==='string'?args.p_conversation_id:null),error:null};
    }
    if(functionName==='mark_communication_conversation_read_v1'){
      if(args.p_conversation_id!==CONVERSATION)return {data:null,error:{message:'ENJAZ_COMMUNICATION_CONVERSATION_NOT_FOUND'}};
      read=true;return {data:{conversationId:CONVERSATION,lastReadAt:new Date().toISOString(),version:1},error:null};
    }
    if(functionName==='retry_communication_outbound_v1'){
      if(args.p_command_id!==COMMAND)return {data:null,error:{message:'ENJAZ_COMMUNICATION_RETRY_RECONCILIATION_REQUIRED'}};
      retried=true;return {data:{commandId:COMMAND,status:'queued',attemptNo:2,version:4},error:null};
    }
    if(functionName==='relink_communication_v1'){
      if(args.p_communication_id!==REVIEW_COMMUNICATION||args.p_expected_version!==2)return {data:null,error:{message:'ENJAZ_COMMUNICATION_RELINK_STALE'}};
      relinked=true;return {data:{communicationId:REVIEW_COMMUNICATION,conversationId:CONVERSATION,linkStatus:'linked',linkVersion:3},error:null};
    }
    return {data:null,error:{message:`Unexpected RPC ${functionName}`}};
  },
}) as unknown as EnjazDataLayerFactory;

function BrowserApp(){
  return <>{ConnectedCoreWorkRouter({destinationId:'communications',transactionId:null,navigate(){},openTransaction(){}})}</>;
}

const root=document.getElementById('phase11-4-communications-root');
if(!root)throw new Error('Phase 11.4-D communications browser root missing');

createRoot(root).render(
  <StrictMode>
    <DataLayerProvider factory={factory}>
      <CurrentUserIdProvider userId={USER}>
        <main className="ez-r2-root r2-shell__main" dir="rtl"><BrowserApp /></main>
      </CurrentUserIdProvider>
    </DataLayerProvider>
  </StrictMode>,
);
