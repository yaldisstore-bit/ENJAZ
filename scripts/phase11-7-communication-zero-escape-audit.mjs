import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const json=(p)=>JSON.parse(read(p));
const exists=(p)=>fs.existsSync(new URL(p,root));
const state=json('docs/PHASE11_7_STATE.json');
const predecessor=json('docs/PHASE11_6_STATE.json');
const registry=json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const kickoff=read('docs/PHASE11_7_KICKOFF.md');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');
const tests=read('tests/phase11-7-communication-zero-escape.test.ts');
const portal=read('src/features/client-portal/clientPortalAuthority.ts');
const comms=read('src/features/communications/omnichannelAuthority.ts');
const scheduling=read('src/features/scheduling/schedulingAuthority.ts');
const intake=read('src/features/intake-contract-communication/intakeContractCommunicationAuthority.ts');
const staleMigration=read('database/migrations/phase_11_7_m10_stale_conflict_sqlstate_hardening.sql');
const realCloud=read('scripts/phase11-7-real-cloud-e2e.mjs');

const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

req(predecessor.phase==='11.6'&&predecessor.status==='CLOSED'&&predecessor.exitGatePassed===true&&predecessor.phase11_7Allowed===true&&predecessor.successorStatus==='AUTHORIZED_NEXT','Phase 11.6 is not a closed/authorized predecessor');
req(predecessor.phase11_6ClosureDecision==='PASS'&&predecessor.phase11_6ClosureEvidencePath==='docs/PHASE11_6_CLOSURE.md'&&exists('docs/PHASE11_6_CLOSURE.md'),'Phase 11.6 closure evidence missing');
req(state.phase==='11.7'&&state.name==='Communication Zero-Escape Gate'&&state.status==='IN_PROGRESS','11.7 identity/lifecycle drift');
req(state.baseCommit==='5c4b1bfa4cda339fbbd96b7d3bbf938ef560f98a'&&state.implementationBranch==='phase11-7-communication-zero-escape','11.7 exact base/branch drift');
req(state.predecessor?.formalClosureCommit===state.baseCommit&&state.predecessor?.requiredAuthorization==='phase11_7Allowed=true','predecessor lineage drift');
req(state.mode==='DESTRUCTION_AND_CLOSURE_EVIDENCE_ONLY','11.7 mode drift');
req(state.newFeatureAuthorityAllowed===false&&state.newDatabaseTablesAllowed===false&&state.newWriteRpcAuthorityAllowed===false&&state.shadowTruthStoreAllowed===false,'11.7 cannot create new authority');
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false&&state.featureCutForBudgetAllowed===false,'frozen budget law drift');

const cert=state.predecessorCertification||{};
req(cert.exactMainWorkflowCount===35&&cert.exactMainSuccessCount===35&&cert.exactMainFailureCount===0&&cert.exactMainQueuedCount===0&&cert.exactMainInProgressCount===0,'11.6 post-closure exact-main inventory drift');
req(cert.qualityRunId===35315886158&&cert.realBrowserRunId===35315885941&&cert.majorSystemsRunId===35315886071&&cert.roadmapRunId===35315886456&&cert.pagesRunId===35315931140&&cert.liveExternalRunId===35316019025,'11.6 post-closure critical run lineage drift');

const systems=['M3','M4','M10','M16_PHASE11_PORTION','M17_PHASE11_PORTION'];
const dimensions=['large_counts','stale_targets','duplicate_events','revoked_links','unauthorized_portal_access','delivery_failure','timezone_boundaries','archived_relations'];
req(JSON.stringify(state.systemsUnderGate)===JSON.stringify(systems),'systems-under-gate drift');
req(JSON.stringify(state.destructionDimensions)===JSON.stringify(dimensions),'destruction-dimension drift');
req(['PENDING','PASS'].includes(state.realCloudWave1Status),'Real Cloud wave-1 lifecycle status invalid');
if(state.realCloudWave1Status==='PASS'){
  for(const key of systems)req(state.systemEvidence?.[key]?.status==='PASS',`${key} Real Cloud evidence must be PASS after wave 1 certification`);
  req(state.realCloudVerification==='PASS_INDIVIDUAL_SYSTEM_WAVE1'&&state.permissionMatrixVerification==='PASS_REAL_CLOUD_WAVE1','wave-1 Real Cloud/permission certificate invalid');
  req(state.realCloudWave1RunId===35320196712&&state.realCloudWave1RunNumber===13&&state.realCloudWave1Head==='339291b4a7fcd4a6a6d992d4a2f4f66a92b41961','wave-1 run lineage invalid');
  req(state.realCloudWave1ArtifactId===10536333814&&state.realCloudWave1ArtifactDigest==='sha256:56a87b9e1fd3a31c32c559b0a5b80e2e58be95a6d0e4bc41199de332139cfb26','wave-1 artifact certificate invalid');
  req(state.realCloudWave1ZeroResidue===true&&state.realCloudWave1ExternalResidueCheck==='PASS','wave-1 zero-residue certificate invalid');
  req(state.m10StaleHardeningMigrationVersion==='20260918073107'&&state.m10StaleHardeningFunctionCount===9&&state.m10StaleHardeningRetryableRemaining===0&&state.m10StaleHardeningNonRetryableCount===9,'M10 stale hardening Real Cloud certificate invalid');
  req(state.securityAdvisorPostWave1Total===65&&state.performanceAdvisorPostWave1Total===75&&state.unindexedForeignKeysPostWave1===28&&state.wave1NewSecurityAdvisorFindings===0&&state.wave1NewPerformanceAdvisorFindings===0,'wave-1 advisor certificate invalid');
}else{
  for(const key of systems)req(state.systemEvidence?.[key]?.status==='PENDING',`${key} must remain PENDING before Real Cloud wave 1`);
  req(state.realCloudVerification==='PENDING'&&state.permissionMatrixVerification==='PENDING','Real Cloud wave 1 cannot be pre-claimed');
}
req(state.exitGatePassed===false&&state.phase12_1Allowed===false&&state.nextPhase==='12.1'&&state.successorStatus==='LOCKED','Phase 12.1 must remain locked while 11.7 is open');
for(const k of ['realBrowserVerification','pagesVerification','liveExternalVerification','pullRequestGate','postMergeRecertification'])req(state[k]==='PENDING',`premature 11.7 evidence: ${k}`);
req(state.openingDestructionTests==='PASS_8_OF_8'&&state.openingGateRunId===35316622618&&state.openingGateRunNumber===2&&state.openingGateHead==='390692c972833cbd016d5cb10d66d7119caf6d0b','opening destruction/gate certificate drift');
req(state.openingRoadmapRunId===35316622551&&state.openingRoadmapRunNumber===1437&&state.openingRoadmapHead===state.openingGateHead,'opening roadmap certificate drift');
req(state.realCloudWave1Script==='scripts/phase11-7-real-cloud-e2e.mjs'&&state.realCloudWave1Workflow==='.github/workflows/phase11-7-real-cloud-e2e.yml','Real Cloud wave-1 source lineage drift');
req(state.m3PublishedBaselineRunId===35316019043&&state.m3PublishedBaselineRunNumber===148&&state.m3PublishedBaselineHead===state.baseCommit,'M3 published exact-closure baseline drift');
for(const k of ['knownCriticalDefects','knownHighDefects','knownFunctionalBlockers'])req(state[k]===0,`${k} must be zero at opening`);

for(const [id,anchors] of [['M3','11'],['M4','11'],['M10','11'],['M16','7,10,11'],['M17','8,11']]){
  const sys=registry.systems.find((x)=>x.id===id);
  req(sys?.status==='ACTIVE'&&sys?.anchors?.join(',')===anchors&&sys?.closureEvidence===null,`${id} registry boundary drift`);
}

for(const marker of ['CLIENT_PORTAL_FORBIDDEN_DOMAINS','grant.revokedAt !== null','principal.status === \'active\'','fact.staffOnly === true','index.workspaceId === workspaceId'])has(portal,marker,'M3 authority');
for(const marker of ['providerMessageDedupeKey','outboundCommandDedupeKey','manualRelinkIsAuthorized','outboundDispatchAllowed','canTreatTransportEvidenceAsCanonicalMessage(): false','endpointAloneGrantsWorkspaceAuthority(): false'])has(comms,marker,'M4 authority');
for(const marker of ['workspaceTimezone: \'workspaces.timezone\'','deviceTimezoneMayBecomeBusinessScheduleAuthority: false','terminalFactSilentResurrectionAllowed: false','ENJAZ_SCHEDULING_STALE_VERSION','crossWorkspaceReferencesAllowed: false'])has(scheduling,marker,'M10 authority');
for(const marker of ['publicIntakeMayBecomeAuthoritativeWithoutReview: false','expiredOrRevokedIntakeLinkMayBeResurrected: false','terminalContractRevisionMayBeSilentlyReopened: false','ENJAZ_116_STALE_VERSION','ENJAZ_116_IDEMPOTENCY_REQUIRED'])has(intake,marker,'M16/M17 authority');

for(const marker of [
  'complete_renewal_occurrence_v1_impl','materialize_renewal_occurrence_v1_impl','mutate_calendar_event_state_v1_impl',
  'mutate_renewal_state_v1_impl','record_calendar_event_attendance_v1_impl','reschedule_calendar_event_v1_impl',
  'set_calendar_event_confirmation_v1_impl','set_calendar_event_staff_v1_impl','update_calendar_event_metadata_v1_impl',
  'object_not_in_prerequisite_state','ENJAZ_SCHEDULING_STALE_VERSION','ENJAZ_117_M10_RETRYABLE_STALE_REMAINS'
])has(staleMigration,marker,'M10 stale hardening');
for(const marker of [
  'edge_dispatch_requires_internal_auth','unauthorized_dispatch_did_not_claim_or_mutate_command',
  'stale_target_rejected','stale_recovery_committed','baghdad_timezone_durable_projection',
  'cross_workspace_calendar_denied','durable_receipt_single_audit','p_authority'
])has(realCloud,marker,'11.7 Real Cloud wave');

for(const marker of [
  'not a feature-delivery phase','large counts','stale targets','duplicate events','revoked links','unauthorized portal access','delivery failure','timezone boundaries','archived relations',
  'M3 — Client Portal','M4 — Omnichannel Communications Hub','M10 — Scheduling, Appointments & Deadline Engine',
  'M16 — Engagements, Contracts & Retainers — Phase-11 portion','M17 — Smart Intake Forms & Secure Submission Links — Phase-11 portion',
  'Phase 12.1 — Copilot Foundation remains LOCKED'
])has(kickoff,marker,'kickoff');

for(const marker of [
  '11.7 large counts remain deterministic','11.7 stale targets fail closed','11.7 duplicate events remain idempotent',
  '11.7 revoked links cannot resurrect access','11.7 unauthorized portal access is denied','11.7 delivery failure cannot become canonical success',
  '11.7 workspace timezone remains authoritative','11.7 archived and terminal relations cannot resurrect truth'
])has(tests,marker,'destruction wave');

has(roadmap,'## 11.7 — Communication Zero-Escape Gate','roadmap');
has(roadmap,'Large counts, stale targets, duplicate events, revoked links, unauthorized portal access, delivery failure, timezone boundaries and archived relations.','roadmap');
has(roadmap,'M3/M4/M10 and Phase-11 portions of M16/M17 require individual evidence.','roadmap');
has(roadmap,'## 12.1 — Copilot Foundation','roadmap');

if(errors.length){
  console.error(`ENJAZ PHASE 11.7 COMMUNICATION ZERO-ESCAPE AUDIT FAIL (${errors.length})`);
  errors.forEach((e)=>console.error(`- ${e}`));
  process.exitCode=1;
}else{
  console.log(state.realCloudWave1Status==='PASS'
    ? 'ENJAZ PHASE 11.7 COMMUNICATION ZERO-ESCAPE AUDIT PASS — individual M3/M4/M10/M16/M17 Real Cloud wave 1 is certified; destructive closure remains open and Phase 12.1 stays locked.'
    : 'ENJAZ PHASE 11.7 COMMUNICATION ZERO-ESCAPE OPENING AUDIT PASS — exact closed 11.6 base, five active system boundaries, eight destruction dimensions, frozen budgets and Phase 12.1 lock are intact.');
}
