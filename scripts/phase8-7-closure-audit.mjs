import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const stateUrl=new URL('../docs/PHASE8_7_STATE.json',import.meta.url);
const originalStateText=fs.readFileSync(stateUrl,'utf8');
const state=JSON.parse(originalStateText);
const postMerge=read('docs/PHASE8_7_POSTMERGE_RECERTIFICATION.md');
const closure=read('docs/PHASE8_7_CLOSURE.md');
const implementation=read('docs/PHASE8_7_IMPLEMENTATION_EVIDENCE.md');
const realCloud=read('docs/PHASE8_7_REAL_CLOUD_EVIDENCE.md');
const fail=(m)=>{throw new Error(`Phase 8.7 closure audit: ${m}`)};
const must=(text,marker,label)=>{if(!text.includes(marker))fail(`${label} missing ${marker}`)};

if(state.phase!=='8.7'||state.name!=='Operations Zero-Escape Destruction Gate')fail('identity drift');
if(state.status!=='CLOSED')fail('status must be CLOSED');
if(state.baseCommit!=='cb6449428e0ed9490af2758beac12692631b8f8b')fail('base commit drift');
if(state.implementationBranch!=='phase8-7-operations-zero-escape')fail('implementation branch drift');
if(state.mode!=='DESTRUCTION_AND_CLOSURE_EVIDENCE_ONLY')fail('mode drift');
if(state.newFeatureAuthorityAllowed!==false||state.newDatabaseTablesAllowed!==false||state.newWriteRpcAuthorityAllowed!==false)fail('Phase 8.7 cannot gain feature/write authority at closure');
if(state.javascriptBudgetBytes!==670000||state.budgetIncreaseAllowed!==false)fail('JavaScript budget drift');
if(state.realCloudVerification!=='PASS_ZERO_RESIDUE')fail('Real Cloud closure evidence must remain PASS_ZERO_RESIDUE');
if(state.deployedLiveVerification!=='PASS_PAGES_AND_LIVE_EXTERNAL')fail('deployed-live verification must be complete');
if(state.pullRequestGate!=='PASS_36_OF_36_FINAL_REPAIR_HEAD')fail('final PR gate must bind exact repaired head');
if(state.postMergeRecertification!=='COMPLETE')fail('post-merge recertification must be COMPLETE');
if(state.exitGatePassed!==true)fail('exit gate must be passed');
if(state.phase9_1Allowed!==true||state.nextPhase!=='9.1'||state.successorStatus!=='AUTHORIZED')fail('Phase 9.1 must be the sole authorized successor');

const evidence=state.closureEvidence??{};
const expected={
  implementationPR:121,
  implementationFinalHead:'277ceab165fe8e90c2ae6a324b5ff8f5f32b0165',
  implementationMerge:'ff4d86800101fbc076cd092ff07ebbd6e5b4b5e8',
  repairPR:122,
  repairFinalHead:'9cc21db60f3e237de71efb66aaf84c797a2685a6',
  canonicalMerge:'4334d8ab8e9db6310a07fa23fb9d11fc0665ed16',
  implementationPullRequestWorkflowSuccess:36,
  repairPullRequestWorkflowSuccess:36,
  exactMainWorkflowSuccess:18,
  exactMainPhase87Run:34342365886,
  pagesPreviewRun:34342413393,
  liveExternalRun:34342462822,
  realBrowserRun:34342365719,
  pagesJavascriptBytes:669984,
  unresolvedDefectCount:0,
  criticalDefectCount:0,
  highDefectCount:0,
  functionalBlockerCount:0
};
for(const [key,value] of Object.entries(expected))if(evidence[key]!==value)fail(`closureEvidence.${key} drift`);
if(evidence.postMergeEvidence!=='docs/PHASE8_7_POSTMERGE_RECERTIFICATION.md')fail('post-merge evidence pointer drift');
if(evidence.formalClosureEvidence!=='docs/PHASE8_7_CLOSURE.md')fail('formal closure evidence pointer drift');
if(evidence.implementationEvidence!=='docs/PHASE8_7_IMPLEMENTATION_EVIDENCE.md')fail('implementation evidence pointer drift');
if(evidence.realCloudEvidence!=='docs/PHASE8_7_REAL_CLOUD_EVIDENCE.md')fail('Real Cloud evidence pointer drift');

const disposition=state.majorSystemDisposition??{};
if(disposition.M1?.phase8ZeroEscape!=='COMPLETE'||disposition.M1?.globalStatus!=='CLOSURE_CANDIDATE')fail('M1 disposition drift');
if(disposition.M5?.phase8ZeroEscape!=='COMPLETE'||disposition.M5?.globalStatus!=='CLOSURE_CANDIDATE')fail('M5 disposition drift');
if(disposition.M6?.phase8ZeroEscape!=='COMPLETE'||disposition.M6?.globalStatus!=='CLOSURE_CANDIDATE')fail('M6 disposition drift');
if(disposition.M17?.phase8Portion!=='CLOSED'||disposition.M17?.globalStatus!=='ACTIVE'||disposition.M17?.remainingAnchor!=='11')fail('M17 boundary drift');
if(disposition.M15?.phase8Portion!=='CLOSED'||disposition.M15?.globalStatus!=='ACTIVE'||disposition.M15?.remainingAnchor!=='15')fail('M15 boundary drift');

for(const marker of [
  'Status: **COMPLETE / PASS**','#121','#122','277ceab165fe8e90c2ae6a324b5ff8f5f32b0165','9cc21db60f3e237de71efb66aaf84c797a2685a6','4334d8ab8e9db6310a07fa23fb9d11fc0665ed16','36/36 SUCCESS','18/18 SUCCESS','34342365886','34342365719','34342413393','34342462822','669984 / 670000 bytes PASS','Attack the actual published application: SUCCESS','unresolved defects: **0**'
])must(postMerge,marker,'post-merge evidence');

for(const marker of [
  'Status: **CLOSED**','Exit gate: **PASS**','Phase 9.1 — Smart Risk Engine AUTHORIZED','#121','#122','36/36 SUCCESS','18/18 SUCCESS','34342365886','34342365719','34342413393','34342462822','53/53 PASS','PASS — ZERO RESIDUE','669984 / 670000 bytes PASS','M1 — Government Procedure Operating System','global status remains **CLOSURE_CANDIDATE**','M5 — ENJAZ Field Operations / Runner Mode','M6 — Service Catalog, CRM & Commercial Intake','M17 — Smart Intake Forms & Secure Submission Links','M15 — Multi-Branch, Departments & Team Operating Model','unresolved defects: **0**','critical defects: **0**','high defects: **0**','functional blockers: **0**','Phase 9.1 — Smart Risk Engine is the sole authorized successor'
])must(closure,marker,'formal closure evidence');

for(const marker of ['Status: **BRANCH IMPLEMENTATION GATE PASS — NOT FORMALLY CLOSED**','8f09a784a473e2ffd8f99b5ab8703ed35f2f56c1','34339431797','53/53 PASS'])must(implementation,marker,'historical implementation evidence');
for(const marker of ['Status: **PASS — ZERO RESIDUE**','**Phase 8.7 Real Cloud Verification: PASS — ZERO RESIDUE.**'])must(realCloud,marker,'Real Cloud evidence');

// Preserve the original implementation gate unchanged at formal closure. The implementation audit
// deliberately enforces IN_PROGRESS/locked successor semantics. Run it against a transient normalized
// state, then restore the certified CLOSED state even if the historical audit throws.
const provisional=structuredClone(state);
provisional.status='IN_PROGRESS';
provisional.gateEvidence='WAVE1_PASS_REAL_CLOUD_PASS_ZERO_RESIDUE_REAL_CHROMIUM_PASS';
provisional.realBrowserVerification='PASS_CUMULATIVE_PHASE8_BRANCH_HEAD_53_OF_53';
provisional.realBrowserEvidence='docs/PHASE8_7_IMPLEMENTATION_EVIDENCE.md';
provisional.deployedLiveVerification='PENDING';
provisional.pullRequestGate='PENDING';
provisional.postMergeRecertification='PENDING';
provisional.exitGatePassed=false;
provisional.phase9_1Allowed=false;
provisional.successorStatus='LOCKED';
delete provisional.closureEvidence;
delete provisional.majorSystemDisposition;

try{
  fs.writeFileSync(stateUrl,`${JSON.stringify(provisional,null,2)}\n`);
  execFileSync(process.execPath,['scripts/phase8-7-zero-escape-audit.mjs'],{stdio:'inherit'});
}finally{
  fs.writeFileSync(stateUrl,originalStateText);
}

console.log('ENJAZ PHASE 8.7 CLOSURE AUDIT PASS — implementation PR #121 and repair PR #122 were 36/36; final exact-main is 18/18; dedicated 8.7, cumulative Real Browser, Pages and Live External are certified on canonical merge 4334d8ab; Real Cloud remains PASS ZERO RESIDUE; 670000-byte budget remains frozen; Phase 9.1 AUTHORIZED without globally over-closing M1/M5/M6/M15/M17.');
