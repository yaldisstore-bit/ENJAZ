import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.114.0';
import {
  buildContextResult,contextPayloadHash,errorEnvelope,parseContextRequest,parseSearchReferences,successEnvelope,
  type ContextOperation,type ContextRequest,
} from './core.ts';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization,content-type,x-client-info,apikey',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Cache-Control':'no-store',
};
type J=Record<string,unknown>;

function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}})}
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
function record(v:unknown):J{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('COPILOT_BOUNDARY_INVALID');return v as J}
function text(v:unknown){return typeof v==='string'?v:''}
function uuidOrNull(v:unknown){const s=text(v);return /^[0-9a-f-]{36}$/i.test(s)?s:null}
function dbCode(error:unknown){
  if(!error||typeof error!=='object')return 'COPILOT_BOUNDARY_FAILED';
  const row=error as Record<string,unknown>,message=text(row.message);
  for(const code of ['ENJAZ_COPILOT_WORKSPACE_FORBIDDEN','ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT'])if(message.includes(code))return code;
  return 'COPILOT_BOUNDARY_FAILED';
}
function safeError(code:string){
  switch(code){
    case 'AUTH_REQUIRED': return {code,retryable:false,message:'Authentication is required.'};
    case 'AUTH_INVALID': return {code,retryable:false,message:'Authentication is invalid.'};
    case 'ENJAZ_COPILOT_WORKSPACE_FORBIDDEN': return {code,retryable:false,message:'Workspace access is not allowed.'};
    case 'ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT': return {code,retryable:false,message:'Request id was already used with different input.'};
    case 'ENJAZ_COPILOT_RATE_LIMITED': return {code,retryable:true,message:'Copilot request limit reached. Retry after the current minute window.'};
    case 'CONTEXT_SOURCE_FORBIDDEN': return {code,retryable:false,message:'The requested ENJAZ context is not available to this user.'};
    case 'CONTEXT_SOURCE_UNAVAILABLE': return {code,retryable:true,message:'Authoritative ENJAZ context is temporarily unavailable.'};
    case 'CONTEXT_SOURCE_INVALID': return {code,retryable:true,message:'Authoritative ENJAZ context returned an invalid shape.'};
    case 'REQUEST_INVALID':
    case 'REQUEST_FIELD_FORBIDDEN':
    case 'WORKSPACE_ID_INVALID':
    case 'REQUEST_ID_INVALID':
    case 'OPERATION_FORBIDDEN':
    case 'QUERY_INVALID':
    case 'COMPARE_QUERY_REQUIRED':
    case 'COMPARE_QUERY_FORBIDDEN':
    case 'LIMIT_INVALID':
      return {code,retryable:false,message:'Contextual assistance request is invalid.'};
    default:return {code:'COPILOT_CONTEXT_FAILED',retryable:true,message:'Contextual assistance could not be completed.'};
  }
}
function sourceCode(error:unknown){
  if(!error||typeof error!=='object')return 'CONTEXT_SOURCE_UNAVAILABLE';
  const row=error as Record<string,unknown>,message=`${text(row.message)} ${text(row.details)} ${text(row.hint)}`.toUpperCase();
  if(message.includes('FORBIDDEN')||message.includes('AUTH_REQUIRED')||message.includes('INSUFFICIENT'))return 'CONTEXT_SOURCE_FORBIDDEN';
  return 'CONTEXT_SOURCE_UNAVAILABLE';
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json(405,errorEnvelope(null,null,null,{code:'METHOD_NOT_ALLOWED',retryable:false,message:'POST is required.'}));

  let parsed:ContextRequest|null=null,traceId:string|null=null,started=Date.now(),actorId:string|null=null;
  let finishTrace:((status:'completed'|'provider_unavailable'|'failed',errorCode:string|null,metadata?:J)=>Promise<void>)|null=null;
  try{
    const auth=req.headers.get('Authorization')??'',token=auth.startsWith('Bearer ')?auth.slice(7).trim():'';
    if(!token)return json(401,errorEnvelope(null,null,null,safeError('AUTH_REQUIRED')));
    parsed=parseContextRequest(await req.json());

    const url=Deno.env.get('SUPABASE_URL');
    if(!url)throw new Error('SERVER_URL_UNAVAILABLE');
    const userClient=createClient(url,publicKey(),{
      global:{headers:{Authorization:`Bearer ${token}`}},
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    });
    const user=await userClient.auth.getUser(token);
    if(user.error||!user.data.user)return json(401,errorEnvelope(parsed.requestId,null,parsed.operation,safeError('AUTH_INVALID')));
    actorId=user.data.user.id;

    const admin=createClient(url,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const payloadHash=await contextPayloadHash(parsed);
    const begin=await admin.rpc('copilot_begin_request_v2',{
      p_workspace_id:parsed.workspaceId,
      p_actor_user_id:actorId,
      p_request_id:parsed.requestId,
      p_operation:parsed.operation,
      p_payload_hash:payloadHash,
      p_limit:20,
    });
    if(begin.error){
      const code=dbCode(begin.error);
      const status=code==='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN'?403:code==='ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT'?409:500;
      return json(status,errorEnvelope(parsed.requestId,null,parsed.operation,safeError(code)));
    }
    const boundary=record(begin.data);
    if(boundary.allowed!==true)return json(429,errorEnvelope(parsed.requestId,null,parsed.operation,safeError('ENJAZ_COPILOT_RATE_LIMITED')));
    traceId=uuidOrNull(boundary.traceId);
    if(!traceId)throw new Error('COPILOT_TRACE_ID_INVALID');
    const replayed=boundary.replayed===true;

    const finish=async(status:'completed'|'provider_unavailable'|'failed',errorCode:string|null,metadata:J={})=>{
      const done=await admin.rpc('copilot_finish_request_v1',{
        p_workspace_id:parsed!.workspaceId,
        p_actor_user_id:actorId,
        p_request_id:parsed!.requestId,
        p_trace_id:traceId,
        p_status:status,
        p_error_code:errorCode,
        p_provider_name:null,
        p_model_name:null,
        p_latency_ms:Math.max(0,Date.now()-started),
        p_metadata:metadata,
      });
      if(done.error)throw new Error('COPILOT_TRACE_COMPLETION_FAILED');
    };
    finishTrace=finish;

    const read=async(query:string)=>{
      const response=await userClient.rpc('global_search_v1',{
        p_workspace_id:parsed!.workspaceId,
        p_query:query,
        p_limit_per_domain:parsed!.limitPerDomain,
      });
      if(response.error)throw new Error(sourceCode(response.error));
      return parseSearchReferences(response.data);
    };

    const primary=await read(parsed.query);
    const secondary=parsed.operation==='compare'&&parsed.compareWith?await read(parsed.compareWith):[];
    const result=buildContextResult(parsed,primary,secondary,replayed);
    await finish('completed',null,{
      resultKind:'contextual_assistance',
      sourceCount:result.grounding.sourceCount,
      primarySourceCount:primary.length,
      secondarySourceCount:secondary.length,
      providerUsed:false,
      readSemantics:'fresh_on_replay',
    });
    return json(200,successEnvelope(parsed.requestId,traceId,parsed.operation,result));
  }catch(error){
    const raw=error instanceof Error?error.message:'COPILOT_CONTEXT_FAILED';
    const recognized=new Set([
      'REQUEST_INVALID','REQUEST_FIELD_FORBIDDEN','WORKSPACE_ID_INVALID','REQUEST_ID_INVALID','OPERATION_FORBIDDEN',
      'QUERY_INVALID','COMPARE_QUERY_REQUIRED','COMPARE_QUERY_FORBIDDEN','LIMIT_INVALID','CONTEXT_SOURCE_FORBIDDEN',
      'CONTEXT_SOURCE_UNAVAILABLE','CONTEXT_SOURCE_INVALID',
    ]);
    const code=recognized.has(raw)?raw:'COPILOT_CONTEXT_FAILED';
    if(traceId&&finishTrace&&raw!=='COPILOT_TRACE_COMPLETION_FAILED'){
      try{await finishTrace('failed',code,{resultKind:'failure',providerUsed:false})}catch{}
    }
    console.error('enjaz-copilot-context',code);
    const status=code==='CONTEXT_SOURCE_FORBIDDEN'?403:code.startsWith('REQUEST_')||code.endsWith('_INVALID')||code.startsWith('COMPARE_')||code==='OPERATION_FORBIDDEN'?400:500;
    return json(status,errorEnvelope(parsed?.requestId??null,traceId,parsed?.operation??null,safeError(code)));
  }
});
