import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const state=JSON.parse(read('docs/PHASE8_4_STATE.json'));
const evidence=read('docs/PHASE8_4_REAL_CLOUD_EVIDENCE.md');
const closure=read('docs/PHASE8_4_CLOSURE.md');
const postMerge=read('docs/PHASE8_4_POSTMERGE_RECERTIFICATION.md');
const edge=read('supabase/functions/enjaz-intake-upload/index.ts');
const errors=[];
const requireMarker=(source,marker,label)=>{if(!source.includes(marker))errors.push(`${label} missing marker: ${marker}`)};
const forbidMarker=(source,marker,label)=>{if(source.includes(marker))errors.push(`${label} forbidden marker: ${marker}`)};

if(state.status!=='CLOSED'||state.exitGatePassed!==true)errors.push('Phase 8.4 must be CLOSED only after its certified exit gate');
if(state.implementationHead!=='ce9c0ea27af0289593e27467841014922943b171'||state.pullRequest!==115||state.implementationMergeCommit!=='b1f2e3b72ea9e15bb418660c14a4c8b663e37477')errors.push('Phase 8.4 implementation chain drifted');
if(state.preClosure?.workflowCount!==33||state.preClosure?.successCount!==33||state.preClosure?.failureCount!==0||state.preClosure?.crmIntakeTestCount!==7||state.preClosure?.functionalTestCount!==217||state.preClosure?.realChromiumAssertionCount!==9)errors.push('Phase 8.4 pre-closure evidence must remain 33/33 + 7/7 + 217/217 + 9/9');
if(state.preClosure?.productionJsBytes!==669685||state.preClosure?.previewBytes!==250601||state.preClosure?.javascriptBudgetBytes!==670000)errors.push('Phase 8.4 pre-closure size evidence drifted');

const cloud=state.realCloudVerification;
if(cloud?.status!=='PASS_ZERO_RESIDUE'||cloud?.projectRef!=='juzxriirhkuzviwnhkbd'||cloud?.authenticatedProbe!=='PASS'||cloud?.storageAcknowledgement!=='PASS'||cloud?.zeroResidue!==true)errors.push('Phase 8.4 cloud/storage closure evidence drifted');
if(cloud?.cleanupStorageMigration!=='20260909033707 phase_8_4_storage_probe_cleanup_via_api'||cloud?.cleanupFixtureMigration!=='20260909033915 phase_8_4_storage_probe_fixture_cleanup')errors.push('Phase 8.4 cleanup migration identity drifted');

const pm=state.postMergeRecertification;
if(pm?.status!=='COMPLETE'||pm?.mainCommit!=='b1f2e3b72ea9e15bb418660c14a4c8b663e37477')errors.push('Phase 8.4 post-merge target drifted');
if(pm?.workflowCount!==18||pm?.successCount!==18||pm?.failureCount!==0||pm?.queuedCount!==0||pm?.inProgressCount!==0||pm?.skippedCount!==0)errors.push('Phase 8.4 exact-main closure census must remain 18/18 success with zero non-success outcomes');
if(pm?.pagesPreviewRunId!==34307859669||pm?.liveExternalRunId!==34307899140||pm?.realBrowserRunId!==34307826442)errors.push('Phase 8.4 deployed run IDs drifted');
if(pm?.canonicalPagesJsBytes!==669877||pm?.realPagesLiveJsBytes!==669888||pm?.javascriptBudgetBytes!==670000||pm?.publishedApplicationAttack!=='PASS')errors.push('Phase 8.4 Pages/Live evidence drifted');

if(state.phase8_5Allowed!==true||state.nextPhase!=='8.5'||state.successorStatus!=='AUTHORIZED')errors.push('Phase 8.5 must be authorized after certified Phase 8.4 closure');
if(state.systems?.M6?.phase8_4Delivery!=='CLOSED'||state.systems?.M6?.overallClosureAllowed!==false||state.systems?.M17?.phase8_4Delivery!=='CLOSED'||state.systems?.M17?.overallClosureAllowed!==false)errors.push('Phase-level closure must not globally close M6/M17');
if(state.unresolvedDefectCount!==0||state.criticalDefectCount!==0||state.highDefectCount!==0||state.functionalBlockerCount!==0)errors.push('Phase 8.4 defect ledger must remain zero at closure');
if(state.realCloudEvidence!=='docs/PHASE8_4_REAL_CLOUD_EVIDENCE.md'||state.closureEvidence!=='docs/PHASE8_4_CLOSURE.md'||state.postMergeEvidence!=='docs/PHASE8_4_POSTMERGE_RECERTIFICATION.md')errors.push('Phase 8.4 evidence pointers drifted');

for(const marker of [
  'Status: **PASS — ZERO RESIDUE**',
  'juzxriirhkuzviwnhkbd',
  'HTTP 409 with `STORAGE_OBJECT_NOT_FOUND`',
  'HTTP 200 with `uploadStatus=acknowledged`',
  'Storage objects: **0**',
  'intake submission files: **0**',
  'related audit events: **0**',
  'temporary Storage DELETE policies: **0**',
  'temporary `http` extension: **0**',
  '20260909033707 phase_8_4_storage_probe_cleanup_via_api',
  '20260909033915 phase_8_4_storage_probe_fixture_cleanup',
])requireMarker(evidence,marker,'Real Cloud evidence');

for(const marker of [
  'Status: **CLOSED**',
  'Successor: **Phase 8.5 AUTHORIZED**',
  '33/33 pull-request workflows successful',
  '18/18 SUCCESS',
  '34307859669',
  '34307899140',
  '34307826442',
  '669877 / 670000 bytes',
  '669888 / 670000 bytes',
  'M6/M17 overall: **NOT GLOBALLY CLOSED',
])requireMarker(closure,marker,'Phase 8.4 closure evidence');

for(const marker of [
  'Status: **COMPLETE**',
  'b1f2e3b72ea9e15bb418660c14a4c8b663e37477',
  'workflow runs: **18**',
  'successful: **18**',
  'failed: **0**',
  'queued: **0**',
  'in progress: **0**',
  'skipped: **0**',
  '34307859669',
  '34307899140',
  'Published application attack: **PASS**',
])requireMarker(postMerge,marker,'Phase 8.4 post-merge evidence');

forbidMarker(edge,'cleanup_probe','production upload broker');
forbidMarker(edge,'CLEANUP_NONCE','production upload broker');
requireMarker(edge,'STORAGE_OBJECT_NOT_FOUND','production upload broker');
requireMarker(edge,'STORAGE_SIZE_MISMATCH','production upload broker');
requireMarker(edge,'STORAGE_MIME_MISMATCH','production upload broker');

if(errors.length){
  console.error(`ENJAZ PHASE 8.4 CLOUD EVIDENCE AUDIT FAIL (${errors.length})`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exitCode=1;
}else{
  console.log('ENJAZ PHASE 8.4 CLOUD EVIDENCE AUDIT PASS — authenticated Real Cloud + real Storage acknowledgement + API cleanup + zero residue remain bound to exact-head 33/33 and exact-main 18/18 Pages/Live recertification; Phase 8.4 CLOSED, Phase 8.5 AUTHORIZED; M6/M17 global closure remains separate.');
}
