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
const sourceGateway=read('src/features/process-intelligence/processMiningSources.ts');
const service=read('src/features/process-intelligence/processMiningService.ts');
const foundationTests=read('tests/phase9-6-process-mining-foundation.test.ts');
const serviceTests=read('tests/phase9-6-process-mining-service.test.ts');
const workflowMigration=read('database/migrations/phase_8_1_workflow_government_procedure_os.sql');
const transactionLifecycle=read('docs/PHASE5_4_ARCHIVE_RESTORE_LIFECYCLE_CLOSURE.md');
const fieldMigration=read('database/migrations/phase_8_3_operations_field_m5.sql');
const cloudMigration=read('database/migrations/phase_9_6_live_authenticated_process_probe.sql');
const cloudEvidence=read('docs/PHASE9_6_REAL_CLOUD_EVIDENCE.md');

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

const authority=p96.authority||{},sources=p96.authoritativeSources||{},invariants=p96.invariants||{},prediction=p96.predictionFoundation||{},sourceComposition=p96.sourceComposition||{},realCloud=p96.realCloud||{};
const cloudCertified=realCloud.status==='REAL_CLOUD_CERTIFIED';
req(authority.persistence==='SOURCE_DOMAIN_HISTORY_ONLY'&&authority.processIntelligenceAuthority==='READ_ONLY_DERIVED','process intelligence must remain source-history-derived and read-only');
req(authority.sourceProvenance==='REQUIRED'&&authority.shadowProcessEventStoreAllowed===false&&authority.browserOwnedProcessPersistenceAllowed===false,'shadow/browser process persistence must remain forbidden');
req(authority.fabricatedEventTimestampAllowed===false&&authority.fabricatedStrictSequenceAllowed===false,'fabricated timestamps/sequence must remain forbidden');
req(authority.directBrowserSourceMutationAllowed===false&&authority.crossWorkspaceCompositionAllowed===false,'browser source mutation and cross-workspace composition must remain forbidden');
req(authority.predictionAuthority==='DIRECTIONAL_NON_AUTHORITATIVE'&&authority.predictionMethodDisclosure==='REQUIRED'&&authority.predictionConfidenceDisclosure==='REQUIRED','prediction authority/method/confidence disclosure law must remain enforced');
req(authority.generativeModelAsEvidenceAllowed===false,'generative output must not become process evidence');

req(sources.workflow?.events==='workflow_transition_events'&&sources.workflow?.mode==='APPEND_ONLY_SOURCE_OWNED','workflow transition history authority drifted');
req(sources.transactionLifecycle?.events==='transaction_activity'&&sources.transactionLifecycle?.mode==='APPEND_ONLY_SOURCE_OWNED','transaction lifecycle authority drifted');
req(Array.isArray(sources.fieldOperations?.pathTables)&&sources.fieldOperations.pathTables.join(',')==='field_assignments,field_visits,field_visit_evidence'&&sources.fieldOperations?.mode==='SOURCE_OWNED','field process-path authority drifted');
req(Array.isArray(sources.fieldOperations?.integrityOnlyTables)&&sources.fieldOperations.integrityOnlyTables.join(',')==='field_sync_receipts'&&sources.fieldOperations?.syncReceiptReadScope==='ACTOR_SCOPED'&&sources.fieldOperations?.syncReceiptPathInputAllowed===false,'actor-scoped sync receipts must remain integrity-only and excluded from process paths');
req(sources.additionalDomainsRequireExplicitVerification===true,'additional process sources must require explicit verification');

req(invariants.eventWithoutProvenanceAllowed===false&&invariants.pathWithoutWorkspaceLineageAllowed===false&&invariants.duplicateSourceEventIdentityAllowed===false,'event provenance/identity invariants drifted');
req(invariants.futureEventRelativeToSnapshotAllowed===false&&invariants.missingTimestampAsZeroAllowed===false&&invariants.ambiguousEqualTimeAsStrictOrderAllowed===false,'time/ordering fail-closed invariants drifted');
req(invariants.reworkWithoutRepeatedObservedActivityAllowed===false&&invariants.bottleneckWithoutThresholdOrCohortAllowed===false,'rework/bottleneck evidence law drifted');
req(invariants.predictionWithoutEvidenceAllowed===false&&invariants.authoritativePredictionAllowed===false&&invariants.crossWorkspacePathAllowed===false&&invariants.syntheticHistoricalEventAllowed===false,'prediction/workspace/synthetic-history law drifted');
req(invariants.actorScopedReceiptAsWorkspaceHistoryAllowed===false&&invariants.equalTimestampAsDelaySampleAllowed===false,'actor-scoped receipt/equal-time prediction law drifted');
req(invariants.invalidEventBehavior==='FAIL_CLOSED'&&invariants.missingDurationBehavior==='UNKNOWN_NOT_ZERO'&&invariants.ambiguousOrderingBehavior==='EXPLICIT_PARTIAL_ORDER','process failure semantics drifted');
req(invariants.insufficientSampleConfidence==='INSUFFICIENT_ONLY'&&invariants.predictionProbabilityUnit==='BASIS_POINTS_INTEGER','prediction confidence/probability semantics drifted');
req(prediction.method==='empirical_next_activity_frequency'&&prediction.delayMethod==='empirical_wait_threshold_frequency'&&prediction.minimumDirectionalCases===4&&prediction.delayThresholdRequired===true&&prediction.delayEligibleEvidence==='STRICT_POSITIVE_WAIT_ONLY'&&prediction.tieBehavior==='NO_SINGLE_WINNER'&&prediction.authoritative===false,'prediction foundation contract drifted');

for(const p of ['docs/PHASE9_6_KICKOFF.md','docs/PHASE9_6_STATE.json','src/features/process-intelligence/processMiningContract.ts','src/features/process-intelligence/processMiningSources.ts','src/features/process-intelligence/processMiningService.ts','tests/phase9-6-process-mining-foundation.test.ts','tests/phase9-6-process-mining-service.test.ts','.github/workflows/phase9-6-process-mining.yml','database/migrations/phase_9_6_live_authenticated_process_probe.sql','docs/PHASE9_6_REAL_CLOUD_EVIDENCE.md'])req(exists(p),`missing Phase 9.6 artifact: ${p}`);
for(const m of ['ENJAZ_PROCESS_MINING_SCHEMA','PROCESS_MIN_DIRECTIONAL_CASES','ProcessEventProvenance','DirectionalDelayPrediction','buildProcessEvent','buildProcessPath','buildObservedProcessWaits','classifyBottleneckCandidates','buildEmpiricalNextActivityPrediction','buildEmpiricalDelayPrediction','empirical_wait_threshold_frequency','delay_threshold_exceedance','authoritative:false','ordering:ProcessOrderingConfidence','probabilityBps:number|null','ProcessDuplicateSourceEventError'])marker(contract,m,'process contract');
req(!contract.includes('sampleCount:undefined'),'process provenance parser must not smuggle non-contract fields through casts');
for(const forbidden of ['@supabase','supabaseClient','localStorage','sessionStorage','fetch('])req(!contract.includes(forbidden),`pure process contract must not depend on runtime persistence/network: ${forbidden}`);
for(const m of ['PROCESS_SOURCE_LIMIT','source_owned_process_histories','workflow_transition_events','field_assignments','field_visits','field_visit_evidence','actor_scoped_integrity_evidence_not_path_input','ProcessSourceCapacityError','ProcessSourcePageStalledError','ProcessSourceShapeError','ProcessSourceTimeError'])marker(sourceGateway,m,'source gateway');
req(!sourceGateway.includes("'field_sync_receipts'"),'process source gateway must not read actor-scoped field_sync_receipts into workspace process history');
for(const m of ['PROCESS_COMPOSITION_SOURCE_LIMIT','loadProcessMiningSnapshot','read_only_derived_process_intelligence','phase9.6-source-composition-v1','ProcessCompositionAuthorityError','ProcessCompositionOrphanError','ProcessCompositionPageStalledError','Workflow instance transaction drift','Field visit transaction drift','Field evidence transaction drift','Field evidence precedes visit','actor_scoped_integrity_evidence_not_path_input','predictNextActivity','predictDelayRisk'])marker(service,m,'process service');
for(let i=1;i<=20;i+=1)marker(foundationTests,`9.6 foundation ${String(i).padStart(2,'0')}`,'foundation tests');
for(const m of ['empirical delay prediction is exact','delay prediction below four proven waits','equal-time evidence is excluded from delay samples','delay prediction fails closed'])marker(foundationTests,m,'delay prediction destruction tests');
for(let i=1;i<=11;i+=1)marker(serviceTests,`9.6 ${i<=9?'service':'source'} ${String(i).padStart(2,'0')}`,'source/service tests');
for(const m of ['field_sync_receipts','actor-scoped sync receipts into process paths',"!calls.includes('field_sync_receipts')"])marker(serviceTests,m,'sync-receipt regression');
for(const m of ['Phase 9.7 remains **LOCKED**','shadow process-event ledger','ordering-ambiguous','DIRECTIONAL / NON-AUTHORITATIVE','empirical frequency','670000 bytes'])marker(kickoff,m,'kickoff');
for(const m of ['## 9.6 — Process Mining & Predictive Operations — M18','Derive actual process paths from authoritative histories.','Detect bottlenecks, rework and delay patterns; prediction must expose confidence and evidence.'])marker(roadmap,m,'roadmap');
marker(workflowMigration,'create table public.workflow_transition_events','workflow source');
marker(transactionLifecycle,'transaction_activity','transaction lifecycle source');
for(const m of ['create table public.field_assignments','create table public.field_visits','create table public.field_visit_evidence','create table public.field_sync_receipts','field_sync_receipts_select_own'])marker(fieldMigration,m,'field source');
for(const m of ['ENJAZ_P96_PROBE: pre-existing residue','shadow process persistence detected','anon process-source privilege','browser mutation privilege on process source','sync receipt actor-scope policy missing','set local role authenticated','owner transaction history read','owner workflow transition read','owner field evidence read','owner own sync receipt read','outsider RLS leak','ENJAZ_P96_PROBE: cleanup residue'])marker(cloudMigration,m,'Real Cloud probe');
for(const m of ['REAL_CLOUD_CERTIFIED / PASS_ZERO_RESIDUE','20260912105428','authenticated owner','OUTSIDER_RLS_ISOLATION = PASS','field_sync_receipts_select_own','shadow process objects: `0`','Phase-9.6-owned security findings: **0**','Phase-9.6-owned performance findings: **0**'])marker(cloudEvidence,m,'Real Cloud evidence');

const tracks=p96.projectQualityConstitution?.tracks||{},foundation=p96.foundation||{};
req(tracks.product==='IN_PROGRESS'&&tracks.uiUx==='NOT_STARTED'&&tracks.engineering==='IN_PROGRESS','Phase 9.6 product/UI/engineering tracks must reflect pre-runtime UI state');
req(tracks.certification===(cloudCertified?'IN_PROGRESS':'NOT_STARTED'),'Phase 9.6 certification track must become IN_PROGRESS exactly when Real Cloud is certified');
req(['IN_PROGRESS','LOCAL_GATE_PASS'].includes(foundation.status)&&foundation.contract==='src/features/process-intelligence/processMiningContract.ts'&&foundation.tests==='tests/phase9-6-process-mining-foundation.test.ts','Phase 9.6 foundation artifact registry drifted');
req(foundation.destructionTestCount===20,'Phase 9.6 foundation must preserve all 20 destructive tests after delay prediction expansion');
if(foundation.status==='LOCAL_GATE_PASS'){
 req(Number.isSafeInteger(foundation.gateRunId)&&foundation.gateRunId>0&&foundation.gateConclusion==='SUCCESS','Certified Phase 9.6 foundation requires a successful current gate run');
 req(foundation.audit==='PASS'&&foundation.functionalRegression==='PASS'&&foundation.databaseAndRoadmapIntegrity==='PASS'&&foundation.majorSystemsZeroEscape==='PASS'&&foundation.typecheck==='PASS'&&foundation.productionBuild==='PASS'&&foundation.pagesLiveBuild==='PASS'&&foundation.governedBudget==='PASS','Certified Phase 9.6 foundation matrix must remain all PASS');
}

req(['IN_PROGRESS_PENDING_GATE','LOCAL_GATE_PASS'].includes(sourceComposition.status),'Phase 9.6 source composition must remain pending-gate or locally certified');
req(sourceComposition.sourceGateway==='src/features/process-intelligence/processMiningSources.ts'&&sourceComposition.service==='src/features/process-intelligence/processMiningService.ts'&&sourceComposition.tests==='tests/phase9-6-process-mining-service.test.ts'&&sourceComposition.destructionTestCount===11,'Phase 9.6 source composition artifact registry drifted');
req(sourceComposition.workspaceIsolation==='REQUIRED'&&sourceComposition.crossSourceTransactionDrift==='FAIL_CLOSED'&&sourceComposition.orphanSourceBehavior==='FAIL_CLOSED'&&sourceComposition.paginationBehavior==='BOUNDED_FAIL_CLOSED'&&sourceComposition.equalTimestampOrdering==='EXPLICIT_PARTIAL_ORDER','Phase 9.6 source composition failure semantics drifted');
req(sourceComposition.syncReceiptPolicy==='ACTOR_SCOPED_INTEGRITY_ONLY_NOT_PATH_INPUT','Phase 9.6 sync receipt composition law drifted');
if(sourceComposition.status==='LOCAL_GATE_PASS'){
 req(Number.isSafeInteger(sourceComposition.gateRunId)&&sourceComposition.gateRunId>0&&sourceComposition.gateConclusion==='SUCCESS','Certified source composition requires a successful Phase 9.6 gate run');
 req(sourceComposition.typecheck==='PASS'&&sourceComposition.productionBuild==='PASS'&&sourceComposition.pagesLiveBuild==='PASS'&&sourceComposition.governedBudget==='PASS','Certified source composition build/budget matrix must remain PASS');
}

if(cloudCertified){
 const residue=realCloud.postProbeResidue||{};
 req(realCloud.verification==='PASS_ZERO_RESIDUE'&&realCloud.projectRef==='juzxriirhkuzviwnhkbd','Real Cloud Phase 9.6 certification project/verification drifted');
 req(realCloud.migration==='database/migrations/phase_9_6_live_authenticated_process_probe.sql'&&realCloud.appliedMigrationVersion==='20260912105428','Real Cloud migration evidence drifted');
 req(realCloud.authenticatedOwnerHistoryRead==='PASS'&&realCloud.workflowHistoryRead==='PASS'&&realCloud.fieldHistoryRead==='PASS'&&realCloud.outsiderRlsIsolation==='PASS','Real Cloud authenticated owner/outsider history matrix must remain PASS');
 req(realCloud.syncReceiptActorScope==='PASS'&&realCloud.directBrowserSourceMutationDenied==='PASS'&&realCloud.anonSourceReadDenied==='PASS','Real Cloud permission boundaries drifted');
 req(realCloud.shadowProcessPersistenceDetected===false,'Real Cloud must contain no shadow process persistence');
 req(realCloud.phaseOwnedSecurityAdvisorFindings===0&&realCloud.phaseOwnedPerformanceAdvisorFindings===0,'Phase 9.6 may not certify with phase-owned advisor findings');
 req(Object.values(residue).every(v=>v===0),'Phase 9.6 Real Cloud probe must leave zero fixture/shadow residue');
}

if(errors.length){console.error(`PHASE 9.6 PROCESS MINING AUDIT FAIL (${errors.length})`);errors.forEach(e=>console.error(`- ${e}`));process.exitCode=1}
else console.log(cloudCertified?'PHASE 9.6 PROCESS MINING AUDIT PASS — delay prediction governed; local gates may be pending or certified; Real Cloud PASS_ZERO_RESIDUE; M18 ACTIVE/open for Phase 15; Phase 9.7 locked.':sourceComposition.status==='LOCAL_GATE_PASS'?'PHASE 9.6 PROCESS MINING AUDIT PASS — foundation + source composition LOCAL_GATE_PASS; M18 remains ACTIVE/open for Phase 15; Phase 9.7 locked.':'PHASE 9.6 PROCESS MINING AUDIT PASS — governed local recertification pending; M18 ACTIVE/open for Phase 15; Phase 9.7 locked.');
