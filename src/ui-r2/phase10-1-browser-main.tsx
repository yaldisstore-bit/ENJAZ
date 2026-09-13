import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { EnjazDataLayerFactory } from '../data/createDataLayer.ts';
import { DataLayerProvider } from '../data/react/DataLayerContext.tsx';
import type { DocumentVaultGateway } from '../features/documents/documentVaultCommands.ts';
import type { VaultDocument, VaultVersion } from '../features/documents/documentVaultContract.ts';
import { LiveDocumentVaultPortal } from './documents/LiveDocumentVaultPortal.tsx';
import './design-system/design-system.css';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './runtime/accessibility-hardening.css';

const W='11111111-1111-4111-8111-111111111111';
const C1='22222222-2222-4222-8222-222222222221';
const C2='22222222-2222-4222-8222-222222222222';
const T1='33333333-3333-4333-8333-333333333331';
const T2='33333333-3333-4333-8333-333333333332';
const D1='44444444-4444-4444-8444-444444444441';
const D2='44444444-4444-4444-8444-444444444442';
const D3='44444444-4444-4444-8444-444444444443';
const V1='55555555-5555-4555-8555-555555555551';
const V2='55555555-5555-4555-8555-555555555552';
const V3='55555555-5555-4555-8555-555555555553';
const PDF='application/pdf';
const PNG='image/png';
const now='2026-09-13T05:00:00.000Z';
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

let docs:VaultDocument[]=[
  {id:D1,title:'عقد تأسيس شركة الرافدين للتجارة العامة — نسخة عربية طويلة لاختبار الالتفاف والاتجاه',documentType:'عقد تأسيس',fileName:'rafidain-company-contract-v1.pdf',mimeType:PDF,sizeBytes:184320,status:'ready',companyId:C1,transactionId:T1,createdAt:now,archivedAt:null},
  {id:D2,title:'شهادة تسجيل ومرفقات مصورة',documentType:'شهادة',fileName:'registration-certificate.png',mimeType:PNG,sizeBytes:98304,status:'needs_review',companyId:C2,transactionId:T2,createdAt:now,archivedAt:null},
  {id:D3,title:'كتاب رسمي مؤرشف مع تاريخ محفوظ',documentType:'كتاب رسمي',fileName:'archived-letter.pdf',mimeType:PDF,sizeBytes:65536,status:'archived',companyId:C1,transactionId:null,createdAt:now,archivedAt:'2026-09-13T05:15:00.000Z'},
];
let versions:Record<string,VaultVersion[]>={
  [D1]:[{id:V1,versionNumber:1,fileName:'rafidain-company-contract-v1.pdf',mimeType:PDF,sizeBytes:184320,createdAt:now}],
  [D2]:[{id:V2,versionNumber:1,fileName:'registration-certificate.png',mimeType:PNG,sizeBytes:98304,createdAt:now}],
  [D3]:[{id:V3,versionNumber:1,fileName:'archived-letter.pdf',mimeType:PDF,sizeBytes:65536,createdAt:now}],
};

const browserState={
  listCalls:[] as Array<{workspaceId:string;query:string;includeArchived:boolean;offset:number}>,
  detailCalls:[] as Array<{workspaceId:string;documentId:string}>,
  uploadCalls:[] as Array<{documentId:string|null;title:string;fileName:string;mimeType:string;size:number;companyId:string|null;transactionId:string|null}>,
  downloadCalls:[] as Array<{workspaceId:string;documentId:string;versionNumber:number|null}>,
  archiveCalls:[] as Array<{workspaceId:string;documentId:string}>,
  get documents(){return docs},
  get versions(){return versions},
};

function pageProbe(offset:number):VaultDocument[]{
  const page=offset>=100?2:1;
  const count=page===1?2:1;
  return Array.from({length:count},(_,index)=>({
    id:crypto.randomUUID(),
    title:`وثيقة صفحة ${page} — سجل ${index+1}`,
    documentType:'اختبار صفحات',
    fileName:`page-${page}-${index+1}.pdf`,
    mimeType:PDF,
    sizeBytes:2048+index,
    status:'ready' as const,
    companyId:null,
    transactionId:null,
    createdAt:now,
    archivedAt:null,
  }));
}

const gateway:DocumentVaultGateway={
  async list(workspaceId,query='',includeArchived=false,offset=0){
    browserState.listCalls.push({workspaceId,query,includeArchived,offset});
    await pause(160);
    if(query.trim()==='خطأ')throw new Error('DOCUMENT_VAULT_PROBE_ERROR');
    if(query.trim()==='صفحات')return{total:105,offset,limit:100,documents:pageProbe(offset)};
    const q=query.trim();
    const filtered=docs.filter(d=>(includeArchived||d.status!=='archived')&&(!q||`${d.title} ${d.fileName??''} ${d.documentType??''}`.includes(q)));
    return{total:filtered.length,offset,limit:100,documents:filtered.slice(offset,offset+100)};
  },
  async detail(workspaceId,documentId){
    browserState.detailCalls.push({workspaceId,documentId});
    await pause(60);
    const document=docs.find(d=>d.id===documentId);
    if(!document)throw new Error('DOCUMENT_NOT_FOUND');
    return{document,versions:versions[documentId]??[]};
  },
  async upload(input){
    browserState.uploadCalls.push({documentId:input.documentId??null,title:input.title,fileName:input.file.name,mimeType:input.file.type,size:input.file.size,companyId:input.companyId,transactionId:input.transactionId});
    await pause(90);
    if(input.documentId){
      const index=docs.findIndex(d=>d.id===input.documentId);
      if(index<0)throw new Error('DOCUMENT_NOT_FOUND');
      const next=(versions[input.documentId]?.length??0)+1;
      const version:VaultVersion={id:crypto.randomUUID(),versionNumber:next,fileName:input.file.name,mimeType:input.file.type,sizeBytes:input.file.size,createdAt:new Date().toISOString()};
      versions={...versions,[input.documentId]:[...(versions[input.documentId]??[]),version]};
      docs=docs.map(d=>d.id===input.documentId?{...d,title:input.title,documentType:input.documentType,fileName:input.file.name,mimeType:input.file.type,sizeBytes:input.file.size,status:'ready',companyId:input.companyId,transactionId:input.transactionId}:d);
      return{documentId:input.documentId,versionNumber:next};
    }
    const id=crypto.randomUUID();
    const created=new Date().toISOString();
    const document:VaultDocument={id,title:input.title,documentType:input.documentType,fileName:input.file.name,mimeType:input.file.type,sizeBytes:input.file.size,status:'ready',companyId:input.companyId,transactionId:input.transactionId,createdAt:created,archivedAt:null};
    docs=[document,...docs];
    versions={...versions,[id]:[{id:crypto.randomUUID(),versionNumber:1,fileName:input.file.name,mimeType:input.file.type,sizeBytes:input.file.size,createdAt:created}]};
    return{documentId:id,versionNumber:1};
  },
  async downloadUrl(workspaceId,documentId,versionNumber=null){
    browserState.downloadCalls.push({workspaceId,documentId,versionNumber:versionNumber??null});
    return`${location.href.split('#')[0]}#download-${documentId}-${versionNumber??'latest'}`;
  },
  async archive(workspaceId,documentId){
    browserState.archiveCalls.push({workspaceId,documentId});
    await pause(60);
    docs=docs.map(d=>d.id===documentId?{...d,status:'archived',archivedAt:new Date().toISOString()}:d);
  },
};

const factory={
  async resolveWorkspaceId(){return W},
  forWorkspace(){
    return{
      companies:{async list(){return{items:[
        {id:C1,legal_name:'شركة الرافدين للتجارة العامة',display_name:'الرافدين'},
        {id:C2,legal_name:'شركة بغداد للخدمات القانونية',display_name:'بغداد القانونية'},
      ]}}},
      transactions:{async list(){return{items:[
        {id:T1,type:'تأسيس شركة',status:'active',company_id:C1},
        {id:T2,type:'تعديل عقد',status:'stalled',company_id:C2},
      ]}}},
    };
  },
} as unknown as EnjazDataLayerFactory;

declare global{interface Window{__ENJAZ_PHASE101_BROWSER__?:typeof browserState}}
window.__ENJAZ_PHASE101_BROWSER__=browserState;

const root=document.getElementById('phase101-browser-root');
if(!root)throw new Error('Phase 10.1 browser root missing');
createRoot(root).render(
  <StrictMode>
    <DataLayerProvider factory={factory}>
      <div className="ez-r2-root r2-shell" data-r2-runtime-mode="live" data-destination="documents">
        <main id="r2-main" className="r2-shell__main" aria-label="خزنة الوثائق">
          <div className="r2-screen" data-records-stage="R2.0-6" data-records-domain="documents" aria-hidden="true" />
        </main>
        <LiveDocumentVaultPortal factory={async()=>gateway} workspace={Promise.resolve(W)} />
      </div>
    </DataLayerProvider>
  </StrictMode>,
);
