import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import type {EnjazDataLayerFactory} from '../data/createDataLayer.ts';
import {DataLayerProvider} from '../data/react/DataLayerContext.tsx';
import type {EnjazSupabaseClient} from '../core/supabase/client.ts';
import {createDocumentVaultGateway,type DocumentVaultGateway} from '../features/documents/documentVaultCommands.ts';
import type {DocumentUploadInput,VaultDocument,VaultVersion} from '../features/documents/documentVaultContract.ts';
import {ConnectedDocumentVault} from './documents/ConnectedDocumentVault.tsx';
import './design-system/design-system.css';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './runtime/accessibility-hardening.css';

const W='11111111-1111-4111-8111-111111111111';
const C='22222222-2222-4222-8222-222222222221';
const T='33333333-3333-4333-8333-333333333331';
const D='44444444-4444-4444-8444-444444444441';
const PDF='application/pdf';
const now='2026-09-14T15:00:00.000Z';
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

let docs:VaultDocument[]=[{id:D,title:'عقد محفوظ قبل بوابة الصفر',documentType:'عقد',fileName:'baseline.pdf',mimeType:PDF,sizeBytes:4096,status:'ready',companyId:C,transactionId:T,createdAt:now,archivedAt:null}];
let versions:Record<string,VaultVersion[]>={[D]:[{id:'55555555-5555-4555-8555-555555555551',versionNumber:1,fileName:'baseline.pdf',mimeType:PDF,sizeBytes:4096,createdAt:now}]};
const prepareAttempts=new Map<string,number>();
const operationDocuments=new Map<string,string>();
const browserState={
  listCalls:[] as Array<{query:string;includeArchived:boolean;offset:number}>,
  uploadCalls:[] as Array<{operationId:string|null;fileName:string;title:string}>,
  edgeCalls:[] as Array<{action:string;operationId:string|null;fileName:string|null}>,
  storagePuts:[] as Array<{operationId:string}>,
  get documents(){return docs},
  get operationDocumentCount(){return operationDocuments.size},
};

const fakeClient={
  auth:{async getSession(){return{data:{session:{access_token:'phase10-6-browser-jwt'}}}}},
} as unknown as EnjazSupabaseClient;

const nativeFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const target=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  if(target==='https://phase10-6.invalid/functions/v1/enjaz-document-vault'){
    const body=JSON.parse(String(init?.body??'{}')) as Record<string,unknown>;
    const action=String(body.action??''),operationId=typeof body.operationId==='string'?body.operationId:null,fileName=typeof body.fileName==='string'?body.fileName:null;
    browserState.edgeCalls.push({action,operationId,fileName});
    if(action==='prepare'&&operationId){
      const attempt=(prepareAttempts.get(operationId)??0)+1;prepareAttempts.set(operationId,attempt);
      if(fileName==='retry.pdf'&&attempt===1)return new Response(JSON.stringify({ok:false,error:'SIMULATED_TRANSIENT'}),{status:503,headers:{'Content-Type':'application/json'}});
      if(!operationDocuments.has(operationId))operationDocuments.set(operationId,crypto.randomUUID());
      return new Response(JSON.stringify({ok:true,signedUrl:`https://phase10-6-upload.invalid/${operationId}`,expiresInSeconds:7200}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    if(action==='acknowledge'&&operationId){
      const documentId=operationDocuments.get(operationId);
      if(!documentId)return new Response(JSON.stringify({ok:false,error:'STORAGE_OBJECT_NOT_FOUND'}),{status:409,headers:{'Content-Type':'application/json'}});
      return new Response(JSON.stringify({ok:true,ack:{schema:'enjaz.document-upload-ack.v1',operationId,documentId,versionNumber:1,status:'ready',wasDuplicate:false}}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    return new Response(JSON.stringify({ok:false,error:'UNEXPECTED_ACTION'}),{status:400,headers:{'Content-Type':'application/json'}});
  }
  if(target.startsWith('https://phase10-6-upload.invalid/')){
    const operationId=target.split('/').pop()??'';browserState.storagePuts.push({operationId});return new Response('',{status:200});
  }
  return nativeFetch(input,init);
};

const uploadTransport=createDocumentVaultGateway(fakeClient,'https://phase10-6.invalid','sb_publishable_browser_probe',1500);
const gateway:DocumentVaultGateway={
  async list(_workspaceId,query='',includeArchived=false,offset=0){browserState.listCalls.push({query,includeArchived,offset});await pause(50);const q=query.trim();const filtered=docs.filter(item=>(includeArchived||item.status!=='archived')&&(!q||`${item.title} ${item.fileName??''}`.includes(q)));return{total:filtered.length,offset,limit:100,documents:filtered.slice(offset,offset+100)}},
  async detail(_workspaceId,documentId){const document=docs.find(item=>item.id===documentId);if(!document)throw new Error('DOCUMENT_NOT_FOUND');return{document,versions:versions[documentId]??[]}},
  async upload(input:DocumentUploadInput){
    browserState.uploadCalls.push({operationId:input.operationId??null,fileName:input.file.name,title:input.title});
    const result=await uploadTransport.upload(input);
    const created=new Date().toISOString(),document:VaultDocument={id:result.documentId,title:input.title,documentType:input.documentType,fileName:input.file.name,mimeType:input.file.type,sizeBytes:input.file.size,status:'ready',companyId:input.companyId,transactionId:input.transactionId,createdAt:created,archivedAt:null};
    const version:VaultVersion={id:crypto.randomUUID(),versionNumber:result.versionNumber,fileName:input.file.name,mimeType:input.file.type,sizeBytes:input.file.size,createdAt:created};
    const existing=docs.find(item=>item.id===result.documentId);
    docs=existing?docs.map(item=>item.id===result.documentId?document:item):[document,...docs];
    versions={...versions,[result.documentId]:[...(versions[result.documentId]??[]),version]};
    return result;
  },
  async downloadUrl(){return location.href},
  async archive(_workspaceId,documentId){docs=docs.map(item=>item.id===documentId?{...item,status:'archived',archivedAt:new Date().toISOString()}:item)},
};

const factory={
  async resolveWorkspaceId(){return W},
  forWorkspace(){return{
    companies:{async list(){return{items:[{id:C,legal_name:'شركة بوابة الصفر',display_name:'بوابة الصفر'}]}}},
    transactions:{async list(){return{items:[{id:T,type:'اختبار وثيقة',status:'active',company_id:C}]}}},
  }},
} as unknown as EnjazDataLayerFactory;

declare global{interface Window{__ENJAZ_PHASE106_BROWSER__?:typeof browserState}}
window.__ENJAZ_PHASE106_BROWSER__=browserState;
const root=document.getElementById('phase106-browser-root');
if(!root)throw new Error('Phase 10.6 browser root missing');
createRoot(root).render(<StrictMode><DataLayerProvider factory={factory}><div className="ez-r2-root r2-shell" data-r2-runtime-mode="live" data-destination="documents"><main id="r2-main" className="r2-shell__main" aria-label="بوابة وثائق الصفر"><ConnectedDocumentVault gateway={gateway} workspace={Promise.resolve(W)}/></main></div></DataLayerProvider></StrictMode>);