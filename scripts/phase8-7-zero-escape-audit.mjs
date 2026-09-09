import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const state=JSON.parse(read('docs/PHASE8_7_STATE.json'));
const kickoff=read('docs/PHASE8_7_KICKOFF.md');
const tests=read('tests/phase8-7-operations-zero-escape.test.ts');
const offline=read('src/features/field-operations/fieldOperationsOfflineQueue.ts');
const intakeRateRepair=read('database/migrations/phase_8_7_intake_rate_limit_serialization.sql');
const realCloud=read('docs/PHASE8_7_REAL_CLOUD_EVIDENCE.md');
const implementation=read('docs/PHASE8_7_IMPLEMENTATION_EVIDENCE.md');
const fail=(m)=>{throw new Error(`Phase 8.7 Zero-Escape audit: ${m}`)};
const must=(text,marker,label)=>{if(!text.includes(marker))fail(`${label} missing ${marker}`)};

// Preserve Phase 8.6 exactly as it was certified. Phase 8.7 may add its own destruction repair,
// but it may not weaken, rewrite or retroactively widen the predecessor's authority contract.
const phase86ClosedSha='cb6449428e0ed9490af2758beac12692631b8f8b';
const phase86ProtectedPaths=[
  'docs/PHASE8_6_STATE.json',
  'docs/PHASE8_6_KICKOFF.md',
  'docs/PHASE8_6_IMPLEMENTATION_EVIDENCE.md',
  'docs/PHASE8_6_POSTMERGE_RECERTIFICATION.md',
  'docs/PHASE8_6_CLOSURE.md',
  'src/features/command/commandCenter.ts',
  'src/ui-r2/command/LiveCommandCenterExperience.tsx',
  'src/ui-r2/command/command-center.css',
  'src/ui-r2/runtime/UiR2LiveRoot.tsx',
  'src/ui-r2/runtime/UiR2ProductionRoot.tsx',
  'tests/commandCenter.test.ts',
  'tests-external/phase8-6-command-center.spec.cjs',
  'scripts/phase8-6-command-center-audit.mjs',
  'scripts/phase8-6-closure-audit.mjs'
];
try{
  execFileSync('git',['diff','--quiet',phase86ClosedSha,'--',...phase86ProtectedPaths],{stdio:'inherit'});
}catch{
  fail('Phase 8.6 protected closure/runtime files changed after certified close');
}
const phase86TmpParent=fs.mkdtempSync(path.join(os.tmpdir(),'enjaz-phase86-'));
const phase86Worktree=path.join(phase86TmpParent,'closed');
try{
  execFileSync('git',['worktree','add','--detach',phase86Worktree,phase86ClosedSha],{stdio:'ignore'});
  execFileSync(process.execPath,['scripts/phase8-6-closure-audit.mjs'],{cwd:phase86Worktree,stdio:'inherit'});
}finally{
  try{execFileSync('git',['worktree','remove','--force',phase86Worktree],{stdio:'ignore'});}catch{}
  fs.rmSync(phase86TmpParent,{recursive:true,force:true});
}

if(state.phase!=='8.7'||state.name!=='Operations Zero-Escape Destruction Gate')fail('identity drift');
if(state.status!=='IN_PROGRESS')fail('Phase 8.7 must remain IN_PROGRESS before PR/merge/post-merge closure evidence');
if(state.baseCommit!==phase86ClosedSha)fail('base commit drift');
if(state.implementationBranch!=='phase8-7-operations-zero-escape')fail('implementation branch drift');
if(state.predecessor?.phase!=='8.6'||state.predecessor?.requiredStatus!=='CLOSED'||state.predecessor?.requiredAuthorization!=='phase8_7Allowed=true')fail('predecessor contract drift');
if(state.mode!=='DESTRUCTION_AND_CLOSURE_EVIDENCE_ONLY')fail('mode drift');
if(state.newFeatureAuthorityAllowed!==false||state.newDatabaseTablesAllowed!==false||state.newWriteRpcAuthorityAllowed!==false)fail('Phase 8.7 cannot create new authority');
if(state.javascriptBudgetBytes!==670000||state.budgetIncreaseAllowed!==false)fail('JavaScript budget drift');
if(state.phase9_1Allowed!==false||state.nextPhase!=='9.1'||state.successorStatus!=='LOCKED')fail('Phase 9.1 must remain locked');
if(state.exitGatePassed!==false||state.postMergeRecertification!=='PENDING'||state.pullRequestGate!=='PENDING'||state.deployedLiveVerification!=='PENDING')fail('premature Phase 8.7 closure');

const expectedSystems=['M1','M5','M6','M17','M15_PHASE8_PORTION'];
if(JSON.stringify(state.systemsUnderGate)!==JSON.stringify(expectedSystems))fail('systems-under-gate drift');
const expectedDimensions=['repeated_triggers','stale_transitions','conflicting_actors','large_histories','field_offline_recovery','intake_abuse','branch_team_permission_boundaries','automation_failure_isolation'];
if(JSON.stringify(state.destructionDimensions)!==JSON.stringify(expectedDimensions))fail('destruction dimensions drift');

if(state.gateEvidence!=='WAVE1_PASS_REAL_CLOUD_PASS_ZERO_RESIDUE_REAL_CHROMIUM_PASS')fail('gate evidence must retain Wave 1 + complete Real Cloud + cumulative Chromium result');
if(state.realCloudVerification!=='PASS_ZERO_RESIDUE')fail('complete Phase 8.7 Real Cloud evidence must be PASS_ZERO_RESIDUE');
if(state.realCloudEvidence!=='docs/PHASE8_7_REAL_CLOUD_EVIDENCE.md')fail('Real Cloud evidence pointer drift');
const systemProperties={
  M1:'workflow_replay_stale_and_idempotency_conflict',
  M5:'offline_identity_replay_stale_and_finance_isolation',
  M6:'guarded_conversion_replay_and_finance_isolation',
  M17:'concurrent_public_intake_rate_limit_serialization',
  M15_PHASE8_PORTION:'permission_inheritance_stale_ownership_and_sibling_isolation'
};
for(const [system,verifiedProperty] of Object.entries(systemProperties)){
  const evidence=state.systemEvidence?.[system];
  if(evidence?.realCloud!=='PASS_ZERO_RESIDUE'||evidence?.evidence!==state.realCloudEvidence||evidence?.verifiedProperty!==verifiedProperty)fail(`${system} Real Cloud evidence contract drift`);
}
const automation=state.dimensionEvidence?.automation_failure_isolation;
if(automation?.realCloud!=='PASS_ZERO_RESIDUE'||automation?.evidence!==state.realCloudEvidence||automation?.verifiedProperty!=='stale_rule_replay_human_approval_rejection_and_finance_isolation')fail('automation failure-isolation cloud evidence drift');

const branch=state.branchImplementationGate??{};
if(branch.status!=='PASS_CERTIFIED_HEAD')fail('branch implementation gate status drift');
if(branch.certifiedSha!=='8f09a784a473e2ffd8f99b5ab8703ed35f2f56c1')fail('certified branch SHA drift');
if(branch.workflowRun!==34339431797)fail('certified Phase 8.7 workflow run drift');
if(branch.destructionWave!=='9/9'||branch.subsystemTests!=='45/45'||branch.functionalRegression!=='217/217'||branch.databaseSelfTests!=='25/25')fail('branch test-count evidence drift');
if(branch.javascriptBytes!==669807||branch.javascriptBytes>state.javascriptBudgetBytes)fail('certified JavaScript budget evidence drift');
if(branch.realChromium!=='53/53')fail('cumulative Chromium total drift');
const expectedChromium={'8.1':'8/8','8.2':'9/9','8.3':'9/9','8.4':'9/9','8.5':'9/9','8.6':'9/9'};
if(JSON.stringify(branch.chromiumByPhase)!==JSON.stringify(expectedChromium))fail('cumulative Chromium phase counts drift');
if(branch.evidence!=='docs/PHASE8_7_IMPLEMENTATION_EVIDENCE.md')fail('implementation evidence pointer drift');
if(state.realBrowserVerification!=='PASS_CUMULATIVE_PHASE8_BRANCH_HEAD_53_OF_53'||state.realBrowserEvidence!==branch.evidence)fail('branch Real Browser evidence drift');

for(const marker of [
  '**Status: IN PROGRESS**','not a feature-delivery phase','repeated triggers','stale transitions','conflicting actors','large histories','field offline recovery','intake abuse','branch/team permission boundaries','automation failure isolation',
  'M1 — Government Procedure Operating System','M5 — Field Operations / Runner Mode','M6 — Service Catalog, CRM & Commercial Intake','M17 — Smart Intake Forms & Secure Submission Links','M15 — Phase-8 organizational portion','Phase 9.1 — Smart Risk Engine remains LOCKED'
])must(kickoff,marker,'kickoff');

for(const marker of [
  'M5 corruption guard','unknown offline operation kind is never replayed or silently deleted','M1 repeated transition','M1 stale transition','M1 large history','automation failure isolation','M17 abuse boundary','M6 replayed conversion','M15 source-less inherited workforce permission','M15 stale ownership transfer'
])must(tests,marker,'destruction wave 1');

for(const marker of ["x.kind==='check_in'","x.kind==='check_out'","x.kind==='evidence'","x.kind==='handoff'","x.kind==='reassign'",'return knownKind&&'])must(offline,marker,'M5 offline corruption repair');

for(const marker of [
  'create or replace function private.enforce_public_intake_rate_v1','from public.intake_links l where l.id=p_link_id for update',"v_hour>=120","v_recent>=4",'ENJAZ_INTAKE_RATE_LIMITED','insert into public.intake_public_events(link_id,event_type)','revoke all on function private.enforce_public_intake_rate_v1(uuid,text) from public,anon'
])must(intakeRateRepair,marker,'M17 concurrent abuse repair');
if(/create\s+table\b/i.test(intakeRateRepair))fail('M17 repair may not create a new table');
if(/create\s+or\s+replace\s+function\s+public\./i.test(intakeRateRepair))fail('M17 repair may not create/replace a public RPC');
if(/grant\s+execute/i.test(intakeRateRepair))fail('M17 repair may not grant new execute authority');

for(const marker of [
  'Status: **PASS — ZERO RESIDUE**','juzxriirhkuzviwnhkbd','20260909094008 phase_8_7_intake_rate_limit_serialization','4 × HTTP 200','1 × HTTP 500 / SQLSTATE 54000 / `ENJAZ_INTAKE_RATE_LIMITED`','**M17 concurrent abuse destruction: PASS — ZERO RESIDUE.**',
  '20260909095155 phase_8_7_live_m1_zero_escape_probe_v3','**M1 Phase-8 Zero-Escape cloud destruction: PASS — ZERO RESIDUE.**',
  '20260909095410 phase_8_7_live_m5_offline_zero_escape_probe_v2','**M5 Phase-8 Zero-Escape cloud destruction: PASS — ZERO RESIDUE.**',
  '20260909095550 phase_8_7_live_m6_conversion_zero_escape_probe_v2','**M6 Phase-8 Zero-Escape cloud destruction: PASS — ZERO RESIDUE.**',
  '20260909095745 phase_8_7_live_m15_permission_zero_escape_probe','**M15 Phase-8 Zero-Escape cloud destruction: PASS — ZERO RESIDUE.**',
  '20260909095841 phase_8_7_live_automation_failure_isolation_probe','**Automation failure-isolation Real Cloud destruction: PASS — ZERO RESIDUE.**',
  '**Phase 8.7 Real Cloud Verification: PASS — ZERO RESIDUE.**'
])must(realCloud,marker,'complete Real Cloud evidence');

for(const marker of [
  'Status: **BRANCH IMPLEMENTATION GATE PASS — NOT FORMALLY CLOSED**','8f09a784a473e2ffd8f99b5ab8703ed35f2f56c1','34339431797','9/9 PASS','45/45 PASS','217/217 PASS','25/25 PASS','669,807 / 670,000 bytes PASS','Phase 8.1 Workflow / Government Procedure OS: **8/8 PASS**','Phase 8.2 Automation Engine: **9/9 PASS**','Phase 8.3 Operations + Field M5: **9/9 PASS**','Phase 8.4 CRM + Smart Intake M6/M17: **9/9 PASS**','Phase 8.5 Organization / M15 foundation: **9/9 PASS**','Phase 8.6 Global Command Center: **9/9 PASS**','Total cumulative Phase-8 Real Chromium: **53/53 PASS**','Phase 9.1 — Smart Risk Engine remains **LOCKED**'
])must(implementation,marker,'branch implementation evidence');

console.log('ENJAZ PHASE 8.7 ZERO-ESCAPE AUDIT PASS — exact Phase 8.6 closure independently recertified; Wave 1 9/9, subsystem 45/45, functional 217/217 and DB selftest 25/25 are certified; M1/M5/M6/M17/M15 plus automation failure isolation are Real-Cloud PASS ZERO RESIDUE; cumulative Phase 8.1–8.6 Chromium is 53/53 on certified branch head; JS=669807/670000; deployed-live/PR/merge/post-merge closure remain pending; Phase 9.1 locked.');
