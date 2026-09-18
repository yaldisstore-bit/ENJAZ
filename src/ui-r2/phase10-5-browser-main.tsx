import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import type {DocumentFactoryDraft,DocumentFactoryGateway} from '../features/documents/documentFactoryCommands.ts';
import {assertEngagementContractTransition,type EngagementContractStatus} from '../features/engagements/engagementContract.ts';
import type {CreateEngagementContractRevisionInput,EngagementContractGateway,EngagementContractRuntimeRevision,TransitionEngagementContractRevisionInput} from '../features/engagements/engagementContractCommands.ts';
import {FinanceCommandProvider} from '../features/finance/FinanceCommandContext.tsx';
import type {FinanceCommandGateway,FinanceEngagementContext,FinancePaymentContext} from '../features/finance/financeCommands.ts';
import {EngagementContractPanel} from './documents/EngagementContractPanel.tsx';
import './design-system/design-system.css';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './regulatory/regulatory-knowledge.css';
import './runtime/accessibility-hardening.css';

const W='11111111-1111-4111-8111-111111111111';
const C='22222222-2222-4222-8222-222222222222';
const T='33333333-3333-4333-8333-333333333333';
const E='44444444-4444-4444-8444-444444444444';
const DRAFT='55555555-5555-4555-8555-555555555555';
const TEMPLATE='66666666-6666-4666-8666-666666666666';
const DOCUMENT='77777777-7777-4777-8777-777777777777';
const VERSION='88888888-8888-4888-8888-888888888888';
const NOW='2026-09-14T12:00:00.000Z';
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

const finalDraft:DocumentFactoryDraft=Object.freeze({
  id:DRAFT,
  title:'عقد خدمات قانونية نهائي',
  status:'final',
  compiledContent:'عقد خدمات قانونية نهائي',
  facts:Object.freeze({'company.legal_name':'شركة الاختبار للتجارة العامة'}),
  provenance:Object.freeze({source:'phase10-5-browser'}),
  templateVersionId:TEMPLATE,
  companyId:C,
  transactionId:T,
  approvedAt:NOW,
  approvalNote:'اعتماد المتصفح',
  finalDocumentId:DOCUMENT,
  finalDocumentVersionId:VERSION,
  updatedAt:NOW,
});

const engagement:FinanceEngagementContext=Object.freeze({
  id:E,
  companyId:C,
  title:'اتفاق خدمات الشركة',
  reference:'M16-001',
  type:'contract',
  billingMode:'fixed',
  status:'active',
  transactionIds:Object.freeze([T]),
});

const financeContext:FinancePaymentContext=Object.freeze({
  cashboxes:Object.freeze([]),
  engagements:Object.freeze([engagement]),
  recentReceipts:Object.freeze([]),
  reconciliation:Object.freeze({postedTotalCents:0n,reversedTotalCents:0n,statusWithoutReversal:0,reversalWithoutStatus:0,shadowLedgerEntries:0,integrityWarnings:0,moneyAuthority:'payments_plus_non_payment_ledger'}),
});

const financeGateway={
  async loadContext(workspaceId:string){if(workspaceId!==W)throw new Error('WORKSPACE_FORBIDDEN');await pause(10);return financeContext},
  async postPayment(){throw new Error('HARNESS_FINANCE_WRITE_FORBIDDEN')},
  async reversePayment(){throw new Error('HARNESS_FINANCE_WRITE_FORBIDDEN')},
} as unknown as FinanceCommandGateway;

const documentFactoryGateway={
  async listDrafts(workspaceId:string){if(workspaceId!==W)throw new Error('WORKSPACE_FORBIDDEN');await pause(10);return Object.freeze([finalDraft])},
} as unknown as DocumentFactoryGateway;

let revisions:EngagementContractRuntimeRevision[]=[];
const transitionLog:Array<{from:EngagementContractStatus;to:EngagementContractStatus;documentId:string|null;documentVersionId:string|null}>=[];

function replaceRevision(next:EngagementContractRuntimeRevision){revisions=revisions.map(item=>item.id===next.id?next:item);return next}
function createRuntimeRevision(input:CreateEngagementContractRevisionInput):EngagementContractRuntimeRevision{
  if(input.workspaceId!==W||input.engagementId!==E||input.templateVersionId!==TEMPLATE||input.draftId!==DRAFT)throw new Error('CONTRACT_AUTHORITY_MISMATCH');
  const previous=[...revisions].sort((a,b)=>b.revision-a.revision)[0];
  if(previous&&previous.status!=='superseded')throw new Error('previous revision must be superseded');
  const revision=(previous?.revision??0)+1,id=crypto.randomUUID();
  return Object.freeze({workspaceId:W,engagementId:E,revision,title:input.title,status:'draft',version:1,templateVersionId:TEMPLATE,draftId:DRAFT,documentId:null,documentVersionId:null,supersedesRevision:previous?.revision??null,effectiveOn:null,expiresOn:null,signedAt:null,id,signatureProvenance:Object.freeze({}),terminationNote:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
}

const contractGateway:EngagementContractGateway={
  async listAttention(workspaceId,kind='all',includeTerminal=false){if(workspaceId!==W)throw new Error('WORKSPACE_FORBIDDEN');return Object.freeze({schema:'enjaz.intake-contract-attention.v1' as const,workspaceId:W,workspaceTimezone:'Asia/Baghdad',kind,includeTerminal,generatedAt:NOW,items:Object.freeze([])})},
  async list(workspaceId,engagementId=null){if(workspaceId!==W)throw new Error('WORKSPACE_FORBIDDEN');await pause(10);return Object.freeze(revisions.filter(r=>!engagementId||r.engagementId===engagementId).slice().sort((a,b)=>b.revision-a.revision))},
  async create(input){await pause(15);const existing=revisions.find(r=>r.engagementId===input.engagementId&&r.draftId===input.draftId&&r.status!=='superseded');if(existing)return existing;const next=createRuntimeRevision(input);revisions=[next,...revisions];return next},
  async transition(input:TransitionEngagementContractRevisionInput){await pause(15);if(input.workspaceId!==W)throw new Error('WORKSPACE_FORBIDDEN');const current=revisions.find(r=>r.id===input.revisionId);if(!current)throw new Error('CONTRACT_NOT_FOUND');if(input.expectedVersion!==current.version)throw new Error('CONTRACT_STALE');if(!input.operationId)throw new Error('CONTRACT_OPERATION_REQUIRED');assertEngagementContractTransition(current.status,input.toStatus);let documentId=current.documentId,documentVersionId=current.documentVersionId,signedAt=current.signedAt,effectiveOn=current.effectiveOn,expiresOn=current.expiresOn,signatureProvenance=current.signatureProvenance,terminationNote=current.terminationNote;
    if(input.toStatus==='signature_pending'){if(input.documentId!==DOCUMENT||input.documentVersionId!==VERSION)throw new Error('SIGNED_ARTIFACT_REQUIRED');documentId=DOCUMENT;documentVersionId=VERSION}
    if(current.status==='signature_pending'&&input.toStatus==='approved'){documentId=null;documentVersionId=null;signedAt=null;signatureProvenance=Object.freeze({})}
    if(input.toStatus==='signed'){if(documentId!==DOCUMENT||documentVersionId!==VERSION)throw new Error('SIGNED_ARTIFACT_REQUIRED');signedAt=new Date().toISOString();signatureProvenance=Object.freeze({...input.signatureProvenance})}
    if(input.toStatus==='effective'){if(!input.effectiveOn)throw new Error('effective date required');effectiveOn=input.effectiveOn;expiresOn=input.expiresOn??null}
    if(input.toStatus==='terminated'){if(!input.note?.trim())throw new Error('termination note required');terminationNote=input.note.trim()}
    const next:EngagementContractRuntimeRevision=Object.freeze({...current,version:current.version+1,status:input.toStatus,documentId,documentVersionId,signedAt,effectiveOn,expiresOn,signatureProvenance,terminationNote,updatedAt:new Date().toISOString()});
    transitionLog.push({from:current.status,to:input.toStatus,documentId:next.documentId,documentVersionId:next.documentVersionId});
    return replaceRevision(next)
  },
};

const browserState={get revisions(){return revisions},get transitions(){return transitionLog},workspaceId:W,engagementId:E,draftId:DRAFT,documentId:DOCUMENT,documentVersionId:VERSION};
declare global{interface Window{__ENJAZ_PHASE105_BROWSER__?:typeof browserState}}
window.__ENJAZ_PHASE105_BROWSER__=browserState;

const root=document.getElementById('phase105-browser-root');
if(!root)throw new Error('Phase 10.5 browser root missing');
createRoot(root).render(<StrictMode><FinanceCommandProvider gateway={financeGateway}><main className="ez-r2-root r2-shell" dir="rtl" data-r2-runtime-mode="live" data-phase10-5-browser="true"><section id="r2-main" className="r2-shell__main" aria-label="مركز العقود والاتفاقيات"><EngagementContractPanel gateway={contractGateway} documentFactoryGateway={documentFactoryGateway} workspaceId={W}/></section></main></FinanceCommandProvider></StrictMode>);
