import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const json=p=>JSON.parse(read(p));
const state=json('docs/PHASE12_1_STATE.json');
const kickoff=read('docs/PHASE12_1_KICKOFF.md');
const predecessorClosure=read('docs/PHASE11_7_CLOSURE.md');
const phaseClosure=fs.existsSync(new URL('docs/PHASE12_1_CLOSURE.md',root))?read('docs/PHASE12_1_CLOSURE.md'):'';
const pkg=json('package.json');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

req(state.phase==='12.1'&&state.name==='Copilot Foundation','12.1 lifecycle identity invalid');
req(['IN_PROGRESS','CLOSED'].includes(state.status),'12.1 lifecycle status invalid');
req(state.mode==='COPILOT_FOUNDATION','12.1 mode drifted');
req(state.baseCommit==='8b8d8a678ce98e12b1c6ab170e571bf8f0185e04','12.1 must start from exact merged 11.7 closure');
req(state.predecessorPhase==='11.7'&&state.predecessorStatus==='CLOSED'&&state.predecessorClosureDecision==='PASS','12.1 requires certified 11.7 predecessor');
req(state.predecessorClosureMergeCommit==='8b8d8a678ce98e12b1c6ab170e571bf8f0185e04','11.7 closure lineage drifted');
req(state.successorPhase==='12.2'&&state.successorName==='Contextual Assistance','12.1 successor drifted');
req(state.businessMutationToolsAllowed===false,'12.1 cannot own mutation tools');
req(state.browserProviderCallsAllowed===false&&state.browserSecretCredentialsAllowed===false,'provider boundary escaped to browser');
req(state.rawPromptPersistenceAllowed===false&&state.rawModelOutputPersistenceAllowed===false,'raw AI content persistence is forbidden in foundation');
req(state.providerBackedAssistanceAllowed===false,'12.2 assistance cannot leak into 12.1');
req(state.requestIdempotencyRequired===true&&state.rateLimitPerMinute===20&&state.traceEvidencePrivate===true&&state.workspacePermissionRequired===true,'foundation safety contract drifted');
req(state.structuredOutputSchema==='enjaz.copilot.foundation.v1','structured output schema drifted');
req(state.clientUiAdded===false&&state.newClientCssAllowed===false,'12.1 must remain server-first');
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false,'frozen client budgets drifted');
if(state.databaseFoundationApplied===true||state.edgeFoundationDeployed===true){
 req(state.databaseFoundationApplied===true&&state.databaseFoundationMigrationPath==='database/migrations/phase_12_1_copilot_foundation.sql'&&state.databaseFoundationMigrationVersion==='20260918085157','12.1 DB foundation certificate invalid');
 req(state.edgeFoundationDeployed===true&&state.edgeFoundationSlug==='enjaz-copilot-foundation'&&state.edgeFoundationId==='491c6155-c658-4d2e-9082-1b34be44234c'&&state.edgeFoundationVersion===1&&state.edgeFoundationVerifyJwt===true,'12.1 Edge foundation certificate invalid');
 req(state.edgeFoundationDigest==='sha256:d9148cf4aa3ab9ecee78b797c84a5dd3545bb9bf4fe61ac52e59e3ace58ccbe9','12.1 Edge digest drifted');
 req(state.sourceGateVerification==='PASS'&&state.sourceGateRunId===35326765691&&state.sourceGateRunNumber===13&&state.sourceGateHead==='6c2b5b299d383159d4b1688838d2cac548da861c','12.1 source gate certificate invalid');
 req(state.realCloudVerification==='PASS'&&state.realCloudRunId===35326789332&&state.realCloudRunNumber===1&&state.realCloudHead==='8a9469011aef8917b0aede7972b82b25ab288c84','12.1 Real Cloud lineage invalid');
 req(state.realCloudArtifactId===10539376257&&state.realCloudArtifactDigest==='sha256:ed1c22fd81fd0ab5129ec18cf49dd9caef7e2d7138b6acb73b5e877972d8fcce','12.1 Real Cloud artifact invalid');
 for(const k of ['permissionMatrixVerification','rateLimitVerification','idempotencyVerification','providerFailureIsolationVerification','tracePrivacyVerification','zeroResidueVerification'])req(state[k]==='PASS',`12.1 foundation verification missing: ${k}`);
 req(state.securityAdvisorBaselineTotal===65&&state.securityAdvisorPostFoundationTotal===65&&state.newSecurityAdvisorFindings===0,'12.1 security advisor certificate invalid');
 req(state.performanceAdvisorBaselineTotal===75&&state.performanceAdvisorPostFoundationTotal===75&&state.unindexedForeignKeysBaseline===28&&state.unindexedForeignKeysPostFoundation===28&&state.newPerformanceAdvisorFindings===0,'12.1 performance advisor certificate invalid');
}

const deps={...(pkg.dependencies??{}),...(pkg.devDependencies??{})};
for(const name of Object.keys(deps))req(name!=='ai'&&!name.startsWith('@ai-sdk/'),'12.1 may not add AI SDK/provider packages before a provider-backed phase is authorized');

if(state.status==='IN_PROGRESS'){
 req(state.exitGatePassed===false&&state.phase12_2Allowed===false&&state.successorStatus==='LOCKED','12.2 must remain locked while 12.1 is open');
 req(state.providerConfigured===false&&state.providerBackedAssistanceAllowed===false,'provider-backed assistance cannot be active during opening foundation');
}else{
 req(state.exitGatePassed===true,'closed 12.1 requires exit gate');
 req(state.databaseFoundationApplied===true&&state.edgeFoundationDeployed===true,'closed 12.1 requires DB + Edge foundation');
 for(const k of ['realCloudVerification','permissionMatrixVerification','rateLimitVerification','idempotencyVerification','providerFailureIsolationVerification','tracePrivacyVerification','zeroResidueVerification','pullRequestGate','postMergeRecertification'])req(state[k]==='PASS',`closed 12.1 missing PASS: ${k}`);
 req(state.phase12_2Allowed===true&&state.successorStatus==='AUTHORIZED_NEXT','closed 12.1 may authorize only 12.2');
 req(state.closureDecision==='PASS'&&state.closureEvidence==='docs/PHASE12_1_CLOSURE.md'&&phaseClosure.length>0,'12.1 formal closure evidence missing');
 req(state.implementationPullRequest===197&&state.implementationHead==='6e989503a301368dc68192570a9816ebea5ad2d4'&&state.implementationMergeCommit==='450e87cfbdfe0a6ac00330efe0893941c5fdf946','12.1 implementation lineage invalid');
 req(state.pullRequestGateRunId===35327572351&&state.pullRequestGateRunNumber===20&&state.pullRequestQualityRunId===35327572883&&state.pullRequestMajorSystemsRunId===35327574302&&state.pullRequestRoadmapRunId===35327574197&&state.pullRequestConstitutionRunId===35327573076&&state.pullRequestRealBrowserRunId===35327572130&&state.pullRequestRealBrowserAttempt===2,'12.1 PR certificate invalid');
 req(state.pullRequestWorkflowCount===76&&state.pullRequestSuccessCount===75&&state.pullRequestSkippedCount===1&&state.pullRequestFailureCount===0,'12.1 PR inventory invalid');
 req(state.postMergeMainSha==='450e87cfbdfe0a6ac00330efe0893941c5fdf946'&&state.postMergePhaseGateRunId===35328193218&&state.postMergeQualityRunId===35328193531&&state.postMergeRealBrowserRunId===35328193444&&state.postMergeMajorSystemsRunId===35328193575&&state.postMergeRoadmapRunId===35328193412&&state.postMergeConstitutionRunId===35328193425,'12.1 exact-main critical run lineage invalid');
 req(state.realBrowserVerification==='PASS_EXACT_MAIN_CUMULATIVE'&&state.pagesVerification==='PASS'&&state.pagesRunId===35328300430&&state.pagesRunNumber===1545&&state.liveExternalVerification==='PASS'&&state.liveExternalRunId===35328354120&&state.liveExternalRunNumber===1221,'12.1 deployed-live certificate invalid');
 req(state.postMergeMainWorkflowCount===36&&state.postMergeMainSuccessCount===36&&state.postMergeMainFailureCount===0&&state.postMergeMainQueuedCount===0&&state.postMergeMainInProgressCount===0,'12.1 exact-main workflow inventory invalid');
 req(state.finalInitialJavascriptBytes===430928&&state.finalTotalJavascriptBytes===759521&&state.finalCssBytes===179989&&state.finalTotalJavascriptMarginBytes===479&&state.finalBudgetVerification==='PASS_FROZEN_CAPS_NO_CLIENT_DELTA','12.1 final frozen-budget certificate invalid');
}

for(const marker of [
 'Copilot is not a business authority',
 'must **not** store:',
 '`capabilities`',
 '`provider_probe`',
 'ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT',
 '20 new requests per rolling minute bucket',
 'No AI provider package is added to the browser bundle',
 'Provider outage/unconfigured state must return a structured failure',
 '**Phase 12.2 — Contextual Assistance remains LOCKED.**'
])has(kickoff,marker,'12.1 kickoff');

for(const marker of [
 'Status:** CLOSED / CERTIFIED',
 '21bce9a1a94c0ffcef90a5c9b1de4cecbd31b819',
 'Phase 12.1 — Copilot Foundation is now **AUTHORIZED_NEXT**'
])has(predecessorClosure,marker,'11.7 closure');

if(state.status==='CLOSED')for(const marker of [
 'Status:** CLOSED / CERTIFIED',
 '450e87cfbdfe0a6ac00330efe0893941c5fdf946',
 '35328193218',
 '35328193444',
 '35328300430',
 '35328354120',
 'workflows: **36**',
 'Phase 12.2 — Contextual Assistance is now **AUTHORIZED_NEXT**'
])has(phaseClosure,marker,'12.1 closure');

if(errors.length){
 console.error(`ENJAZ PHASE 12.1 COPILOT FOUNDATION AUDIT FAIL (${errors.length})`);
 errors.forEach(e=>console.error(`- ${e}`));
 process.exitCode=1;
}else{
 console.log(state.status==='CLOSED'
  ? 'ENJAZ PHASE 12.1 COPILOT FOUNDATION AUDIT PASS — server-only foundation, private evidence, rate limit, idempotency, provider isolation and post-merge certification are closed.'
  : 'ENJAZ PHASE 12.1 COPILOT FOUNDATION OPENING AUDIT PASS — exact 11.7 closure lineage, server-only boundary, frozen client budgets and 12.2 lock are intact.');
}
