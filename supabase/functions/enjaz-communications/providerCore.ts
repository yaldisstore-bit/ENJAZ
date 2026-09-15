export type Channel='email'|'sms'|'whatsapp';
export type ProviderEvent='received'|'accepted'|'sent'|'delivered'|'read'|'failed'|'cancelled';

const te=new TextEncoder();
const b64=(bytes:Uint8Array)=>{
  let s='';
  for(const b of bytes)s+=String.fromCharCode(b);
  return btoa(s);
};
const unb64=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const hex=(bytes:Uint8Array)=>[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
const safeEqual=(a:string,b:string)=>{
  if(a.length!==b.length)return false;
  let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;
};

export function normalizeEndpoint(channel:Channel,value:string):string{
  const raw=value.trim();
  if(channel==='email'){
    const match=raw.match(/<([^<>]+)>\s*$/);
    return (match?.[1]??raw).trim().toLowerCase();
  }
  const stripped=raw.replace(/^whatsapp:/i,'').replace(/[^0-9+]/g,'');
  const digits=stripped.replace(/\+/g,'');
  if(!digits)return '';
  return `+${digits}`;
}

export async function endpointFingerprint(channel:Channel,value:string,secret:string):Promise<string>{
  const normalized=normalizeEndpoint(channel,value);
  if(!normalized||!secret)throw new Error('FINGERPRINT_INPUT_INVALID');
  const key=await crypto.subtle.importKey('raw',te.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,te.encode(`${channel}\u001f${normalized}`))));
}

export function renderMergeFields(template:string,fields:Record<string,string|number|boolean|null|undefined>):string{
  return template.replace(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g,(_all,key:string)=>{
    const value=fields[key];
    if(value===null||value===undefined)throw new Error(`MERGE_FIELD_MISSING:${key}`);
    return String(value);
  });
}

export function mapTwilioStatus(value:string):ProviderEvent|null{
  switch(value.trim().toLowerCase()){
    case 'queued':case 'sending':return 'accepted';
    case 'sent':return 'sent';
    case 'delivered':return 'delivered';
    case 'read':return 'read';
    case 'failed':case 'undelivered':return 'failed';
    case 'canceled':case 'cancelled':return 'cancelled';
    case 'received':return 'received';
    default:return null;
  }
}

export function mapResendEvent(value:string):ProviderEvent|null{
  switch(value.trim().toLowerCase()){
    case 'email.received':return 'received';
    case 'email.sent':return 'sent';
    case 'email.delivered':return 'delivered';
    case 'email.opened':return 'read';
    case 'email.failed':case 'email.bounced':case 'email.suppressed':return 'failed';
    default:return null;
  }
}

export async function verifyTwilioSignature(input:{url:string;params:URLSearchParams;signature:string;authToken:string}):Promise<boolean>{
  const pairs=[...input.params.entries()].sort((a,b)=>a[0]===b[0]?0:a[0]<b[0]?-1:1);
  let material=input.url;
  for(const [k,v] of pairs)material+=k+v;
  const key=await crypto.subtle.importKey('raw',te.encode(input.authToken),{name:'HMAC',hash:'SHA-1'},false,['sign']);
  const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,te.encode(material)));
  return safeEqual(b64(digest),input.signature.trim());
}

export async function verifySvixSignature(input:{payload:string;id:string;timestamp:string;signature:string;secret:string;nowSeconds?:number;toleranceSeconds?:number}):Promise<boolean>{
  const ts=Number(input.timestamp);
  const now=input.nowSeconds??Math.floor(Date.now()/1000);
  const tolerance=input.toleranceSeconds??300;
  if(!Number.isFinite(ts)||Math.abs(now-ts)>tolerance)return false;
  const encoded=input.secret.startsWith('whsec_')?input.secret.slice(6):input.secret;
  let secret:Uint8Array;
  try{secret=unb64(encoded)}catch{return false}
  const key=await crypto.subtle.importKey('raw',secret,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,te.encode(`${input.id}.${input.timestamp}.${input.payload}`))));
  return input.signature.split(' ').some(token=>{
    const [version,value]=token.split(',',2);
    return version==='v1'&&typeof value==='string'&&safeEqual(value,digest);
  });
}

export function twilioDestination(channel:'sms'|'whatsapp',value:string):string{
  const normalized=normalizeEndpoint(channel,value);
  if(!normalized)throw new Error('DESTINATION_INVALID');
  return channel==='whatsapp'?`whatsapp:${normalized}`:normalized;
}

export function summarize(body:string,max=1200):string{
  const compact=body.replace(/\s+/g,' ').trim();
  return compact.slice(0,max)||'(no text body)';
}
