import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import type {EnjazDataLayerFactory} from '../data/createDataLayer.ts';
import {DataLayerProvider} from '../data/react/DataLayerContext.tsx';
import type {DocumentFactoryDraft,DocumentFactoryGateway,DocumentFactoryManagedTemplate,DocumentFactoryTemplate,DocumentFactoryTemplateVersion,DocumentSubmissionPack} from '../features/documents/documentFactoryCommands.ts';
import type {FactoryTokenSchema} from '../features/documents/documentFactoryContract.ts';
import type {DocumentVaultGateway} from '../features/documents/documentVaultCommands.ts';
import type {VaultDocument,VaultVersion} from '../features/documents/documentVaultContract.ts';
import {LiveDocumentVaultPortal} from './documents/LiveDocumentVaultPortal.tsx';
import './design-system/design-system.css';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './runtime/accessibility-hardening.css';

const W='11111111-1111-4111-8111-111111111111',C='22222222-2222-4222-8222-222222222222',T='33333333-3333-4333-8333-333333333333',D='44444444-4444-4444-8444-444444444444',V='55555555-5555-4555-8555-555555555555',TPL='66666666-6666-4666-8666-666666666666',TV1='77777777-7777-4777-8777-777777777771';
const PDF='application/pdf',now='2026-09-14T09:00:00.000Z';
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const schema:FactoryTokenSchema=Object.freeze({'company.legal_name':Object.freeze({source:'company',field:'legal_name',required:true}),'transaction.type':Object.freeze({source:'transaction',field:'type',required:true})});
let docs:VaultDocument[]=[{id:D,title:'وثيقة معاملة التأسيس',documentType:'كتاب رسمي',fileName:'source.pdf',mimeType:PDF,sizeBytes:4096,status:'ready',companyId:C,transactionId:T,createdAt:now,archivedAt:null}];
const versions:Record<string,VaultVersion[]>={[D]:[{id:V,versionNumber:1,fileName:'source.pdf',mimeType:PDF,sizeBytes:4096,createdAt:now}]};
let managed:DocumentFactoryManagedTemplate[]=[{id:TPL,name:'قالب كتاب التأسيس',kind:'official-letter',bodySource:'الشركة: {{company.legal_name}}\nالمعاملة: {{transaction.type}}\n[[IF company.legal_name]]بيانات الشركة مثبتة[[END]]',tokenSchema:schema,active:true,versions:[{id:TV1,versionNumber:1,status:'published',contentChecksum:'a'.repeat(64),publishedAt:now}]}];
let published:DocumentFactoryTemplate[]=[{versionId:TV1,templateId:TPL,name:'قالب كتاب التأسيس',kind:'official-letter',versionNumber:1,tokenSchema:schema,publishedAt:now}];
let drafts:DocumentFactoryDraft[]=[];
let packs:DocumentSubmissionPack[]=[];
const logs={saveTemplate:[] as string[],createVersion:[] as string[],publishVersion:[] as string[],generate:[] as string[],review:[] as Array<{id:string;decision:string}>,finalize:[] as string[],pack:[] as string[]};
const cloneDraft=(d:DocumentFactoryDraft,patch:Partial<DocumentFactoryDraft>):DocumentFactoryDraft=>Object.freeze({...d,...patch});

const vaultGateway:DocumentVaultGateway={
 async list(_workspaceId,query='',includeArchived=false,offset=0){await pause(15);const q=query.trim(),filtered=docs.filter(d=>(includeArchived||d.status!=='archived')&&(!q||d.title.includes(q)));return{total:filtered.length,offset,limit:100,documents:filtered}},
 async detail(_workspaceId,documentId){await pause(15);const document=docs.find(d=>d.id===documentId);if(!document)throw new Error('DOCUMENT_NOT_FOUND');return{document,versions:versions[documentId]??[]}},
 async upload(){throw new Error('HARNESS_UPLOAD_NOT_USED')},
 async downloadUrl(_workspaceId,documentId,versionNumber=null){return`${location.href.split('#')[0]}#download-${documentId}-${versionNumber??'latest'}`},
 async archive(_workspaceId,documentId){docs=docs.map(d=>d.id===documentId?{...d,status:'archived',archivedAt:new Date().toISOString()}:d)}
};

const factoryGateway:DocumentFactoryGateway={
 async listTemplates(){await pause(15);return published},
 async listManagedTemplates(){await pause(15);return managed},
 async saveTemplate(input){await pause(20);const id=input.templateId??crypto.randomUUID(),tokenSchema=input.tokenSchema as FactoryTokenSchema,current=managed.find(x=>x.id===id);const next:DocumentFactoryManagedTemplate={id,name:input.name,kind:input.kind,bodySource:input.bodySource,tokenSchema,active:input.active!==false,versions:current?.versions??[]};managed=[next,...managed.filter(x=>x.id!==id)];logs.saveTemplate.push(id);return id},
 async createTemplateVersion(_workspaceId,templateId,bodySource,tokenSchema){await pause(20);const target=managed.find(x=>x.id===templateId);if(!target)throw new Error('TEMPLATE_NOT_FOUND');const version:DocumentFactoryTemplateVersion={id:crypto.randomUUID(),versionNumber:Math.max(0,...target.versions.map(v=>v.versionNumber))+1,status:'draft',contentChecksum:'b'.repeat(64),publishedAt:null};managed=managed.map(t=>t.id===templateId?{...t,bodySource,tokenSchema:tokenSchema as FactoryTokenSchema,versions:[version,...t.versions]}:t);logs.createVersion.push(version.id);return version},
 async publishTemplateVersion(_workspaceId,versionId){await pause(20);let owner:DocumentFactoryManagedTemplate|undefined;managed=managed.map(t=>{if(!t.versions.some(v=>v.id===versionId))return t;owner=t;return{...t,versions:t.versions.map(v=>v.id===versionId?{...v,status:'published' as const,publishedAt:new Date().toISOString()}:v)}});if(!owner)throw new Error('VERSION_NOT_FOUND');const version=managed.find(t=>t.id===owner!.id)!.versions.find(v=>v.id===versionId)!;published=[{versionId:version.id,templateId:owner.id,name:owner.name,kind:owner.kind,versionNumber:version.versionNumber,tokenSchema:owner.tokenSchema,publishedAt:version.publishedAt},...published.filter(v=>v.versionId!==version.id)];logs.publishVersion.push(versionId)},
 async listDrafts(_workspaceId,companyId=null,limit=30){await pause(15);return drafts.filter(d=>!companyId||d.companyId===companyId).slice(0,limit)},
 async generate(input){await pause(25);const d:DocumentFactoryDraft=Object.freeze({id:crypto.randomUUID(),title:input.title,status:'review_required',compiledContent:`الشركة: شركة الاختبار للتجارة العامة\nالمعاملة: تأسيس شركة\nبيانات الشركة مثبتة`,facts:Object.freeze({'company.legal_name':'شركة الاختبار للتجارة العامة','transaction.type':'تأسيس شركة'}),provenance:Object.freeze({templateVersionId:input.templateVersionId}),templateVersionId:input.templateVersionId,companyId:input.companyId??null,transactionId:input.transactionId??null,approvedAt:null,approvalNote:null,finalDocumentId:null,finalDocumentVersionId:null,updatedAt:new Date().toISOString()});drafts=[d,...drafts];logs.generate.push(d.id);return d},
 async review(_workspaceId,draftId,decision,note=null){await pause(20);const current=drafts.find(d=>d.id===draftId);if(!current||current.status!=='review_required')throw new Error('REVIEW_STATE_INVALID');const next=cloneDraft(current,{status:decision==='approve'?'approved':'draft',approvedAt:decision==='approve'?new Date().toISOString():null,approvalNote:note,updatedAt:new Date().toISOString()});drafts=drafts.map(d=>d.id===draftId?next:d);logs.review.push({id:draftId,decision});return next},
 async renderAndFinalize(_workspaceId,draftId){await pause(35);const current=drafts.find(d=>d.id===draftId);if(!current||current.status!=='approved')throw new Error('APPROVAL_REQUIRED');const documentId=crypto.randomUUID(),documentVersionId=crypto.randomUUID(),renderJobId=crypto.randomUUID(),next=cloneDraft(current,{status:'final',finalDocumentId:documentId,finalDocumentVersionId:documentVersionId,updatedAt:new Date().toISOString()});drafts=drafts.map(d=>d.id===draftId?next:d);logs.finalize.push(draftId);return{draftId,renderJobId,documentId,documentVersionId,wasDuplicate:false}},
 async listSubmissionPacks(_workspaceId,transactionId=null){await pause(15);return packs.filter(p=>!transactionId||p.transactionId===transactionId)},
 async buildSubmissionPack(_workspaceId,transactionId,title,draftIds){await pause(35);const finals=draftIds.map(id=>drafts.find(d=>d.id===id)).filter(Boolean) as DocumentFactoryDraft[];if(finals.length<2||finals.some(d=>d.status!=='final'||d.transactionId!==transactionId))throw new Error('SUBMISSION_PACK_FINAL_TRANSACTION_DRAFT_REQUIRED');const pack:DocumentSubmissionPack=Object.freeze({packId:crypto.randomUUID(),transactionId,title,status:'succeeded',manifestChecksum:'c'.repeat(64),outputDocumentId:crypto.randomUUID(),outputDocumentVersionId:crypto.randomUUID(),failureCode:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),itemCount:finals.length});packs=[pack,...packs];logs.pack.push(pack.packId);return pack}
};

const dataFactory={async resolveWorkspaceId(){return W},forWorkspace(){return{companies:{async list(){return{items:[{id:C,legal_name:'شركة الاختبار للتجارة العامة',display_name:'شركة الاختبار',updated_at:now}]}}},transactions:{async list(){return{items:[{id:T,type:'تأسيس شركة',status:'active',company_id:C,updated_at:now}]}}}}}} as unknown as EnjazDataLayerFactory;
const browserState={get drafts(){return drafts},get packs(){return packs},get templates(){return managed},logs};
declare global{interface Window{__ENJAZ_PHASE103_BROWSER__?:typeof browserState}}
window.__ENJAZ_PHASE103_BROWSER__=browserState;
const root=document.getElementById('phase103-browser-root');if(!root)throw new Error('Phase 10.3 browser root missing');
createRoot(root).render(<StrictMode><DataLayerProvider factory={dataFactory}><div className="ez-r2-root r2-shell" data-r2-runtime-mode="live" data-destination="documents"><main id="r2-main" className="r2-shell__main" aria-label="مصنع الوثائق"><div className="r2-screen" data-records-stage="R2.0-6" data-records-domain="documents" aria-hidden="true"/></main><LiveDocumentVaultPortal factory={async()=>vaultGateway} documentFactoryFactory={async()=>factoryGateway} workspace={Promise.resolve(W)}/></div></DataLayerProvider></StrictMode>);
