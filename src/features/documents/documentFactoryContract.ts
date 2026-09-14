import {DataAccessError} from '../../data/contracts/DataAccessError.ts';

export type TemplateVersionState='draft'|'published';
export type FactoryTokenSource='company'|'transaction'|'contact'|'ocr';
export type FactoryTokenDescriptor=Readonly<{source:FactoryTokenSource;field:string;required:boolean}>;
export type FactoryTokenSchema=Readonly<Record<string,FactoryTokenDescriptor>>;
export type GenerationSource=Readonly<{kind:'company'|'contact'|'transaction'|'finance'|'governance'|'document'|'ocr';entityId:string;sourceVersionId?:string|null;verificationState?:string|null;stale?:boolean}>;
export type OfficialGenerationProvenance=Readonly<{templateVersionId:string;factSnapshot:Readonly<Record<string,unknown>>;sources:readonly GenerationSource[]}>;
export type DocumentFactoryGenerationInput=Readonly<{workspaceId:string;templateVersionId:string;title:string;companyId?:string|null;transactionId?:string|null;contactId?:string|null;ocrAnalysisId?:string|null}>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/;
const FIELD=/^[a-z][a-z0-9_]{0,63}$/;
const ALLOWED:Readonly<Record<Exclude<FactoryTokenSource,'ocr'>,readonly string[]>>=Object.freeze({
 company:Object.freeze(['legal_name','display_name','capital','address','registration_number','legal_status']),
 transaction:Object.freeze(['type','department','status','priority','current_fee']),
 contact:Object.freeze(['display_name','phone','email']),
});
const fail=(message:string):never=>{throw new DataAccessError(message,'DATA_VALIDATION_FAILED')};
const id=(value:unknown,label:string)=>typeof value==='string'&&UUID.test(value)?value:fail(`Invalid ${label}`);
const nullableId=(value:unknown,label:string)=>value==null||value===''?null:id(value,label);
const object=(value:unknown,label:string):Readonly<Record<string,unknown>>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?Object.freeze({...value as Record<string,unknown>}):fail(`${label} must be an object`);

export function validateFactoryTokenSchema(value:unknown,bodySource?:string):FactoryTokenSchema{
 const raw=object(value,'Token schema'),normalized:Record<string,FactoryTokenDescriptor>={};
 for(const [key,descriptor] of Object.entries(raw)){
  if(!TOKEN.test(key))fail(`Invalid token name: ${key}`);
  const d=object(descriptor,`Token descriptor ${key}`),source=String(d.source??'') as FactoryTokenSource,field=String(d.field??'').trim().toLowerCase();
  if(!['company','transaction','contact','ocr'].includes(source))fail(`Invalid token source: ${key}`);
  if(!FIELD.test(field))fail(`Invalid token field: ${key}`);
  if(source!=='ocr'&&!ALLOWED[source].includes(field))fail(`Unsupported ${source} field: ${field}`);
  if(d.required!==undefined&&typeof d.required!=='boolean')fail(`Invalid required flag: ${key}`);
  normalized[key]=Object.freeze({source,field,required:d.required===true});
 }
 if(bodySource!==undefined){
  const syntaxStripped=bodySource.replace(/\{\{([A-Za-z][A-Za-z0-9_.-]{0,127})\}\}/g,(_,token:string)=>{if(!(token in normalized))fail(`Undeclared template token: ${token}`);return''});
  if(syntaxStripped.includes('{{')||syntaxStripped.includes('}}'))fail('Invalid template token syntax');
 }
 return Object.freeze(normalized);
}

export function validateTemplateVersionInput(input:Readonly<{workspaceId:string;templateId:string;bodySource:string;tokenSchema:unknown}>){
 const body=typeof input.bodySource==='string'?input.bodySource:'';
 if(!body.trim()||body.length>1_000_000)fail('Template body is empty or too large');
 return Object.freeze({workspaceId:id(input.workspaceId,'workspace id'),templateId:id(input.templateId,'template id'),bodySource:body,tokenSchema:validateFactoryTokenSchema(input.tokenSchema,body)});
}

export function validateDocumentFactoryGenerationInput(input:DocumentFactoryGenerationInput){
 const title=typeof input.title==='string'?input.title.trim():'';
 if(!title||title.length>320)fail('Invalid document factory title');
 return Object.freeze({workspaceId:id(input.workspaceId,'workspace id'),templateVersionId:id(input.templateVersionId,'template version id'),title,companyId:nullableId(input.companyId,'company id'),transactionId:nullableId(input.transactionId,'transaction id'),contactId:nullableId(input.contactId,'contact id'),ocrAnalysisId:nullableId(input.ocrAnalysisId,'OCR analysis id')});
}

export function validateDocumentFactoryDraftContent(value:unknown){const content=typeof value==='string'?value:'';if(!content||content.length>1_000_000)fail('Invalid document draft content');return content}
export function validateDocumentFactoryReview(decision:unknown,note:unknown){if(decision!=='approve'&&decision!=='return')fail('Invalid document factory review decision');const normalized=typeof note==='string'?note.trim():'';if(normalized.length>1000)fail('Document factory review note is too long');return Object.freeze({decision,note:normalized||null})}
export function validateDocumentFactoryFinalization(input:Readonly<{workspaceId:string;draftId:string;documentId:string;documentVersionId:string}>){return Object.freeze({workspaceId:id(input.workspaceId,'workspace id'),draftId:id(input.draftId,'draft id'),documentId:id(input.documentId,'document id'),documentVersionId:id(input.documentVersionId,'document version id')})}

export function assertTemplateVersionTransition(from:TemplateVersionState,to:TemplateVersionState){
 if(from==='draft'&&to==='published')return;
 if(from===to)return;
 fail(`Invalid template version transition ${from} -> ${to}`);
}

export function validateOfficialGenerationProvenance(input:Readonly<{templateVersionId:string;factSnapshot:unknown;sources:readonly unknown[]}>):OfficialGenerationProvenance{
 const templateVersionId=id(input.templateVersionId,'template version id'),factSnapshot=object(input.factSnapshot,'Fact snapshot');
 if(!Array.isArray(input.sources))fail('Generation sources must be an array');
 const sources=input.sources.map((raw,index)=>{
  if(raw===null||typeof raw!=='object'||Array.isArray(raw))fail(`Invalid generation source ${index}`);
  const source=raw as Record<string,unknown>,kind=source.kind;
  if(!['company','contact','transaction','finance','governance','document','ocr'].includes(String(kind)))fail(`Invalid generation source kind ${index}`);
  const normalized={kind:String(kind) as GenerationSource['kind'],entityId:id(source.entityId,`source entity id ${index}`),sourceVersionId:source.sourceVersionId==null?null:id(source.sourceVersionId,`source version id ${index}`),verificationState:source.verificationState==null?null:String(source.verificationState),stale:source.stale===true};
  if(normalized.kind==='ocr'&&(normalized.verificationState!=='verified'||normalized.stale))fail('Official generation cannot consume unverified or stale OCR');
  return Object.freeze(normalized);
 });
 return Object.freeze({templateVersionId,factSnapshot,sources:Object.freeze(sources)});
}

export function isOfficialDraftFinalizable(input:Readonly<{status:string;templateVersionId:string|null;approvedAt:string|null;finalDocumentId:string|null;finalDocumentVersionId:string|null}>){
 return input.status==='final'&&Boolean(input.templateVersionId&&input.approvedAt&&input.finalDocumentId&&input.finalDocumentVersionId);
}
