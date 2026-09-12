import fs from 'node:fs';

const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8'),json=p=>JSON.parse(read(p)),exists=p=>fs.existsSync(new URL(p,root));
const errors=[],req=(v,m)=>{if(!v)errors.push(m)},marker=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);
const p95=json('docs/PHASE9_5_STATE.json'),p96=json('docs/PHASE9_6_STATE.json'),major=json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json'),ia=json('docs/UI_UX_REBIRTH_2_0_INFORMATION_ARCHITECTURE.json');
const contract=read('src/features/process-intelligence/processMiningContract.ts'),source=read('src/features/process-intelligence/processMiningSources.ts'),service=read('src/features/process-intelligence/processMiningService.ts'),runtime=read('src/features/process-intelligence/processMiningRuntime.ts');
const foundationTests=read('tests/phase9-6-process-mining-foundation.test.ts'),serviceTests=read('tests/phase9-6-process-mining-service.test.ts'),parityTests=read('tests/phase9-6-process-mining-runtime-parity.test.ts'),uiTests=read('tests/phase9-6-process-mining-ui.test.ts');
const center=read('src/ui-r2/intelligence/ProcessIntelligenceCenter.tsx'),tabs=read('src/ui-r2/intelligence/IntelligenceViewTabs.tsx'),rootRuntime=read('src/ui-r2/runtime/UiR2ProductionRoot.tsx'),cloudMigration=read('database/migrations/phase_9_6_live_authenticated_process_probe.sql'),cloudEvidence=read('docs/PHASE9_6_REAL_CLOUD_EVIDENCE.md');

req(p95.status==='CLOSED'&&p95.exitGatePassed===true&&p95.phase9_6Allowed===true&&p95.nextPhase==='9.6'&&p95.successorStatus==='AUTHORIZED','Phase 9.5 must remain CLOSED and authorize 9.6');
req(p96.phase==='9.6'&&p96.name==='Process Mining & Predictive Operations — M18'&&['IN_PROGRESS','CLOSED'].includes(p96.status),'Phase 9.6 lifecycle invalid');
req(p96.baseCommit==='295ad9dd308e391e7d92b1e27de74c859b0a20b1','Phase 9.6 base drifted');
req(p96.javascriptBudgetBytes===670000&&p96.totalJavascriptBudgetBytes===760000&&p96.cssBudgetBytes===180000&&p96.budgetIncreaseAllowed===false,'Phase 9.6 governed budgets drifted');
const m18=major.systems?.find(s=>s.id==='M18');
req(m18?.name==='Process Mining & Predictive Operations'&&m18?.status==='ACTIVE'&&m18?.anchors?.join(',')==='9,15'&&m18?.closureEvidence===null,'M18 must remain ACTIVE/global-open for Phase 15');
req(p96.majorSystem?.id==='M18'&&p96.majorSystem?.status==='ACTIVE'&&p96.majorSystem?.anchors?.join(',')==='9,15'&&p96.majorSystem?.globalClosureAllowed===false,'Phase 9.6 M18 state drifted');

const a=p96.authority||{},s=p96.authoritativeSources||{},i=p96.invariants||{},p=p96.predictionFoundation||{},f=p96.foundation||{},c=p96.sourceComposition||{},r=p96.runtime||{},cloud=p96.realCloud||{},tracks=p96.projectQualityConstitution?.tracks||{},cert=p96.certification||{};
req(a.persistence==='SOURCE_DOMAIN_HISTORY_ONLY'&&a.processIntelligenceAuthority==='READ_ONLY_DERIVED'&&a.sourceProvenance==='REQUIRED'&&a.shadowProcessEventStoreAllowed===false&&a.browserOwnedProcessPersistenceAllowed===false,'process authority drifted');
req(a.fabricatedEventTimestampAllowed===false&&a.fabricatedStrictSequenceAllowed===false&&a.directBrowserSourceMutationAllowed===false&&a.crossWorkspaceCompositionAllowed===false&&a.predictionAuthority==='DIRECTIONAL_NON_AUTHORITATIVE','process mutation/prediction law drifted');
req(s.workflow?.events==='workflow_transition_events'&&s.transactionLifecycle?.events==='transaction_activity','workflow/transaction source authority drifted');
req(s.fieldOperations?.pathTables?.join(',')==='field_assignments,field_visits,field_visit_evidence'&&s.fieldOperations?.integrityOnlyTables?.join(',')==='field_sync_receipts'&&s.fieldOperations?.syncReceiptReadScope==='ACTOR_SCOPED'&&s.fieldOperations?.syncReceiptPathInputAllowed===false,'field process source authority drifted');
req(i.ambiguousEqualTimeAsStrictOrderAllowed===false&&i.equalTimestampAsDelaySampleAllowed===false&&i.ambiguousOrderingBehavior==='EXPLICIT_PARTIAL_ORDER'&&i.missingDurationBehavior==='UNKNOWN_NOT_ZERO','ordering/duration law drifted');
req(i.predictionWithoutEvidenceAllowed===false&&i.authoritativePredictionAllowed===false&&i.crossWorkspacePathAllowed===false&&i.syntheticHistoricalEventAllowed===false&&i.invalidEventBehavior==='FAIL_CLOSED','prediction/workspace fail-closed law drifted');
req(p.method==='empirical_next_activity_frequency'&&p.delayMethod==='empirical_wait_threshold_frequency'&&p.minimumDirectionalCases===4&&p.delayThresholdRequired===true&&p.delayEligibleEvidence==='STRICT_POSITIVE_WAIT_ONLY'&&p.tieBehavior==='NO_SINGLE_WINNER'&&p.authoritative===false,'prediction foundation drifted');

for(const path of ['docs/PHASE9_6_KICKOFF.md','docs/PHASE9_6_STATE.json','src/features/process-intelligence/processMiningContract.ts','src/features/process-intelligence/processMiningSources.ts','src/features/process-intelligence/processMiningService.ts','src/features/process-intelligence/processMiningRuntime.ts','tests/phase9-6-process-mining-foundation.test.ts','tests/phase9-6-process-mining-service.test.ts','tests/phase9-6-process-mining-runtime-parity.test.ts','tests/phase9-6-process-mining-ui.test.ts','database/migrations/phase_9_6_live_authenticated_process_probe.sql','docs/PHASE9_6_REAL_CLOUD_EVIDENCE.md'])req(exists(path),`missing Phase 9.6 artifact: ${path}`);
for(const m of ['buildProcessPath','buildEmpiricalNextActivityPrediction','buildEmpiricalDelayPrediction','empirical_wait_threshold_frequency','authoritative:false'])marker(contract,m,'process contract');
for(const x of ['@supabase','supabaseClient','localStorage','sessionStorage','fetch('])req(!contract.includes(x),`pure process contract runtime dependency: ${x}`);
for(const m of ['workflow_transition_events','field_assignments','field_visits','field_visit_evidence','actor_scoped_integrity_evidence_not_path_input'])marker(source,m,'source gateway');
req(!source.includes("'field_sync_receipts'"),'reference source gateway must not read actor-scoped sync receipts into process paths');
for(const m of ['loadProcessMiningSnapshot','predictNextActivity','predictDelayRisk','read_only_derived_process_intelligence'])marker(service,m,'reference process service');
for(const m of ['createProcessRuntimeGateway','transaction_activity','workflow_instances','workflow_transition_events','field_assignments','field_visits','field_visit_evidence','rows.length>=MIN','pairs(s,key.trim()).filter(x=>x[2]>0)'])marker(runtime,m,'compact runtime');
req(!runtime.includes('processMiningService')&&!runtime.includes('processMiningSources')&&!runtime.includes('processMiningContract')&&!runtime.includes("from('field_sync_receipts')"),'compact runtime authority/bundle drifted');
for(let n=1;n<=20;n++)marker(foundationTests,`9.6 foundation ${String(n).padStart(2,'0')}`,'foundation tests');
for(let n=1;n<=9;n++)marker(serviceTests,`9.6 service ${String(n).padStart(2,'0')}`,'service tests');
for(let n=10;n<=11;n++)marker(serviceTests,`9.6 source ${String(n).padStart(2,'0')}`,'source tests');marker(serviceTests,'9.6 service 12','service tests');
for(let n=1;n<=3;n++)marker(parityTests,`9.6 runtime parity ${String(n).padStart(2,'0')}`,'runtime parity');
for(let n=1;n<=12;n++)marker(uiTests,`9.6 ui ${String(n).padStart(2,'0')}`,'UI destruction');
req((ia.destinations||[]).filter(d=>d.id==='insights').length===1&&!(ia.destinations||[]).some(d=>d.id==='process'||d.id==='process-intelligence'),'Phase 9.6 must reuse canonical insights destination');
for(const m of ["get('view')==='process'","searchParams.set('view','process')",'ذكاء الأعمال','ذكاء العمليات'])marker(tabs,m,'intelligence tabs');
for(const m of ['data-phase9-6-runtime="process-intelligence"','data-process-paths','data-process-ordering','data-process-rework','data-process-bottlenecks','data-process-next-prediction','data-process-delay-prediction','data-process-prediction-confidence','data-process-sync-receipt-policy','دليل المصدر'])marker(center,m,'process UI');
for(const x of ['createEnjazSupabaseClient','fetch(','localStorage','sessionStorage','workflow_transition_events','field_assignments','field_visits','field_visit_evidence'])req(!center.includes(x),`process UI owns forbidden authority: ${x}`);
marker(rootRuntime,'createEnjazSupabaseClient(config)','production runtime');marker(rootRuntime,"import('../../features/process-intelligence/processMiningRuntime.ts')",'production runtime');
for(const m of ['set local role authenticated','owner transaction history read','owner workflow transition read','owner field evidence read','outsider RLS leak','ENJAZ_P96_PROBE: cleanup residue'])marker(cloudMigration,m,'Real Cloud probe');
for(const m of ['REAL_CLOUD_CERTIFIED / PASS_ZERO_RESIDUE','20260912105428','OUTSIDER_RLS_ISOLATION = PASS','shadow process objects: `0`'])marker(cloudEvidence,m,'Real Cloud evidence');
req(cloud.status==='REAL_CLOUD_CERTIFIED'&&cloud.verification==='PASS_ZERO_RESIDUE'&&cloud.appliedMigrationVersion==='20260912105428'&&cloud.shadowProcessPersistenceDetected===false&&cloud.phaseOwnedSecurityAdvisorFindings===0&&cloud.phaseOwnedPerformanceAdvisorFindings===0,'Real Cloud certification drifted');
req(Object.values(cloud.postProbeResidue||{}).every(v=>v===0),'Real Cloud probe residue must remain zero');
req(f.status==='LOCAL_GATE_PASS'&&f.destructionTestCount===20&&f.gateConclusion==='SUCCESS','foundation certification drifted');
req(c.status==='LOCAL_GATE_PASS'&&c.destructionTestCount===12&&c.gateConclusion==='SUCCESS'&&c.syncReceiptPolicy==='ACTOR_SCOPED_INTEGRITY_ONLY_NOT_PATH_INPUT','source composition certification drifted');
req(r.canonicalDestination==='insights'&&r.route==='/app/insights?view=process'&&r.uiDestructionTestCount===12&&r.parityTestCount===3&&r.sameSupabaseClient===true&&r.sameDataFactory===true&&r.lazyRuntimeProjection===true&&r.newDestinationAllowed===false&&r.newCssAdded===false,'runtime contract drifted');

if(p96.status==='IN_PROGRESS'){
  req(p96.exitGatePassed===false&&p96.phase9_7Allowed===false&&p96.nextPhase===null&&p96.successorStatus==='LOCKED','Open Phase 9.6 must keep 9.7 locked');
  req(tracks.product==='IN_PROGRESS'&&tracks.engineering==='IN_PROGRESS'&&['NOT_STARTED','IN_PROGRESS'].includes(tracks.uiUx)&&['NOT_STARTED','IN_PROGRESS'].includes(tracks.certification),'Open Phase 9.6 quality tracks drifted');
}else{
  for(const path of ['docs/PHASE9_6_CLOSURE.md','docs/PHASE9_6_POSTMERGE_RECERTIFICATION.md'])req(exists(path),`closed Phase 9.6 missing evidence: ${path}`);
  const closure=read('docs/PHASE9_6_CLOSURE.md'),post=read('docs/PHASE9_6_POSTMERGE_RECERTIFICATION.md');
  req(p96.exitGatePassed===true&&p96.phase9_7Allowed===true&&p96.nextPhase==='9.7'&&p96.successorStatus==='AUTHORIZED','Closed Phase 9.6 must authorize only 9.7');
  req(tracks.product==='PASS'&&tracks.uiUx==='PASS'&&tracks.engineering==='PASS'&&tracks.certification==='PASS','Closed Phase 9.6 requires four PASS tracks');
  req(p96.certifiedImplementationMain==='d92059530275ff70e02a05c4f4c1ef930cb1750a','closed Phase 9.6 certified main drifted');
  req(cert.status==='PASS'&&cert.certifiedMain==='d92059530275ff70e02a05c4f4c1ef930cb1750a'&&cert.exactMainWorkflowCount===27&&cert.exactMainSuccessCount===27&&cert.exactMainFailureCount===0&&cert.exactMainQueuedCount===0&&cert.exactMainInProgressCount===0,'closed Phase 9.6 exact-main evidence drifted');
  req(cert.phaseGateRunId===34705494680&&cert.phaseRealBrowserRunId===34705494809&&cert.cumulativeRealBrowserRunId===34705494731&&cert.pagesPreviewRunId===34705526787&&cert.liveExternalRunId===34705561853&&cert.publishedProcessTests==='6/6_PASS','closed Phase 9.6 run evidence drifted');
  req(r.status==='REAL_BROWSER_PASS'&&r.realBrowser==='PASS'&&r.realBrowserRunId===34705494809&&r.realBrowserWidths?.join(',')==='1280,430,390,360,320'&&r.publishedLive==='PASS'&&r.pagesPreviewRunId===34705526787&&r.liveExternalRunId===34705561853&&r.publishedProcessTests==='6/6_PASS','closed Phase 9.6 runtime/deployed evidence drifted');
  for(const m of ['M18 remains ACTIVE','34705494680','34705494809','34705494731','34705526787','34705561853','6/6 PASS'])marker(closure,m,'closure evidence');
  for(const m of ['27','34705494680','34705494809','34705494731','34705526787','34705561853','PASS_ZERO_RESIDUE'])marker(post,m,'post-merge evidence');
}

if(errors.length){console.error(`PHASE 9.6 PROCESS MINING AUDIT FAIL (${errors.length})`);errors.forEach(e=>console.error(`- ${e}`));process.exitCode=1}else console.log(`PHASE 9.6 PROCESS MINING AUDIT PASS — lifecycle=${p96.status}; 20 foundation + 12 source/service + 3 runtime parity + 12 UI destructions; Real Cloud zero-residue; M18 ACTIVE/open for Phase 15; successor ${p96.phase9_7Allowed?'9.7 AUTHORIZED':'LOCKED'}.`);
