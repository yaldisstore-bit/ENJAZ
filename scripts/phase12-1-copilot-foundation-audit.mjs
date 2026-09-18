import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const json=p=>JSON.parse(read(p));
const state=json('docs/PHASE12_1_STATE.json');
const kickoff=read('docs/PHASE12_1_KICKOFF.md');
const closure=read('docs/PHASE11_7_CLOSURE.md');
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
])has(closure,marker,'11.7 closure');

if(errors.length){
 console.error(`ENJAZ PHASE 12.1 COPILOT FOUNDATION AUDIT FAIL (${errors.length})`);
 errors.forEach(e=>console.error(`- ${e}`));
 process.exitCode=1;
}else{
 console.log(state.status==='CLOSED'
  ? 'ENJAZ PHASE 12.1 COPILOT FOUNDATION AUDIT PASS — server-only foundation, private evidence, rate limit, idempotency, provider isolation and post-merge certification are closed.'
  : 'ENJAZ PHASE 12.1 COPILOT FOUNDATION OPENING AUDIT PASS — exact 11.7 closure lineage, server-only boundary, frozen client budgets and 12.2 lock are intact.');
}
