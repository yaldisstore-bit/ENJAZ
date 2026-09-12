import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { RegulatoryKnowledgeEntry, RegulatoryKnowledgeGateway, RegulatoryKnowledgeSearchItem } from '../features/regulatory/regulatoryKnowledgeCommands.ts';
import { LiveRegulatoryKnowledgePortal } from './regulatory/LiveRegulatoryKnowledgePortal.tsx';
import './design-system/design-system.css';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './runtime/accessibility-hardening.css';

const W='11111111-1111-4111-8111-111111111111';
const S1='22222222-2222-4222-8222-222222222221';
const S2='22222222-2222-4222-8222-222222222222';
const V1='33333333-3333-4333-8333-333333333331';
const V2='33333333-3333-4333-8333-333333333332';
const A1='44444444-4444-4444-8444-444444444441';
const HASH='a'.repeat(64);

const rows:readonly RegulatoryKnowledgeSearchItem[]=[
  {sourceId:S1,scope:'official_global',workspaceId:null,kind:'law',jurisdiction:'العراق',issuer:'الوقائع العراقية',referenceCode:'ق-21/2026',asOf:'2026-09-12',versionId:V1,revision:3,titleAr:'قانون الشركات — النص النافذ',publicationDate:'2026-02-10',effectiveFrom:'2026-03-01',effectiveTo:null,sourceLocator:'الوقائع العراقية — العدد 4810',publisher:'وزارة العدل',sourceUrl:'https://example.gov.iq/company-law',retrievedOn:'2026-09-12',sourceHash:HASH,authoritative:true,excerpt:'ينظم هذا النص الأحكام النافذة المتعلقة بتأسيس الشركات وإدارتها وتمثيلها القانوني.'},
  {sourceId:S2,scope:'workspace_curated',workspaceId:W,kind:'procedure',jurisdiction:'العراق',issuer:'فريق إنجاز القانوني',referenceCode:'PROC-REG-04',asOf:'2026-09-12',versionId:V2,revision:2,titleAr:'إجراء تدقيق محضر الشركة قبل الإيداع',publicationDate:'2026-08-20',effectiveFrom:'2026-08-20',effectiveTo:null,sourceLocator:'دليل إجراءات مساحة العمل',publisher:'مساحة عمل إنجاز',sourceUrl:'https://example.com/enjaz-procedure',retrievedOn:'2026-09-12',sourceHash:'b'.repeat(64),authoritative:true,excerpt:'إجراء داخلي موثق يحدد خطوات التحقق من المحضر والمخولين قبل الإيداع الرسمي.'},
];

const entries:Readonly<Record<string,RegulatoryKnowledgeEntry>>={
  [S1]:{sourceId:S1,workspaceId:W,asOf:'2026-09-12',configured:true,official:{scope:'official_global',sourceWorkspaceId:null,kind:'law',jurisdiction:'العراق',issuer:'الوقائع العراقية',referenceCode:'ق-21/2026',versionId:V1,revision:3,titleAr:'قانون الشركات — النص النافذ',publicationDate:'2026-02-10',effectiveFrom:'2026-03-01',effectiveTo:null,supersedesVersionId:null,sourceLocator:'الوقائع العراقية — العدد 4810',publisher:'وزارة العدل',sourceUrl:'https://example.gov.iq/company-law',retrievedOn:'2026-09-12',sourceHash:HASH,officialText:'النص الرسمي المعتمد لهذا الإصدار محفوظ كما ورد من المصدر، ويظل المرجع الوحيد للحقيقة التنظيمية داخل إنجاز.',authoritative:true},derivedArtifacts:[{artifactId:A1,kind:'ai_summary',sourceId:S1,sourceVersionId:V1,body:'ملخص مساعد يوضح موضوع النص للمستخدم، ولا يملك أي سلطة تنظيمية أو قانونية مستقلة عن الإصدار الرسمي المرتبط به.',authoritative:false,createdAt:'2026-09-12T06:00:00.000Z'}]},
  [S2]:{sourceId:S2,workspaceId:W,asOf:'2026-09-12',configured:true,official:{scope:'workspace_curated',sourceWorkspaceId:W,kind:'procedure',jurisdiction:'العراق',issuer:'فريق إنجاز القانوني',referenceCode:'PROC-REG-04',versionId:V2,revision:2,titleAr:'إجراء تدقيق محضر الشركة قبل الإيداع',publicationDate:'2026-08-20',effectiveFrom:'2026-08-20',effectiveTo:null,supersedesVersionId:null,sourceLocator:'دليل إجراءات مساحة العمل',publisher:'مساحة عمل إنجاز',sourceUrl:'https://example.com/enjaz-procedure',retrievedOn:'2026-09-12',sourceHash:'b'.repeat(64),officialText:'إجراء مساحة العمل الموثق: التحقق من هوية الشركة، صحة المحضر، وصفة المخولين، ثم مطابقة الوثائق قبل الإيداع.',authoritative:true},derivedArtifacts:[]},
};

const browserState={searchCalls:[] as Array<Record<string,unknown>>,entryCalls:[] as Array<Record<string,unknown>>};
const gateway:RegulatoryKnowledgeGateway={
  async search(input){browserState.searchCalls.push({...input});const q=(input.query??'').trim();return rows.filter(row=>(!input.kind||row.kind===input.kind)&&(!input.scope||row.scope===input.scope)&&(!q||`${row.titleAr} ${row.issuer} ${row.referenceCode} ${row.excerpt}`.includes(q)))},
  async getEntry(input){browserState.entryCalls.push({...input});const entry=entries[input.sourceId];if(!entry)throw new Error('REGULATORY_SOURCE_NOT_FOUND');return entry},
};

declare global{interface Window{__ENJAZ_PHASE94_BROWSER__?:typeof browserState}}
window.__ENJAZ_PHASE94_BROWSER__=browserState;
const root=document.getElementById('phase94-browser-root');
if(!root)throw new Error('Phase 9.4 browser root missing');
createRoot(root).render(<StrictMode><div className="ez-r2-root r2-shell" data-r2-runtime-mode="live" data-destination="knowledge"><main id="r2-main" className="r2-shell__main" aria-label="مركز المعرفة التنظيمية"><div className="r2-screen" data-regulatory-runtime-target="phase9.4" aria-hidden="true"/></main><LiveRegulatoryKnowledgePortal gateway={gateway} workspace={Promise.resolve(W)}/></div></StrictMode>);
