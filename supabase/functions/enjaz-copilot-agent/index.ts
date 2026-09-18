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
  ]);
  if(messages[code])return {code,retryable,message:messages[code]};
  if(validation.has(code))return {code,retryable:false,message:'Agentic Copilot request is invalid.'};
  return {code:'COPILOT_AGENT_FAILED',retryable:true,message:'Agentic Copilot could not complete the request.'};
}
function httpStatus(code:string){
  if(code==='AUTH_REQUIRED'||code==='AUTH_INVALID')return 401;
  if(code==='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN'||code==='ENJAZ_COPILOT_PROPOSAL_ACTOR_FORBIDDEN'||code==='CONTEXT_SOURCE_FORBIDDEN')return 403;
  if(code==='ENJAZ_COPILOT_PROPOSAL_NOT_FOUND')return 404;
  if(code==='ENJAZ_COPILOT_APPROVAL_EXPIRED')return 410;
  if(code==='ENJAZ_COPILOT_RATE_LIMITED')return 429;
  if(code.includes('CONFLICT'))return 409;
  if(code==='CONTEXT_SOURCE_UNAVAILABLE')return 503;
  if(code.endsWith('_INVALID')||code.startsWith('REQUEST_')||code.startsWith('APPROVAL_')||code==='OPERATION_FORBIDDEN'||code==='GOAL_INVALID'||code==='CONTEXT_QUERY_INVALID'||code==='LIMIT_INVALID')return 400;
  return 500;
}
function isApprovalBody(v:unknown){
  return Boolean(v&&typeof v==='object'&&!Array.isArray(v)&&Object.prototype.hasOwnProperty.call(v,'decision'));
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json(405,{schema:AGENT_PLAN_SCHEMA,ok:false,error:{code:'METHOD_NOT_ALLOWED',retryable:false,message:'POST is required.'}});

  let plan:AgentRequest|null=null,approval:AgentApprovalRequest|null=null;
  let traceId:string|null=null,actorId:string|null=null,started=Date.now();
  let traceOperation:string|null=null;
  let finishTrace:((status:TraceStatus,errorCode:string|null,metadata?:J)=>Promise<void>)|null=null;

  try{
    const auth=req.headers.get('Authorization')??'',token=auth.startsWith('Bearer ')?auth.slice(7).trim():'';
    if(!token)return json(401,{schema:AGENT_PLAN_SCHEMA,ok:false,error:safeError('AUTH_REQUIRED')});

    const body:unknown=await req.json();
    const approvalMode=isApprovalBody(body);
    if(approvalMode)approval=parseAgentApprovalRequest(body);
    else plan=parseAgentRequest(body);

    const url=Deno.env.get('SUPABASE_URL');
    if(!url)throw new Error('SERVER_URL_UNAVAILABLE');

    const userClient=createClient(url,publicKey(),{
      global:{headers:{Authorization:`Bearer ${token}`}},
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    });
    const user=await userClient.auth.getUser(token);
    if(user.error||!user.data.user){
      const schema=approvalMode?AGENT_APPROVAL_SCHEMA:AGENT_PLAN_SCHEMA;
      return json(401,{schema,ok:false,error:safeError('AUTH_INVALID')});
    }
    actorId=user.data.user.id;

    const admin=createClient(url,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    traceOperation=approval?approvalTraceOperation(approval.decision):plan!.operation;
    const payloadHash=approval?await approvalPayloadHash(approval):await agentPayloadHash(plan!);
    const workspaceId=approval?.workspaceId??plan!.workspaceId;
    const requestId=approval?.requestId??plan!.requestId;

    const begin=await admin.rpc('copilot_begin_request_v3',{
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
      'APPROVAL_DECISION_INVALID',
    ]);
    const code=known.has(raw)?raw:'COPILOT_AGENT_FAILED';
    if(traceId&&finishTrace&&raw!=='COPILOT_TRACE_COMPLETION_FAILED'){
      try{await finishTrace('failed',code,{resultKind:'failure',providerUsed:false})}catch{}
    }
    console.error('enjaz-copilot-agent',code);
    const schema=approval?AGENT_APPROVAL_SCHEMA:AGENT_PLAN_SCHEMA;
    const body=approval
      ?{schema,ok:false,requestId:approval.requestId,traceId,operation:traceOperation,error:safeError(code)}
      :{...errorAgentEnvelope(plan?.requestId??null,plan?.operation as AgentOperation|null,safeError(code)),traceId};
    return json(httpStatus(code),body);
  }
});
