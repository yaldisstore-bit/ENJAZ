import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const json=(p)=>JSON.parse(read(p));
const state=json('docs/PHASE11_6_STATE.json');
const scope=read('docs/PHASE11_6D_UNIFIED_EXPERIENCE_SCOPE.md');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

req(state.phase==='11.6'&&state.status==='IN_PROGRESS','11.6 must remain open during D certification');
req(state.currentSlice==='11.6-D'&&state.currentSliceName==='Unified experience & certification','11.6-D must be the active final slice');
req(state.mode==='UNIFIED_EXPERIENCE_CERTIFICATION','11.6-D mode drifted');
req(state.currentSliceBaseCommit==='ea6d7bdedaa2a714c7ec34ebf444d06e0875b06b','11.6-D base must be exact merged C closure');
req(state.phase11_6dOpenedFromMainSha===state.currentSliceBaseCommit,'D opening lineage drifted');
req(state.nextSlice===null&&state.nextSliceName===null,'D is the final 11.6 slice and must not invent a successor slice');
req(state.phase11_6cStatus==='CLOSED'&&state.phase11_6cExitGatePassed===true&&state.phase11_6cClosureDecision==='PASS','D requires formally closed C');
req(state.phase11_6cMergeCommit==='ea6d7bdedaa2a714c7ec34ebf444d06e0875b06b','C merge lineage drifted');
req(state.phase11_6cPostMergeRecertification==='PASS_EXACT_MAIN_SHA','D requires exact-main C recertification');
req(state.phase11_6cPostMergeQualityRunId===35312001998&&state.phase11_6cPostMergeRealBrowserRunId===35312002076&&state.phase11_6cPostMergeMajorSystemsRunId===35312002091,'C exact-main core gate lineage invalid');
req(state.phase11_6cPostMergePagesRunId===35312053231&&state.phase11_6cPostMergeLiveExternalRunId===35312111384,'C exact-main deployed-live lineage invalid');
req(state.phase11_6dAllowed===true,'C closure must authorize D');
req(['IN_PROGRESS','CLOSED'].includes(state.phase11_6dStatus),'D lifecycle status invalid');
req(state.phase11_6dProjectionOnly===true,'D must remain projection-only');
req(state.phase11_6dNewCssAllowed===false,'D cannot open new CSS budget');
req(state.phase11_6dShadowStoreAllowed===false,'D cannot create a shadow store');
req(state.phase11_6dDirectAuthorityWriteAllowed===false,'D cannot own direct authority writes');
if(state.phase11_6dUnifiedReadModelAdded===true){
  req(state.phase11_6dUnifiedReadModelMigrationPath==='database/migrations/phase_11_6_unified_intake_contract_attention.sql','D1 migration path drifted');
  req(state.phase11_6dUnifiedReadModelMigrationApplied===true&&state.phase11_6dUnifiedReadModelMigrationVersion==='20260918055120','D1 Real Cloud migration lineage invalid');
  req(state.phase11_6dSecurityAdvisorBaselineTotal===65&&state.phase11_6dSecurityAdvisorPostD1Total===65&&state.phase11_6dD1NewSecurityAdvisorFindings===0,'D1 security advisor certificate invalid');
  req(state.phase11_6dPerformanceAdvisorBaselineTotal===80&&state.phase11_6dPerformanceAdvisorPostD1Total===80&&state.phase11_6dUnindexedForeignKeysBaseline===28&&state.phase11_6dUnindexedForeignKeysPostD1===28&&state.phase11_6dD1NewPerformanceAdvisorFindings===0,'D1 performance advisor certificate invalid');
  req(state.phase11_6dD1PermissionMatrix==='PASS','D1 permission matrix missing');
}
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false,'frozen budgets drifted');
if(state.phase11_6dUnifiedExperienceImplemented===true){
  req(state.phase11_6dRealBrowserVerification==='PASS_1280_430_390_360_320','D3 five-width browser certificate missing');
  req(state.phase11_6dRealBrowserRunId===35314058289&&state.phase11_6dRealBrowserRunNumber===11&&state.phase11_6dRealBrowserHead==='f0339676c21b5cf1e6da0d154f7f6e8379a830e5'&&state.phase11_6dRealBrowserChecks===7,'D3 browser run lineage invalid');
  req(state.phase11_6dRealBrowserArtifactId===10533698463&&state.phase11_6dRealBrowserArtifactDigest==='sha256:55ee78d43135d949779f09d59b57fa08fc19fede3328d03736868d0b356cf2b5','D3 browser artifact certificate invalid');
  req(state.phase11_6dRealCloudVerification==='PASS'&&state.realCloudAuthenticatedVerification==='PASS_11_6D_FINAL','D4 Real Cloud certificate missing');
  req(state.phase11_6dRealCloudRunId===35313859136&&state.phase11_6dRealCloudRunNumber===1&&state.phase11_6dRealCloudHead==='ed580e348356ebc7ef36474f8d73d19f03bd4134'&&state.phase11_6dRealCloudChecks===12,'D4 Real Cloud run lineage invalid');
  req(state.phase11_6dRealCloudArtifactId===10534297950&&state.phase11_6dRealCloudArtifactDigest==='sha256:e43fae747f6c1ac63d7be596ed6c92ba76e1b9b9179a9cd410f6bff6f3b7557d','D4 Real Cloud artifact certificate invalid');
  for(const f of ['phase11_6dRealCloudFreshWorkspace','phase11_6dRealCloudDurableProjectionRoundTrip','phase11_6dRealCloudAnonDenied','phase11_6dRealCloudWorkspaceIsolation','phase11_6dRealCloudStaleExposure','phase11_6dRealCloudStaleRecovery','phase11_6dRealCloudRevokedTruth','phase11_6dRealCloudTerminalFilter'])req(state[f]==='PASS',`D4 proof missing: ${f}`);
  req(state.phase11_6dRealCloudZeroResidue===true&&state.phase11_6dRealCloudExternalResidueCheck==='PASS','D4 zero-residue certificate invalid');
  req(state.phase11_6dSecurityAdvisorPostD4Total===65&&state.phase11_6dPerformanceAdvisorPostD4Total===80&&state.phase11_6dUnindexedForeignKeysPostD4===28&&state.phase11_6dD4NewSecurityAdvisorFindings===0&&state.phase11_6dD4NewPerformanceAdvisorFindings===0,'D4 advisor certificate invalid');
  req(state.phase11_6dInitialJavascriptBytes===430928&&state.phase11_6dTotalJavascriptBytes===759521&&state.phase11_6dCssBytes===179989&&state.phase11_6dJavascriptMarginBytes===479&&state.phase11_6dBudgetVerification==='PASS_FROZEN_CAPS_NO_INCREASE','D frozen budget certificate invalid');
}
if(state.phase11_6dUnifiedExperienceImplemented===true){
  req(state.phase11_6dRealBrowserVerification==='PASS_1280_430_390_360_320','implemented D requires five-width browser PASS');
  req(state.phase11_6dRealBrowserRunId===35314058289&&state.phase11_6dRealBrowserRunNumber===11&&state.phase11_6dRealBrowserHead==='f0339676c21b5cf1e6da0d154f7f6e8379a830e5'&&state.phase11_6dRealBrowserChecks===7,'D3 browser certificate lineage invalid');
  req(state.phase11_6dRealCloudVerification==='PASS','implemented D requires Real Cloud PASS');
  req(state.phase11_6dRealCloudRunId===35313859136&&state.phase11_6dRealCloudRunNumber===1&&state.phase11_6dRealCloudHead==='ed580e348356ebc7ef36474f8d73d19f03bd4134'&&state.phase11_6dRealCloudChecks===12,'D4 Real Cloud certificate lineage invalid');
  req(state.phase11_6dRealCloudZeroResidue===true&&state.phase11_6dRealCloudExternalResidueCheck==='PASS','D4 zero residue certificate invalid');
  req(state.phase11_6dSecurityAdvisorPostD4Total===65&&state.phase11_6dPerformanceAdvisorPostD4Total===80&&state.phase11_6dUnindexedForeignKeysPostD4===28&&state.phase11_6dD4NewSecurityAdvisorFindings===0&&state.phase11_6dD4NewPerformanceAdvisorFindings===0,'D4 advisor certificate invalid');
  req(state.phase11_6dBudgetVerification==='PASS_FROZEN_CAPS_NO_INCREASE'&&state.phase11_6dInitialJavascriptBytes===430928&&state.phase11_6dTotalJavascriptBytes===759521&&state.phase11_6dCssBytes===179989&&state.phase11_6dJavascriptMarginBytes===479,'D3 frozen budget certificate invalid');
}

if(state.phase11_6dStatus==='IN_PROGRESS'){
  req(state.phase11_6dExitGatePassed===false,'open D cannot pre-pass exit gate');
  req(state.phase11_7Allowed===false&&state.successorStatus==='LOCKED','11.7 must remain locked while D is open');
  req(['PENDING_1280_430_390_360_320','PASS_1280_430_390_360_320'].includes(state.phase11_6dRealBrowserVerification),'D browser lifecycle invalid');
  req(['PENDING_FRESH_WORKSPACE_DURABLE_WRITE_PERMISSION_CONFLICT_RECOVERY_ZERO_RESIDUE','PASS'].includes(state.phase11_6dRealCloudVerification),'D Real Cloud lifecycle invalid');
  req(['PENDING','PASS'].includes(state.phase11_6dPagesVerification)&&['PENDING','PASS'].includes(state.phase11_6dLiveExternalVerification),'D deployed-live lifecycle invalid');
}else{
  req(state.phase11_6dExitGatePassed===true&&state.exitGatePassed===true,'closed D must close Phase 11.6 exit gate');
  req(state.phase11_6dUnifiedReadModelAdded===true&&state.phase11_6dUnifiedExperienceImplemented===true,'closed D requires implementation');
  req(state.phase11_6dRealBrowserVerification==='PASS_1280_430_390_360_320','closed D requires five-width browser proof');
  req(state.phase11_6dRealCloudVerification==='PASS','closed D requires Real Cloud proof');
  req(state.phase11_6dPagesVerification==='PASS'&&state.phase11_6dLiveExternalVerification==='PASS'&&state.phase11_6dPostMergeRecertification==='PASS','closed D requires deployed-live/post-merge proof');
  req(state.phase11_7Allowed===true&&['AUTHORIZED','AUTHORIZED_NEXT'].includes(state.successorStatus),'closed Phase 11.6 may authorize only 11.7');
}

for(const marker of [
  'one Arabic/RTL/mobile-first operational journey',
  'projection-only read model',
  'never persist its own business-state table',
  'route any action back to the existing owning surface/command',
  '**No new CSS file or CSS budget increase is allowed.**',
  '759488 total JS / 179989 CSS',
  '512 JS bytes / 11 CSS bytes',
  'Loading, empty, offline, failure, stale/conflict, revoked/expired and recovery states are explicit.',
  '1280 / 430 / 390 / 360 / 320',
  'Pages deployment',
  'Live External critical-path verification',
  'Phase 11.7 — Communication Zero-Escape Gate remains LOCKED'
])has(scope,marker,'D scope');

if(errors.length){
  console.error(`ENJAZ PHASE 11.6-D UNIFIED EXPERIENCE AUDIT FAIL (${errors.length})`);
  errors.forEach(e=>console.error(`- ${e}`));
  process.exitCode=1;
}else{
  console.log(state.phase11_6dStatus==='CLOSED'
    ? 'ENJAZ PHASE 11.6-D FINAL CERTIFICATION CONTRACT PASS — unified projection, Real Cloud, five-width browser, deployed-live and Phase 11.6 exit evidence are certified.'
    : 'ENJAZ PHASE 11.6-D OPENING/IMPLEMENTATION CONTRACT PASS — exact merged C lineage, projection-only UX, frozen budgets and Phase 11.7 lock are intact.');
}
