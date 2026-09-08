import { createClient } from 'npm:@supabase/supabase-js@2.114.0';

const BUCKET='enjaz-intake-private';
const ALLOWED_MIME=['application/pdf','image/jpeg','image/png'];
const MAX_BYTES=52428800;
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'content-type,x-client-info,apikey',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store',
};

type JsonRecord=Record<string,unknown>;
type UploadClaim={fileId:string;submissionId:string;bucket:string;path:string;byteSize:number;mimeType:string;uploadStatus:string;authoritative:false};

function response(status:number,body:JsonRecord){return new Response(JSON.stringify(body),{status,headers:cors});}
function text(v:unknown,max:number){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error('INVALID_INPUT');return v.trim();}
function token(v:unknown){const s=text(v,64);if(!/^[0-9a-f]{64}$/.test(s))throw new Error('INVALID_TOKEN');return s;}
function uuid(v:unknown){const s=text(v,64);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s))throw new Error('INVALID_FILE_ID');return s;}
function adminKey(){
  const modern=Deno.env.get('SUPABASE_SECRET_KEYS');
  if(modern){try{const parsed=JSON.parse(modern) as Record<string,string>;if(typeof parsed.default==='string'&&parsed.default)return parsed.default;}catch{/* fall through */}}
  const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(legacy)return legacy;
  throw new Error('SERVER_SECRET_UNAVAILABLE');
}
function claim(v:unknown):UploadClaim{
  if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('INVALID_CLAIM');
  const r=v as Record<string,unknown>;
  const c={fileId:uuid(r.fileId),submissionId:uuid(r.submissionId),bucket:text(r.bucket,80),path:text(r.path,240),byteSize:Number(r.byteSize),mimeType:text(r.mimeType,160),uploadStatus:text(r.uploadStatus,40),authoritative:false as const};
  if(c.bucket!==BUCKET||c.uploadStatus!=='pending_upload'||!Number.isSafeInteger(c.byteSize)||c.byteSize<1||c.byteSize>MAX_BYTES||!ALLOWED_MIME.includes(c.mimeType)||r.authoritative!==false)throw new Error('INVALID_CLAIM');
  return c;
}
async function ensurePrivateBucket(admin:ReturnType<typeof createClient>){
  const {data,error}=await admin.storage.getBucket(BUCKET);
  if(!error&&data){
    if(data.public===true)throw new Error('BUCKET_MUST_BE_PRIVATE');
    return;
  }
  const created=await admin.storage.createBucket(BUCKET,{public:false,fileSizeLimit:MAX_BYTES,allowedMimeTypes:ALLOWED_MIME});
  if(created.error&&!/already exists/i.test(created.error.message))throw created.error;
}
function objectMime(info:unknown){
  if(!info||typeof info!=='object')return null;
  const r=info as Record<string,unknown>;
  if(typeof r.contentType==='string')return r.contentType;
  const m=r.metadata;
  if(m&&typeof m==='object'&&!Array.isArray(m)){
    const mr=m as Record<string,unknown>;
    if(typeof mr.mimetype==='string')return mr.mimetype;
    if(typeof mr.contentType==='string')return mr.contentType;
  }
  return null;
}
function objectSize(info:unknown){
  if(!info||typeof info!=='object')return NaN;
  const r=info as Record<string,unknown>;
  if(typeof r.size==='number')return r.size;
  const m=r.metadata;
  if(m&&typeof m==='object'&&!Array.isArray(m)){
    const n=Number((m as Record<string,unknown>).size);
    if(Number.isFinite(n))return n;
  }
  return NaN;
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return response(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const length=Number(req.headers.get('content-length')||'0');
    if(Number.isFinite(length)&&length>16384)return response(413,{ok:false,error:'REQUEST_TOO_LARGE'});
    const body=await req.json() as Record<string,unknown>;
    const action=text(body.action,32);
    const rawToken=token(body.token);
    const fileId=uuid(body.fileId);
    const url=Deno.env.get('SUPABASE_URL');
    if(!url)throw new Error('SERVER_URL_UNAVAILABLE');
    const admin=createClient(url,adminKey(),{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    await ensurePrivateBucket(admin);

    const prepared=await admin.rpc('prepare_intake_file_upload_v1',{p_token:rawToken,p_file_id:fileId});
    if(prepared.error)throw prepared.error;
    const expected=claim(prepared.data);

    if(action==='prepare'){
      const signed=await admin.storage.from(BUCKET).createSignedUploadUrl(expected.path,{upsert:false});
      if(signed.error||!signed.data)throw signed.error??new Error('SIGNED_UPLOAD_UNAVAILABLE');
      const d=signed.data as unknown as Record<string,unknown>;
      return response(200,{ok:true,authoritative:false,fileId:expected.fileId,bucket:BUCKET,path:expected.path,byteSize:expected.byteSize,mimeType:expected.mimeType,uploadToken:typeof d.token==='string'?d.token:null,signedUrl:typeof d.signedUrl==='string'?d.signedUrl:null,expiresInSeconds:7200});
    }

    if(action==='acknowledge'){
      const info=await admin.storage.from(BUCKET).info(expected.path);
      if(info.error||!info.data)return response(409,{ok:false,error:'STORAGE_OBJECT_NOT_FOUND'});
      const actualSize=objectSize(info.data);
      const actualMime=objectMime(info.data);
      if(!Number.isSafeInteger(actualSize)||actualSize!==expected.byteSize)return response(409,{ok:false,error:'STORAGE_SIZE_MISMATCH'});
      if(!actualMime||actualMime.toLowerCase()!==expected.mimeType.toLowerCase())return response(409,{ok:false,error:'STORAGE_MIME_MISMATCH'});
      const ack=await admin.rpc('acknowledge_intake_file_upload_v1',{p_token:rawToken,p_file_id:fileId,p_storage_path:expected.path,p_actual_byte_size:actualSize,p_actual_mime_type:actualMime});
      if(ack.error)throw ack.error;
      return response(200,{ok:true,authoritative:false,fileId:expected.fileId,uploadStatus:'acknowledged'});
    }

    return response(400,{ok:false,error:'UNKNOWN_ACTION'});
  }catch(error){
    const message=error instanceof Error?error.message:'UNKNOWN';
    if(message==='INVALID_INPUT'||message==='INVALID_TOKEN'||message==='INVALID_FILE_ID')return response(400,{ok:false,error:message});
    console.error('enjaz-intake-upload failed',{kind:error instanceof Error?error.name:'unknown'});
    return response(500,{ok:false,error:'INTAKE_UPLOAD_UNAVAILABLE'});
  }
});
