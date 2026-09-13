import {DataAccessError} from '../../data/contracts/DataAccessError.ts';

export type DocumentIntelligenceState='queued'|'extracting'|'review_required'|'reviewed'|'verified'|'rejected'|'failed'|'superseded'|'legacy_unverified';
export type IntelligenceField=Readonly<{key:string;value:string|null;confidence:number;pageNumber:number}>;
export type IntelligencePage=Readonly<{pageNumber:number;text:string;confidence:number;fields:readonly IntelligenceField[]}>;
export type DocumentAnalysis=Readonly<{
 id:string;documentId:string;documentVersionId:string|null;sourceVersionNumber:number|null;analysisVersion:number;state:DocumentIntelligenceState;reviewStatus:string;ocrText:string|null;extractedFields:Readonly<Record<string,Readonly<{value:string|null;confidence:number;pageNumber:number}>>>;pages:readonly IntelligencePage[];classification:string|null;confidence:number|null;provider:string|null;stale:boolean;analyzedAt:string|null;reviewedAt:string|null;verifiedAt:string|null;failureCode:string|null;
}>;
export type DocumentIntelligence=Readonly<{documentId:string;currentVersionId:string|null;currentVersionNumber:number|null;sourceAuthority:'SOURCE_FILE_REMAINS_AUTHORITATIVE';analyses:readonly DocumentAnalysis[]}>;
export type ExtractionResult=Readonly<{analysisId:string;state:DocumentIntelligenceState}>;

const states=new Set<DocumentIntelligenceState>(['queued','extracting','review_required','reviewed','verified','rejected','failed','superseded','legacy_unverified']);
const fail=(message:string):never=>{throw new DataAccessError(message,'DATA_OPERATION_FAILED')};
const object=(v:unknown,message='Invalid Document Intelligence response'):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:fail(message);
const string=(v:unknown,max=8_000_000)=>typeof v==='string'&&v.length<=max?v:fail('Invalid Document Intelligence string');
const nullableString=(v:unknown,max=8_000_000)=>v==null?null:string(v,max);
const integer=(v:unknown,min=0)=>Number.isSafeInteger(Number(v))&&Number(v)>=min?Number(v):fail('Invalid Document Intelligence integer');
const nullableInteger=(v:unknown,min=0)=>v==null?null:integer(v,min);
const confidence=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=1?n:fail('Invalid Document Intelligence confidence')};
const nullableConfidence=(v:unknown)=>v==null?null:confidence(v);
const state=(v:unknown)=>typeof v==='string'&&states.has(v as DocumentIntelligenceState)?v as DocumentIntelligenceState:fail('Invalid Document Intelligence state');

function fields(v:unknown){const source=object(v,'Invalid extracted fields'),result:Record<string,{value:string|null;confidence:number;pageNumber:number}>={};for(const [key,raw] of Object.entries(source)){if(!key.trim()||key.length>160)fail('Invalid extracted field key');const f=object(raw,'Invalid extracted field');result[key]={value:f.value==null?null:string(f.value,100_000),confidence:confidence(f.confidence),pageNumber:integer(f.pageNumber,1)}}return Object.freeze(result)}
function pages(v:unknown):readonly IntelligencePage[]{if(!Array.isArray(v))fail('Invalid page results');const seen=new Set<number>();return Object.freeze(v.map(raw=>{const p=object(raw,'Invalid page result'),pageNumber=integer(p.pageNumber,1);if(seen.has(pageNumber))fail('Duplicate page result');seen.add(pageNumber);const rawFields=Array.isArray(p.fields)?p.fields:[];return Object.freeze({pageNumber,text:string(p.text,8_000_000),confidence:confidence(p.confidence),fields:Object.freeze(rawFields.map(rawField=>{const f=object(rawField,'Invalid page field');return Object.freeze({key:string(f.key,160),value:f.value==null?null:string(f.value,100_000),confidence:confidence(f.confidence),pageNumber:integer(f.pageNumber,1)})}))})}))}
function analysis(v:unknown):DocumentAnalysis{const a=object(v);return Object.freeze({id:string(a.id,64),documentId:string(a.documentId,64),documentVersionId:nullableString(a.documentVersionId,64),sourceVersionNumber:nullableInteger(a.sourceVersionNumber,1),analysisVersion:integer(a.analysisVersion,1),state:state(a.state),reviewStatus:string(a.reviewStatus,80),ocrText:nullableString(a.ocrText),extractedFields:fields(a.extractedFields??{}),pages:pages(a.pages??[]),classification:nullableString(a.classification,240),confidence:nullableConfidence(a.confidence),provider:nullableString(a.provider,240),stale:a.stale===true,analyzedAt:nullableString(a.analyzedAt,80),reviewedAt:nullableString(a.reviewedAt,80),verifiedAt:nullableString(a.verifiedAt,80),failureCode:nullableString(a.failureCode,160)})}
export function parseDocumentIntelligence(v:unknown):DocumentIntelligence{const r=object(v);if(r.schema!=='enjaz.document-intelligence.v1'||r.sourceAuthority!=='SOURCE_FILE_REMAINS_AUTHORITATIVE'||!Array.isArray(r.analyses))fail('Invalid Document Intelligence contract');return Object.freeze({documentId:string(r.documentId,64),currentVersionId:nullableString(r.currentVersionId,64),currentVersionNumber:nullableInteger(r.currentVersionNumber,1),sourceAuthority:'SOURCE_FILE_REMAINS_AUTHORITATIVE',analyses:Object.freeze(r.analyses.map(analysis))})}
export function parseExtractionResult(v:unknown):ExtractionResult{const r=object(v);if(r.ok!==true)fail('Document extraction failed');return Object.freeze({analysisId:string(r.analysisId,64),state:state(r.state)})}
