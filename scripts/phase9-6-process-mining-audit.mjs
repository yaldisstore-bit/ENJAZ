import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const json=(p)=>JSON.parse(read(p));
const exists=(p)=>fs.existsSync(new URL(p,root));
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const marker=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

const p95=json('docs/PHASE9_5_STATE.json');
const p96=json('docs/PHASE9_6_STATE.json');
const major=json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');
const kickoff=read('docs/PHASE9_6_KICKOFF.md');
const contract=read('src/features/process-intelligence/processMiningContract.ts');
const tests=read('tests/phase9-6-process-mining-foundation.test.ts');
const workflowMigration=read('database/migrations/phase_8_1_workflow_government_procedure_os.sql');
const transactionLifecycle=read('docs/PHASE5_4_ARCHIVE_RESTORE_LIFECYCLE_CLOSURE.md');
const fieldMigration=read('database/migrations/phase_8_3_operations_field_m5.sql');

req(p95.status==='CLOSED'&&p95.exitGatePassed===true&&p95.phase9_6Allowed===true&&p95.nextPhase==='9.6'&&p95.successorStatus==='AUTHORIZED','Phase 9.5 must remain CLOSED and authorize only 9.6');
req(p95.postMergeRecertification?.status==='COMPLETE'&&p95.postMergeRecertification?.workflowCount===25&&p95.postMergeRecertification?.successCount===25&&p95.postMergeRecertification?.failureCount===0,'Phase 9.5 exact-main 25/25 recertification must remain certified');
req(p95.publishedLiveCertification?.status==='PASS'&&p95.publishedLiveCertification?.directLoadReloadTestsPassed===7,'Phase 9.5 published-live certification must remain PASS');

req(p96.phase==='9.6'&&p96.name==='Process Mining & Predictive Operations — M18'&&p96.status==='IN_PROGRESS','Phase 9.6 must be IN_PROGRESS');
req(p96.baseCommit==='295ad9dd308e391e7d92b1e27de74c859b0a20b1','Phase 9.6 base must be the exact formal Phase 9.5 closure main SHA');
req(p96.javascriptBudgetBytes===670000&&p96.budgetIncreaseAllowed===false,'670000-byte JavaScript ceiling must remain frozen');
req(p96.exitGatePassed===false&&p96.phase9_7Allowed===false&&p96.nextPhase===null&&p96.successorStatus==='LOCKED','Open Phase 9.6 must keep Phase 9.7 locked');

const m18=major.systems?.find((s)=>s.id==='M18');
req(m18?.name==='Process Mining & Predictive Operations'&&m18?.status==='ACTIVE','M18 must be ACTIVE during Phase 9.6');
req(Array.isArray(m18?.anchors)&&m18.anchors.join(',')==='9,15','M18 must preserve governing anchors 9 + 15');
req(m18?.closureEvidence===null,'Phase 9.6 must not fabricate global M18 closure evidence');
req(p96.majorSystem?.id==='M18'&&p96.majorSystem?.status==='ACTIVE'&&p96.majorSystem?.anchors?.join(',')==='9,15'&&p96.majorSystem?.globalClosureAllowed===false,'Phase 9.6 state must preserve M18 globally open for Phase 15');

const authority=p96.authority||{},sources=p96.authoritativeSources||{},invariants=p96.invariants||{},prediction=p96.predictionFoundation||{};
req(authority.persistence==='SOURCE_DOMAIN_HISTORY_ONLY'&&authority.processIntelligenceAuthority==='READ_ONLY_DERIVED','process intelligence must remain source-history-derived and read-only');
req(authority.sourceProvenance==='REQUIRED'&&authority.shadowProcessEventStoreAllowed===false&&authority.browserOwnedProcessPersistenceAllowed===false,'shadow/browser process persistence must remain forbidden');
req(authority.fabricatedEventTimestampAllowed===false&&authority.fabricatedStrictSequenceAllowed===false,'fabricated timestamps/sequence must remain forbidden');
req(authority.directBrowserSourceMutationAllowed===false&&authority.crossWorkspaceCompositionAllowed===false,'browser source mutation and cross-workspace composition must remain forbidden');
req(authority.predictionAuthority==='DIRECTIONAL_NON_AUTHORITATIVE'&&authority.predictionMethodDisclosure==='REQUIRED'&&authority.predictionConfidenceDisclosure==='REQUIRED','prediction authority/method/confidence disclosure law must remain enforced');
req(authority.generativeModelAsEvidenceAllowed===false,'generative output must not become process evidence');

req(sources.workflow?.events==='workflow_transition_events'&&sources.workflow?.mode==='APPEND_ONLY_SOURCE_OWNED','workflow transition history authority drifted');
req(sources.transactionLifecycle?.events==='transaction_activity'&&sources.transactionLifecycle?.mode==='APPEND_ONLY_SOURCE_OWNED','transaction lifecycle authority drifted');
req(Array.isArray(sources.fieldOperations?.tables)&&sources.fieldOperations.tables.join(',')==='field_assignments,field_visits,field_visit_evidence,field_sync_receipts'&&sources.fieldOperations?.mode==='SOURCE_OWNED','field operations authority drifted');
req(sources.additionalDomainsRequireExplicitVerification===true,'additional process sources must require explicit verification');

req(invariants.eventWithoutProvenanceAllowed===false&&invariants.pathWithoutWorkspaceLineageAllowed===false&&invariants.duplicateSourceEventIdentityAllowed===false,'event provenance/identity invariants drifted');
req(invariants.futureEventRelativeToSnapshotAllowed===false&&invariants.missingTimestampAsZeroAllowed===false&&invariants.ambiguousEqualTimeAsStrictOrderAllowed===false,'time/ordering fail-closed invariants drifted');
req(invariants.reworkWithoutRepeatedObservedActivityAllowed===false&&invariants.bottleneckWithoutThresholdOrCohortAllowed===false,'rework/bottleneck evidence law drifted');
req(invariants.predictionWithoutEvidenceAllowed===false&&invariants.authoritativePredictionAllowed===false&&invariants.crossWorkspacePathAllowed===false&&invariants.syntheticHistoricalEventAllowed===false,'prediction/workspace/synthetic-history law drifted');
req(invariants.invalidEventBehavior==='FAIL_CLOSED'&&invariants.missingDurationBehavior==='UNKNOWN_NOT_ZERO'&&invariants.ambiguousOrderingBehavior==='EXPLICIT_PARTIAL_ORDER','process failure semantics drifted');
req(invariants.insufficientSampleConfidence==='INSUFFICIENT_ONLY'&&invariants.predictionProbabilityUnit==='BASIS_POINTS_INTEGER','prediction confidence/probability semantics drifted');
req(prediction.method==='empirical_next_activity_frequency'&&prediction.minimumDirectionalCases===4&&prediction.tieBehavior==='NO_SINGLE_WINNER'&&prediction.authoritative===false,'prediction foundation contract drifted');

for(const p of ['docs/PHASE9_6_KICKOFF.md','docs/PHASE9_6_STATE.json','src/features/process-intelligence/processMiningContract.ts','tests/phase9-6-process-mining-foundation.test.ts'])req(exists(p),`missing Phase 9.6 foundation artifact: ${p}`);
for(const m of ['ENJAZ_PROCESS_MINING_SCHEMA','PROCESS_MIN_DIRECTIONAL_CASES','ProcessEventProvenance','buildProcessEvent','buildProcessPath','buildObservedProcessWaits','classifyBottleneckCandidates','buildEmpiricalNextActivityPrediction','authoritative:false','ordering:ProcessOrderingConfidence','probabilityBps:number|null','ProcessDuplicateSourceEventError'])marker(contract,m,'process contract');
for(const forbidden of ['@supabase','supabaseClient','localStorage','sessionStorage','fetch('])req(!contract.includes(forbidden),`pure process contract must not depend on runtime persistence/network: ${forbidden}`);
for(let i=1;i<=16;i+=1)marker(tests,`9.6 foundation ${String(i).padStart(2,'0')}`,'foundation tests');
for(const m of ['Phase 9.7 remains **LOCKED**','shadow process-event ledger','ordering-ambiguous','DIRECTIONAL / NON-AUTHORITATIVE','empirical frequency','670000 bytes'])marker(kickoff,m,'kickoff');
for(const m of ['## 9.6 — Process Mining & Predictive Operations — M18','Derive actual process paths from authoritative histories.','Detect bottlenecks, rework and delay patterns; prediction must expose confidence and evidence.'])marker(roadmap,m,'roadmap');
marker(workflowMigration,'create table public.workflow_transition_events','workflow source');
marker(transactionLifecycle,'transaction_activity','transaction lifecycle source');
for(const m of ['create table public.field_assignments','create table public.field_visits','create table public.field_visit_evidence','create table public.field_sync_receipts'])marker(fieldMigration,m,'field source');

const tracks=p96.projectQualityConstitution?.tracks||{},foundation=p96.foundation||{};
req(tracks.product==='IN_PROGRESS'&&tracks.uiUx==='NOT_STARTED'&&tracks.engineering==='IN_PROGRESS'&&tracks.certification==='NOT_STARTED','Phase 9.6 foundation quality tracks must reflect pre-UI foundation state');
req(['IN_PROGRESS','LOCAL_GATE_PASS'].includes(foundation.status)&&foundation.contract==='src/features/process-intelligence/processMiningContract.ts'&&foundation.tests==='tests/phase9-6-process-mining-foundation.test.ts','Phase 9.6 foundation artifact registry drifted');
if(foundation.status==='LOCAL_GATE_PASS'){
 req(foundation.destructionTestCount===16,'Certified Phase 9.6 foundation must preserve all 16 destructive tests');
 req(foundation.gateRunId===34688367427&&foundation.gateConclusion==='SUCCESS','Certified Phase 9.6 foundation gate evidence drifted');
 req(foundation.audit==='PASS'&&foundation.functionalRegression==='PASS'&&foundation.databaseAndRoadmapIntegrity==='PASS'&&foundation.majorSystemsZeroEscape==='PASS'&&foundation.typecheck==='PASS'&&foundation.productionBuild==='PASS'&&foundation.pagesLiveBuild==='PASS'&&foundation.governedBudget==='PASS','Certified Phase 9.6 foundation matrix must remain all PASS');
}

if(errors.length){console.error(`PHASE 9.6 PROCESS MINING AUDIT FAIL (${errors.length})`);errors.forEach(e=>console.error(`- ${e}`));process.exitCode=1}
else console.log(foundation.status==='LOCAL_GATE_PASS'?'PHASE 9.6 PROCESS MINING AUDIT PASS — foundation LOCAL_GATE_PASS; Phase 9.5 closure preserved; M18 ACTIVE/open for Phase 15; source-owned event lineage and non-authoritative empirical prediction enforced; Phase 9.7 locked.':'PHASE 9.6 PROCESS MINING AUDIT PASS — Phase 9.5 closure preserved; M18 ACTIVE/open for Phase 15; source-owned event lineage, partial-order honesty, evidence-bound rework/bottlenecks and non-authoritative empirical prediction enforced; Phase 9.7 locked.');
