import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {LiveCopilotPortal} from './copilot/LiveCopilotPortal.tsx';
import './design-system/design-system.css';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './golden/golden-mobile-hardening.css';
import './operational-intelligence/operational-intelligence.css';
import './runtime/accessibility-hardening.css';

const W='11111111-1111-4111-8111-111111111111';
type Call=Readonly<{operation:string;query:string;compareWith?:string}>;
declare global{interface Window{__ENJAZ_PHASE122_BROWSER__?:{calls:Call[]}}}
const state={calls:[] as Call[]};window.__ENJAZ_PHASE122_BROWSER__=state;
const invoke=async(body:Readonly<Record<string,unknown>>)=>{
 const operation=String(body.operation??''),query=String(body.query??''),compareWith=typeof body.compareWith==='string'?body.compareWith:undefined;
 state.calls.push({operation,query,...(compareWith?{compareWith}:{})});
 const refs=[
  {citationId:operation==='compare'?'A1':'S1',sourceSchema:'enjaz.global-search-result.v1',domain:'companies',entityId:'company-1',title:'شركة ألف',subtitle:'بغداد',destination:'/app/companies?entity=company-1',authoritative:true},
  ...(operation==='compare'?[{citationId:'B1',sourceSchema:'enjaz.global-search-result.v1',domain:'transactions',entityId:'transaction-1',title:'معاملة باء',subtitle:'قيد المتابعة',destination:'/app/transactions/transaction-1',authoritative:true}]:[]),
 ];
 return new Response(JSON.stringify({schema:'enjaz.copilot.context.v1',ok:true,requestId:String(body.requestId),traceId:'33333333-3333-4333-8333-333333333333',operation,result:{answer:'إجابة سياقية موثقة للاختبار فقط.',citations:refs,grounding:{authoritativeContextFound:true,sourceCount:refs.length,sourceDomains:['companies'],generationMode:'deterministic_grounded_v1',providerUsed:false,nonAuthoritativeAssistance:true,readSemantics:'fresh_on_replay',replayed:false},comparison:operation==='compare'?{primaryCount:1,secondaryCount:1,sharedNormalizedTitles:[]}:null}}),{status:200,headers:{'Content-Type':'application/json'}});
};
const root=document.getElementById('phase122-browser-root');if(!root)throw new Error('Phase 12.2 browser root missing');
createRoot(root).render(<StrictMode><div className="ez-r2-root r2-shell" data-r2-runtime-mode="live" data-destination="copilot"><aside className="r2-shell__rail" aria-hidden="true"/><div className="r2-shell__workspace"><main id="r2-main" className="r2-shell__main" aria-label="مساعد إنجاز"><section data-live-deferred="true">placeholder</section></main></div><LiveCopilotPortal workspace={Promise.resolve(W)} invoke={invoke}/></div></StrictMode>);
