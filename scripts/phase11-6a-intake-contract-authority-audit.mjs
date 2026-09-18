import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const json=(p)=>JSON.parse(read(p));
const state=json('docs/PHASE11_6_STATE.json');
const kickoff=read('docs/PHASE11_6_KICKOFF.md');
const authority=read('src/features/intake-contract-communication/intakeContractCommunicationAuthority.ts');
const tests=read('tests/intakeContractCommunicationAuthority.test.ts');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');
const major=json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const predecessor=json('docs/PHASE11_5_STATE.json');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

req(predecessor.status==='CLOSED'&&predecessor.exitGatePassed===true&&predecessor.phase11_6Allowed===true,'Phase 11.6 requires formally closed/authorized Phase 11.5');
req(predecessor.nextPhase==='11.6'&&['AUTHORIZED','AUTHORIZED_NEXT'].includes(predecessor.successorStatus),'Phase 11.5 successor must authorize 11.6');
req(state.phase==='11.6'&&['IN_PROGRESS','CLOSED'].includes(state.status),'Phase 11.6 lifecycle status invalid');
req(state.baseCommit==='14a670e8dd2d892a7039fd7a52437a8c6274aa2a','Phase 11.6 base must remain formal Phase 11.5 closure SHA');

if(state.currentSlice==='11.6-A'){
  req(state.mode==='AUTHORITY_FREEZE','Open 11.6-A must remain in authority-freeze mode');
  req(state.exitGatePassed===false,'Open 11.6-A cannot pre-pass the Phase 11.6 exit gate');
}else{
  req(['11.6-B','11.6-C','11.6-D'].includes(state.currentSlice),'Only a governed Phase 11.6 successor slice may follow 11.6-A');
  req(state.phase11_6aStatus==='CLOSED'&&state.phase11_6aExitGatePassed===true,'Successor slice requires formally closed 11.6-A evidence');
  req(state.phase11_6aMergeCommit==='d44b27411f3b994eb79f9e75ea0f8c15984c0412','11.6-A canonical merge lineage drifted');
  req(state.phase11_6aPostMergeRecertification==='PASS_EXACT_MAIN_SHA','Successor slice requires exact-main 11.6-A recertification');
}
if(state.status==='IN_PROGRESS'){
  req(state.phase11_7Allowed===false&&state.successorStatus==='LOCKED','Phase 11.7 must remain locked while Phase 11.6 is IN_PROGRESS');
}else{
  req(state.exitGatePassed===true&&state.phase11_6dStatus==='CLOSED'&&state.phase11_6dExitGatePassed===true,'Phase 11.6 CLOSED requires certified D exit');
  req(state.phase11_7Allowed===true&&state.successorStatus==='AUTHORIZED_NEXT','Phase 11.6 closure may authorize only Phase 11.7');
}
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false,'Phase 11.6 frozen budgets drifted');

for(const [id,name] of [['M17','Smart Intake Forms & Secure Submission Links'],['M16','Engagements, Contracts & Retainers']]){
  const s=major.systems.find((x)=>x.id===id);
  req(s?.name===name&&s?.status==='ACTIVE'&&s?.closureEvidence===null,`${id} must remain ACTIVE with no premature global closure evidence`);
}
req(major.systems.find((x)=>x.id==='M17')?.anchors?.join(',')==='8,11','M17 anchors must remain 8,11');
req(major.systems.find((x)=>x.id==='M16')?.anchors?.join(',')==='7,10,11','M16 anchors must remain 7,10,11');

for(const marker of [
  'intake_forms','intake_links','intake_submissions','crm_leads','crm_conversion_audits','commercial_engagements',
  'engagement_contract_revisions','documents_and_document_versions','renewals','client_portal_requests',
  'client_portal_document_approval_targets','client_portal_document_approval_responses','client_portal_messages',
  'communications','in_app_notifications','notification_deliveries','audit_events'
]) has(authority,marker,'authority contract');

for(const marker of [
  'publicIntakeMayBecomeAuthoritativeWithoutReview: false',
  'intakeFollowupMayCreateShadowSubmission: false',
  'clientApprovalMayMutateContractTruthDirectly: false',
  'communicationMayBecomeContractTruth: false',
  'notificationMayBecomeCommunicationTruth: false',
  'renewalReminderMayBecomeRenewalTruth: false',
  'contractReminderMayCreateShadowRenewal: false',
  'crossWorkspaceReferencesAllowed: false',
  'expiredOrRevokedIntakeLinkMayBeResurrected: false',
  'terminalContractRevisionMayBeSilentlyReopened: false',
  "boundary:'phase11.6-domain-command'|'direct-browser-table-write'",
  'ENJAZ_116_GOVERNED_COMMAND_REQUIRED','ENJAZ_116_CROSS_WORKSPACE_REFERENCE','ENJAZ_116_STALE_VERSION','ENJAZ_116_IDEMPOTENCY_REQUIRED'
]) has(authority,marker,'authority contract');

for(const marker of [
  'public intake remains non-authoritative until governed review',
  'client approval is evidence only and cannot mutate canonical contract state directly',
  'browser writes are rejected outside the Phase 11.6 domain boundary',
  'governed bridge requires auth, workspace isolation, fresh version and retry idempotency',
  'contract renewal attention is derived only from an effective canonical contract with an existing renewal authority',
  'client decision can feed a contract command only through the existing approval permission and canonical artifact binding'
]) has(tests,marker,'authority tests');

for(const marker of [
  'Phase 11.6 — Smart Intake & Contract Communication — M17 + M16',
  'Public intake submissions remain non-authoritative external input',
  '`engagement_contract_revisions` remains M16 canonical contract-revision authority',
  '`renewals` remains the canonical renewal fact',
  '`communications` remains M4 canonical business-communication truth',
  'Phase 11.7 — Communication Zero-Escape Gate remains LOCKED'
]) has(kickoff,marker,'kickoff');

has(roadmap,'## 11.6 — Smart Intake & Contract Communication — M17 + M16','roadmap');
has(roadmap,'Secure submission follow-up, client approvals, contract/retainer renewal reminders and communication evidence.','roadmap');

if(errors.length){
  console.error(`ENJAZ PHASE 11.6-A AUTHORITY AUDIT FAIL (${errors.length})`);
  errors.forEach((e)=>console.error(`- ${e}`));
  process.exitCode=1;
}else console.log(state.status==='CLOSED'?'ENJAZ PHASE 11.6-A AUTHORITY AUDIT PASS — A remains preserved after certified Phase 11.6 closure; canonical authorities remain unchanged and 11.7 is AUTHORIZED_NEXT.':'ENJAZ PHASE 11.6-A AUTHORITY AUDIT PASS — A is either the active authority freeze or a preserved exact-main predecessor; M17/M16/M3/M4/M10 authorities remain canonical and 11.7 stays locked.');
