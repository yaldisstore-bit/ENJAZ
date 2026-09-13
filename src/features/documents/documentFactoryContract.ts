import {DataAccessError} from '../../data/contracts/DataAccessError.ts';

export type TemplateVersionState='draft'|'published';
export type GenerationSource=Readonly<{kind:'company'|'contact'|'transaction'|'finance'|'governance'|'document'|'ocr';entityId:string;sourceVersionId?:string|null;verificationState?:string|null;stale?:boolean}>;
export type OfficialGenerationProvenance=Readonly<{templateVersionId:string;factSnapshot:Readonly<Record<string,unknown>>;sources:readonly GenerationSource[]}>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=(message:string):never=>{throw new DataAccessError(message,'DATA_VALIDATION_FAILED')};
const id=(value:unknown,label:string)=>typeof value==='string'&&UUID.test(value)?value:fail(`Invalid ${label}`);
const object=(value:unknown,label:string):Readonly<Record<string,unknown>>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?Object.freeze({...value as Record<string,unknown>}):fail(`${label} must be an object`);

export function validateTemplateVersionInput(input:Readonly<{workspaceId:string;templateId:string;bodySource:string;tokenSchema:unknown}>){
 const body=typeof input.bodySource==='string'?input.bodySource:'';
 if(!body.trim()||body.length>1_000_000)fail('Template body is empty or too large');
 return Object.freeze({workspaceId:id(input.workspaceId,'workspace id'),templateId:id(input.templateId,'template id'),bodySource:body,tokenSchema:object(input.tokenSchema,'Token schema')});
}

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
