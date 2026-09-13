import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import type {EnjazDataLayerFactory} from '../data/createDataLayer.ts';
import {DataLayerProvider} from '../data/react/DataLayerContext.tsx';
import type {DocumentIntelligenceGateway} from '../features/documents/documentIntelligenceCommands.ts';
import type {DocumentIntelligenceAnalysis} from '../features/documents/documentIntelligenceContract.ts';
import type {DocumentVaultGateway} from '../features/documents/documentVaultCommands.ts';
import type {VaultDocument,VaultVersion} from '../features/documents/documentVaultContract.ts';
import {LiveDocumentVaultPortal} from './documents/LiveDocumentVaultPortal.tsx';
import './design-system/design-system.css';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './runtime/accessibility-hardening.css';

const W='11111111-1111-4111-8111-111111111111',C='22222222-2222-4222-8222-222222222222',T='33333333-3333-4333-8333-333333333333',D='44444444-4444-4444-8444-444444444444',V1='55555555-5555-4555-8555-555555555551';
const PDF='application/pdf',now='2026-09-13T13:00:00.000Z';
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
let docs:VaultDocument[]=[{id:D,title:'عقد تأسيس شركة الاختبار',documentType:'عقد تأسيس',fileName:'contract-v1.pdf',mimeType:PDF,sizeBytes:4096,status:'ready',companyId:C,transactionId:T,createdAt:now,archivedAt:null}];
let versions:Record<string,VaultVersion[]>={[D]:[{id:V1,versionNumber:1,fileName:'contract-v1.pdf',mimeType:PDF,sizeBytes:4096,createdAt:now}]};
let analyses:DocumentIntelligenceAnalysis[]=[];
const latest=()=>versions[D]?.[versions[D]!.length-1]??null;
const withStale=(a:DocumentIntelligenceAnalysis):DocumentIntelligenceAnalysis=>({...a,stale:latest()?.id!==a.documentVersionId});
const logs={extract:[] as Array<{versionNumber:number|null}>,review:[] as Array<{analysisId:string;decision:string;correctedFields:unknown}>,verify:[] as Array<{analysisId:string}>,uploads:[] as Array<{documentId:string|null;fileName:string}>};

const vaultGateway:DocumentVaultGateway={
 async list(_workspaceId,query='',includeArchived=false,offset=0){await pause(25);const q=query.trim();const filtered=docs.filter(d=>(includeArchived||d.status!=='archived')&&(!q||d.title.includes(q)));return{total:filtered.length,offset,limit:100,documents:filtered}},
 async detail(_workspaceId,documentId){await pause(20);const document=docs.find(d=>d.id===documentId);if(!document)throw new Error('DOCUMENT_NOT_FOUND');return{document,versions:versions[documentId]??[]}},
 async upload(input){logs.uploads.push({documentId:input.documentId??null,fileName:input.file.name});await pause(30);if(!input.documentId)throw new Error('HARNESS_ONLY_VERSION_UPLOAD');const current=versions[input.documentId]??[],versionNumber=current.length+1,id=crypto.randomUUID(),createdAt=new Date().toISOString(),version:VaultVersion={id,versionNumber,fileName:input.file.name,mimeType:input.file.type,sizeBytes:input.file.size,createdAt};versions={...versions,[input.documentId]:[...current,version]};docs=docs.map(d=>d.id===input.documentId?{...d,fileName:input.file.name,mimeType:input.file.type,sizeBytes:input.file.size,status:'ready'}:d);return{documentId:input.documentId,versionNumber}},
 async downloadUrl(_workspaceId,documentId,versionNumber=null){return`${location.href.split('#')[0]}#download-${documentId}-${versionNumber??'latest'}`},
 async archive(_workspaceId,documentId){docs=docs.map(d=>d.id===documentId?{...d,status:'archived',archivedAt:new Date().toISOString()}:d)}
};

const intelligenceGateway:DocumentIntelligenceGateway={
 async detail(_workspaceId,documentId){await pause(25);const current=latest();return{documentId,currentVersionId:current?.id??null,currentVersionNumber:current?.versionNumber??null,analyses:analyses.map(withStale)}},
 async extract(input){logs.extract.push({versionNumber:input.versionNumber??null});await pause(45);const current=latest(),source=(input.versionNumber==null?current:versions[D]?.find(v=>v.versionNumber===input.versionNumber))??null;if(!source)throw new Error('SOURCE_VERSION_NOT_FOUND');const id=crypto.randomUUID(),analysisVersion=(analyses[0]?.analysisVersion??0)+1;const a:DocumentIntelligenceAnalysis={id,documentId:D,documentVersionId:source.id,sourceVersionNumber:source.versionNumber,analysisVersion,state:'review_required',reviewStatus:'unreviewed',ocrText:'شركة الاختبار للتجارة العامة\nرأس المال 100000000',extractedFields:{company_name:{value:'شركة الاختبار',confidence:.92,pageNumber:1},capital:{value:'100000000',confidence:.88,pageNumber:1}},pages:[{pageNumber:1,text:'شركة الاختبار للتجارة العامة — رأس المال 100000000',confidence:.91,fields:[{key:'company_name',value:'شركة الاختبار',confidence:.92,pageNumber:1,sourceText:'شركة الاختبار للتجارة العامة',corrected:false},{key:'capital',value:'100000000',confidence:.88,pageNumber:1,sourceText:'رأس المال 100000000',corrected:false}]}],classification:'عقد تأسيس',confidence:.91,provider:'browser-ocr',stale:false,analyzedAt:new Date().toISOString(),reviewedAt:null,verifiedAt:null,failureCode:null};analyses=[a,...analyses];return{analysisId:id,state:'review_required'}},
 async review(input){logs.review.push({analysisId:input.analysisId,decision:input.decision,correctedFields:input.correctedFields});await pause(35);const target=analyses.find(a=>a.id===input.analysisId);if(!target||target.state!=='review_required')throw new Error('REVIEW_TRANSITION_INVALID');const corrections=input.correctedFields??{};const pages=target.pages.map(p=>({...p,fields:p.fields.map(f=>{const raw=corrections[f.key];const r=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:null;const value=r&&typeof r.value==='string'?r.value:f.value;return{...f,value,corrected:value!==f.value}})}));analyses=analyses.map(a=>a.id===target.id?{...a,state:input.decision==='accept'?'reviewed':'rejected',reviewStatus:input.decision==='accept'?'approved':'rejected',pages,extractedFields:input.decision==='accept'&&input.correctedFields?input.correctedFields:a.extractedFields,reviewedAt:new Date().toISOString()}:a);return{analysisId:target.id,state:input.decision==='accept'?'reviewed':'rejected'}},
 async verify(input){logs.verify.push({analysisId:input.analysisId});await pause(35);const target=analyses.find(a=>a.id===input.analysisId);if(!target||target.state!=='reviewed')throw new Error('VERIFY_TRANSITION_INVALID');if(latest()?.id!==target.documentVersionId){analyses=analyses.map(a=>a.id===target.id?{...a,state:'superseded',failureCode:'SOURCE_VERSION_STALE'}:a);return{analysisId:target.id,state:'superseded',verified:false,reason:'SOURCE_VERSION_STALE'}}analyses=analyses.map(a=>a.id===target.id?{...a,state:'verified',verifiedAt:new Date().toISOString(),failureCode:null}:a);return{analysisId:target.id,state:'verified',verified:true}}
};

const factory={async resolveWorkspaceId(){return W},forWorkspace(){return{companies:{async list(){return{items:[{id:C,legal_name:'شركة الاختبار للتجارة العامة',display_name:'شركة الاختبار'}]}}},transactions:{async list(){return{items:[{id:T,type:'تأسيس شركة',status:'active',company_id:C}]}}}}}} as unknown as EnjazDataLayerFactory;
const browserState={get analyses(){return analyses.map(withStale)},get versions(){return versions[D]??[]},logs};
declare global{interface Window{__ENJAZ_PHASE102_BROWSER__?:typeof browserState}}
window.__ENJAZ_PHASE102_BROWSER__=browserState;
const root=document.getElementById('phase102-browser-root');if(!root)throw new Error('Phase 10.2 browser root missing');
createRoot(root).render(<StrictMode><DataLayerProvider factory={factory}><div className="ez-r2-root r2-shell" data-r2-runtime-mode="live" data-destination="documents"><main id="r2-main" className="r2-shell__main" aria-label="ذكاء الوثائق"><div className="r2-screen" data-records-stage="R2.0-6" data-records-domain="documents" aria-hidden="true"/></main><LiveDocumentVaultPortal factory={async()=>vaultGateway} intelligenceFactory={async()=>intelligenceGateway} workspace={Promise.resolve(W)}/></div></DataLayerProvider></StrictMode>);
