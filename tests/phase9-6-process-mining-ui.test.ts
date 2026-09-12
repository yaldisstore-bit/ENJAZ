import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(path,'utf8');
const nav=read('src/ui-r2/architecture/navigation-contract.ts');
const ia=JSON.parse(read('docs/UI_UX_REBIRTH_2_0_INFORMATION_ARCHITECTURE.json'));
const tabs=read('src/ui-r2/intelligence/IntelligenceViewTabs.tsx');
const center=read('src/ui-r2/intelligence/ProcessIntelligenceCenter.tsx');
const business=read('src/ui-r2/intelligence/BusinessIntelligenceCenter.tsx');
const lazy=read('src/ui-r2/runtime/LazyLiveProductionPortals.tsx');
const portal=read('src/ui-r2/intelligence/LiveBusinessIntelligencePortal.tsx');
const root=read('src/ui-r2/runtime/UiR2ProductionRoot.tsx');
const context=read('src/features/process-intelligence/ProcessMiningHistoryContext.tsx');
const runtime=read('src/features/process-intelligence/processMiningRuntime.ts');

test('9.6 ui 01 — process intelligence reuses the one canonical insights destination',()=>{
 assert.equal((ia.destinations as any[]).filter(item=>item.id==='insights').length,1);
 assert.equal((ia.destinations as any[]).filter(item=>item.id==='process'||item.id==='process-intelligence').length,0);
 const insights=(ia.destinations as any[]).find(item=>item.id==='insights');assert.equal(insights.route,'/app/insights');assert.equal(insights.availability,'live');
 assert.match(nav,/\['insights', 'مركز ذكاء الأعمال', 7, 'insights', 0, 2\]/);assert.doesNotMatch(nav,/\['process(?:-intelligence)?'/);
});

test('9.6 ui 02 — process view is a secondary deep-link query, not state-only or a second launcher entry',()=>{
 assert.match(tabs,/get\('view'\)==='process'/);assert.match(tabs,/searchParams\.set\('view','process'\)/);assert.match(tabs,/searchParams\.delete\('view'\)/);
 assert.match(tabs,/window\.history\.pushState/);assert.match(tabs,/window\.addEventListener\('popstate'/);assert.match(tabs,/aria-label="أقسام مركز الذكاء"/);assert.match(tabs,/aria-pressed=/);
 assert.match(tabs,/ذكاء الأعمال/);assert.match(tabs,/ذكاء العمليات/);
});

test('9.6 ui 03 — Phase 9.5 lazy portal contract remains textually intact',()=>{
 assert.match(lazy,/LiveBusinessIntelligencePortal/);assert.match(lazy,/destination === 'insights' \? <InsightsPortal \/>/);
 assert.match(portal,/shell\.dataset\.destination==='insights'/);assert.match(portal,/createPortal\(<BusinessIntelligenceCenter\/>/);
 assert.doesNotMatch(lazy,/ProcessIntelligenceCenter/);assert.doesNotMatch(portal,/ProcessIntelligenceCenter/);
});

test('9.6 ui 04 — production runtime lazily loads compact process projection from the one shared Supabase client and data factory',()=>{
 assert.match(root,/const client = createEnjazSupabaseClient\(config\)/);assert.match(root,/const dataFactory=createEnjazDataLayerFactory\(client\)/);
 assert.match(root,/import\('\.\.\/\.\.\/features\/process-intelligence\/processMiningRuntime\.ts'\)/);assert.match(root,/module=>module\.createProcessRuntimeGateway\(client,dataFactory\)/);
 assert.match(root,/processRuntime\?: ProcessRuntimeFactory/);assert.match(root,/ProcessRuntimeProvider factory=\{processRuntime\?\?null\}/);
 assert.equal((root.match(/createEnjazSupabaseClient\(/g)??[]).length,1);
 assert.doesNotMatch(root,/processMiningSources\.ts/);assert.doesNotMatch(root,/processMiningService\.ts/);
});

test('9.6 ui 05 — process center consumes only injected compact runtime projection and authenticated identity',()=>{
 assert.match(center,/useProcessRuntimeFactory\(\)/);assert.match(center,/useCurrentUserId\(\)/);assert.match(center,/const r=await factory\(\),s=await r\.load\(userId\)/);
 assert.match(center,/data-process-authority="read-only-derived"/);assert.match(center,/data-process-provenance="required"/);
 assert.match(context,/createContext<ProcessRuntimeFactory\|null>/);assert.match(context,/useProcessRuntimeFactory/);
 assert.doesNotMatch(center,/useDataLayerFactory/);assert.doesNotMatch(center,/createEnjazSupabaseClient/);
});

test('9.6 ui 06 — process UI contains no demo, direct network/storage, source-table or private CSS authority',()=>{
 for(const forbidden of ['createEnjazSupabaseClient','createClient(','supabaseClient','fetch(','localStorage','sessionStorage','sampleData','fakeData','mockData','workflow_transition_events','field_assignments','field_visits','field_visit_evidence'])assert.ok(!center.includes(forbidden),`forbidden process UI marker: ${forbidden}`);
 assert.doesNotMatch(center,/import\s+['"].*\.css['"]/);assert.doesNotMatch(tabs,/import\s+['"].*\.css['"]/);
 assert.match(runtime,/workflow_transition_events/);assert.match(runtime,/field_visit_evidence/);
});

test('9.6 ui 07 — actual paths, partial ordering, rework and governed bottlenecks remain explicit',()=>{
 for(const marker of ['data-process-paths','data-process-case','data-process-event','data-process-ordering','ترتيب جزئي','لا يُفترض بينها تسلسل صارم','data-process-rework','data-process-bottlenecks','runtime.bottlenecks(snapshot,threshold)','threshold معلنة','غير معروف'])assert.ok(center.includes(marker),`missing process diagnostic marker: ${marker}`);
 assert.match(runtime,/d>0&&d>=thresholdMs/);assert.match(runtime,/partial=true/);
});

test('9.6 ui 08 — next-activity prediction visibly discloses method, confidence, samples, probability and source evidence count',()=>{
 assert.match(center,/runtime\.next\(snapshot,key\)/);assert.match(center,/data-process-next-prediction/);assert.match(center,/data-process-prediction-method/);assert.match(center,/data-process-prediction-confidence/);
 for(const marker of ['empirical_next_activity_frequency','next[3]','next[4]','probability(next[2])','عينات غير كافية','data-process-authoritative="false"'])assert.ok(center.includes(marker),`missing next prediction disclosure: ${marker}`);
 assert.match(runtime,/rows\.length>=MIN/);assert.match(runtime,/Math\.floor\(top\[1\]\*10000\/rows\.length\)/);
});

test('9.6 ui 09 — delay prediction exposes selected threshold and excludes ambiguous equal-time evidence',()=>{
 assert.match(center,/runtime\.delay\(snapshot,key,threshold\)/);assert.match(center,/H=\[4,24,72\]/);assert.match(center,/data-process-threshold-hours/);assert.match(center,/data-process-delay-threshold-ms/);
 for(const marker of ['empirical_wait_threshold_frequency','delay[2]','delay[3]','probability(delay[1])','لا تدخل الأحداث متساوية الزمن في عينة التأخر'])assert.ok(center.includes(marker),`missing delay prediction disclosure: ${marker}`);
 assert.match(runtime,/pairs\(s,key\.trim\(\)\)\.filter\(x=>x\[2\]>0\)/);
});

test('9.6 ui 10 — actor-scoped sync receipts are disclosed as integrity-only and absent from runtime path input',()=>{
 assert.match(center,/data-process-sync-receipt-policy/);assert.match(center,/دليل سلامة فقط وليست جزءًا من مسار العملية/);
 assert.doesNotMatch(runtime,/from\(['"]field_sync_receipts['"]\)/);assert.doesNotMatch(center,/field_sync_receipts/);
});

test('9.6 ui 11 — loading, empty, error and retry states fail closed truthfully',()=>{
 for(const marker of ['جارٍ إعادة بناء المسارات الفعلية','لا توجد مسارات مرصودة','لا يعرض إنجاز مسارًا مصطنعًا','تعذر بناء ذكاء العمليات','تعذر التحقق من مصدر العمليات.','Fail closed','إعادة المحاولة'])assert.ok(center.includes(marker),`missing truthful runtime state: ${marker}`);
});

test('9.6 ui 12 — business intelligence stays default and process deep-link does not start the BI loader',()=>{
 assert.match(business,/const view=useIntelligenceView\(\)/);assert.match(business,/return view==='process'\?<ProcessIntelligenceCenter\/>:<BusinessIntelligenceRuntime\/>/);
 assert.match(business,/loadBusinessIntelligence\(\{dataFactory,fieldOperations\},userId\)/);assert.match(business,/data-phase9-5-runtime="business-intelligence"/);assert.match(business,/IntelligenceViewTabs/);
 assert.match(tabs,/return new URLSearchParams\(window\.location\.search\)\.get\('view'\)==='process'\?'process':'business'/);
});
