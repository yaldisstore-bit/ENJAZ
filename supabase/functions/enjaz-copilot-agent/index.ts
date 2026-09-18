import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.114.0';
import {
  AGENT_PLAN_SCHEMA,agentPayloadHash,buildAgentPlan,errorAgentEnvelope,parseAgentReferences,parseAgentRequest,
  successAgentEnvelope,type AgentOperation,type AgentRequest,
} from './core.ts';
import {
  AGENT_APPROVAL_SCHEMA,agentProposalHash,approvalDbDecision,approvalPayloadHash,approvalResult,
  approvalTraceOperation,parseAgentApprovalRequest,type AgentApprovalRequest,
} from './approval.ts';
import {
  AGENT_ACTION_SCHEMA,actionProposalHash,actionTracePayloadHash,isAgentActionOperation,parseAgentActionRequest,
  parseExecutionResult,preparedCreateActionResult,preparedDocumentRequestResult,preparedReminderActionResult,preparedSnoozeActionResult,type AgentActionRequest,
} from './action.ts';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization,content-type,x-client-info,apikey',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Cache-Control':'no-store',
};
type J=Record<string,unknown>;
type TraceStatus='completed'|'provider_unavailable'|'failed';

function json(status:number,body:unknown){
  return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
}
function text(v:unknown){return typeof v==='string'?v:''}
function record(v:unknown):J{
  if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('COPILOT_BOUNDARY_INVALID');
  return v as J;
}
function publicKey(){
  const modern=Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if(modern)try{const row=JSON.parse(modern) as Record<string,string>;if(row.default)return row.default}catch{}
  const legacy=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if(legacy)return legacy;
  throw new Error('SERVER_PUBLIC_KEY_UNAVAILABLE');
}
function serviceKey(){
  const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(legacy)return legacy;
  const direct=Deno.env.get('SUPABASE_SECRET_KEY');
  if(direct)return direct;
  const modern=Deno.env.get('SUPABASE_SECRET_KEYS');
  if(modern)try{const row=JSON.parse(modern) as Record<string,string>;if(row.default)return row.default}catch{}
  throw new Error('SERVER_SERVICE_KEY_UNAVAILABLE');
}
function uuidOrNull(v:unknown){const s=text(v);return /^[0-9a-f-]{36}$/i.test(s)?s:null}
function errorText(error:unknown){
  if(!error||typeof error!=='object')return '';
  const row=error as Record<string,unknown>;
  return `${text(row.message)} ${text(row.details)} ${text(row.hint)} ${text(row.code)}`;
}
const DB_CODES=[
  'ENJAZ_COPILOT_WORKSPACE_FORBIDDEN','ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT','ENJAZ_COPILOT_PROPOSAL_CONFLICT',
  'ENJAZ_COPILOT_APPROVAL_EXPIRY_INVALID','ENJAZ_COPILOT_PROPOSAL_NOT_FOUND','ENJAZ_COPILOT_PROPOSAL_ACTOR_FORBIDDEN',
  'ENJAZ_COPILOT_PROPOSAL_HASH_CONFLICT','ENJAZ_COPILOT_APPROVAL_CONFLICT','ENJAZ_COPILOT_APPROVAL_REPLAY_CONFLICT',
  'ENJAZ_COPILOT_APPROVAL_EXPIRED','ENJAZ_COPILOT_APPROVAL_DECISION_INVALID','ENJAZ_COPILOT_PROPOSAL_HASH_INVALID',
  'ENJAZ_COPILOT_ACTION_HASH_CONFLICT','ENJAZ_COPILOT_ACTION_PROPOSAL_CONFLICT','ENJAZ_COPILOT_ACTION_KIND_CONFLICT',
  'ENJAZ_COPILOT_ACTION_APPROVAL_REQUIRED','ENJAZ_COPILOT_EXECUTION_REPLAY_CONFLICT','ENJAZ_COPILOT_ACTION_SNOOZE_STALE',
  'ENJAZ_COPILOT_ACTION_SNOOZE_INVALID','ENJAZ_FOLLOWUP_AUTH_REQUIRED','ENJAZ_FOLLOWUP_WORKSPACE_FORBIDDEN',
  'ENJAZ_FOLLOWUP_NOT_FOUND','ENJAZ_FOLLOWUP_TERMINAL_FINAL','ENJAZ_FOLLOWUP_SNOOZE_NOT_FUTURE',
  'ENJAZ_FOLLOWUP_TRANSACTION_INVALID','ENJAZ_FOLLOWUP_ID_REQUIRED','ENJAZ_FOLLOWUP_TITLE_INVALID','ENJAZ_FOLLOWUP_DUE_AT_REQUIRED','ENJAZ_FOLLOWUP_IDEMPOTENCY_CONFLICT',
  'ENJAZ_COPILOT_ACTION_TITLE_INVALID','ENJAZ_COPILOT_ACTION_DUE_AT_INVALID','ENJAZ_COPILOT_ACTION_DUE_AT_STALE',
  'ENJAZ_COPILOT_REMINDER_SOURCE_KIND_INVALID','ENJAZ_COPILOT_REMINDER_SCHEDULE_INVALID','ENJAZ_COPILOT_REMINDER_SCHEDULE_STALE',
  'ENJAZ_SCHEDULING_ATTENTION_INVALID','ENJAZ_SCHEDULING_ATTENTION_RECIPIENT_INVALID','ENJAZ_SCHEDULING_DEADLINE_NOT_FOUND',
  'ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_NOT_FOUND','ENJAZ_SCHEDULING_ATTENTION_SOURCE_TERMINAL',
  'ENJAZ_SCHEDULING_REMINDER_SCHEDULE_INVALID','ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT',
  'ENJAZ_COPILOT_DOCUMENT_REQUEST_STALE',
  'ENJAZ_PORTAL_AUTH_REQUIRED','ENJAZ_PORTAL_OWNER_REQUIRED','ENJAZ_PORTAL_WORKSPACE_FORBIDDEN',
  'ENJAZ_PORTAL_PRINCIPAL_NOT_GRANTABLE','ENJAZ_PORTAL_SHARE_PRINCIPAL_INVALID','ENJAZ_PORTAL_SHARE_STAFF_COLLISION','ENJAZ_PORTAL_REQUEST_PERMISSION_REQUIRED',
  'ENJAZ_PORTAL_REQUEST_ID_INVALID','ENJAZ_PORTAL_REQUEST_TYPE_INVALID','ENJAZ_PORTAL_REQUEST_TITLE_INVALID',
  'ENJAZ_PORTAL_REQUEST_INSTRUCTIONS_INVALID','ENJAZ_PORTAL_REQUEST_TRANSACTION_INVALID','ENJAZ_PORTAL_REQUEST_VALIDITY_INVALID',
  'ENJAZ_PORTAL_REQUEST_ID_CONFLICT','ENJAZ_PORTAL_REQUEST_REVOKED','ENJAZ_PORTAL_REQUEST_NOT_OPEN',
  'ENJAZ_PORTAL_REQUEST_CREATE_VERSION_INVALID','ENJAZ_PORTAL_REQUEST_EXPECTED_VERSION_REQUIRED',
    'ENJAZ_PORTAL_SHARE_PRINCIPAL_INVALID','ENJAZ_PORTAL_SHARE_STAFF_COLLISION','ENJAZ_PORTAL_REQUEST_STALE',
  'ENJAZ_PORTAL_REQUEST_NOT_FOUND',
] as const;
function dbCode(error:unknown){
  const message=errorText(error);
  for(const code of DB_CODES)if(message.includes(code))return code;
  return 'COPILOT_BOUNDARY_FAILED';
}
function sourceCode(error:unknown){
  const message=errorText(error).toUpperCase();
  if(message.includes('FORBIDDEN')||message.includes('AUTH_REQUIRED')||message.includes('INSUFFICIENT'))return 'CONTEXT_SOURCE_FORBIDDEN';
  return 'CONTEXT_SOURCE_UNAVAILABLE';
}
function safeError(code:string){
  const retryable=code==='CONTEXT_SOURCE_UNAVAILABLE'||code==='ENJAZ_COPILOT_RATE_LIMITED';
  const messages:Record<string,string>={
    AUTH_REQUIRED:'Authentication is required.',
    AUTH_INVALID:'Authentication is invalid.',
    ENJAZ_COPILOT_WORKSPACE_FORBIDDEN:'Workspace access is not allowed.',
    ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT:'Request id was already used with different input.',
    ENJAZ_COPILOT_PROPOSAL_CONFLICT:'Proposal request conflicts with existing evidence.',
    ENJAZ_COPILOT_PROPOSAL_NOT_FOUND:'Proposal evidence was not found.',
    ENJAZ_COPILOT_PROPOSAL_ACTOR_FORBIDDEN:'Proposal approval is bound to another actor.',
    ENJAZ_COPILOT_PROPOSAL_HASH_CONFLICT:'Proposal digest does not match the registered proposal.',
    ENJAZ_COPILOT_APPROVAL_CONFLICT:'Proposal already has a conflicting decision.',
    ENJAZ_COPILOT_APPROVAL_REPLAY_CONFLICT:'Approval decision key was already used.',
    ENJAZ_COPILOT_APPROVAL_EXPIRED:'Proposal approval window has expired.',
    ENJAZ_COPILOT_ACTION_HASH_CONFLICT:'Action digest does not match the exact stored action.',
    ENJAZ_COPILOT_ACTION_PROPOSAL_CONFLICT:'Action proposal conflicts with existing evidence.',
    ENJAZ_COPILOT_ACTION_KIND_CONFLICT:'Proposal is not an authorized follow-up snooze action.',
    ENJAZ_COPILOT_ACTION_APPROVAL_REQUIRED:'Explicit approval is required before action execution.',
    ENJAZ_COPILOT_EXECUTION_REPLAY_CONFLICT:'Execution key was already consumed by another action.',
    ENJAZ_COPILOT_ACTION_SNOOZE_STALE:'Approved snooze time is no longer in the future.',
    ENJAZ_FOLLOWUP_NOT_FOUND:'The approved follow-up no longer exists.',
    ENJAZ_FOLLOWUP_TERMINAL_FINAL:'The approved follow-up is already terminal.',
    ENJAZ_FOLLOWUP_TRANSACTION_INVALID:'The approved transaction is not available in this workspace.',
    ENJAZ_COPILOT_ACTION_DUE_AT_STALE:'The approved follow-up due time is no longer in the future.',
    ENJAZ_COPILOT_REMINDER_SCHEDULE_STALE:'The approved reminder time is no longer in the future.',
    ENJAZ_COPILOT_REMINDER_SOURCE_NOT_FOUND:'The scheduling source is not available in this workspace.',
    ENJAZ_SCHEDULING_DEADLINE_NOT_FOUND:'The approved workflow deadline no longer exists.',
    ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_NOT_FOUND:'The approved renewal occurrence no longer exists.',
    ENJAZ_SCHEDULING_ATTENTION_SOURCE_TERMINAL:'The approved scheduling source is already terminal.',
    ENJAZ_COPILOT_DOCUMENT_REQUEST_STALE:'The approved document request timing is no longer valid.',
    ENJAZ_PORTAL_OWNER_REQUIRED:'Client portal owner authority is required.',
    ENJAZ_PORTAL_REQUEST_PERMISSION_REQUIRED:'The portal principal no longer has document-request permission.',
    ENJAZ_PORTAL_PRINCIPAL_NOT_GRANTABLE:'The portal principal is not eligible for this request.',
    ENJAZ_PORTAL_SHARE_PRINCIPAL_INVALID:'The portal principal is not eligible for this request.',
    ENJAZ_PORTAL_SHARE_STAFF_COLLISION:'Staff accounts cannot be targeted as client portal principals.',
    ENJAZ_COPILOT_RATE_LIMITED:'Copilot request limit reached.',
    CONTEXT_SOURCE_FORBIDDEN:'Authoritative ENJAZ context is not available to this user.',
    CONTEXT_SOURCE_UNAVAILABLE:'Authoritative ENJAZ context is temporarily unavailable.',
  };
  const validation=new Set([
    'REQUEST_INVALID','REQUEST_FIELD_FORBIDDEN','WORKSPACE_ID_INVALID','REQUEST_ID_INVALID','OPERATION_FORBIDDEN',
    'GOAL_INVALID','CONTEXT_QUERY_INVALID','LIMIT_INVALID','CONTEXT_SOURCE_INVALID','APPROVAL_REQUEST_INVALID',
    'APPROVAL_FIELD_FORBIDDEN','WORKSPACEID_INVALID','REQUESTID_INVALID','PROPOSALID_INVALID','DECISIONKEY_INVALID',
    'PROPOSAL_HASH_INVALID','APPROVAL_DECISION_INVALID','ENJAZ_COPILOT_APPROVAL_EXPIRY_INVALID',
    'ENJAZ_COPILOT_APPROVAL_DECISION_INVALID','ENJAZ_COPILOT_PROPOSAL_HASH_INVALID',
    'ACTION_REQUEST_INVALID','ACTION_FIELD_FORBIDDEN','ACTION_OPERATION_FORBIDDEN','ACTION_SNOOZE_INVALID',
    'FOLLOWUP_ID_INVALID','TRANSACTION_ID_INVALID','PROPOSAL_ID_INVALID','EXECUTION_KEY_INVALID','ENJAZ_COPILOT_ACTION_SNOOZE_INVALID',
    'ACTION_TITLE_INVALID','ACTION_DUE_AT_INVALID','ENJAZ_COPILOT_ACTION_TITLE_INVALID','ENJAZ_COPILOT_ACTION_DUE_AT_INVALID',
    'ACTION_SOURCE_KIND_INVALID','SOURCE_ID_INVALID','OPERATION_ID_INVALID','ACTION_SCHEDULED_FOR_INVALID',
    'ENJAZ_COPILOT_REMINDER_SOURCE_KIND_INVALID','ENJAZ_COPILOT_REMINDER_SCHEDULE_INVALID',
    'ENJAZ_SCHEDULING_ATTENTION_INVALID','ENJAZ_SCHEDULING_ATTENTION_RECIPIENT_INVALID','ENJAZ_SCHEDULING_REMINDER_SCHEDULE_INVALID',
    'PRINCIPAL_ID_INVALID','PORTAL_REQUEST_ID_INVALID','ACTION_INSTRUCTIONS_INVALID','ACTION_VALID_UNTIL_INVALID','ACTION_DOCUMENT_VALIDITY_INVALID',
    'ENJAZ_PORTAL_REQUEST_ID_INVALID','ENJAZ_PORTAL_REQUEST_TYPE_INVALID','ENJAZ_PORTAL_REQUEST_TITLE_INVALID',
    'ENJAZ_PORTAL_REQUEST_INSTRUCTIONS_INVALID','ENJAZ_PORTAL_REQUEST_TRANSACTION_INVALID','ENJAZ_PORTAL_REQUEST_VALIDITY_INVALID',
    'ENJAZ_PORTAL_REQUEST_CREATE_VERSION_INVALID','ENJAZ_PORTAL_REQUEST_EXPECTED_VERSION_REQUIRED',
  ]);
  if(messages[code])return {code,retryable,message:messages[code]};
  if(validation.has(code))return {code,retryable:false,message:'Agentic Copilot request is invalid.'};
  return {code:'COPILOT_AGENT_FAILED',retryable:true,message:'Agentic Copilot could not complete the request.'};
}
function httpStatus(code:string){
  if(code==='AUTH_REQUIRED'||code==='AUTH_INVALID'||code==='ENJAZ_FOLLOWUP_AUTH_REQUIRED'||code==='ENJAZ_PORTAL_AUTH_REQUIRED')return 401;
  if(code==='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN'||code==='ENJAZ_COPILOT_PROPOSAL_ACTOR_FORBIDDEN'||code==='ENJAZ_FOLLOWUP_WORKSPACE_FORBIDDEN'||code==='ENJAZ_PORTAL_OWNER_REQUIRED'||code==='ENJAZ_PORTAL_WORKSPACE_FORBIDDEN'||code==='ENJAZ_PORTAL_PRINCIPAL_NOT_GRANTABLE'||code==='ENJAZ_PORTAL_REQUEST_PERMISSION_REQUIRED'||code==='CONTEXT_SOURCE_FORBIDDEN')return 403;
  if(code==='ENJAZ_COPILOT_PROPOSAL_NOT_FOUND'||code==='ENJAZ_FOLLOWUP_NOT_FOUND'||code==='ENJAZ_COPILOT_REMINDER_SOURCE_NOT_FOUND'||code==='ENJAZ_SCHEDULING_DEADLINE_NOT_FOUND'||code==='ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_NOT_FOUND'||code==='ENJAZ_PORTAL_REQUEST_NOT_FOUND')return 404;
  if(code==='ENJAZ_COPILOT_APPROVAL_EXPIRED'||code==='ENJAZ_COPILOT_ACTION_SNOOZE_STALE'||code==='ENJAZ_COPILOT_ACTION_DUE_AT_STALE'||code==='ENJAZ_COPILOT_REMINDER_SCHEDULE_STALE'||code==='ENJAZ_COPILOT_DOCUMENT_REQUEST_STALE')return 410;
  if(code==='ENJAZ_COPILOT_RATE_LIMITED')return 429;
  if(code.includes('CONFLICT')||code==='ENJAZ_COPILOT_ACTION_APPROVAL_REQUIRED'||code==='ENJAZ_FOLLOWUP_TERMINAL_FINAL'||code==='ENJAZ_SCHEDULING_ATTENTION_SOURCE_TERMINAL'||code==='ENJAZ_PORTAL_REQUEST_REVOKED'||code==='ENJAZ_PORTAL_REQUEST_NOT_OPEN'||code==='ENJAZ_PORTAL_REQUEST_STALE')return 409;
  if(code==='CONTEXT_SOURCE_UNAVAILABLE')return 503;
  if(code.endsWith('_INVALID')||code.startsWith('REQUEST_')||code.startsWith('APPROVAL_')||code.startsWith('ACTION_')||code==='OPERATION_FORBIDDEN'||code==='GOAL_INVALID'||code==='CONTEXT_QUERY_INVALID'||code==='LIMIT_INVALID')return 400;
  return 500;
}
function isApprovalBody(v:unknown){
  return Boolean(v&&typeof v==='object'&&!Array.isArray(v)&&Object.prototype.hasOwnProperty.call(v,'decision'));
}
function operationOf(v:unknown){
  if(!v||typeof v!=='object'||Array.isArray(v))return '';
  return text((v as Record<string,unknown>).operation);
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json(405,{schema:AGENT_PLAN_SCHEMA,ok:false,error:{code:'METHOD_NOT_ALLOWED',retryable:false,message:'POST is required.'}});

  let plan:AgentRequest|null=null,approval:AgentApprovalRequest|null=null,action:AgentActionRequest|null=null;
  let traceId:string|null=null,actorId:string|null=null,started=Date.now();
  let traceOperation:string|null=null;
  let finishTrace:((status:TraceStatus,errorCode:string|null,metadata?:J)=>Promise<void>)|null=null;

  try{
    const auth=req.headers.get('Authorization')??'',token=auth.startsWith('Bearer ')?auth.slice(7).trim():'';
    if(!token)return json(401,{schema:AGENT_PLAN_SCHEMA,ok:false,error:safeError('AUTH_REQUIRED')});

    const body:unknown=await req.json();
    const actionMode=isAgentActionOperation(operationOf(body));
    const approvalMode=!actionMode&&isApprovalBody(body);
    if(actionMode)action=parseAgentActionRequest(body);
    else if(approvalMode)approval=parseAgentApprovalRequest(body);
    else plan=parseAgentRequest(body);

    const url=Deno.env.get('SUPABASE_URL');
    if(!url)throw new Error('SERVER_URL_UNAVAILABLE');

    const userClient=createClient(url,publicKey(),{
      global:{headers:{Authorization:`Bearer ${token}`}},
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    });
    const user=await userClient.auth.getUser(token);
    if(user.error||!user.data.user){
      const schema=actionMode?AGENT_ACTION_SCHEMA:approvalMode?AGENT_APPROVAL_SCHEMA:AGENT_PLAN_SCHEMA;
      return json(401,{schema,ok:false,error:safeError('AUTH_INVALID')});
    }
    actorId=user.data.user.id;

    const admin=createClient(url,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    traceOperation=action?.operation??(approval?approvalTraceOperation(approval.decision):plan!.operation);
    const payloadHash=action?await actionTracePayloadHash(action):(approval?await approvalPayloadHash(approval):await agentPayloadHash(plan!));
    const workspaceId=action?.workspaceId??approval?.workspaceId??plan!.workspaceId;
    const requestId=action?.requestId??approval?.requestId??plan!.requestId;

    const begin=await admin.rpc('copilot_begin_request_v7',{
      p_workspace_id:workspaceId,p_actor_user_id:actorId,p_request_id:requestId,
      p_operation:traceOperation,p_payload_hash:payloadHash,p_limit:20,
    });
    if(begin.error)throw new Error(dbCode(begin.error));
    const boundary=record(begin.data);
    if(boundary.allowed!==true)throw new Error('ENJAZ_COPILOT_RATE_LIMITED');
    traceId=uuidOrNull(boundary.traceId);
    if(!traceId)throw new Error('COPILOT_TRACE_ID_INVALID');

    const finish=async(status:TraceStatus,errorCode:string|null,metadata:J={})=>{
      const done=await admin.rpc('copilot_finish_request_v1',{
        p_workspace_id:workspaceId,p_actor_user_id:actorId,p_request_id:requestId,p_trace_id:traceId,
        p_status:status,p_error_code:errorCode,p_provider_name:null,p_model_name:null,
        p_latency_ms:Math.max(0,Date.now()-started),p_metadata:metadata,
      });
      if(done.error)throw new Error('COPILOT_TRACE_COMPLETION_FAILED');
    };
    finishTrace=finish;

    if(action?.operation==='prepare_followup_snooze'){
      const target=await userClient.from('transaction_followups')
        .select('id,workspace_id,status,snoozed_until')
        .eq('workspace_id',action.workspaceId).eq('id',action.followupId).maybeSingle();
      if(target.error)throw new Error(sourceCode(target.error));
      if(!target.data)throw new Error('ENJAZ_FOLLOWUP_NOT_FOUND');
      if(target.data.status!=='open')throw new Error('ENJAZ_FOLLOWUP_TERMINAL_FINAL');

      const proposalHash=await actionProposalHash(action);
      const expiresAt=new Date(Date.now()+10*60*1000).toISOString();
      const registered=await admin.rpc('copilot_register_followup_snooze_proposal_v1',{
        p_workspace_id:action.workspaceId,p_actor_user_id:actorId,p_request_id:action.requestId,
        p_proposal_hash:proposalHash,p_followup_id:action.followupId,
        p_snoozed_until:action.snoozedUntil,p_expires_at:expiresAt,
      });
      if(registered.error)throw new Error(dbCode(registered.error));
      const row=record(registered.data);
      const proposalId=uuidOrNull(row.proposalId),storedHash=text(row.proposalHash),storedExpiry=text(row.expiresAt);
      if(!proposalId||storedHash!==proposalHash||!storedExpiry||row.actionKind!=='followup.snooze'||text(row.targetId)!==action.followupId)throw new Error('COPILOT_ACTION_EVIDENCE_INVALID');
      const result=preparedSnoozeActionResult({
        proposalId,proposalHash:storedHash,expiresAt:storedExpiry,replayed:row.replayed===true,
        followupId:action.followupId,snoozedUntil:action.snoozedUntil,
      });
      await finish('completed',null,{resultKind:'action_proposal',actionKind:'followup.snooze',providerUsed:false});
      return json(200,{schema:AGENT_ACTION_SCHEMA,ok:true,requestId:action.requestId,traceId,operation:action.operation,result});
    }

    if(action?.operation==='prepare_followup_create'){
      const target=await userClient.from('transactions')
        .select('id,workspace_id,deleted_at')
        .eq('workspace_id',action.workspaceId).eq('id',action.transactionId).maybeSingle();
      if(target.error)throw new Error(sourceCode(target.error));
      if(!target.data||target.data.deleted_at)throw new Error('ENJAZ_FOLLOWUP_TRANSACTION_INVALID');

      const proposalHash=await actionProposalHash(action);
      const expiresAt=new Date(Date.now()+10*60*1000).toISOString();
      const registered=await admin.rpc('copilot_register_followup_create_proposal_v1',{
        p_workspace_id:action.workspaceId,p_actor_user_id:actorId,p_request_id:action.requestId,
        p_proposal_hash:proposalHash,p_transaction_id:action.transactionId,p_followup_id:action.followupId,
        p_title:action.title,p_due_at:action.dueAt,p_expires_at:expiresAt,
      });
      if(registered.error)throw new Error(dbCode(registered.error));
      const row=record(registered.data);
      const proposalId=uuidOrNull(row.proposalId),storedHash=text(row.proposalHash),storedExpiry=text(row.expiresAt);
      if(!proposalId||storedHash!==proposalHash||!storedExpiry||row.actionKind!=='followup.create'
        ||text(row.targetId)!==action.followupId||text(row.transactionId)!==action.transactionId
        ||text(row.title)!==action.title)throw new Error('COPILOT_ACTION_EVIDENCE_INVALID');
      const result=preparedCreateActionResult({
        proposalId,proposalHash:storedHash,expiresAt:storedExpiry,replayed:row.replayed===true,
        transactionId:action.transactionId,followupId:action.followupId,title:action.title,dueAt:action.dueAt,
      });
      await finish('completed',null,{resultKind:'action_proposal',actionKind:'followup.create',providerUsed:false});
      return json(200,{schema:AGENT_ACTION_SCHEMA,ok:true,requestId:action.requestId,traceId,operation:action.operation,result});
    }

    if(action?.operation==='prepare_schedule_reminder'){
      const snapshot=await userClient.rpc('get_scheduling_deadline_snapshot_v1',{
        p_workspace_id:action.workspaceId,p_as_of:new Date().toISOString(),
      });
      if(snapshot.error)throw new Error(sourceCode(snapshot.error));
      const data=record(snapshot.data);
      const rows=action.sourceKind==='workflow_deadline'
        ?(Array.isArray(data.workflowDeadlines)?data.workflowDeadlines:[])
        :(Array.isArray(data.renewalOccurrences)?data.renewalOccurrences:[]);
      const source=rows.find(v=>v&&typeof v==='object'&&!Array.isArray(v)&&text((v as J).id)===action.sourceId) as J|undefined;
      if(!source)throw new Error('ENJAZ_COPILOT_REMINDER_SOURCE_NOT_FOUND');
      const sourceState=text(source.state);
      if(sourceState==='completed_on_time'||sourceState==='completed_late'){
        throw new Error('ENJAZ_SCHEDULING_ATTENTION_SOURCE_TERMINAL');
      }
      if(sourceState!=='upcoming'&&sourceState!=='due_today'){
        throw new Error('ACTION_SCHEDULED_FOR_INVALID');
      }
      const cutoffAt=text(source.cutoffAt);
      if(!cutoffAt||!Number.isFinite(Date.parse(cutoffAt))||Date.parse(action.scheduledFor)>=Date.parse(cutoffAt)){
        throw new Error('ACTION_SCHEDULED_FOR_INVALID');
      }

      const proposalHash=await actionProposalHash(action);
      const expiresAt=new Date(Date.now()+10*60*1000).toISOString();
      const registered=await admin.rpc('copilot_register_schedule_reminder_proposal_v1',{
        p_workspace_id:action.workspaceId,p_actor_user_id:actorId,p_request_id:action.requestId,
        p_proposal_hash:proposalHash,p_source_kind:action.sourceKind,p_source_id:action.sourceId,
        p_operation_id:action.operationId,p_scheduled_for:action.scheduledFor,p_expires_at:expiresAt,
      });
      if(registered.error)throw new Error(dbCode(registered.error));
      const row=record(registered.data);
      const proposalId=uuidOrNull(row.proposalId),storedHash=text(row.proposalHash),storedExpiry=text(row.expiresAt);
      if(!proposalId||storedHash!==proposalHash||!storedExpiry||row.actionKind!=='reminder.schedule'
        ||text(row.targetId)!==action.sourceId||text(row.sourceKind)!==action.sourceKind
        ||text(row.operationId)!==action.operationId)throw new Error('COPILOT_ACTION_EVIDENCE_INVALID');
      const result=preparedReminderActionResult({
        proposalId,proposalHash:storedHash,expiresAt:storedExpiry,replayed:row.replayed===true,
        sourceKind:action.sourceKind,sourceId:action.sourceId,operationId:action.operationId,scheduledFor:action.scheduledFor,
      });
      await finish('completed',null,{resultKind:'action_proposal',actionKind:'reminder.schedule',providerUsed:false,recipientScope:'self'});
      return json(200,{schema:AGENT_ACTION_SCHEMA,ok:true,requestId:action.requestId,traceId,operation:action.operation,result});
    }

    if(action?.operation==='prepare_document_request'){
      const authority=await userClient.rpc('get_client_portal_admin_authority_v1',{p_workspace_id:action.workspaceId});
      if(authority.error)throw new Error(dbCode(authority.error));
      const data=record(authority.data);
      const principals=Array.isArray(data.principals)?data.principals:[];
      const principal=principals.find(v=>v&&typeof v==='object'&&!Array.isArray(v)&&text((v as J).id)===action.principalId) as J|undefined;
      if(!principal||text(principal.status)!=='active'||text(principal.revokedAt))throw new Error('ENJAZ_PORTAL_PRINCIPAL_NOT_GRANTABLE');

      const now=Date.now();
      const grants=Array.isArray(data.grants)?data.grants:[];
      const allowed=grants.some(v=>{
        if(!v||typeof v!=='object'||Array.isArray(v))return false;
        const g=v as J,permissions=Array.isArray(g.permissions)?g.permissions:[];
        const validFrom=text(g.validFrom),validUntil=text(g.validUntil);
        return text(g.principalId)===action.principalId&&text(g.targetType)==='transaction'&&text(g.targetId)===action.transactionId
          &&permissions.includes('view')&&permissions.includes('upload_requested_document')&&!text(g.revokedAt)
          &&Boolean(validFrom)&&Date.parse(validFrom)<=now&&(!validUntil||Date.parse(validUntil)>now);
      });
      if(!allowed)throw new Error('ENJAZ_PORTAL_REQUEST_PERMISSION_REQUIRED');

      const target=await userClient.from('transactions')
        .select('id,workspace_id,deleted_at')
        .eq('workspace_id',action.workspaceId).eq('id',action.transactionId).maybeSingle();
      if(target.error)throw new Error(sourceCode(target.error));
      if(!target.data||target.data.deleted_at)throw new Error('ENJAZ_PORTAL_REQUEST_TRANSACTION_INVALID');

      const proposalHash=await actionProposalHash(action);
      const expiresAt=new Date(Date.now()+10*60*1000).toISOString();
      const registered=await admin.rpc('copilot_register_document_request_proposal_v1',{
        p_workspace_id:action.workspaceId,p_actor_user_id:actorId,p_request_id:action.requestId,
        p_proposal_hash:proposalHash,p_principal_id:action.principalId,p_transaction_id:action.transactionId,
        p_portal_request_id:action.portalRequestId,p_title:action.title,p_instructions:action.instructions,
        p_due_at:action.dueAt,p_valid_until:action.validUntil,p_expires_at:expiresAt,
      });
      if(registered.error)throw new Error(dbCode(registered.error));
      const row=record(registered.data);
      const proposalId=uuidOrNull(row.proposalId),storedHash=text(row.proposalHash),storedExpiry=text(row.expiresAt);
      if(!proposalId||storedHash!==proposalHash||!storedExpiry||row.actionKind!=='document.request'
        ||text(row.targetId)!==action.portalRequestId||text(row.principalId)!==action.principalId
        ||text(row.transactionId)!==action.transactionId||text(row.title)!==action.title)throw new Error('COPILOT_ACTION_EVIDENCE_INVALID');
      const result=preparedDocumentRequestResult({
        proposalId,proposalHash:storedHash,expiresAt:storedExpiry,replayed:row.replayed===true,
        principalId:action.principalId,transactionId:action.transactionId,portalRequestId:action.portalRequestId,
        title:action.title,instructions:action.instructions,dueAt:action.dueAt,validUntil:action.validUntil,
      });
      await finish('completed',null,{resultKind:'action_proposal',actionKind:'document.request',providerUsed:false,requestType:'document'});
      return json(200,{schema:AGENT_ACTION_SCHEMA,ok:true,requestId:action.requestId,traceId,operation:action.operation,result});
    }

    if(action?.operation==='execute_followup_snooze'){
      const executed=await userClient.rpc('copilot_execute_followup_snooze_v1',{
        p_workspace_id:action.workspaceId,p_proposal_id:action.proposalId,
        p_proposal_hash:action.proposalHash,p_execution_key:action.executionKey,
      });
      if(executed.error)throw new Error(dbCode(executed.error));
      const result=parseExecutionResult(executed.data);
      await finish('completed',null,{resultKind:'action_execution',actionKind:'followup.snooze',providerUsed:false,replayed:result.replayed});
      return json(200,{schema:AGENT_ACTION_SCHEMA,ok:true,requestId:action.requestId,traceId,operation:action.operation,result});
    }

    if(action?.operation==='execute_followup_create'){
      const executed=await userClient.rpc('copilot_execute_followup_create_v1',{
        p_workspace_id:action.workspaceId,p_proposal_id:action.proposalId,
        p_proposal_hash:action.proposalHash,p_execution_key:action.executionKey,
      });
      if(executed.error)throw new Error(dbCode(executed.error));
      const result=parseExecutionResult(executed.data);
      await finish('completed',null,{resultKind:'action_execution',actionKind:'followup.create',providerUsed:false,replayed:result.replayed});
      return json(200,{schema:AGENT_ACTION_SCHEMA,ok:true,requestId:action.requestId,traceId,operation:action.operation,result});
    }

    if(action?.operation==='execute_schedule_reminder'){
      const executed=await userClient.rpc('copilot_execute_schedule_reminder_v1',{
        p_workspace_id:action.workspaceId,p_proposal_id:action.proposalId,
        p_proposal_hash:action.proposalHash,p_execution_key:action.executionKey,
      });
      if(executed.error)throw new Error(dbCode(executed.error));
      const result=parseExecutionResult(executed.data);
      await finish('completed',null,{resultKind:'action_execution',actionKind:'reminder.schedule',providerUsed:false,replayed:result.replayed,recipientScope:'self'});
      return json(200,{schema:AGENT_ACTION_SCHEMA,ok:true,requestId:action.requestId,traceId,operation:action.operation,result});
    }

    if(action?.operation==='execute_document_request'){
      const executed=await userClient.rpc('copilot_execute_document_request_v1',{
        p_workspace_id:action.workspaceId,p_proposal_id:action.proposalId,
        p_proposal_hash:action.proposalHash,p_execution_key:action.executionKey,
      });
      if(executed.error)throw new Error(dbCode(executed.error));
      const result=parseExecutionResult(executed.data);
      await finish('completed',null,{resultKind:'action_execution',actionKind:'document.request',providerUsed:false,replayed:result.replayed,requestType:'document'});
      return json(200,{schema:AGENT_ACTION_SCHEMA,ok:true,requestId:action.requestId,traceId,operation:action.operation,result});
    }

    if(approval){
      const decision=await admin.rpc('copilot_decide_agent_proposal_v1',{
        p_workspace_id:approval.workspaceId,p_actor_user_id:actorId,p_proposal_id:approval.proposalId,
        p_proposal_hash:approval.proposalHash,p_decision:approvalDbDecision(approval.decision),
        p_decision_key:approval.decisionKey,
      });
      if(decision.error)throw new Error(dbCode(decision.error));
      const row=record(decision.data);
      const proposalId=uuidOrNull(row.proposalId),proposalHash=text(row.proposalHash),expiresAt=text(row.expiresAt);
      const status=text(row.status);
      if(!proposalId||!/^[0-9a-f]{64}$/.test(proposalHash)||!expiresAt||!(status==='approved'||status==='rejected'))throw new Error('COPILOT_APPROVAL_EVIDENCE_INVALID');
      const result=approvalResult({
        proposalId,proposalHash,status,expiresAt,decidedAt:text(row.decidedAt)||null,replayed:row.replayed===true,
      });
      await finish('completed',null,{resultKind:'agent_approval',decision:approval.decision,providerUsed:false});
      return json(200,{schema:AGENT_APPROVAL_SCHEMA,ok:true,requestId:approval.requestId,traceId,operation:traceOperation,result});
    }

    const search=await userClient.rpc('global_search_v1',{
      p_workspace_id:plan!.workspaceId,p_query:plan!.contextQuery,p_limit_per_domain:plan!.limitPerDomain,
    });
    if(search.error)throw new Error(sourceCode(search.error));
    const refs=parseAgentReferences(search.data);
    const result=buildAgentPlan(plan!,refs);
    let approvalEvidence:ReturnType<typeof approvalResult>|null=null;

    if(plan!.operation==='propose'&&result.grounding.authoritativeContextFound){
      const proposalHash=await agentProposalHash(plan!,result);
      const expiresAt=new Date(Date.now()+10*60*1000).toISOString();
      const registered=await admin.rpc('copilot_register_agent_proposal_v1',{
        p_workspace_id:plan!.workspaceId,p_actor_user_id:actorId,p_request_id:plan!.requestId,
        p_proposal_hash:proposalHash,p_expires_at:expiresAt,
      });
      if(registered.error)throw new Error(dbCode(registered.error));
      const row=record(registered.data);
      const proposalId=uuidOrNull(row.proposalId),storedHash=text(row.proposalHash),storedExpiry=text(row.expiresAt),status=text(row.status);
      if(!proposalId||storedHash!==proposalHash||!storedExpiry||!(status==='pending'||status==='approved'||status==='rejected'))throw new Error('COPILOT_PROPOSAL_EVIDENCE_INVALID');
      approvalEvidence=approvalResult({
        proposalId,proposalHash:storedHash,status,expiresAt:storedExpiry,replayed:row.replayed===true,
      });
    }

    await finish('completed',null,{
      resultKind:'agent_plan',sourceCount:result.grounding.sourceCount,providerUsed:false,
      proposalRegistered:Boolean(approvalEvidence),
    });
    return json(200,{...successAgentEnvelope(plan!.requestId,plan!.operation,result),traceId,approval:approvalEvidence});
  }catch(error){
    const raw=error instanceof Error?error.message:'COPILOT_AGENT_FAILED';
    const known=new Set<string>([
      ...DB_CODES,'ENJAZ_COPILOT_RATE_LIMITED','CONTEXT_SOURCE_FORBIDDEN','CONTEXT_SOURCE_UNAVAILABLE','CONTEXT_SOURCE_INVALID',
      'REQUEST_INVALID','REQUEST_FIELD_FORBIDDEN','WORKSPACE_ID_INVALID','REQUEST_ID_INVALID','OPERATION_FORBIDDEN',
      'GOAL_INVALID','CONTEXT_QUERY_INVALID','LIMIT_INVALID','APPROVAL_REQUEST_INVALID','APPROVAL_FIELD_FORBIDDEN',
      'WORKSPACEID_INVALID','REQUESTID_INVALID','PROPOSALID_INVALID','DECISIONKEY_INVALID','PROPOSAL_HASH_INVALID',
      'APPROVAL_DECISION_INVALID','ACTION_REQUEST_INVALID','ACTION_FIELD_FORBIDDEN','ACTION_OPERATION_FORBIDDEN',
      'ACTION_SNOOZE_INVALID','FOLLOWUP_ID_INVALID','TRANSACTION_ID_INVALID','PROPOSAL_ID_INVALID','EXECUTION_KEY_INVALID',
      'ACTION_TITLE_INVALID','ACTION_DUE_AT_INVALID','ACTION_SOURCE_KIND_INVALID','SOURCE_ID_INVALID','OPERATION_ID_INVALID','ACTION_SCHEDULED_FOR_INVALID',
      'PRINCIPAL_ID_INVALID','PORTAL_REQUEST_ID_INVALID','ACTION_INSTRUCTIONS_INVALID','ACTION_VALID_UNTIL_INVALID','ACTION_DOCUMENT_VALIDITY_INVALID',
      'ENJAZ_COPILOT_REMINDER_SOURCE_NOT_FOUND',
    ]);
    const code=known.has(raw)?raw:'COPILOT_AGENT_FAILED';
    if(traceId&&finishTrace&&raw!=='COPILOT_TRACE_COMPLETION_FAILED'){
      try{await finishTrace('failed',code,{resultKind:'failure',providerUsed:false})}catch{}
    }
    console.error('enjaz-copilot-agent',code);
    const schema=action?AGENT_ACTION_SCHEMA:approval?AGENT_APPROVAL_SCHEMA:AGENT_PLAN_SCHEMA;
    if(action){
      return json(httpStatus(code),{schema,ok:false,requestId:action.requestId,traceId,operation:action.operation,error:safeError(code)});
    }
    const body=approval
      ?{schema,ok:false,requestId:approval.requestId,traceId,operation:traceOperation,error:safeError(code)}
      :{...errorAgentEnvelope(plan?.requestId??null,plan?.operation as AgentOperation|null,safeError(code)),traceId};
    return json(httpStatus(code),body);
  }
});
