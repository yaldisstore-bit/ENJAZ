import type {EnjazSupabaseClient} from '../../core/supabase/client.ts';
import {DataAccessError,normalizeDataFailure,normalizeThrownDataFailure,type DataFailureLike} from '../../data/contracts/DataAccessError.ts';
import {assertIntelligenceId,parseDocumentIntelligenceDetail,validateExtractionRequest,validateReviewInput,validateVerifyInput,type DocumentIntelligenceDetail,type DocumentIntelligenceState,type ExtractionRequestInput,type ExtractionReviewInput,type ExtractionVerifyInput} from './documentIntelligenceContract.ts';

export interface DocumentIntelligenceActionResult{readonly analysisId:string;readonly state:DocumentIntelligenceState;readonly verified?:boolean;readonly reason?:string|null}
export interface DocumentIntelligenceGateway{
  detail(workspaceId:string,documentId:string):Promise<DocumentIntelligenceDetail>;
  extract(input:ExtractionRequestInput):Promise<DocumentIntelligenceActionResult>;
  review(input:ExtractionReviewInput):Promise<DocumentIntelligenceActionResult>;
  verify(input:ExtractionVerifyInput):Promise<DocumentIntelligenceActionResult>;
}
type Rpc={rpc(name:string,args:Record<string,unknown>):PromiseLike<{data:unknown;error:DataFailureLike|null}>};
const STATES=['queued','extracting','review_required','reviewed','verified','rejected','failed','superseded','legacy_unverified'] as const;
const object=(v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:(()=>{throw new DataAccessError('Invalid Document Intelligence response','DATA_OPERATION_FAILED')})();
const action=(v:unknown):DocumentIntelligenceActionResult=>{const x=object(v),analysisId=assertIntelligenceId(x.analysisId),state=typeof x.state==='string'&&STATES.includes(x.state as typeof STATES[number])?x.state as DocumentIntelligenceState:(()=>{throw new DataAccessError('Invalid Document Intelligence state','DATA_OPERATION_FAILED')})();return{analysisId,state,verified:typeof x.verified==='boolean'?x.verified:undefined,reason:typeof x.reason==='string'?x.reason:null}};

export function createDocumentIntelligenceGateway(client:EnjazSupabaseClient,url:string,key:string,timeout=20_000):DocumentIntelligenceGateway{
  const rpc=client as unknown as Rpc,wait=async<T>(p:Promise<T>,ms=timeout)=>{let t:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([p,new Promise<never>((_,r)=>{t=setTimeout(()=>r(new Error('document intelligence timeout')),ms)})])}finally{if(t)clearTimeout(t)}},call=async(name:string,args:Record<string,unknown>,write=false)=>{try{const r=await wait(Promise.resolve(rpc.rpc(name,args)));if(r.error)throw normalizeDataFailure(r.error);return r.data}catch(e){throw normalizeThrownDataFailure(e,write?'write':'read')}},edge=async(body:Record<string,unknown>)=>{try{const token=(await client.auth.getSession()).data.session?.access_token;if(!token)throw new DataAccessError('Authentication required','DATA_FORBIDDEN');const res=await wait(fetch(`${url.replace(/\/$/,'')}/functions/v1/enjaz-document-intelligence`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)}),120_000),data=object(await res.json().catch(()=>null));if(!res.ok){const code=typeof data.error==='string'?data.error:'Document Intelligence request failed';if(res.status===401||res.status===403)throw new DataAccessError(code,'DATA_FORBIDDEN');if(res.status===503&&code==='OCR_PROVIDER_NOT_CONFIGURED')throw new DataAccessError('OCR provider is not configured','DATA_OPERATION_FAILED');throw new DataAccessError(code,'DATA_OPERATION_FAILED')}return data}catch(e){if(e instanceof DataAccessError)throw e;throw normalizeThrownDataFailure(e,'write')}};
  return Object.freeze({
    async detail(workspaceId:string,documentId:string){assertIntelligenceId(workspaceId);assertIntelligenceId(documentId);return parseDocumentIntelligenceDetail(await call('get_document_intelligence_v1',{p_workspace_id:workspaceId,p_document_id:documentId}))},
    async extract(input:ExtractionRequestInput){validateExtractionRequest(input);const requestId=crypto.randomUUID(),r=await edge({action:'extract',workspaceId:input.workspaceId,documentId:input.documentId,versionNumber:input.versionNumber??null,requestId});return action(r)},
    async review(input:ExtractionReviewInput){validateReviewInput(input);return action(await call('review_document_extraction_v1',{p_workspace_id:input.workspaceId,p_analysis_id:input.analysisId,p_decision:input.decision,p_corrected_fields:input.correctedFields??null,p_note:input.note?.trim()||null},true))},
    async verify(input:ExtractionVerifyInput){validateVerifyInput(input);return action(await call('verify_document_extraction_v1',{p_workspace_id:input.workspaceId,p_analysis_id:input.analysisId,p_note:input.note?.trim()||null},true))}
  })
}
