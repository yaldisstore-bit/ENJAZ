import {DataAccessError} from '../../data/contracts/DataAccessError.ts';

export const DOCUMENT_INTELLIGENCE_SCHEMA='enjaz.document-intelligence.v1' as const;
export const DOCUMENT_INTELLIGENCE_MAX_REVIEW_BYTES=131_072;
export type DocumentIntelligenceState='queued'|'extracting'|'review_required'|'reviewed'|'verified'|'rejected'|'failed'|'superseded'|'legacy_unverified';
export type DocumentReviewDecision='accept'|'reject';

export interface IntelligenceField {
  readonly key:string;
  readonly value:string|null;
  readonly confidence:number;
  readonly pageNumber:number;
  readonly sourceText:string|null;
  readonly corrected:boolean;
}
export interface IntelligencePage {
  readonly pageNumber:number;
  readonly text:string;
  readonly confidence:number;
  readonly fields:readonly IntelligenceField[];
}
export interface DocumentIntelligenceAnalysis {
  readonly id:string;
  readonly documentId:string;
  readonly documentVersionId:string|null;
  readonly sourceVersionNumber:number|null;
  readonly analysisVersion:number;
  readonly state:DocumentIntelligenceState;
  readonly reviewStatus:string;
  readonly ocrText:string|null;
  readonly extractedFields:Readonly<Record<string,unknown>>;
  readonly pages:readonly IntelligencePage[];
  readonly classification:string|null;
  readonly confidence:number|null;
  readonly provider:string|null;
  readonly stale:boolean;
  readonly analyzedAt:string;
  readonly reviewedAt:string|null;
  readonly verifiedAt:string|null;
  readonly failureCode:string|null;
}
export interface DocumentIntelligenceDetail {
  readonly documentId:string;
  readonly currentVersionId:string|null;
  readonly currentVersionNumber:number|null;
  readonly analyses:readonly DocumentIntelligenceAnalysis[];
}
export interface ExtractionRequestInput {readonly workspaceId:string;readonly documentId:string;readonly versionNumber?:number|null}
export interface ExtractionReviewInput {readonly workspaceId:string;readonly analysisId:string;readonly decision:DocumentReviewDecision;readonly correctedFields?:Readonly<Record<string,unknown>>|null;readonly note?:string|null}
export interface ExtractionVerifyInput {readonly workspaceId:string;readonly analysisId:string;readonly note?:string|null}

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATES=['queued','extracting','review_required','reviewed','verified','rejected','failed','superseded','legacy_unverified'] as const;
const TRANSITIONS:Readonly<Record<DocumentIntelligenceState,readonly DocumentIntelligenceState[]>>=Object.freeze({
  queued:['extracting','failed'],extracting:['review_required','failed'],review_required:['reviewed','rejected','failed'],reviewed:['verified','rejected','superseded'],verified:['superseded'],rejected:[],failed:[],superseded:[],legacy_unverified:['rejected']
});
const bad=(validation=false):never=>{throw new DataAccessError('Invalid Document Intelligence data',validation?'DATA_VALIDATION_FAILED':'DATA_OPERATION_FAILED')};
const rec=(v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:bad();
const arr=(v:unknown)=>Array.isArray(v)?v:bad();
const str=(v:unknown,n=2_000_000)=>typeof v==='string'&&v.length<=n?v:bad();
const req=(v:unknown,n=1200)=>{const s=str(v,n).trim();return s?s:bad()};
const opt=(v:unknown,n=1200)=>v==null?null:str(v,n);
const integer=(v:unknown,min=0)=>{const n=Number(v);return Number.isSafeInteger(n)&&n>=min?n:bad()};
const confidence=(v:unknown,optional=false)=>{if(v==null&&optional)return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=1?n:bad()};
export function assertIntelligenceId(v:unknown){const s=req(v,64);if(!UUID.test(s))bad(true);return s}
const oid=(v:unknown)=>v==null?null:assertIntelligenceId(v);
const state=(v:unknown)=>{const s=req(v,32) as DocumentIntelligenceState;return STATES.includes(s)?s:bad()};
const jsonObject=(v:unknown)=>rec(v);

function field(v:unknown):IntelligenceField{const x=rec(v),pageNumber=integer(x.pageNumber,1),key=req(x.key,160),value=x.value==null?null:str(x.value,20_000),sourceText=x.sourceText==null?null:str(x.sourceText,20_000);return{key,value,confidence:confidence(x.confidence)!,pageNumber,sourceText,corrected:x.corrected===true}}
function page(v:unknown):IntelligencePage{const x=rec(v),pageNumber=integer(x.pageNumber,1);return{pageNumber,text:str(x.text,2_000_000),confidence:confidence(x.confidence)!,fields:arr(x.fields??[]).map(field)}}
function analysis(v:unknown):DocumentIntelligenceAnalysis{const x=rec(v),s=state(x.state),documentVersionId=oid(x.documentVersionId),sourceVersionNumber=x.sourceVersionNumber==null?null:integer(x.sourceVersionNumber,1);if(s!=='legacy_unverified'&&(!documentVersionId||!sourceVersionNumber))bad();const pages=arr(x.pages??[]).map(page);if((s==='review_required'||s==='reviewed'||s==='verified')&&!pages.length)bad();return{id:assertIntelligenceId(x.id),documentId:assertIntelligenceId(x.documentId),documentVersionId,sourceVersionNumber,analysisVersion:integer(x.analysisVersion,1),state:s,reviewStatus:req(x.reviewStatus,32),ocrText:opt(x.ocrText,8_000_000),extractedFields:jsonObject(x.extractedFields??{}),pages,classification:opt(x.classification,240),confidence:confidence(x.confidence,true),provider:opt(x.provider,240),stale:x.stale===true,analyzedAt:req(x.analyzedAt,80),reviewedAt:opt(x.reviewedAt,80),verifiedAt:opt(x.verifiedAt,80),failureCode:opt(x.failureCode,160)}}

export function parseDocumentIntelligenceDetail(v:unknown):DocumentIntelligenceDetail{const x=rec(v);if(x.schema!==DOCUMENT_INTELLIGENCE_SCHEMA)bad();const currentVersionId=oid(x.currentVersionId),currentVersionNumber=x.currentVersionNumber==null?null:integer(x.currentVersionNumber,1);if((currentVersionId===null)!==(currentVersionNumber===null))bad();return{documentId:assertIntelligenceId(x.documentId),currentVersionId,currentVersionNumber,analyses:arr(x.analyses??[]).map(analysis)}}
export function validateExtractionRequest(x:ExtractionRequestInput){assertIntelligenceId(x.workspaceId);assertIntelligenceId(x.documentId);if(x.versionNumber!=null)integer(x.versionNumber,1)}
export function validateReviewInput(x:ExtractionReviewInput){assertIntelligenceId(x.workspaceId);assertIntelligenceId(x.analysisId);if(x.decision!=='accept'&&x.decision!=='reject')bad(true);if(x.note!=null&&x.note.length>1000)bad(true);if(x.decision==='reject'&&x.correctedFields!=null)bad(true);if(x.correctedFields!=null){const value=jsonObject(x.correctedFields),encoded=JSON.stringify(value);if(encoded.length>DOCUMENT_INTELLIGENCE_MAX_REVIEW_BYTES)bad(true);for(const [key,raw] of Object.entries(value)){if(!key.trim()||key.length>160)bad(true);const f=rec(raw);integer(f.pageNumber,1);confidence(f.confidence);if(f.value!=null&&typeof f.value!=='string')bad(true)}}}
export function validateVerifyInput(x:ExtractionVerifyInput){assertIntelligenceId(x.workspaceId);assertIntelligenceId(x.analysisId);if(x.note!=null&&x.note.length>1000)bad(true)}
export function assertDocumentIntelligenceTransition(from:DocumentIntelligenceState,to:DocumentIntelligenceState){if(!TRANSITIONS[from]?.includes(to))bad(true)}
export function isVerifiedIntelligenceUsable(a:Pick<DocumentIntelligenceAnalysis,'state'|'stale'>){return a.state==='verified'&&!a.stale}
