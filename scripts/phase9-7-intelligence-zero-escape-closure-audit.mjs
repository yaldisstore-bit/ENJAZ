import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const json=(p)=>JSON.parse(read(p));
const exists=(p)=>fs.existsSync(new URL(p,root));
const fail=(m)=>{throw new Error(`Phase 9.7 closure audit: ${m}`)};
const must=(v,m)=>{if(!v)fail(m)};

for(const script of [
  'scripts/phase9-3-governance-ownership-audit.mjs',
  'scripts/phase9-4-regulatory-knowledge-audit.mjs',
  'scripts/phase9-5-business-intelligence-audit.mjs',
  'scripts/phase9-6-process-mining-audit.mjs',
  'scripts/major-systems-zero-escape-audit.mjs',
]) execFileSync(process.execPath,[script],{cwd:new URL('../',import.meta.url),stdio:'inherit'});

const state=json('docs/PHASE9_7_STATE.json');
const prior=json('docs/PHASE9_6_STATE.json');
const registry=json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const m2Evidence=json('docs/M2_ZERO_ESCAPE_CLOSURE.json');
const closure=read('docs/PHASE9_7_CLOSURE.md');
const post=read('docs/PHASE9_7_POSTMERGE_RECERTIFICATION.md');

must(prior.status==='CLOSED'&&prior.exitGatePassed===true&&prior.phase9_7Allowed===true,'Phase 9.6 predecessor is not closed/authorized');
must(state.phase==='9.7'&&state.name==='Intelligence Zero-Escape Gate'&&state.status==='CLOSED','closed identity/state drift');
must(state.baseCommit==='bcb8e697fa7457e216036ae321b8eddac2050b1b','base commit drift');
must(state.candidateHead==='84331768024d1aef2eed83444a9c5aff8789e875','candidate head drift');
must(state.implementationMain==='e8992650afb7bd3bd5c47770d0b2d752cdd0488e','certified merged SHA drift');
must(state.mode==='DESTRUCTION_AND_CLOSURE_EVIDENCE_ONLY','mode drift');
must(state.newFeatureAuthorityAllowed===false&&state.newDatabaseTablesAllowed===false&&state.newWriteRpcAuthorityAllowed===false,'closure gained forbidden authority');
must(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false,'governed budget drift');
must(state.systemsUnderGate?.join(',')==='M2,M8_PHASE9_PORTION,M13_PHASE9_PORTION,M18_PHASE9_PORTION','systems-under-gate drift');
must(state.destructionDimensions?.join(',')==='conflicting_stale_signals,no_data_states,high_volume_datasets,invalid_ownership,regulatory_version_conflicts,model_drift,prediction_uncertainty','destruction dimension drift');
for(const key of state.systemsUnderGate) must(state.systemEvidence?.[key]?.status==='POSTMERGE_CERTIFIED',`${key} is not post-merge certified`);
must(state.realCloudVerification==='PASS_READ_ONLY_ZERO_NEW_RESIDUE'&&exists(state.realCloudEvidence),'Real Cloud evidence drift');
must(state.realBrowserVerification==='PASS'&&state.deployedLiveVerification==='PASS'&&state.pullRequestGate==='PASS'&&state.postMergeRecertification==='PASS','closure certification is incomplete');
const c=state.certification||{};
must(c.status==='PASS'&&c.exactMainWorkflowCount===31&&c.exactMainSuccessCount===31&&c.exactMainFailureCount===0&&c.exactMainQueuedCount===0&&c.exactMainInProgressCount===0,'exact-main aggregate drift');
must(c.phaseGateRunId===34708680263&&c.realBrowserRunId===34708680233&&c.pagesBuildRunId===34708679838&&c.pagesPreviewRunId===34708710217&&c.liveExternalRunId===34708764814,'exact-main run-id drift');
must(c.realBrowserWidths?.join(',')==='1280,430,390,360,320','Real Browser matrix drift');
must(state.exitGatePassed===true&&state.phase10_1Allowed===true&&state.nextPhase==='10.1'&&state.successorStatus==='AUTHORIZED','Phase 10.1 authorization drift');
for(const count of ['unresolvedDefectCount','criticalDefectCount','highDefectCount','functionalBlockerCount']) must(state[count]===0,`${count} must remain zero`);
for(const track of ['product','uiUx','engineering','certification']) must(state.projectQualityConstitution?.tracks?.[track]==='PASS',`${track} quality track is not PASS`);

const m2=registry.systems.find(x=>x.id==='M2');
const m8=registry.systems.find(x=>x.id==='M8');
const p125=exists('docs/PHASE12_5_STATE.json')?json('docs/PHASE12_5_STATE.json'):null;
const downstreamM8Closed=p125?.status==='CLOSED'&&p125?.closureDecision==='PASS'&&m8?.status==='CLOSED'&&m8?.closureEvidence==='docs/M8_ZERO_ESCAPE_CLOSURE.json'&&exists(m8.closureEvidence);
const m13=registry.systems.find(x=>x.id==='M13');
const m18=registry.systems.find(x=>x.id==='M18');
must(m2?.status==='CLOSED'&&m2?.anchors?.join(',')==='9'&&m2?.closureEvidence==='docs/M2_ZERO_ESCAPE_CLOSURE.json','M2 global closure registry drift');
if(downstreamM8Closed) must(m8?.anchors?.join(',')==='9,12','M8 closed anchors drifted'); else must(m8?.status==='ACTIVE'&&m8?.anchors?.join(',')==='9,12'&&m8?.closureEvidence===null,'M8 must remain active until Phase 12.5');
must(m13?.status==='ACTIVE'&&m13?.anchors?.join(',')==='9,15'&&m13?.closureEvidence===null,'M13 must remain active for Phase 15');
must(m18?.status==='ACTIVE'&&m18?.anchors?.join(',')==='9,15'&&m18?.closureEvidence===null,'M18 must remain active for Phase 15');

must(m2Evidence.gateProfile==='ZERO_ESCAPE_V1'&&m2Evidence.systemId==='M2'&&m2Evidence.status==='CLOSED','M2 machine closure evidence drift');
must(m2Evidence.candidateHead===state.candidateHead&&m2Evidence.mergeCommit===state.implementationMain,'M2 SHA evidence drift');
for(const gate of ['preMergeDeterministic','realCloudAuthenticated','freshWorkspaceBootstrap','durableWriteRoundTrip','permissionMatrix','realBrowserMobile','failureConflictRecovery','auditReconciliation','deployedLiveCriticalPath','postMergeRecertification']) must(['PASS','COMPLETE'].includes(m2Evidence[gate]),`M2 ${gate} is not PASS`);
must(m2Evidence.unresolvedCriticalCount===0&&m2Evidence.unresolvedHighCount===0&&m2Evidence.unresolvedFunctionalBlockerCount===0,'M2 blocker ledger is not zero');
must(Array.isArray(m2Evidence.workflowEvidence)&&m2Evidence.workflowEvidence.length>=7,'M2 workflow evidence incomplete');
must(Array.isArray(m2Evidence.liveEvidence)&&m2Evidence.liveEvidence.length>=4,'M2 live evidence incomplete');
must(Array.isArray(m2Evidence.escapedDefects)&&m2Evidence.escapedDefects.length===0,'M2 escaped defects remain open');

for(const [text,markers,label] of [
  [closure,['Status: **CLOSED**','31/31 SUCCESS','M2 → CLOSED','Phase 10.1 — Document Vault'], 'closure'],
  [post,['PASS — EXACT-MAIN / REAL-BROWSER / PAGES / LIVE-EXTERNAL CERTIFIED','34708680263','34708680233','34708710217','34708764814','M2 — Corporate Governance & Ownership Engine'], 'post-merge'],
]) for(const marker of markers) must(text.includes(marker),`${label} missing marker ${marker}`);

console.log('ENJAZ PHASE 9.7 FORMAL CLOSURE AUDIT PASS — exact-main 31/31 and deployed live certified; M2 CLOSED under ZERO_ESCAPE_V1; M8/M13/M18 remain ACTIVE for later anchors; Phase 10.1 AUTHORIZED; no authority or budget expansion.');
