import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const state=JSON.parse(read('docs/PHASE11_4_STATE.json'));
const closure=read('docs/PHASE11_4_CLOSURE.md');
const errors=[];
const req=(ok,message)=>{if(!ok)errors.push(message)};
const has=(text,needle,message)=>req(text.includes(needle),message);

req(state.phase==='11.4'&&state.systemId==='M4','Phase 11.4 / M4 identity drifted');
req(state.status==='CLOSED'&&state.mode==='CLOSED_CERTIFIED','Phase 11.4 closure lifecycle state missing');
req(state.currentSlice==='11.4-D','Phase 11.4 may close only from D');
req(state.phase11_4cExitGatePassed===true,'11.4-C exit evidence must remain passed');
req(state.phase11_4dExitGatePassed===true&&state.exitGatePassed===true,'11.4-D and overall exit gates must pass');
req(state.phase11_5Allowed===true&&state.nextPhase==='11.5'&&state.successorStatus==='AUTHORIZED_NEXT','Phase 11.5 authorization missing');
req(state.postMergeRecertification==='PASS_ZERO_FAILED_ZERO_RUNNING_ZERO_QUEUED','exact-main recertification proof missing');
req(state.closureEvidence==='docs/PHASE11_4_CLOSURE.md'&&fs.existsSync(state.closureEvidence),'formal closure evidence missing');

req(state.implementationPullRequestNumber===179,'implementation PR lineage drifted');
req(state.implementationHeadCommit==='eb788ba599b12ed7f2946a694a48be0ec4489c91','implementation head drifted');
req(state.implementationMergeCommit==='96d35188ddd0c810859d8c92daae6adeb124b01f','implementation merge drifted');
req(state.iaCorrectionPullRequestNumber===180,'IA correction PR lineage drifted');
req(state.iaCorrectionHeadCommit==='8657d979b00d3c980c4ccbb851a4032f5e14de8f','IA correction head drifted');
req(state.iaCorrectionMergeCommit==='8d0be4ede228954f06c32833c524d2df7f737b39','IA correction merge drifted');
req(state.certifiedMainCommit==='8d0be4ede228954f06c32833c524d2df7f737b39','certified main SHA drifted');
req(state.currentSliceBaseCommit===state.certifiedMainCommit,'closed state must pin the exact certified main SHA');

req(state.preMergeM4GateRunId===35008898848,'certified M4 run id drifted');
req(state.preMergeBrowserGateRunId===35008898812,'certified unified browser run id drifted');
req(state.preMergeQualityGateRunId===35008899115,'certified quality run id drifted');
req(state.preMergeRealCloudArabicPdfCertificateRunId===35008899363,'certified real-cloud PDF run id drifted');
req(state.iaCorrectionGovernanceRunId===35009767300,'IA governance run id drifted');
req(state.iaCorrectionQualityRunId===35009766664,'IA quality run id drifted');
req(state.exactMainQualityRunId===35010090621,'exact-main quality run id drifted');
req(state.exactMainUiGovernanceRunId===35010090840,'exact-main UI governance run id drifted');
req(state.exactMainBrowserRunId===35010090901,'exact-main browser run id drifted');

req(state.providerConfiguredIntegrationVerification==='PENDING_NOT_CONFIGURED','configured-provider state must remain truthful');
req(state.configuredProviderAccountCount===0&&state.providerAccountsConfigured===false,'provider account count/configuration state drifted');
req(state.providerIngressImplemented===true&&state.providerEgressImplemented===true,'provider gateway implementation evidence missing');
req(state.conversationExperienceImplemented===true&&state.unifiedConversationTimelineImplemented===true,'unified communications experience evidence missing');
req(state.authenticatedStaffDispatchBridgeImplemented===true,'staff dispatch bridge evidence missing');
req(state.freshWorkspaceBootstrapVerification==='PASS_AUTHENTICATED_EMPTY_HUB_ZERO_RESIDUE','fresh-workspace verification missing');
req(state.realBrowserMobileVerification==='PASS_CHROMIUM_1280_430_390_360_320','multi-width browser verification missing');
req(state.knownCriticalBlockers===0&&state.knownHighBlockers===0&&state.knownFunctionalBlockers===0,'closure blocker ledger must be zero');
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false,'frozen budgets drifted');

for(const marker of [
  'Status:** CLOSED / CERTIFIED',
  'PR: **#179**',
  'PR: **#180**',
  '8d0be4ede228954f06c32833c524d2df7f737b39',
  '0 failed / 0 running / 0 queued',
  'PENDING_NOT_CONFIGURED',
  'Phase 11.4 exit gate: **PASS**',
]) has(closure,marker,`closure evidence missing marker: ${marker}`);

if(errors.length){
  console.error(`ENJAZ PHASE 11.4 CLOSURE AUDIT FAIL (${errors.length})`);
  for(const error of errors)console.error(`- ${error}`);
  process.exit(1);
}
console.log('ENJAZ PHASE 11.4 CLOSURE AUDIT PASS — exact-main lineage, zero-active recertification, truthful provider configuration boundary and Phase 11.5 authorization are certified.');
