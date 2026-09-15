import { createClient } from 'npm:@supabase/supabase-js@2.114.0';

const BUCKET='enjaz-documents-private';
const MAX_BYTES=52_428_800;
const ALLOWED_MIME=['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] as const;
const EXTENSIONS:Record<string,readonly string[]>={
  'application/pdf':['pdf'],'image/jpeg':['jpg','jpeg'],'image/png':['png'],'image/webp':['webp'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['xlsx']
};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type,x-client-info,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
type J=Record<string,unknown>;
type Claim={operationId:string;documentId:string;versionNumber:number;bucket:string;path:string;title:string;fileName:string;mimeType:string;byteSize:number;checksum:string|null;state:'prepared'|'acknowledged';binaryAuthoritative:boolean};

const out=(status:number,body:J)=>new Response(JSON.stringify(body),{status,headers:cors});
const txt=(value:unknown,max:number)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('INVALID_INPUT');return value.trim()};
const uid=(value:unknown)=>{const result=txt(value,64);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result))throw new Error('INVALID_UUID');return result};
const lowerByte=(value:number)=>value>=65&&value<=90?value+32:value;
const starts=(bytes:Uint8Array,signature:readonly number[])=>signature.every((value,index)=>bytes[index]===value);
function containsAscii(bytes:Uint8Array,needle:string){const target=[...needle].map(char=>char.charCodeAt(0));outer:for(let i=0;i<=bytes.length-target.length;i++){for(let j=0;j<target.length;j++)if(lowerByte(bytes[i+j]??-1)!==lowerByte(target[j]??-2))continue outer;return true}return false}
function extension(name:string){const normalized=name.toLowerCase(),dot=normalized.lastIndexOf('.');return dot>0&&dot<normalized.length-1?normalized.slice(dot+1):''}
function secret(){const modern=Deno.env.get('SUPABASE_SECRET_KEYS');if(modern)try{const parsed=JSON.parse(modern) as Record<string,string>;if(parsed.default)return parsed.default}catch{}const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(legacy)return legacy;throw new Error('SERVER_SECRET_UNAVAILABLE')}
function publicKey(){const key=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY');if(key)return key;throw new Error('SERVER_PUBLIC_KEY_UNAVAILABLE')}
function claim(value:unknown):Claim{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('INVALID_CLAIM');const row=value as J,c={operationId:uid(row.operationId),documentId:uid(row.documentId),versionNumber:Number(row.versionNumber),bucket:txt(row.bucket,80),path:txt(row.path,1200),title:txt(row.title,320),fileName:txt(row.fileName,240),mimeType:txt(row.mimeType,160).toLowerCase(),byteSize:Number(row.byteSize),checksum:row.checksum===null?null:typeof row.checksum==='string'?row.checksum.toLowerCase():null,state:row.state,binaryAuthoritative:row.binaryAuthoritative} as Claim;const validState=c.state==='prepared'||c.state==='acknowledged',validAuthority=c.state==='prepared'?c.binaryAuthoritative===false:c.state==='acknowledged'&&c.binaryAuthoritative===true;if(c.bucket!==BUCKET||!validState||!validAuthority||!Number.isSafeInteger(c.versionNumber)||c.versionNumber<1||!Number.isSafeInteger(c.byteSize)||c.byteSize<1||c.byteSize>MAX_BYTES||!ALLOWED_MIME.includes(c.mimeType as typeof ALLOWED_MIME[number])||(c.checksum!==null&&!/^[0-9a-f]{64}$/.test(c.checksum)))throw new Error('INVALID_CLAIM');return c}
async function ensureBucket(admin:ReturnType<typeof createClient>){const got=await admin.storage.getBucket(BUCKET);if(!got.error&&got.data){if(got.data.public)throw new Error('BUCKET_MUST_BE_PRIVATE');return}const made=await admin.storage.createBucket(BUCKET,{public:false,fileSizeLimit:MAX_BYTES,allowedMimeTypes:[...ALLOWED_MIME]});if(made.error&&!/already exists/i.test(made.error.message))throw made.error}
function objectSize(value:unknown){if(!value||typeof value!=='object')return NaN;const row=value as J;if(typeof row.size==='number')return row.size;const metadata=row.metadata;if(metadata&&typeof metadata==='object'&&!Array.isArray(metadata)){const size=Number((metadata as J).size);if(Number.isFinite(size))return size}return NaN}
function objectMime(value:unknown){if(!value||typeof value!=='object')return null;const row=value as J;if(typeof row.contentType==='string')return row.contentType;const metadata=row.metadata;if(metadata&&typeof metadata==='object'&&!Array.isArray(metadata)){const nested=metadata as J;return typeof nested.mimetype==='string'?nested.mimetype:typeof nested.contentType==='string'?nested.contentType:null}return null}
async function fail(admin:ReturnType<typeof createClient>,operationId:string,code:string,path?:string){if(path)await admin.storage.from(BUCKET).remove([path]);await admin.rpc('fail_document_upload_v1',{p_operation_id:operationId,p_failure_code:code})}
function hex(buffer:ArrayBuffer){return [...new Uint8Array(buffer)].map(value=>value.toString(16).padStart(2,'0')).join('')}
function assertBinary(bytes:Uint8Array,expected:Claim){
  const ext=extension(expected.fileName),allowedExt=EXTENSIONS[expected.mimeType]??[];
  if(!allowedExt.includes(ext))throw new Error('BINARY_EXTENSION_MISMATCH');
  if(starts(bytes,[0x4d,0x5a])||starts(bytes,[0x7f,0x45,0x4c,0x46])||starts(bytes,[0xcf,0xfa,0xed,0xfe])||starts(bytes,[0xca,0xfe,0xba,0xbe]))throw new Error('BINARY_EXECUTABLE_FORBIDDEN');
  const head=bytes.subarray(0,Math.min(bytes.length,1_048_576)),tail=bytes.subarray(Math.max(0,bytes.length-1_048_576));
  if(containsAscii(head,'<!doctype html')||containsAscii(head,'<html')||containsAscii(head,'<script')||containsAscii(head,'<svg'))throw new Error('BINARY_SCRIPTABLE_MASQUERADE');
  if(expected.mimeType==='application/pdf'){
    if(!starts(bytes,[0x25,0x50,0x44,0x46,0x2d])||!containsAscii(tail,'%%EOF'))throw new Error('BINARY_PDF_CORRUPT');
    for(const marker of ['/javascript','/launch','/openaction','/embeddedfile'])if(containsAscii(head,marker)||containsAscii(tail,marker))throw new Error('BINARY_PDF_ACTIVE_CONTENT_FORBIDDEN');
  }else if(expected.mimeType==='image/jpeg'){
    if(!starts(bytes,[0xff,0xd8,0xff])||bytes.length<4||bytes[bytes.length-2]!==0xff||bytes[bytes.length-1]!==0xd9)throw new Error('BINARY_JPEG_CORRUPT');
  }else if(expected.mimeType==='image/png'){
    if(!starts(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])||!containsAscii(bytes.subarray(Math.max(0,bytes.length-64)),'IEND'))throw new Error('BINARY_PNG_CORRUPT');
  }else if(expected.mimeType==='image/webp'){
    if(bytes.length<12||!containsAscii(bytes.subarray(0,4),'RIFF')||!containsAscii(bytes.subarray(8,12),'WEBP'))throw new Error('BINARY_WEBP_CORRUPT');
  }else if(!starts(bytes,[0x50,0x4b,0x03,0x04]))throw new Error('BINARY_OOXML_CORRUPT');
}
async function inspectStoredBinary(admin:ReturnType<typeof createClient>,expected:Claim){const downloaded=await admin.storage.from(BUCKET).download(expected.path);if(downloaded.error||!downloaded.data)throw new Error('BINARY_DOWNLOAD_FAILED');const buffer=await downloaded.data.arrayBuffer();const bytes=new Uint8Array(buffer);if(bytes.byteLength!==expected.byteSize)throw new Error('BINARY_SIZE_DRIFT');assertBinary(bytes,expected);const checksum=hex(await crypto.subtle.digest('SHA-256',buffer));if(expected.checksum&&expected.checksum!==checksum)throw new Error('BINARY_CHECKSUM_MISMATCH');return checksum}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return out(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  let stage='input';
  try{
    const len=Number(req.headers.get('content-length')||'0');if(Number.isFinite(len)&&len>32768)return out(413,{ok:false,error:'REQUEST_TOO_LARGE'});
    const auth=req.headers.get('authorization')||'';if(!/^Bearer\s+\S+$/i.test(auth))return out(401,{ok:false,error:'AUTH_REQUIRED'});
    const url=Deno.env.get('SUPABASE_URL');if(!url)throw new Error('SERVER_URL_UNAVAILABLE');
    const userClient=createClient(url,publicKey(),{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}),who=await userClient.auth.getUser();if(who.error||!who.data.user)return out(401,{ok:false,error:'AUTH_INVALID'});
    const admin=createClient(url,secret(),{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}),body=await req.json() as J,action=txt(body.action,32);stage='storage_init';await ensureBucket(admin);

    if(action==='prepare'){
      stage='prepare_rpc';
      const checksum=typeof body.checksum==='string'&&body.checksum.trim()?body.checksum.trim().toLowerCase():null;
      if(checksum!==null&&!/^[0-9a-f]{64}$/.test(checksum))return out(400,{ok:false,error:'CHECKSUM_INVALID'});
      const prepared=await userClient.rpc('prepare_document_upload_v1',{p_workspace_id:uid(body.workspaceId),p_operation_id:uid(body.operationId),p_title:txt(body.title,320),p_original_file_name:txt(body.fileName,240),p_mime_type:txt(body.mimeType,160),p_byte_size:Number(body.byteSize),p_document_id:body.documentId?uid(body.documentId):null,p_document_type:typeof body.documentType==='string'&&body.documentType.trim()?body.documentType.trim():null,p_company_id:body.companyId?uid(body.companyId):null,p_transaction_id:body.transactionId?uid(body.transactionId):null,p_checksum:checksum});
      if(prepared.error)throw prepared.error;
      const expected=claim(prepared.data);stage='signed_upload';const signed=await admin.storage.from(BUCKET).createSignedUploadUrl(expected.path,{upsert:false});if(signed.error||!signed.data)throw signed.error??new Error('SIGNED_UPLOAD_UNAVAILABLE');return out(200,{ok:true,signedUrl:signed.data.signedUrl,expiresInSeconds:7200});
    }

    if(action==='portal-prepare'){
      stage='portal_prepare_rpc';
      const checksum=typeof body.checksum==='string'&&body.checksum.trim()?body.checksum.trim().toLowerCase():null;
      if(checksum!==null&&!/^[0-9a-f]{64}$/.test(checksum))return out(400,{ok:false,error:'CHECKSUM_INVALID'});
      const workspaceId=uid(body.workspaceId),requestId=uid(body.requestId),operationId=uid(body.operationId);
      const prepared=await userClient.rpc('prepare_client_portal_requested_document_v1',{p_workspace_id:workspaceId,p_request_id:requestId,p_operation_id:operationId,p_title:txt(body.title,320),p_original_file_name:txt(body.fileName,240),p_mime_type:txt(body.mimeType,160),p_byte_size:Number(body.byteSize),p_document_type:typeof body.documentType==='string'&&body.documentType.trim()?body.documentType.trim():null,p_checksum:checksum});
      if(prepared.error)throw prepared.error;
      const expected=claim(prepared.data);stage='portal_signed_upload';const signed=await admin.storage.from(BUCKET).createSignedUploadUrl(expected.path,{upsert:false});if(signed.error||!signed.data)throw signed.error??new Error('SIGNED_UPLOAD_UNAVAILABLE');return out(200,{ok:true,signedUrl:signed.data.signedUrl,expiresInSeconds:7200,operationId,requestId});
    }

    if(action==='acknowledge'){
      const operationId=uid(body.operationId);stage='claim_rpc';const claimed=await userClient.rpc('get_document_upload_claim_v2',{p_operation_id:operationId});if(claimed.error)throw claimed.error;const expected=claim(claimed.data);
      if(expected.state==='acknowledged'){
        if(!expected.checksum)return out(409,{ok:false,error:'ACKNOWLEDGED_CHECKSUM_MISSING'});
        stage='ack_replay_rpc';const replay=await admin.rpc('acknowledge_document_upload_v2',{p_operation_id:operationId,p_storage_path:expected.path,p_actual_byte_size:expected.byteSize,p_actual_mime_type:expected.mimeType,p_actual_checksum:expected.checksum});if(replay.error)throw replay.error;return out(200,{ok:true,ack:replay.data});
      }
      stage='storage_info';const info=await admin.storage.from(BUCKET).info(expected.path);if(info.error||!info.data)return out(409,{ok:false,error:'STORAGE_OBJECT_NOT_FOUND'});
      const actualSize=objectSize(info.data),actualMime=objectMime(info.data)?.toLowerCase()??null;
      if(!Number.isSafeInteger(actualSize)||actualSize!==expected.byteSize){await fail(admin,operationId,'STORAGE_SIZE_MISMATCH',expected.path);return out(409,{ok:false,error:'STORAGE_SIZE_MISMATCH'})}
      if(!actualMime||actualMime!==expected.mimeType){await fail(admin,operationId,'STORAGE_MIME_MISMATCH',expected.path);return out(409,{ok:false,error:'STORAGE_MIME_MISMATCH'})}
      stage='binary_inspection';let checksum:string;try{checksum=await inspectStoredBinary(admin,expected)}catch(error){const code=error instanceof Error?error.message:'BINARY_INSPECTION_FAILED';await fail(admin,operationId,code,expected.path);return out(409,{ok:false,error:code})}
      stage='ack_rpc';const acknowledged=await admin.rpc('acknowledge_document_upload_v2',{p_operation_id:operationId,p_storage_path:expected.path,p_actual_byte_size:actualSize,p_actual_mime_type:actualMime,p_actual_checksum:checksum});if(acknowledged.error)throw acknowledged.error;return out(200,{ok:true,ack:acknowledged.data});
    }

    if(action==='portal-acknowledge'){
      const operationId=uid(body.operationId),workspaceId=uid(body.workspaceId);stage='portal_claim_rpc';const claimed=await userClient.rpc('get_client_portal_document_upload_claim_v1',{p_operation_id:operationId});if(claimed.error)throw claimed.error;const expected=claim(claimed.data);
      if(expected.state==='acknowledged'){
        if(!expected.checksum)return out(409,{ok:false,error:'ACKNOWLEDGED_CHECKSUM_MISSING'});
        stage='portal_ack_replay_rpc';const replay=await admin.rpc('acknowledge_document_upload_v2',{p_operation_id:operationId,p_storage_path:expected.path,p_actual_byte_size:expected.byteSize,p_actual_mime_type:expected.mimeType,p_actual_checksum:expected.checksum});if(replay.error)throw replay.error;
        stage='portal_complete_replay_rpc';const completed=await userClient.rpc('complete_client_portal_requested_document_v1',{p_workspace_id:workspaceId,p_operation_id:operationId});if(completed.error)throw completed.error;return out(200,{ok:true,ack:replay.data,portal:completed.data});
      }
      stage='portal_storage_info';const info=await admin.storage.from(BUCKET).info(expected.path);if(info.error||!info.data)return out(409,{ok:false,error:'STORAGE_OBJECT_NOT_FOUND'});
      const actualSize=objectSize(info.data),actualMime=objectMime(info.data)?.toLowerCase()??null;
      if(!Number.isSafeInteger(actualSize)||actualSize!==expected.byteSize){await fail(admin,operationId,'STORAGE_SIZE_MISMATCH',expected.path);return out(409,{ok:false,error:'STORAGE_SIZE_MISMATCH'})}
      if(!actualMime||actualMime!==expected.mimeType){await fail(admin,operationId,'STORAGE_MIME_MISMATCH',expected.path);return out(409,{ok:false,error:'STORAGE_MIME_MISMATCH'})}
      stage='portal_binary_inspection';let checksum:string;try{checksum=await inspectStoredBinary(admin,expected)}catch(error){const code=error instanceof Error?error.message:'BINARY_INSPECTION_FAILED';await fail(admin,operationId,code,expected.path);return out(409,{ok:false,error:code})}
      stage='portal_ack_rpc';const acknowledged=await admin.rpc('acknowledge_document_upload_v2',{p_operation_id:operationId,p_storage_path:expected.path,p_actual_byte_size:actualSize,p_actual_mime_type:actualMime,p_actual_checksum:checksum});if(acknowledged.error)throw acknowledged.error;
      stage='portal_complete_rpc';const completed=await userClient.rpc('complete_client_portal_requested_document_v1',{p_workspace_id:workspaceId,p_operation_id:operationId});if(completed.error)throw completed.error;return out(200,{ok:true,ack:acknowledged.data,portal:completed.data});
    }

    if(action==='download'){
      stage='download_claim';const downloaded=await userClient.rpc('get_document_download_claim_v1',{p_workspace_id:uid(body.workspaceId),p_document_id:uid(body.documentId),p_version_number:body.versionNumber==null?null:Number(body.versionNumber)});if(downloaded.error)throw downloaded.error;if(!downloaded.data||typeof downloaded.data!=='object')throw new Error('INVALID_DOWNLOAD_CLAIM');const claimData=downloaded.data as J;if(claimData.bucket!==BUCKET)throw new Error('INVALID_DOWNLOAD_BUCKET');const path=txt(claimData.path,1200),fileName=txt(claimData.fileName,240);stage='signed_download';const signed=await admin.storage.from(BUCKET).createSignedUrl(path,300,{download:fileName});if(signed.error||!signed.data)throw signed.error??new Error('SIGNED_DOWNLOAD_UNAVAILABLE');return out(200,{ok:true,signedUrl:signed.data.signedUrl,expiresInSeconds:300});
    }

    return out(400,{ok:false,error:'UNKNOWN_ACTION'});
  }catch(error){const message=error instanceof Error?error.message:'UNKNOWN';if(['INVALID_INPUT','INVALID_UUID'].includes(message))return out(400,{ok:false,error:message});console.error('enjaz-document-vault failed',{stage,kind:error instanceof Error?error.name:'unknown'});return out(500,{ok:false,error:`DOCUMENT_VAULT_${stage.toUpperCase()}_FAILED`})}
});
