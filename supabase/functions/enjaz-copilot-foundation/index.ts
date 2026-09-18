import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.114.0';
import {
  capabilitiesResult,errorEnvelope,foundationPayloadHash,parseFoundationRequest,safeError,successEnvelope,
  type FoundationOperation,type FoundationRequest,
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

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json(405,errorEnvelope(null,null,null,{code:'METHOD_NOT_ALLOWED',retryable:false,message:'POST is required.'}));

  let parsed:FoundationRequest|null=null,traceId:string|null=null,started=Date.now(),actorId:string|null=null;
  try{
    const auth=req.headers.get('Authorization')??'',token=auth.startsWith('Bearer ')?auth.slice(7).trim():'';
    if(!token)return json(401,errorEnvelope(null,null,null,safeError('AUTH_REQUIRED')));

    const body=await req.json();
    parsed=parseFoundationRequest(body);

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
    const payloadHash=await foundationPayloadHash(parsed);
    const begin=await admin.rpc('copilot_begin_request_v1',{
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
    if(boundary.allowed!==true){
      return json(429,errorEnvelope(parsed.requestId,null,parsed.operation,safeError('ENJAZ_COPILOT_RATE_LIMITED')));
    }
    traceId=uuidOrNull(boundary.traceId);
    if(!traceId)throw new Error('COPILOT_TRACE_ID_INVALID');

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

    if(parsed.operation==='capabilities'){
      await finish('completed',null,{resultKind:'capabilities'});
      return json(200,successEnvelope(parsed.requestId,traceId,parsed.operation,capabilitiesResult()));
    }

    await finish('provider_unavailable','PROVIDER_NOT_CONFIGURED',{resultKind:'provider_unavailable'});
    return json(503,errorEnvelope(parsed.requestId,traceId,parsed.operation,safeError('PROVIDER_NOT_CONFIGURED')));
  }catch(error){
    const code=error instanceof Error?error.message:'COPILOT_FOUNDATION_FAILED';
    console.error('enjaz-copilot-foundation',code);
    return json(code.startsWith('REQUEST_')||code.endsWith('_INVALID')||code==='OPERATION_FORBIDDEN'?400:500,
      errorEnvelope(parsed?.requestId??null,traceId,parsed?.operation??null,safeError(code)));
  }
});
