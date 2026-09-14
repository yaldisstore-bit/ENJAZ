import type {EnjazSupabaseClient} from '../../core/supabase/client.ts';
import {DataAccessError,normalizeDataFailure,normalizeThrownDataFailure,type DataFailureLike} from '../../data/contracts/DataAccessError.ts';
import {inspectDocumentBinary} from './documentBinarySafety.ts';
import {assertVaultId,parseVaultDetail,parseVaultList,validateUploadInput,type DocumentUploadInput,type VaultDetail,type VaultList} from './documentVaultContract.ts';

export interface DocumentVaultGateway{list(workspaceId:string,query?:string,includeArchived?:boolean,offset?:number):Promise<VaultList>;detail(workspaceId:string,documentId:string):Promise<VaultDetail>;upload(input:DocumentUploadInput):Promise<{documentId:string;versionNumber:number}>;downloadUrl(workspaceId:string,documentId:string,versionNumber?:number|null):Promise<string>;archive(workspaceId:string,documentId:string):Promise<void>}
type Rpc={rpc(name:string,args:Record<string,unknown>):PromiseLike<{data:unknown;error:DataFailureLike|null}>};
const object=(v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:(()=>{throw new DataAccessError('Invalid Document Vault response','DATA_OPERATION_FAILED')})();
function parseAck(value:unknown){const envelope=object(value),ack=object(envelope.ack),version=Number(ack.versionNumber);if(envelope.ok!==true||ack.schema!=='enjaz.document-upload-ack.v1'||typeof ack.documentId!=='string'||!Number.isSafeInteger(version)||version<1)throw new DataAccessError('Invalid upload acknowledgement','DATA_OPERATION_FAILED');return{documentId:ack.documentId,versionNumber:version}}

export function createDocumentVaultGateway(client:EnjazSupabaseClient,url:string,key:string,timeout=20_000):DocumentVaultGateway{
  const rpc=client as unknown as Rpc;
  const wait=async<T>(p:Promise<T>)=>{let t:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([p,new Promise<never>((_,reject)=>{t=setTimeout(()=>reject(new Error('vault timeout')),timeout)})])}finally{if(t)clearTimeout(t)}};
  const call=async(name:string,args:Record<string,unknown>,write=false)=>{try{const r=await wait(Promise.resolve(rpc.rpc(name,args)));if(r.error)throw normalizeDataFailure(r.error);return r.data}catch(error){throw normalizeThrownDataFailure(error,write?'write':'read')}};
  const edge=async(body:Record<string,unknown>)=>{try{const token=(await client.auth.getSession()).data.session?.access_token;if(!token)throw new DataAccessError('Authentication required','DATA_FORBIDDEN');const response=await wait(fetch(`${url.replace(/\/$/,'')}/functions/v1/enjaz-document-vault`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)}));const data=object(await response.json().catch(()=>null));if(!response.ok)throw new DataAccessError(typeof data.error==='string'?data.error:'Document Vault request failed',response.status===401||response.status===403?'DATA_FORBIDDEN':response.status===400||response.status===409||response.status===413?'DATA_VALIDATION_FAILED':'DATA_OPERATION_FAILED');return data}catch(error){if(error instanceof DataAccessError)throw error;throw normalizeThrownDataFailure(error,'write')}};
  return Object.freeze({
    async list(workspaceId:string,query='',includeArchived=false,offset=0){assertVaultId(workspaceId);if(query.length>120||!Number.isSafeInteger(offset)||offset<0)throw new DataAccessError('Invalid vault list request','DATA_VALIDATION_FAILED');return parseVaultList(await call('get_document_vault_v1',{p_workspace_id:workspaceId,p_query:query.trim()||null,p_include_archived:includeArchived,p_limit:100,p_offset:offset}))},
    async detail(workspaceId:string,documentId:string){assertVaultId(workspaceId);assertVaultId(documentId);return parseVaultDetail(await call('get_document_detail_v1',{p_workspace_id:workspaceId,p_document_id:documentId}))},
    async upload(input:DocumentUploadInput){
      validateUploadInput(input);
      const safety=await inspectDocumentBinary(input.file),operationId=input.operationId??crypto.randomUUID();
      const acknowledge=async()=>parseAck(await edge({action:'acknowledge',operationId}));
      let prepared:Record<string,unknown>;
      try{
        prepared=object(await edge({action:'prepare',workspaceId:input.workspaceId,operationId,documentId:input.documentId??null,title:input.title.trim(),documentType:input.documentType?.trim()||null,companyId:input.companyId,transactionId:input.transactionId,fileName:input.file.name,mimeType:safety.mimeType,byteSize:safety.byteSize,checksum:safety.sha256}));
      }catch(prepareError){
        if(input.operationId){try{return await acknowledge()}catch{/* exact operation recovery failed; preserve original prepare failure */}}
        throw prepareError;
      }
      if(prepared.ok!==true||typeof prepared.signedUrl!=='string')throw new DataAccessError('Invalid signed upload','DATA_OPERATION_FAILED');
      const form=new FormData();form.append('cacheControl','3600');form.append('',input.file);
      let sent:Response;
      try{sent=await wait(fetch(prepared.signedUrl,{method:'PUT',headers:{'x-upsert':'false'},body:form}))}catch(uploadError){
        try{return await acknowledge()}catch{throw normalizeThrownDataFailure(uploadError,'write')}
      }
      if(!sent.ok){try{return await acknowledge()}catch{throw new DataAccessError(`Storage upload failed (${sent.status})`,'DATA_OPERATION_FAILED')}}
      return acknowledge();
    },
    async downloadUrl(workspaceId:string,documentId:string,versionNumber:number|null=null){assertVaultId(workspaceId);assertVaultId(documentId);if(versionNumber!==null&&(!Number.isSafeInteger(versionNumber)||versionNumber<1))throw new DataAccessError('Invalid version','DATA_VALIDATION_FAILED');const r=await edge({action:'download',workspaceId,documentId,versionNumber});if(r.ok!==true||typeof r.signedUrl!=='string'||!r.signedUrl.startsWith('https://'))throw new DataAccessError('Invalid download URL','DATA_OPERATION_FAILED');return r.signedUrl},
    async archive(workspaceId:string,documentId:string){assertVaultId(workspaceId);assertVaultId(documentId);await call('archive_document_v1',{p_workspace_id:workspaceId,p_document_id:documentId},true)}
  });
}
