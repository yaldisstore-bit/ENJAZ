import { createClient } from 'npm:@supabase/supabase-js@2.114.0';

const BUCKET='enjaz-documents-private';
const MAX_BYTES=52428800;
const ALLOWED_MIME=['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] as const;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type,x-client-info,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
type J=Record<string,unknown>;
type Claim={operationId:string;documentId:string;versionNumber:number;bucket:string;path:string;title:string;fileName:string;mimeType:string;byteSize:number;checksum:string|null;state:'prepared';binaryAuthoritative:false};
const out=(s:number,b:J)=>new Response(JSON.stringify(b),{status:s,headers:cors});
const txt=(v:unknown,n:number)=>{if(typeof v!=='string'||!v.trim()||v.length>n)throw new Error('INVALID_INPUT');return v.trim()};
const uid=(v:unknown)=>{const s=txt(v,64);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s))throw new Error('INVALID_UUID');return s};
function secret(){const modern=Deno.env.get('SUPABASE_SECRET_KEYS');if(modern){try{const p=JSON.parse(modern) as Record<string,string>;if(typeof p.default==='string'&&p.default)return p.default}catch{}}const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(legacy)return legacy;throw new Error('SERVER_SECRET_UNAVAILABLE')}
function publicKey(){const k=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY');if(k)return k;throw new Error('SERVER_PUBLIC_KEY_UNAVAILABLE')}
function claim(v:unknown):Claim{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('INVALID_CLAIM');const r=v as J;const c={operationId:uid(r.operationId),documentId:uid(r.documentId),versionNumber:Number(r.versionNumber),bucket:txt(r.bucket,80),path:txt(r.path,1200),title:txt(r.title,320),fileName:txt(r.fileName,240),mimeType:txt(r.mimeType,160).toLowerCase(),byteSize:Number(r.byteSize),checksum:r.checksum===null?null:typeof r.checksum==='string'?r.checksum:null,state:r.state,binaryAuthoritative:r.binaryAuthoritative} as Claim;if(c.bucket!==BUCKET||c.state!=='prepared'||c.binaryAuthoritative!==false||!Number.isSafeInteger(c.versionNumber)||c.versionNumber<1||!Number.isSafeInteger(c.byteSize)||c.byteSize<1||c.byteSize>MAX_BYTES||!ALLOWED_MIME.includes(c.mimeType as typeof ALLOWED_MIME[number]))throw new Error('INVALID_CLAIM');return c}
async function ensureBucket(admin:ReturnType<typeof createClient>){const got=await admin.storage.getBucket(BUCKET);if(!got.error&&got.data){if(got.data.public===true)throw new Error('BUCKET_MUST_BE_PRIVATE');return}const made=await admin.storage.createBucket(BUCKET,{public:false,fileSizeLimit:MAX_BYTES,allowedMimeTypes:[...ALLOWED_MIME]});if(made.error&&!/already exists/i.test(made.error.message))throw made.error}
function objectSize(v:unknown){if(!v||typeof v!=='object')return NaN;const r=v as J;if(typeof r.size==='number')return r.size;const m=r.metadata;if(m&&typeof m==='object'&&!Array.isArray(m)){const n=Number((m as J).size);if(Number.isFinite(n))return n}return NaN}
function objectMime(v:unknown){if(!v||typeof v!=='object')return null;const r=v as J;if(typeof r.contentType==='string')return r.contentType;const m=r.metadata;if(m&&typeof m==='object'&&!Array.isArray(m)){const q=m as J;if(typeof q.mimetype==='string')return q.mimetype;if(typeof q.contentType==='string')return q.contentType}return null}
async function fail(admin:ReturnType<typeof createClient>,operationId:string,code:string,path?:string){if(path)await admin.storage.from(BUCKET).remove([path]);await admin.rpc('fail_document_upload_v1',{p_operation_id:operationId,p_failure_code:code})}

Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});if(req.method!=='POST')return out(405,{ok:false,error:'METHOD_NOT_ALLOWED'});let stage='input';try{
  const len=Number(req.headers.get('content-length')||'0');if(Number.isFinite(len)&&len>32768)return out(413,{ok:false,error:'REQUEST_TOO_LARGE'});
  const auth=req.headers.get('authorization')||'';if(!/^Bearer\s+\S+$/i.test(auth))return out(401,{ok:false,error:'AUTH_REQUIRED'});
  const url=Deno.env.get('SUPABASE_URL');if(!url)throw new Error('SERVER_URL_UNAVAILABLE');
  const userClient=createClient(url,publicKey(),{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const who=await userClient.auth.getUser();if(who.error||!who.data.user)return out(401,{ok:false,error:'AUTH_INVALID'});
  const admin=createClient(url,secret(),{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const body=await req.json() as J,action=txt(body.action,32);stage='storage_init';await ensureBucket(admin);
  if(action==='prepare'){
    stage='prepare_rpc';const args={p_workspace_id:uid(body.workspaceId),p_operation_id:uid(body.operationId),p_title:txt(body.title,320),p_original_file_name:txt(body.fileName,240),p_mime_type:txt(body.mimeType,160),p_byte_size:Number(body.byteSize),p_document_id:body.documentId?uid(body.documentId):null,p_document_type:typeof body.documentType==='string'&&body.documentType.trim()?body.documentType.trim():null,p_company_id:body.companyId?uid(body.companyId):null,p_transaction_id:body.transactionId?uid(body.transactionId):null,p_checksum:typeof body.checksum==='string'&&body.checksum.trim()?body.checksum.trim():null};
    const p=await userClient.rpc('prepare_document_upload_v1',args);if(p.error)throw p.error;const expected=claim(p.data);
    stage='signed_upload';const signed=await admin.storage.from(BUCKET).createSignedUploadUrl(expected.path,{upsert:false});if(signed.error||!signed.data)throw signed.error??new Error('SIGNED_UPLOAD_UNAVAILABLE');
    return out(200,{ok:true,claim:expected,uploadToken:signed.data.token,signedUrl:signed.data.signedUrl,expiresInSeconds:7200});
  }
  if(action==='acknowledge'){
    const operationId=uid(body.operationId);stage='claim_rpc';const c=await userClient.rpc('get_document_upload_claim_v1',{p_operation_id:operationId});if(c.error)throw c.error;const expected=claim(c.data);
    stage='storage_info';const info=await admin.storage.from(BUCKET).info(expected.path);if(info.error||!info.data)return out(409,{ok:false,error:'STORAGE_OBJECT_NOT_FOUND'});
    const actualSize=objectSize(info.data),actualMime=objectMime(info.data)?.toLowerCase()??null;
    if(!Number.isSafeInteger(actualSize)||actualSize!==expected.byteSize){await fail(admin,operationId,'STORAGE_SIZE_MISMATCH',expected.path);return out(409,{ok:false,error:'STORAGE_SIZE_MISMATCH'})}
    if(!actualMime||actualMime!==expected.mimeType){await fail(admin,operationId,'STORAGE_MIME_MISMATCH',expected.path);return out(409,{ok:false,error:'STORAGE_MIME_MISMATCH'})}
    stage='ack_rpc';const a=await admin.rpc('acknowledge_document_upload_v1',{p_operation_id:operationId,p_storage_path:expected.path,p_actual_byte_size:actualSize,p_actual_mime_type:actualMime});if(a.error)throw a.error;
    return out(200,{ok:true,ack:a.data});
  }
  if(action==='download'){
    stage='download_claim';const d=await userClient.rpc('get_document_download_claim_v1',{p_workspace_id:uid(body.workspaceId),p_document_id:uid(body.documentId),p_version_number:body.versionNumber===null||body.versionNumber===undefined?null:Number(body.versionNumber)});if(d.error)throw d.error;if(!d.data||typeof d.data!=='object')throw new Error('INVALID_DOWNLOAD_CLAIM');const q=d.data as J;if(q.bucket!==BUCKET)throw new Error('INVALID_DOWNLOAD_BUCKET');const path=txt(q.path,1200),fileName=txt(q.fileName,240);
    stage='signed_download';const s=await admin.storage.from(BUCKET).createSignedUrl(path,300,{download:fileName});if(s.error||!s.data)throw s.error??new Error('SIGNED_DOWNLOAD_UNAVAILABLE');return out(200,{ok:true,signedUrl:s.data.signedUrl,expiresInSeconds:300});
  }
  return out(400,{ok:false,error:'UNKNOWN_ACTION'});
}catch(e){const m=e instanceof Error?e.message:'UNKNOWN';if(['INVALID_INPUT','INVALID_UUID'].includes(m))return out(400,{ok:false,error:m});console.error('enjaz-document-vault failed',{stage,kind:e instanceof Error?e.name:'unknown'});return out(500,{ok:false,error:`DOCUMENT_VAULT_${stage.toUpperCase()}_FAILED`})}});
