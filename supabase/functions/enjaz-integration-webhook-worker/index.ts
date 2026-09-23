import { createClient } from 'npm:@supabase/supabase-js@2.114.0';

type J = Record<string, unknown>;
const MAX_ATTEMPTS=5;
const RETRY_DELAYS=[60,300,1800,7200] as const;
const JSON_HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};

function serviceKey(){
  const modern=Deno.env.get('SUPABASE_SECRET_KEYS');
  if(modern) try { const parsed=JSON.parse(modern) as Record<string,string>; if(parsed.default) return parsed.default; } catch {}
  const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(legacy) return legacy;
  throw new Error('SERVER_SECRET_UNAVAILABLE');
}
function supabaseUrl(){
  const value=Deno.env.get('SUPABASE_URL');
  if(!value) throw new Error('SERVER_URL_UNAVAILABLE');
  return value.replace(/\/+$/,'');
}
function admin(){
  return createClient(supabaseUrl(),serviceKey(),{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
const out=(status:number,body:J)=>new Response(JSON.stringify(body),{status,headers:JSON_HEADERS});
const uuid=()=>crypto.randomUUID();

async function sameSecret(a:string,b:string){
  const enc=new TextEncoder();
  const [ah,bh]=await Promise.all([
    crypto.subtle.digest('SHA-256',enc.encode(a)),
    crypto.subtle.digest('SHA-256',enc.encode(b)),
  ]);
  const av=new Uint8Array(ah),bv=new Uint8Array(bh);
  let diff=av.length^bv.length;
  for(let i=0;i<Math.max(av.length,bv.length);i++) diff|=(av[i]??0)^(bv[i]??0);
  return diff===0;
}
function isPrivateIpv4(host:string){
  const parts=host.split('.').map(Number);
  if(parts.length!==4||parts.some(v=>!Number.isInteger(v)||v<0||v>255)) return false;
  const [a,b]=parts;
  return a===0||a===10||a===127||(a===169&&b===254)||(a===172&&b!>=16&&b!<=31)||(a===192&&b===168);
}
function safeEndpoint(raw:string){
  try{
    const u=new URL(raw),h=u.hostname.toLowerCase();
    if(u.protocol!=='https:'||u.username||u.password||u.hash||h==='localhost'||h.endsWith('.localhost')||isPrivateIpv4(h)) return null;
    if(h==='::1'||h==='[::1]'||h.startsWith('[fc')||h.startsWith('[fd')||h.startsWith('[fe80:')) return null;
    return u.toString();
  }catch{return null;}
}
function stableBody(payload:unknown){ return JSON.stringify(payload); }
async function hmacHex(secret:string,message:string){
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,enc.encode(message));
  return Array.from(new Uint8Array(sig),b=>b.toString(16).padStart(2,'0')).join('');
}
function classify(status:number|null,error:boolean,attempt:number){
  if(!error&&status!==null&&status>=200&&status<300) return {outcome:'delivered',next:null};
  const retryable=error||status===408||status===425||status===429||(status!==null&&status>=500);
  if(!retryable||attempt>=MAX_ATTEMPTS) return {outcome:'dead_letter',next:null};
  const delay=RETRY_DELAYS[attempt-1];
  if(delay===undefined) return {outcome:'dead_letter',next:null};
  return {outcome:'retryable',next:new Date(Date.now()+delay*1000).toISOString()};
}

Deno.serve(async(req)=>{
  if(req.method!=='POST') return out(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const expected=Deno.env.get('ENJAZ_INTEGRATION_WORKER_KEY')||'';
    const provided=req.headers.get('x-enjaz-integration-worker-key')||'';
    if(expected.length<32||!provided||!(await sameSecret(provided,expected))) return out(401,{ok:false,error:'WORKER_AUTH_REQUIRED'});

    const body=await req.json().catch(()=>({})) as J;
    const requested=Number(body.maxJobs??10);
    const maxJobs=Number.isInteger(requested)?Math.max(1,Math.min(requested,25)):10;
    const db=admin(),workerId=uuid();
    const summary:{delivered:number;retried:number;deadLetter:number;claimed:number}={delivered:0,retried:0,deadLetter:0,claimed:0};

    for(let i=0;i<maxJobs;i++){
      const claim=await db.rpc('integration_claim_webhook_delivery_v1',{p_worker_id:workerId});
      if(claim.error) throw claim.error;
      const job=claim.data as J|null;
      if(!job) break;
      summary.claimed++;

      const jobId=String(job.jobId||''),eventId=String(job.eventId||''),eventType=String(job.eventType||'');
      const endpoint=safeEndpoint(String(job.endpointUrl||''));
      const secret=typeof job.signingSecret==='string'?job.signingSecret:'';
      const attempt=Number(job.attemptNo||0);
      let status:number|null=null,errorCode:string|null=null,failed=false;

      if(!endpoint){ failed=true; errorCode='ENDPOINT_UNSAFE'; }
      else if(secret.length<32){ failed=true; errorCode='SIGNING_SECRET_UNAVAILABLE'; }
      else {
        const rawBody=stableBody(job.payload);
        const timestamp=Math.floor(Date.now()/1000);
        const material=`enjaz.webhook.v1\n${timestamp}\n${eventId}\n${rawBody}`;
        const signature=await hmacHex(secret,material);
        try{
          const response=await fetch(endpoint,{
            method:'POST',
            headers:{
              'Content-Type':'application/json',
              'User-Agent':'ENJAZ-Webhook/1.0',
              'X-ENJAZ-Event-Id':eventId,
              'X-ENJAZ-Event-Type':eventType,
              'X-ENJAZ-Timestamp':String(timestamp),
              'X-ENJAZ-Signature':`v1=${signature}`,
            },
            body:rawBody,
            signal:AbortSignal.timeout(10_000),
            redirect:'error',
          });
          status=response.status;
        }catch(error){
          failed=true;
          errorCode=error instanceof Error&&error.name==='TimeoutError'?'DELIVERY_TIMEOUT':'DELIVERY_NETWORK_ERROR';
        }
      }

      const decision=(errorCode==='ENDPOINT_UNSAFE'||errorCode==='SIGNING_SECRET_UNAVAILABLE')
        ? {outcome:'dead_letter',next:null}
        : classify(status,failed,attempt);

      const complete=await db.rpc('integration_complete_webhook_delivery_v1',{
        p_job_id:jobId,
        p_worker_id:workerId,
        p_outcome:decision.outcome,
        p_http_status:status,
        p_error_code:errorCode,
        p_next_attempt_at:decision.next,
      });
      if(complete.error) throw complete.error;
      if(decision.outcome==='delivered') summary.delivered++;
      else if(decision.outcome==='retryable') summary.retried++;
      else summary.deadLetter++;
    }

    return out(200,{ok:true,...summary});
  }catch(error){
    console.error('integration webhook worker failure',error);
    return out(500,{ok:false,error:'WEBHOOK_WORKER_FAILED'});
  }
});
