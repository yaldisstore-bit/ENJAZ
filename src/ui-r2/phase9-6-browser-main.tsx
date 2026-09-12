import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { ProcessRuntimeGateway,RuntimeBottleneck,RuntimeCase,RuntimeDelay,RuntimeNext,RuntimeSnapshot } from '../features/process-intelligence/processMiningRuntime.ts';
import { IntelligenceViewTabs,useIntelligenceView } from './intelligence/IntelligenceViewTabs.tsx';
import { ProcessIntelligencePanel } from './intelligence/ProcessIntelligenceCenter.tsx';
import './design-system/design-system.css';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './runtime/accessibility-hardening.css';

const W='11111111-1111-4111-8111-111111111111',AS_OF='2026-09-12T07:00:00.000Z';
const ev=(key:string,time:string,source:string)=>[key,time,source] as const;
const cases:readonly RuntimeCase[]=[
 ['case-01',false,18_000_000,0,[],[ev('workflow:advance:review','2026-09-01T08:00:00.000Z','w1'),ev('workflow:advance:approve','2026-09-01T13:00:00.000Z','w2')]],
 ['case-02',false,3_600_000,0,[],[ev('workflow:advance:review','2026-09-02T08:00:00.000Z','w3'),ev('workflow:advance:approve','2026-09-02T09:00:00.000Z','w4')]],
 ['case-03',false,21_600_000,0,[],[ev('workflow:advance:review','2026-09-03T08:00:00.000Z','w5'),ev('workflow:advance:approve','2026-09-03T14:00:00.000Z','w6')]],
 ['case-04',false,3_600_000,0,[],[ev('workflow:advance:review','2026-09-04T08:00:00.000Z','w7'),ev('workflow:advance:reject','2026-09-04T09:00:00.000Z','w8')]],
 ['case-05',true,7_200_000,0,[],[ev('transaction:transaction_created','2026-09-05T08:00:00.000Z','t1'),ev('workflow:start:intake','2026-09-05T08:00:00.000Z','w9'),ev('field:assignment_created','2026-09-05T10:00:00.000Z','a1')]],
 ['case-06',false,9_000_000,1,['field:visit_check_in'],[ev('field:assignment_created','2026-09-06T08:00:00.000Z','a2'),ev('field:visit_check_in','2026-09-06T09:00:00.000Z','v1'),ev('field:visit_failed','2026-09-06T10:00:00.000Z','v2'),ev('field:visit_check_in','2026-09-06T10:30:00.000Z','v3')]],
];
const snapshot:RuntimeSnapshot={w:W,a:AS_OF,c:cases};

function bottlenecks(s:RuntimeSnapshot,thresholdMs:number):readonly RuntimeBottleneck[]{const out:RuntimeBottleneck[]=[];for(const c of s.c)for(let i=1;i<c[5].length;i++){const a=c[5][i-1]!,b=c[5][i]!,duration=Date.parse(b[1])-Date.parse(a[1]);if(duration>0&&duration>=thresholdMs)out.push([c[0],a[0],b[0],duration])}return out.sort((a,b)=>b[3]-a[3]).slice(0,8)}
const runtime:ProcessRuntimeGateway={
 async load(){return snapshot},
 next(_s,key):RuntimeNext|null{return key==='workflow:advance:review'?[true,'workflow:advance:approve',7500,4,8]:null},
 delay(_s,key,thresholdMs):RuntimeDelay|null{return key==='workflow:advance:review'?[true,thresholdMs<=14_400_000?5000:0,4,thresholdMs<=14_400_000?2:0,8]:null},
 bottlenecks,
};

declare global{interface Window{__ENJAZ_PHASE96_BROWSER__?:Readonly<{workspaceId:string;caseCount:number;partialCount:number;reworkCount:number;predictionCases:number}>}}
window.__ENJAZ_PHASE96_BROWSER__=Object.freeze({workspaceId:W,caseCount:cases.length,partialCount:cases.filter(x=>x[1]).length,reworkCount:cases.filter(x=>x[3]>0).length,predictionCases:4});

function Harness(){const view=useIntelligenceView();if(view==='process')return <ProcessIntelligencePanel snapshot={snapshot} runtime={runtime}/>;return <section className="r2-screen" dir="rtl" data-phase9-6-business-default="true"><IntelligenceViewTabs/><div className="r2-section-heading r2-section-heading--hero"><div><p className="r2-eyebrow">Phase 9.5 preserved</p><h1>مركز ذكاء الأعمال</h1><p>الواجهة الافتراضية لمركز الذكاء.</p></div></div></section>}
const root=document.getElementById('phase96-browser-root');if(!root)throw new Error('Phase 9.6 browser root missing');
createRoot(root).render(<StrictMode><div className="ez-r2-root r2-shell" data-r2-runtime-mode="live" data-destination="insights"><main id="r2-main" className="r2-shell__main" aria-label="مركز الذكاء"><Harness/></main></div></StrictMode>);
