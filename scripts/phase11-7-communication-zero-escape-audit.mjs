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
for(const key of systems)req(state.systemEvidence?.[key]?.status==='PENDING',`${key} must start PENDING`);
req(state.exitGatePassed===false&&state.phase12_1Allowed===false&&state.nextPhase==='12.1'&&state.successorStatus==='LOCKED','Phase 12.1 must remain locked while 11.7 is open');
for(const k of ['realCloudVerification','permissionMatrixVerification','realBrowserVerification','pagesVerification','liveExternalVerification','pullRequestGate','postMergeRecertification'])req(state[k]==='PENDING',`premature 11.7 evidence: ${k}`);
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
  console.log('ENJAZ PHASE 11.7 COMMUNICATION ZERO-ESCAPE OPENING AUDIT PASS — exact closed 11.6 base, five active system boundaries, eight destruction dimensions, frozen budgets and Phase 12.1 lock are intact.');
}
