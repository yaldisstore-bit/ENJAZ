import { createClient } from 'npm:@supabase/supabase-js@2.114.0';
import {
  endpointFingerprint,mapResendEvent,mapTwilioStatus,normalizeEndpoint,summarize,twilioDestination,
  verifySvixSignature,verifyTwilioSignature,type Channel,
} from './providerCore.ts';

type J=Record<string,unknown>;
type ProviderConfig={
  resendApiKey?:string; resendWebhookSecret?:string;
  twilioAccountSid?:string; twilioAuthToken?:string;
};
type Account={id:string;workspace_id:string;channel:Channel;provider:string;external_account_ref:string;enabled:boolean;capabilities:string[]};
type DispatchRow={id:string;workspace_id:string;provider_account_id:string;communication_id:string;status:string};
type Communication={id:string;workspace_id:string;contact_id:string|null;transaction_id:string|null;company_id:string|null;subject:string|null;body_text:string;summary:string;channel:Channel};
type DocumentRow={id:string;storage_path:string;mime_type:string;size_bytes:number;original_file_name:string|null;title:string;status:string;archived_at:string|null};

const BUCKET='enjaz-documents-private';
const cors={
  'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,x-enjaz-communications-key',
  'Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
};
const out=(status:number,body:J,headers:HeadersInit={})=>new Response(JSON.stringify(body),{status,headers:{...cors,...headers}});
const uid=(value:unknown)=>{
  if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw new Error('INVALID_UUID');
  return value;
};
const txt=(value:unknown,max:number)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('INVALID_TEXT');return value.trim()};
const optionalText=(value:unknown,max:number)=>typeof value==='string'&&value.trim()?value.trim().slice(0,max):null;
const serviceKey=()=>{
  const modern=Deno.env.get('SUPABASE_SECRET_KEYS');
  if(modern)try{const parsed=JSON.parse(modern) as Record<string,string>;if(parsed.default)return parsed.default}catch{}
  const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(legacy)return legacy;
  throw new Error('SERVER_SECRET_UNAVAILABLE');
};
const constantTime=(a:string,b:string)=>{if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0};
const hex=async(buffer:ArrayBuffer)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(v=>v.toString(16).padStart(2,'0')).join('');
const bytesToBase64=(bytes:Uint8Array)=>{let s='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)s+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(s)};
const stripHtml=(html:string)=>html.replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();

function configs():Record<string,ProviderConfig>{
  const raw=Deno.env.get('ENJAZ_COMM_PROVIDER_CONFIG');if(!raw)return {};
  try{const parsed=JSON.parse(raw);return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed as Record<string,ProviderConfig>:{};}catch{throw new Error('PROVIDER_CONFIG_INVALID')}
}
function providerConfig(id:string){const c=configs()[id];if(!c)throw new Error('PROVIDER_CONFIG_MISSING');return c}
function publicBase(){return (Deno.env.get('ENJAZ_COMMUNICATIONS_PUBLIC_URL')||'').replace(/\/+$/,'')}
function fingerprintSecret(){const s=Deno.env.get('ENJAZ_ENDPOINT_FINGERPRINT_SECRET');if(!s)throw new Error('FINGERPRINT_SECRET_MISSING');return s}
function admin(){const url=Deno.env.get('SUPABASE_URL');if(!url)throw new Error('SERVER_URL_UNAVAILABLE');return createClient(url,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}
function internalAuthorized(req:Request){const expected=Deno.env.get('ENJAZ_COMMUNICATIONS_INTERNAL_KEY')||'';const got=req.headers.get('x-enjaz-communications-key')||'';return expected.length>=32&&constantTime(expected,got)}

async function getAccount(db:ReturnType<typeof createClient>,id:string):Promise<Account>{
  const {data,error}=await db.from('communication_provider_accounts').select('id,workspace_id,channel,provider,external_account_ref,enabled,capabilities').eq('id',id).single();
  if(error||!data)throw new Error('PROVIDER_ACCOUNT_NOT_FOUND');
  const row=data as Account;if(!row.enabled)throw new Error('PROVIDER_ACCOUNT_DISABLED');return row;
}
async function getDispatchMaterial(db:ReturnType<typeof createClient>,workspaceId:string,commandId:string){
  const commandResult=await db.from('communication_outbound_commands').select('id,workspace_id,provider_account_id,communication_id,status').eq('workspace_id',workspaceId).eq('id',commandId).single();
  if(commandResult.error||!commandResult.data)throw new Error('OUTBOUND_COMMAND_NOT_FOUND');
  const command=commandResult.data as DispatchRow;
  if(command.status!=='queued')throw new Error('OUTBOUND_COMMAND_NOT_QUEUED');
  const account=await getAccount(db,command.provider_account_id);
  if(account.workspace_id!==workspaceId)throw new Error('PROVIDER_WORKSPACE_MISMATCH');
  const commResult=await db.from('communications').select('id,workspace_id,contact_id,transaction_id,company_id,subject,body_text,summary,channel').eq('workspace_id',workspaceId).eq('id',command.communication_id).single();
  if(commResult.error||!commResult.data)throw new Error('COMMUNICATION_NOT_FOUND');
  const communication=commResult.data as Communication;
  if(communication.channel!==account.channel)throw new Error('PROVIDER_CHANNEL_MISMATCH');
  if(!communication.contact_id)throw new Error('COMMUNICATION_CONTACT_MISSING');
  const contactResult=await db.from('contacts').select('id,email,phone,status,deleted_at').eq('workspace_id',workspaceId).eq('id',communication.contact_id).single();
  if(contactResult.error||!contactResult.data||contactResult.data.status!=='active'||contactResult.data.deleted_at)throw new Error('CONTACT_UNAVAILABLE');
  const links=await db.from('communication_document_links').select('document_id').eq('workspace_id',workspaceId).eq('communication_id',communication.id);
  if(links.error)throw links.error;
  const ids=(links.data??[]).map((x:J)=>String(x.document_id));
  let documents:DocumentRow[]=[];
  if(ids.length){const docs=await db.from('documents').select('id,storage_path,mime_type,size_bytes,original_file_name,title,status,archived_at').eq('workspace_id',workspaceId).in('id',ids);if(docs.error)throw docs.error;documents=(docs.data??[]) as DocumentRow[];}
  return {command,account,communication,contact:contactResult.data as J,documents};
}

function allowedVaultMime(mime:string){return ['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mime)}
function starts(bytes:Uint8Array,sig:number[]){return sig.every((v,i)=>bytes[i]===v)}
function containsAscii(bytes:Uint8Array,needle:string){const lower=new TextDecoder().decode(bytes).toLowerCase();return lower.includes(needle.toLowerCase())}
function assertSafeBinary(bytes:Uint8Array,mime:string){
  if(!allowedVaultMime(mime)||bytes.byteLength<1||bytes.byteLength>52_428_800)throw new Error('ATTACHMENT_TYPE_OR_SIZE_FORBIDDEN');
  if(starts(bytes,[0x4d,0x5a])||starts(bytes,[0x7f,0x45,0x4c,0x46]))throw new Error('ATTACHMENT_EXECUTABLE_FORBIDDEN');
  const head=bytes.subarray(0,Math.min(bytes.length,1_048_576));const tail=bytes.subarray(Math.max(0,bytes.length-1_048_576));
  if(containsAscii(head,'<script')||containsAscii(head,'<!doctype html')||containsAscii(head,'<svg'))throw new Error('ATTACHMENT_SCRIPTABLE_FORBIDDEN');
  if(mime==='application/pdf'&&(!starts(bytes,[0x25,0x50,0x44,0x46,0x2d])||!containsAscii(tail,'%%EOF')))throw new Error('ATTACHMENT_PDF_CORRUPT');
  if(mime==='image/jpeg'&&(!starts(bytes,[0xff,0xd8,0xff])||bytes.at(-2)!==0xff||bytes.at(-1)!==0xd9))throw new Error('ATTACHMENT_JPEG_CORRUPT');
  if(mime==='image/png'&&!starts(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))throw new Error('ATTACHMENT_PNG_CORRUPT');
  if(mime==='image/webp'&&!(containsAscii(bytes.subarray(0,4),'RIFF')&&containsAscii(bytes.subarray(8,12),'WEBP')))throw new Error('ATTACHMENT_WEBP_CORRUPT');
  if(mime.includes('officedocument')&&!starts(bytes,[0x50,0x4b,0x03,0x04]))throw new Error('ATTACHMENT_OOXML_CORRUPT');
}

async function prepareOutboundAttachments(db:ReturnType<typeof createClient>,account:Account,documents:DocumentRow[]){
  for(const d of documents)if(d.status!=='ready'||d.archived_at)throw new Error('ATTACHMENT_NOT_READY');
  if(account.provider==='resend'){
    const total=documents.reduce((n,d)=>n+Number(d.size_bytes),0);if(total>40_000_000)throw new Error('RESEND_ATTACHMENT_LIMIT');
    const result=[] as {filename:string;content:string}[];
    for(const d of documents){const got=await db.storage.from(BUCKET).download(d.storage_path);if(got.error||!got.data)throw new Error('ATTACHMENT_DOWNLOAD_FAILED');const bytes=new Uint8Array(await got.data.arrayBuffer());assertSafeBinary(bytes,d.mime_type);result.push({filename:d.original_file_name||d.title,content:bytesToBase64(bytes)});}
    return {resend:result,twilio:[] as string[]};
  }
  if(account.provider==='twilio'){
    const limit=account.channel==='whatsapp'?20_000_000:5_000_000;
    if(documents.reduce((n,d)=>n+Number(d.size_bytes),0)>limit)throw new Error('TWILIO_ATTACHMENT_LIMIT');
    const urls=[] as string[];
    for(const d of documents){if(!allowedVaultMime(d.mime_type))throw new Error('ATTACHMENT_TYPE_FORBIDDEN');const signed=await db.storage.from(BUCKET).createSignedUrl(d.storage_path,3600);if(signed.error||!signed.data?.signedUrl)throw new Error('ATTACHMENT_SIGNING_FAILED');urls.push(signed.data.signedUrl);}
    return {resend:[] as {filename:string;content:string}[],twilio:urls};
  }
  throw new Error('PROVIDER_UNSUPPORTED');
}

async function dispatch(req:Request){
  if(!internalAuthorized(req))return out(401,{ok:false,error:'INTERNAL_AUTH_REQUIRED'});
  const body=await req.json() as J;const workspaceId=uid(body.workspaceId),commandId=uid(body.commandId);const db=admin();
  const material=await getDispatchMaterial(db,workspaceId,commandId);const cfg=providerConfig(material.account.id);
  if(material.account.provider==='resend'&&!cfg.resendApiKey)throw new Error('RESEND_API_KEY_MISSING');
  if(material.account.provider==='twilio'&&(!cfg.twilioAccountSid||!cfg.twilioAuthToken))throw new Error('TWILIO_CREDENTIALS_MISSING');
  const attachments=await prepareOutboundAttachments(db,material.account,material.documents);
  const claimed=await db.rpc('claim_communication_outbound_dispatch_v1',{p_workspace_id:workspaceId,p_command_id:commandId});if(claimed.error)throw claimed.error;
  const claim=claimed.data as J;const dispatchToken=uid(claim.dispatchToken);let providerTouched=false;
  try{
    let providerMessageId='';let providerEventId='';let providerStatus='accepted';
    if(material.account.provider==='resend'){
      const to=txt(material.contact.email,320);const subject=txt(claim.subject,998);providerTouched=true;
      const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${cfg.resendApiKey}`,'Content-Type':'application/json','Idempotency-Key':String(claim.idempotencyKey)},body:JSON.stringify({from:material.account.external_account_ref,to:[to],subject,text:String(claim.bodyText),attachments:attachments.resend})});
      const responseBody=await response.json().catch(()=>({})) as J;
      if(!response.ok){await db.rpc('fail_communication_outbound_dispatch_v1',{p_workspace_id:workspaceId,p_command_id:commandId,p_dispatch_token:dispatchToken,p_failure_code:`RESEND_HTTP_${response.status}`,p_outcome_ambiguous:response.status>=500});return out(response.status>=500?503:422,{ok:false,error:'PROVIDER_SEND_FAILED',providerStatus:response.status});}
      providerMessageId=txt(responseBody.id,500);providerEventId=`dispatch:${providerMessageId}`;providerStatus='accepted';
    }else if(material.account.provider==='twilio'){
      const channel=material.account.channel;if(channel!=='sms'&&channel!=='whatsapp')throw new Error('TWILIO_CHANNEL_INVALID');
      const to=twilioDestination(channel,txt(material.contact.phone,120));let from=material.account.external_account_ref;if(channel==='whatsapp'&&!from.startsWith('whatsapp:'))from=`whatsapp:${normalizeEndpoint('whatsapp',from)}`;
      const params=new URLSearchParams({To:to,From:from,Body:String(claim.bodyText)});const base=publicBase();if(!base)throw new Error('PUBLIC_URL_MISSING');params.set('StatusCallback',`${base}/webhook/twilio/${material.account.id}`);for(const url of attachments.twilio)params.append('MediaUrl',url);
      providerTouched=true;const basic=btoa(`${cfg.twilioAccountSid}:${cfg.twilioAuthToken}`);
      const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(cfg.twilioAccountSid!)}/Messages.json`,{method:'POST',headers:{Authorization:`Basic ${basic}`,'Content-Type':'application/x-www-form-urlencoded'},body:params.toString()});
      const responseBody=await response.json().catch(()=>({})) as J;
      if(!response.ok){await db.rpc('fail_communication_outbound_dispatch_v1',{p_workspace_id:workspaceId,p_command_id:commandId,p_dispatch_token:dispatchToken,p_failure_code:`TWILIO_HTTP_${response.status}`,p_outcome_ambiguous:response.status>=500});return out(response.status>=500?503:422,{ok:false,error:'PROVIDER_SEND_FAILED',providerStatus:response.status});}
      providerMessageId=txt(responseBody.sid,500);providerEventId=`dispatch:${providerMessageId}`;providerStatus=mapTwilioStatus(String(responseBody.status||'queued'))==='sent'?'sent':'accepted';
    }else throw new Error('PROVIDER_UNSUPPORTED');
    const completed=await db.rpc('complete_communication_outbound_dispatch_v1',{p_workspace_id:workspaceId,p_command_id:commandId,p_dispatch_token:dispatchToken,p_provider_message_id:providerMessageId,p_provider_event_id:providerEventId,p_provider_status:providerStatus,p_occurred_at:new Date().toISOString()});if(completed.error)throw completed.error;
    return out(200,{ok:true,dispatch:completed.data});
  }catch(error){
    const code=error instanceof Error?error.message:'DISPATCH_FAILED';
    const failed=await db.rpc('fail_communication_outbound_dispatch_v1',{p_workspace_id:workspaceId,p_command_id:commandId,p_dispatch_token:dispatchToken,p_failure_code:code.slice(0,120),p_outcome_ambiguous:providerTouched});
    if(failed.error)console.error('dispatch fail-state persistence error',failed.error);
    throw error;
  }
}

async function importInboundAttachment(db:ReturnType<typeof createClient>,input:{account:Account;communicationId:string;fileName:string;mimeType:string;bytes:Uint8Array}){
  assertSafeBinary(input.bytes,input.mimeType);const documentId=crypto.randomUUID();const checksum=await hex(input.bytes.buffer.slice(input.bytes.byteOffset,input.bytes.byteOffset+input.bytes.byteLength));const clean=input.fileName.replace(/[\\/\u0000-\u001f]/g,'_').slice(0,240)||'attachment';const path=`${input.account.workspace_id}/communication-attachments/${input.communicationId}/${documentId}/${clean}`;
  const uploaded=await db.storage.from(BUCKET).upload(path,input.bytes,{contentType:input.mimeType,upsert:false});if(uploaded.error)throw uploaded.error;
  const registered=await db.rpc('register_communication_provider_attachment_v1',{p_workspace_id:input.account.workspace_id,p_communication_id:input.communicationId,p_document_id:documentId,p_storage_path:path,p_title:clean,p_file_name:clean,p_mime_type:input.mimeType,p_byte_size:input.bytes.byteLength,p_checksum:checksum});
  if(registered.error){await db.storage.from(BUCKET).remove([path]);throw registered.error}
}

async function handleTwilio(req:Request,providerAccountId:string){
  const db=admin(),account=await getAccount(db,providerAccountId),cfg=providerConfig(providerAccountId);if(account.provider!=='twilio'||!cfg.twilioAuthToken)throw new Error('TWILIO_CONFIG_INVALID');
  const raw=await req.text();const params=new URLSearchParams(raw);const signature=req.headers.get('x-twilio-signature')||'';const exactUrl=req.url;
  if(!await verifyTwilioSignature({url:exactUrl,params,signature,authToken:cfg.twilioAuthToken}))return out(401,{ok:false,error:'WEBHOOK_SIGNATURE_INVALID'});
  const messageSid=txt(params.get('MessageSid')||params.get('SmsSid'),500);const status=params.get('MessageStatus')||params.get('SmsStatus');
  if(status){const mapped=mapTwilioStatus(status);if(!mapped)return out(200,{ok:true,ignored:true});const event=await db.rpc('record_communication_provider_event_v1',{p_workspace_id:account.workspace_id,p_provider_account_id:account.id,p_provider_message_id:messageSid,p_provider_event_id:`${messageSid}:${status.toLowerCase()}`,p_event_type:mapped,p_error_code:optionalText(params.get('ErrorCode'),120),p_occurred_at:new Date().toISOString()});if(event.error)throw event.error;return out(200,{ok:true,event:event.data});}
  const from=txt(params.get('From'),160);const body=params.get('Body')||'';const fp=await endpointFingerprint(account.channel,from,fingerprintSecret());
  const ingested=await db.rpc('ingest_communication_provider_message_v1',{p_workspace_id:account.workspace_id,p_provider_account_id:account.id,p_provider_message_id:messageSid,p_provider_event_id:`${messageSid}:received`,p_endpoint_fingerprint:fp,p_subject:null,p_body_text:body||'(media message)',p_summary:summarize(body||'(media message)'),p_occurred_at:new Date().toISOString()});if(ingested.error)throw ingested.error;
  const communicationId=uid((ingested.data as J).communicationId);const mediaCount=Math.min(Number(params.get('NumMedia')||0),10);
  for(let i=0;i<mediaCount;i++)try{const mediaUrl=txt(params.get(`MediaUrl${i}`),1500);const mime=txt(params.get(`MediaContentType${i}`),160).toLowerCase();if(!allowedVaultMime(mime))continue;const auth=btoa(`${cfg.twilioAccountSid||''}:${cfg.twilioAuthToken}`);const media=await fetch(mediaUrl,{headers:{Authorization:`Basic ${auth}`}});if(!media.ok)throw new Error(`TWILIO_MEDIA_HTTP_${media.status}`);const bytes=new Uint8Array(await media.arrayBuffer());const ext=mime==='application/pdf'?'pdf':mime==='image/jpeg'?'jpg':mime==='image/png'?'png':mime==='image/webp'?'webp':'bin';await importInboundAttachment(db,{account,communicationId,fileName:`twilio-${messageSid}-${i}.${ext}`,mimeType:mime,bytes});}catch(error){console.error('Twilio attachment import failed',error)}
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>',{status:200,headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});
}

async function resendGet(apiKey:string,path:string){const r=await fetch(`https://api.resend.com${path}`,{headers:{Authorization:`Bearer ${apiKey}`}});const data=await r.json().catch(()=>({})) as J;if(!r.ok)throw new Error(`RESEND_HTTP_${r.status}`);return data}
async function handleResend(req:Request,providerAccountId:string){
  const db=admin(),account=await getAccount(db,providerAccountId),cfg=providerConfig(providerAccountId);if(account.provider!=='resend'||!cfg.resendApiKey||!cfg.resendWebhookSecret)throw new Error('RESEND_CONFIG_INVALID');
  const payload=await req.text();const id=req.headers.get('svix-id')||'',timestamp=req.headers.get('svix-timestamp')||'',signature=req.headers.get('svix-signature')||'';
  if(!await verifySvixSignature({payload,id,timestamp,signature,secret:cfg.resendWebhookSecret}))return out(401,{ok:false,error:'WEBHOOK_SIGNATURE_INVALID'});
  const event=JSON.parse(payload) as J;const type=String(event.type||'');const data=(event.data&&typeof event.data==='object'?event.data:{}) as J;const emailId=txt(data.email_id,500);const mapped=mapResendEvent(type);
  if(type==='email.received'){
    const full=await resendGet(cfg.resendApiKey,`/emails/receiving/${encodeURIComponent(emailId)}`);const from=txt(full.from||data.from,320);const subject=optionalText(full.subject||data.subject,998);const text=typeof full.text==='string'&&full.text.trim()?full.text:typeof full.html==='string'?stripHtml(full.html):subject||'(received email)';const fp=await endpointFingerprint('email',from,fingerprintSecret());
    const ingested=await db.rpc('ingest_communication_provider_message_v1',{p_workspace_id:account.workspace_id,p_provider_account_id:account.id,p_provider_message_id:emailId,p_provider_event_id:id||`${emailId}:received`,p_endpoint_fingerprint:fp,p_subject:subject,p_body_text:text.slice(0,200000),p_summary:summarize(text),p_occurred_at:String(full.created_at||data.created_at||event.created_at||new Date().toISOString())});if(ingested.error)throw ingested.error;
    const communicationId=uid((ingested.data as J).communicationId);const attachments=Array.isArray(full.attachments)?full.attachments:[];
    for(const item of attachments.slice(0,20))try{const a=item as J;const mime=txt(a.content_type,160).toLowerCase();if(!allowedVaultMime(mime))continue;const attachmentId=txt(a.id,500);const meta=await resendGet(cfg.resendApiKey,`/emails/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`);const downloadUrl=txt(meta.download_url,2000);const file=await fetch(downloadUrl);if(!file.ok)throw new Error(`RESEND_ATTACHMENT_HTTP_${file.status}`);const bytes=new Uint8Array(await file.arrayBuffer());await importInboundAttachment(db,{account,communicationId,fileName:txt(meta.filename||a.filename,240),mimeType:mime,bytes});}catch(error){console.error('Resend attachment import failed',error)}
    return out(200,{ok:true,communicationId});
  }
  if(!mapped)return out(200,{ok:true,ignored:true});const recorded=await db.rpc('record_communication_provider_event_v1',{p_workspace_id:account.workspace_id,p_provider_account_id:account.id,p_provider_message_id:emailId,p_provider_event_id:id||`${emailId}:${type}`,p_event_type:mapped,p_error_code:null,p_occurred_at:String(data.created_at||event.created_at||new Date().toISOString())});if(recorded.error)throw recorded.error;return out(200,{ok:true,event:recorded.data});
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return out(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const url=new URL(req.url);const parts=url.pathname.split('/').filter(Boolean);const webhookIndex=parts.lastIndexOf('webhook');
    if(webhookIndex>=0){const provider=parts[webhookIndex+1],accountId=uid(parts[webhookIndex+2]);if(provider==='twilio')return await handleTwilio(req,accountId);if(provider==='resend')return await handleResend(req,accountId);return out(404,{ok:false,error:'WEBHOOK_PROVIDER_UNKNOWN'});}
    if(parts.at(-1)==='dispatch'||url.searchParams.get('action')==='dispatch')return await dispatch(req);
    return out(404,{ok:false,error:'ROUTE_NOT_FOUND'});
  }catch(error){console.error(error);const message=error instanceof Error?error.message:'UNEXPECTED_ERROR';return out(500,{ok:false,error:message});}
});
