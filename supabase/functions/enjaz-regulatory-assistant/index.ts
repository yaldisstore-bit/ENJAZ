import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.114.0';
import {
  REGULATORY_ASSISTANCE_SCHEMA,buildRegulatoryAssistanceResult,parseRegulatoryAssistanceRequest,successEnvelope,
  type RegulatoryAssistanceRequest,
} from './core.ts';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization,content-type,x-client-info,apikey',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Cache-Control':'no-store',
};
type J=Record<string,unknown>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}})}
function publicKey(){
  const modern=Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if(modern)try{const row=JSON.parse(modern) as Record<string,string>;if(row.default)return row.default}catch{}
  const direct=Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||Deno.env.get('SUPABASE_ANON_KEY');
  if(direct)return direct;
  throw new Error('SERVER_PUBLIC_KEY_UNAVAILABLE');
}
function record(value:unknown,label:string):J{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(label+'_INVALID');
  return value as J;
}
function text(value:unknown){return typeof value==='string'?value:''}
function errorEnvelope(requestId:string|null,code:string,message:string){
  return {schema:REGULATORY_ASSISTANCE_SCHEMA,ok:false,requestId,operation:'answer',error:{code,retryable:false,message}};
}
function databaseCode(error:unknown){
  if(!error||typeof error!=='object')return 'REGULATORY_SOURCE_UNAVAILABLE';
  const row=error as Record<string,unknown>;
  const message=(text(row.message)+' '+text(row.details)+' '+text(row.hint)).toUpperCase();
  for(const code of [
    'ENJAZ_REGULATORY_WORKSPACE_ACCESS_DENIED','ENJAZ_REGULATORY_SEARCH_INPUT_INVALID',
    'ENJAZ_REGULATORY_ASOF_AMBIGUOUS','ENJAZ_REGULATORY_SOURCE_NOT_FOUND'
  ])if(message.includes(code))return code;
  if(message.includes('INSUFFICIENT')||message.includes('PERMISSION'))return 'ENJAZ_REGULATORY_WORKSPACE_ACCESS_DENIED';
  return 'REGULATORY_SOURCE_UNAVAILABLE';
}
function statusFor(code:string){
  if(code==='AUTH_REQUIRED'||code==='AUTH_INVALID')return 401;
  if(code==='ENJAZ_REGULATORY_WORKSPACE_ACCESS_DENIED')return 403;
  if(code==='ENJAZ_REGULATORY_SOURCE_NOT_FOUND')return 404;
  if(code==='ENJAZ_REGULATORY_ASOF_AMBIGUOUS'||code==='REGULATORY_VERSION_BINDING_CONFLICT')return 409;
  if(code==='ENJAZ_REGULATORY_SEARCH_INPUT_INVALID'||code.endsWith('_INVALID')||code==='REQUEST_FIELD_FORBIDDEN'||code==='OPERATION_FORBIDDEN')return 400;
  return 500;
}
function messageFor(code:string){
  switch(code){
    case 'AUTH_REQUIRED':return 'Authentication is required.';
    case 'AUTH_INVALID':return 'Authentication is invalid.';
    case 'ENJAZ_REGULATORY_WORKSPACE_ACCESS_DENIED':return 'Regulatory knowledge is not available to this workspace actor.';
    case 'ENJAZ_REGULATORY_SEARCH_INPUT_INVALID':return 'Regulatory search input is invalid.';
    case 'ENJAZ_REGULATORY_ASOF_AMBIGUOUS':return 'Regulatory authority is ambiguous for the requested as-of date.';
    case 'ENJAZ_REGULATORY_SOURCE_NOT_FOUND':return 'Regulatory source was not found.';
    case 'REGULATORY_VERSION_BINDING_CONFLICT':return 'Regulatory source version changed between search and retrieval.';
    default:return 'Regulatory assistance could not be completed.';
  }
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json(405,errorEnvelope(null,'METHOD_NOT_ALLOWED','POST is required.'));

  let parsed:RegulatoryAssistanceRequest|null=null;
  try{
    const auth=req.headers.get('Authorization')??'';
    const token=auth.startsWith('Bearer ')?auth.slice(7).trim():'';
    if(!token)return json(401,errorEnvelope(null,'AUTH_REQUIRED',messageFor('AUTH_REQUIRED')));

    parsed=parseRegulatoryAssistanceRequest(await req.json());
    const url=Deno.env.get('SUPABASE_URL');
    if(!url)throw new Error('SERVER_URL_UNAVAILABLE');
    const userClient=createClient(url,publicKey(),{
      global:{headers:{Authorization:'Bearer '+token}},
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    });
    const user=await userClient.auth.getUser(token);
    if(user.error||!user.data.user)return json(401,errorEnvelope(parsed.requestId,'AUTH_INVALID',messageFor('AUTH_INVALID')));

    const search=await userClient.rpc('search_regulatory_knowledge_v1',{
      p_workspace_id:parsed.workspaceId,p_query:parsed.query,p_kind:null,p_scope:null,p_as_of:parsed.asOf,p_limit:parsed.limit,
    });
    if(search.error){
      const code=databaseCode(search.error);
      return json(statusFor(code),errorEnvelope(parsed.requestId,code,messageFor(code)));
    }
    const root=record(search.data,'REGULATORY_SEARCH');
    if(root.schema!=='enjaz.regulatory-knowledge.search.v1'||!Array.isArray(root.items))throw new Error('REGULATORY_SEARCH_RESPONSE_INVALID');
    const refs=root.items.map((value)=>{
      const item=record(value,'REGULATORY_SEARCH_ITEM');
      const sourceId=text(item.sourceId),versionId=text(item.versionId);
      if(item.authoritative!==true||!UUID.test(sourceId)||!UUID.test(versionId)||item.asOf!==parsed!.asOf)throw new Error('REGULATORY_SEARCH_RESPONSE_INVALID');
      return Object.freeze({sourceId,versionId});
    });

    const entries:unknown[]=[];
    for(const ref of refs){
      const response=await userClient.rpc('get_regulatory_knowledge_entry_v1',{
        p_workspace_id:parsed.workspaceId,p_source_id:ref.sourceId,p_as_of:parsed.asOf,
      });
      if(response.error){
        const code=databaseCode(response.error);
        return json(statusFor(code),errorEnvelope(parsed.requestId,code,messageFor(code)));
      }
      const entry=record(response.data,'REGULATORY_ENTRY');
      const official=entry.configured===true?record(entry.official,'REGULATORY_OFFICIAL'):null;
      if(official&&official.versionId!==ref.versionId)throw new Error('REGULATORY_VERSION_BINDING_CONFLICT');
      entries.push(response.data);
    }

    const result=buildRegulatoryAssistanceResult(parsed,entries);
    return json(200,successEnvelope(parsed.requestId,result));
  }catch(error){
    const raw=error instanceof Error?error.message:'REGULATORY_ASSISTANCE_FAILED';
    const known=new Set([
      'REQUEST_INVALID','REQUEST_FIELD_FORBIDDEN','WORKSPACE_ID_INVALID','REQUEST_ID_INVALID','OPERATION_FORBIDDEN','QUERY_INVALID','AS_OF_INVALID','LIMIT_INVALID',
      'REGULATORY_SEARCH_RESPONSE_INVALID','REGULATORY_ENTRY_INVALID','REGULATORY_ENTRY_SCHEMA_INVALID','REGULATORY_ENTRY_WORKSPACE_INVALID','REGULATORY_ENTRY_AS_OF_INVALID',
      'REGULATORY_WORKSPACE_MISMATCH','REGULATORY_ASOF_MISMATCH','REGULATORY_ASOF_AMBIGUOUS','REGULATORY_VERSION_BINDING_CONFLICT'
    ]);
    const code=known.has(raw)?raw:'REGULATORY_ASSISTANCE_FAILED';
    console.error('enjaz-regulatory-assistant',code);
    return json(statusFor(code),errorEnvelope(parsed?.requestId??null,code,messageFor(code)));
  }
});
