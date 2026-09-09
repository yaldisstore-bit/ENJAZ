import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const readme = read('README.md');
const major = JSON.parse(read('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json'));
const phase55 = JSON.parse(read('docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json'));
const phase61 = JSON.parse(read('docs/PHASE6_1_COMPANIES_STATE.json'));
const phase62 = JSON.parse(read('docs/PHASE6_2_LAWYERS_CONTACTS_STATE.json'));
const phase63 = JSON.parse(read('docs/PHASE6_3_COMPANY_LAWYER_360_STATE.json'));
const phase64 = JSON.parse(read('docs/PHASE6_4_COMPANIES_PEOPLE_DESTRUCTION_STATE.json'));
const phase71 = JSON.parse(read('docs/PHASE7_1_FINANCIAL_LEDGER_STATE.json'));
const phase72 = JSON.parse(read('docs/PHASE7_2_STATE.json'));
const phase73 = JSON.parse(read('docs/PHASE7_3_STATE.json'));
const phase74 = JSON.parse(read('docs/PHASE7_4_STATE.json'));
const phase75 = JSON.parse(read('docs/PHASE7_5_STATE.json'));
const phase81 = JSON.parse(read('docs/PHASE8_1_STATE.json'));
const errors = [];

const requireMarker = (source, marker, label) => {
  if (!source.includes(marker)) errors.push(`${label} missing marker: ${marker}`);
};
const forbidMarker = (source, marker, label) => {
  if (source.includes(marker)) errors.push(`${label} contains stale/forbidden marker: ${marker}`);
};
const checkOrder = (items, label) => {
  let last = -1;
  for (const item of items) {
    const pos = roadmap.indexOf(item);
    if (pos < 0) errors.push(`${label}: missing ${item}`);
    else if (pos <= last) errors.push(`${label}: out of order ${item}`);
    last = Math.max(last, pos);
  }
};

const phases = [
  '# Phase 0 — Product Freeze & Migration Contract',
  '# Phase 1 — Engineering Foundation',
  '# Phase 2 — ENJAZ Design System 1.0',
  '# Phase 3 — Application Shell & Navigation',
  '# Phase 4 — Home, Daily Work & Executive Overview',
  '# Phase 5 — Transactions Core',
  '# Phase 6 — Companies & People',
  '# Phase 7 — Finance',
  '# Phase 8 — Workflow, Automation & Operations',
  '# Phase 9 — Risk, Governance & Intelligence',
  '# Phase 10 — Documents, Vault, OCR & Reports',
  '# Phase 11 — Notifications, Follow-ups, Client & Communications',
  '# Phase 12 — ENJAZ AI & Knowledge Agent',
  '# Phase 13 — Legacy Import & Reconciliation',
  '# Phase 14 — Full-system Integration, API & Real E2E',
  '# Phase 15 — Performance, Security, Reliability & Enterprise Controls',
  '# Phase 16 — Final Visual & UX Destruction',
  '# Phase 17 — Release Candidate & Production Validation',
  '# Phase 18 — Final Delivery & Handoff',
];
checkOrder(phases, 'delivery phases');

checkOrder([
  '## 2.1 — Visual Identity Foundation',
  '## 2.2 — Design Tokens',
  '## 2.3 — Typography & RTL System',
  '## 2.4 — Core Component System',
  '## 2.5 — Motion & Interaction System',
  '## 2.6 — Mobile & Android Hardening',
  '## 2.7 — Premium Pattern Library',
  '## 2.8 — Visual Destruction & Quality Gate',
], 'Phase 2 sequence');
checkOrder([
  '## 5.1 — Transaction List & Search',
  '## 5.2 — Transaction Create/Edit',
  '## 5.3 — Transaction Details / 360°',
  '## 5.4 — Archive/Restore/Lifecycle',
  '## 5.5 — Transaction Destruction Gate',
], 'Phase 5 sequence');
checkOrder([
  '## 6.1 — Companies',
  '## 6.2 — Lawyers / Contacts',
  '## 6.3 — Company / Lawyer 360°',
  '## 6.4 — Companies & People Destruction Gate',
], 'Phase 6 sequence');
checkOrder([
  '## 7.1 — Financial Ledger & Summary',
  '## 7.2 — Payments & Receipts',
  '## 7.3 — Financial Intelligence',
  '## 7.4 — Financial Reports',
  '## 7.5 — Finance Destruction & Reconciliation Gate',
], 'Phase 7 sequence');
checkOrder([
  '## 8.1 — Workflow Engine & Government Procedure OS — M1',
  '## 8.2 — Automation Engine',
  '## 8.3 — Operations Center + Field Operations — M5',
  '## 8.4 — CRM, Service Catalog & Smart Intake — M6 + M17',
  '## 8.5 — Multi-Branch / Departments / Teams — M15 foundation',
  '## 8.6 — Global Command Center',
  '## 8.7 — Operations Zero-Escape Destruction Gate',
], 'Phase 8 sequence');

for (const marker of [
  'ENJAZ 1.0 — Delivered',
  'Zero-Escape closure law for M1–M18',
  'Current position — canonical reconciled state',
  'Major-system anchor matrix',
  'Historical predecessor transition (satisfied): **Next: Phase 8.1 — Workflow Engine & Government Procedure OS — M1**',
  '**Phase 8.1 — Workflow Engine & Government Procedure OS — M1 ✅ CLOSED + post-merge recertified**',
  '**M1 — Government Procedure Operating System 🟠 `CLOSURE_CANDIDATE`; 8.1 implementation anchor complete, overall closure remains locked behind Phase 8.7 individual Zero-Escape evidence**',
  '**Next: Phase 8.2 — Automation Engine**',
  '**Phase 8.7 — Operations Zero-Escape Destruction Gate ✅ CLOSED + post-merge recertified**',
  '**Phase 8 — Workflow, Automation & Operations ✅ CLOSED + post-merge recertified**',
  '**Next: Phase 9.1 — Smart Risk Engine**',
  'Phase 7.1 — Financial Ledger & Summary ✅ CLOSED + post-merge recertified',
  'Phase 7.2 — Payments & Receipts ✅ CLOSED + post-merge recertified',
  'Phase 7.3 — Financial Intelligence ✅ CLOSED + post-merge recertified',
  'Phase 7.4 — Financial Reports ✅ CLOSED + post-merge recertified',
  'docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json',
  'docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md',
  'Gate Escape',
]) requireMarker(roadmap, marker, 'roadmap');

for (const stale of [
  '**Next: Phase 6.1 — Companies**',
  '**Next: Phase 7.1 — Financial Ledger & Summary**',
  '**Next: Phase 7.2 — Payments & Receipts**',
  '**Next: Phase 7.3 — Financial Intelligence**',
  '**Next: Phase 7.4 — Financial Reports**',
  '**Next: Phase 7.5 — Finance Destruction & Reconciliation Gate**',
  '**M1 — Government Procedure Operating System ✅ CLOSED under Zero-Escape evidence**',
  '**Phase 8.1 and M1 ✅ CLOSED + post-merge recertified**',
  'Phase 8.2 is the only newly authorized implementation stage.',
]) forbidMarker(roadmap, stale, 'roadmap');

if (major.schemaVersion !== 2 || major.status !== 'GOVERNING_AMENDMENT') errors.push('major-system registry must remain governing amendment schema v2');
if (major.majorSystemCount !== 18 || major.systems?.length !== 18) errors.push('major-system registry must contain exactly M1-M18');
if (major.closureGateProfile !== 'ZERO_ESCAPE_V1' || major.closureAuthority !== 'deployed-merged-sha') errors.push('major-system closure authority drifted');
if (major.closedPhasesReopened !== false || major.phaseOrderChanged !== false) errors.push('major-system amendment must not silently reopen/reorder historical phases');

const expectedSystems = new Map([
  ['M1', 'Government Procedure Operating System'],
  ['M2', 'Corporate Governance & Ownership Engine'],
  ['M3', 'Client Portal'],
  ['M4', 'Omnichannel Communications Hub'],
  ['M5', 'ENJAZ Field Operations / Runner Mode'],
  ['M6', 'Service Catalog, CRM & Commercial Intake'],
  ['M7', 'Document Factory & Official Form Engine'],
  ['M8', 'Regulatory / Knowledge Base Engine'],
  ['M9', 'Agentic ENJAZ Copilot'],
  ['M10', 'Scheduling, Appointments & Deadline Engine'],
  ['M11', 'Integration Platform / API / Webhooks'],
  ['M12', 'Compliance, Audit & Evidence Center'],
  ['M13', 'Business Intelligence & Forecasting Center'],
  ['M14', 'Backup, Restore & Workspace Portability'],
  ['M15', 'Multi-Branch, Departments & Team Operating Model'],
  ['M16', 'Engagements, Contracts & Retainers'],
  ['M17', 'Smart Intake Forms & Secure Submission Links'],
  ['M18', 'Process Mining & Predictive Operations'],
]);
for (const [id, name] of expectedSystems) {
  const system = major.systems.find((candidate) => candidate.id === id);
  if (!system || system.name !== name) errors.push(`major-system registry drifted: ${id}`);
  requireMarker(roadmap, `${id} | ${name}`, 'roadmap anchor matrix');
  requireMarker(readme, `**${id} — ${name}**`, 'README major systems');
}

const m1 = major.systems.find((system) => system.id === 'M1');
if (m1?.status !== 'CLOSURE_CANDIDATE' || m1?.closureEvidence !== 'docs/PHASE8_1_CLOSURE.md') {
  errors.push('M1 must remain CLOSURE_CANDIDATE with Phase 8.1 anchor evidence until Phase 8.7 destruction closure');
}

const assertClosed = (label, state) => {
  if (state.status !== 'CLOSED' || state.exitGatePassed !== true || state.unresolvedDefectCount !== 0) {
    errors.push(`${label} must remain CLOSED with exitGatePassed and zero unresolved defects`);
  }
};
assertClosed('Phase 5.5', phase55);
assertClosed('Phase 6.1', phase61);
assertClosed('Phase 6.2', phase62);
assertClosed('Phase 6.3', phase63);
assertClosed('Phase 6.4', phase64);
assertClosed('Phase 7.1', phase71);
assertClosed('Phase 7.2', phase72);
assertClosed('Phase 7.3', phase73);
assertClosed('Phase 7.4', phase74);
assertClosed('Phase 7.5', phase75);
assertClosed('Phase 8.1', phase81);

if (phase55.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 5.5 recertification drifted');
if (phase61.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 6.1 recertification drifted');
if (phase62.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 6.2 recertification drifted');
if (phase63.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 6.3 recertification drifted');
if (phase64.postMergeRecertification?.status !== 'COMPLETE' || phase64.phase7Allowed !== true || phase64.nextPhase !== '7.1') errors.push('Phase 6.4 historical transition evidence drifted');

if (phase71.implementationHead !== '0ac2174272d7ac0e5f79020ed78ad3872177af31') errors.push('Phase 7.1 certified implementation head drifted');
if (phase71.preClosure?.workflowCount !== 24 || phase71.preClosure?.successCount !== 24 || phase71.preClosure?.failureCount !== 0) errors.push('Phase 7.1 must preserve 24/24 pre-closure evidence');
if (phase71.preClosure?.productionJavaScriptBytes !== 628924 || phase71.productionJavaScriptBudget !== 670000) errors.push('Phase 7.1 production budget evidence drifted');
if (phase71.mergeCommit !== '3d4043c8e5d6784f327ff8ac9879402b7d933422') errors.push('Phase 7.1 canonical merge commit drifted');
if (phase71.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 7.1 post-merge recertification must be COMPLETE');
if (phase71.postMergeRecertification?.mainCommit !== '3d4043c8e5d6784f327ff8ac9879402b7d933422') errors.push('Phase 7.1 recertified main commit drifted');
if (phase71.postMergeRecertification?.workflowCount !== 9 || phase71.postMergeRecertification?.successCount !== 9 || phase71.postMergeRecertification?.failureCount !== 0 || phase71.postMergeRecertification?.inProgressCount !== 0) errors.push('Phase 7.1 must preserve 9/9 canonical recertification evidence');
if (phase71.phase7_2Allowed !== true || phase71.nextPhase !== '7.2') errors.push('Phase 7.1 historical transition evidence must authorize 7.2');
if (phase71.postMergeEvidence !== 'docs/PHASE7_1_POSTMERGE_RECERTIFICATION.md') errors.push('Phase 7.1 post-merge evidence pointer drifted');

if (phase72.phase !== '7.2') errors.push('Phase 7.2 state identity drifted');
if (phase72.implementationHead !== 'da4800ddf4df2ecca49b01d1b40db0546fd70a13') errors.push('Phase 7.2 certified implementation head drifted');
if (phase72.preClosure?.workflowCount !== 26 || phase72.preClosure?.successCount !== 26 || phase72.preClosure?.failureCount !== 0 || phase72.preClosure?.inProgressCount !== 0 || phase72.preClosure?.queuedCount !== 0) errors.push('Phase 7.2 must preserve 26/26 pre-closure evidence');
if (phase72.preClosure?.realChromium !== 'PASS') errors.push('Phase 7.2 Real Chromium closure evidence drifted');
if (phase72.mergeCommit !== '192711cfcc36bf041ab0e576f8ab3899dc63b7a6') errors.push('Phase 7.2 canonical merge commit drifted');
if (phase72.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 7.2 post-merge recertification must be COMPLETE');
if (phase72.postMergeRecertification?.mainCommit !== '192711cfcc36bf041ab0e576f8ab3899dc63b7a6') errors.push('Phase 7.2 recertified main commit drifted');
if (phase72.postMergeRecertification?.workflowCount !== 11 || phase72.postMergeRecertification?.successCount !== 11 || phase72.postMergeRecertification?.failureCount !== 0 || phase72.postMergeRecertification?.inProgressCount !== 0 || phase72.postMergeRecertification?.queuedCount !== 0 || phase72.postMergeRecertification?.cancelledCount !== 0) errors.push('Phase 7.2 must preserve 11/11 canonical recertification evidence');
if (phase72.postMergeRecertification?.pagesRunId !== 34084227883 || phase72.postMergeRecertification?.pagesBuild !== 'SUCCESS' || phase72.postMergeRecertification?.pagesDeploy !== 'SUCCESS') errors.push('Phase 7.2 Pages deployment evidence drifted');
if (phase72.postMergeRecertification?.liveExternalRunId !== 34084261408 || phase72.postMergeRecertification?.liveExternal !== 'SUCCESS' || phase72.postMergeRecertification?.publishedApplicationAttack !== 'SUCCESS') errors.push('Phase 7.2 deployed-live evidence drifted');
if (phase72.realSupabaseAuthenticatedProbe !== 'PASSED') errors.push('Phase 7.2 real Supabase authenticated probe evidence drifted');
if (phase72.m16FinanceCommercialAnchor !== 'COMPLETE' || phase72.m16OverallSystemClosed !== false) errors.push('Phase 7.2 must close only the M16 finance anchor, not the entire M16 system');
if (phase72.phase7_3Allowed !== true || phase72.nextPhase !== '7.3') errors.push('Phase 7.2 historical transition evidence must authorize 7.3');
if (phase72.closureEvidence !== 'docs/PHASE7_2_CLOSURE.md' || phase72.postMergeEvidence !== 'docs/PHASE7_2_POSTMERGE_RECERTIFICATION.md') errors.push('Phase 7.2 closure evidence pointers drifted');
if (phase72.criticalDefectCount !== 0 || phase72.highDefectCount !== 0 || phase72.functionalBlockerCount !== 0) errors.push('Phase 7.2 defect gate must remain zero');

if (phase73.phase !== '7.3') errors.push('Phase 7.3 state identity drifted');
if (phase73.implementationHead !== 'b99a39d9b4553604b49528faffdd798104042ffb') errors.push('Phase 7.3 certified implementation head drifted');
if (phase73.preClosure?.workflowCount !== 27 || phase73.preClosure?.successCount !== 27 || phase73.preClosure?.failureCount !== 0 || phase73.preClosure?.inProgressCount !== 0 || phase73.preClosure?.queuedCount !== 0 || phase73.preClosure?.realChromium !== 'PASS') errors.push('Phase 7.3 must preserve 27/27 pre-closure evidence and Real Chromium PASS');
if (phase73.mergeCommit !== 'a1c34888732270bea5795ac59603345c190b8fd7') errors.push('Phase 7.3 canonical recertified merge commit drifted');
if (phase73.postMergeRecertification?.status !== 'COMPLETE' || phase73.postMergeRecertification?.mainCommit !== 'a1c34888732270bea5795ac59603345c190b8fd7') errors.push('Phase 7.3 post-merge recertification must remain COMPLETE on the exact canonical SHA');
if (phase73.postMergeRecertification?.workflowCount !== 12 || phase73.postMergeRecertification?.successCount !== 12 || phase73.postMergeRecertification?.failureCount !== 0 || phase73.postMergeRecertification?.inProgressCount !== 0 || phase73.postMergeRecertification?.queuedCount !== 0 || phase73.postMergeRecertification?.cancelledCount !== 0) errors.push('Phase 7.3 must preserve 12/12 canonical recertification evidence');
if (phase73.postMergeRecertification?.phaseGateRunId !== 34092284324 || phase73.postMergeRecertification?.pagesPreviewRunId !== 34092324197 || phase73.postMergeRecertification?.pagesPreview !== 'SUCCESS') errors.push('Phase 7.3 gate/Pages Preview evidence drifted');
if (phase73.postMergeRecertification?.pagesDeploymentRunId !== 34092283834 || phase73.postMergeRecertification?.pagesBuild !== 'SUCCESS' || phase73.postMergeRecertification?.pagesDeploy !== 'SUCCESS') errors.push('Phase 7.3 Pages deployment evidence drifted');
if (phase73.postMergeRecertification?.realBrowserRunId !== 34092284382 || phase73.postMergeRecertification?.realBrowser !== 'SUCCESS') errors.push('Phase 7.3 Real Browser evidence drifted');
if (phase73.postMergeRecertification?.liveExternalRunId !== 34092363985 || phase73.postMergeRecertification?.liveExternal !== 'SUCCESS' || phase73.postMergeRecertification?.publishedApplicationAttack !== 'SUCCESS') errors.push('Phase 7.3 deployed-live evidence drifted');
if (phase73.m13FinanceAnchor !== 'COMPLETE' || phase73.m13OverallSystemClosed !== false) errors.push('Phase 7.3 must close only the M13 finance anchor, not the entire M13 system');
if (phase73.phase7_4Allowed !== true || phase73.nextPhase !== '7.4') errors.push('Phase 7.3 historical transition evidence must authorize 7.4');
if (phase73.closureEvidence !== 'docs/PHASE7_3_CLOSURE.md' || phase73.postMergeEvidence !== 'docs/PHASE7_3_POSTMERGE_RECERTIFICATION.md') errors.push('Phase 7.3 closure evidence pointers drifted');
if (phase73.criticalDefectCount !== 0 || phase73.highDefectCount !== 0 || phase73.functionalBlockerCount !== 0) errors.push('Phase 7.3 defect gate must remain zero');

if (phase74.phase !== '7.4') errors.push('Phase 7.4 state identity drifted');
if (phase74.implementationHead !== '7dba0c48e5782df5093deae57c6f10677b32fbce' || phase74.pullRequest !== 103) errors.push('Phase 7.4 certified implementation/PR evidence drifted');
if (phase74.preClosure?.workflowCount !== 28 || phase74.preClosure?.successCount !== 28 || phase74.preClosure?.failureCount !== 0 || phase74.preClosure?.inProgressCount !== 0 || phase74.preClosure?.queuedCount !== 0 || phase74.preClosure?.realChromium !== 'PASS') errors.push('Phase 7.4 must preserve 28/28 pre-closure evidence and Real Chromium PASS');
if (phase74.preClosure?.dedicatedGateRunId !== 34096775256) errors.push('Phase 7.4 dedicated pre-merge gate evidence drifted');
if (phase74.preClosure?.productionJavaScriptBytes !== 588519 || phase74.preClosure?.productionJavaScriptBudget !== 670000) errors.push('Phase 7.4 production budget evidence drifted');
if (phase74.mergeCommit !== 'd4ad3844dc7ae7a1895e2fddfdb06b2ee0a01858') errors.push('Phase 7.4 canonical merge commit drifted');
if (phase74.postMergeRecertification?.status !== 'COMPLETE' || phase74.postMergeRecertification?.mainCommit !== 'd4ad3844dc7ae7a1895e2fddfdb06b2ee0a01858') errors.push('Phase 7.4 post-merge recertification must remain COMPLETE on the exact canonical SHA');
if (phase74.postMergeRecertification?.workflowCount !== 10 || phase74.postMergeRecertification?.successCount !== 10 || phase74.postMergeRecertification?.failureCount !== 0 || phase74.postMergeRecertification?.inProgressCount !== 0 || phase74.postMergeRecertification?.queuedCount !== 0 || phase74.postMergeRecertification?.cancelledCount !== 0) errors.push('Phase 7.4 must preserve 10/10 canonical main push recertification evidence');
if (phase74.postMergeRecertification?.phaseGateRunId !== 34097286172) errors.push('Phase 7.4 post-merge phase gate evidence drifted');
if (phase74.postMergeRecertification?.pagesPreviewRunId !== 34097333825 || phase74.postMergeRecertification?.pagesPreview !== 'SUCCESS' || phase74.postMergeRecertification?.pagesBuild !== 'SUCCESS' || phase74.postMergeRecertification?.pagesDeploy !== 'SUCCESS') errors.push('Phase 7.4 Pages evidence drifted');
if (phase74.postMergeRecertification?.realBrowserRunId !== 34097286214 || phase74.postMergeRecertification?.realBrowser !== 'SUCCESS') errors.push('Phase 7.4 Real Browser evidence drifted');
if (phase74.postMergeRecertification?.liveExternalRunId !== 34097378705 || phase74.postMergeRecertification?.liveExternal !== 'SUCCESS' || phase74.postMergeRecertification?.publishedApplicationAttack !== 'SUCCESS') errors.push('Phase 7.4 deployed-live evidence drifted');
if (phase74.m16ReportingHook !== 'COMPLETE' || phase74.m16OverallSystemClosed !== false) errors.push('Phase 7.4 must close only the M16 reporting hook, not the entire M16 system');
if (phase74.phase7_5Allowed !== true || phase74.nextPhase !== '7.5') errors.push('Phase 7.5 must be the only next stage authorized by Phase 7.4');
if (phase74.closureEvidence !== 'docs/PHASE7_4_CLOSURE.md' || phase74.postMergeEvidence !== 'docs/PHASE7_4_POSTMERGE_RECERTIFICATION.md') errors.push('Phase 7.4 closure evidence pointers drifted');
if (phase74.criticalDefectCount !== 0 || phase74.highDefectCount !== 0 || phase74.functionalBlockerCount !== 0) errors.push('Phase 7.4 defect gate must remain zero');

if (phase75.phase !== '7.5') errors.push('Phase 7.5 state identity drifted');
if (phase75.implementationHead !== 'c479af8341b9699baf639deabbd61d356ea01c4e' || phase75.pullRequest !== 105) errors.push('Phase 7.5 certified implementation/PR evidence drifted');
if (phase75.preClosure?.workflowCount !== 30 || phase75.preClosure?.successCount !== 30 || phase75.preClosure?.failureCount !== 0 || phase75.preClosure?.inProgressCount !== 0 || phase75.preClosure?.queuedCount !== 0 || phase75.preClosure?.cancelledCount !== 0 || phase75.preClosure?.realChromium !== 'PASS') errors.push('Phase 7.5 must preserve 30/30 pre-closure evidence and Real Chromium PASS');
if (phase75.preClosure?.dedicatedGateRunId !== 34103255390 || phase75.preClosure?.realBrowserRunId !== 34103255198) errors.push('Phase 7.5 pre-merge gate/browser evidence drifted');
if (phase75.preClosure?.productionJavaScriptBytes !== 588688 || phase75.preClosure?.productionJavaScriptBudget !== 670000) errors.push('Phase 7.5 production budget evidence drifted');
if (phase75.realCloudVerification?.status !== 'COMPLETE' || phase75.realCloudVerification?.authenticatedRoleSwitch !== 'PASS' || phase75.realCloudVerification?.exactHugeValue !== '9999999999999999.99' || phase75.realCloudVerification?.authoritativeReconciliation !== 'PASS' || phase75.realCloudVerification?.duplicateReversalDatabaseGuard !== 'PASS' || phase75.realCloudVerification?.duplicateReversalGroupCount !== 0) errors.push('Phase 7.5 Real Cloud evidence drifted');
if (phase75.mergeCommit !== '761073812fc0e43f481ac20532ea6c10979d805d') errors.push('Phase 7.5 canonical merge commit drifted');
if (phase75.postMergeRecertification?.status !== 'COMPLETE' || phase75.postMergeRecertification?.mainCommit !== '761073812fc0e43f481ac20532ea6c10979d805d') errors.push('Phase 7.5 post-merge recertification must remain COMPLETE on the exact canonical SHA');
if (phase75.postMergeRecertification?.workflowCount !== 11 || phase75.postMergeRecertification?.successCount !== 11 || phase75.postMergeRecertification?.failureCount !== 0 || phase75.postMergeRecertification?.inProgressCount !== 0 || phase75.postMergeRecertification?.queuedCount !== 0 || phase75.postMergeRecertification?.cancelledCount !== 0) errors.push('Phase 7.5 must preserve 11/11 canonical main push recertification evidence');
if (phase75.postMergeRecertification?.phaseGateRunId !== 34103686407 || phase75.postMergeRecertification?.pagesPreviewRunId !== 34103737386 || phase75.postMergeRecertification?.pagesBuild !== 'SUCCESS' || phase75.postMergeRecertification?.pagesDeploy !== 'SUCCESS' || phase75.postMergeRecertification?.realBrowserRunId !== 34103686363 || phase75.postMergeRecertification?.realBrowser !== 'SUCCESS' || phase75.postMergeRecertification?.liveExternalRunId !== 34103828264 || phase75.postMergeRecertification?.liveExternal !== 'SUCCESS' || phase75.postMergeRecertification?.publishedApplicationAttack !== 'SUCCESS') errors.push('Phase 7.5 deployed post-merge evidence drifted');
if (phase75.phase8Allowed !== true || phase75.nextPhase !== '8.1') errors.push('Phase 7.5 historical transition evidence must authorize 8.1');
if (phase75.closureEvidence !== 'docs/PHASE7_5_CLOSURE.md' || phase75.postMergeEvidence !== 'docs/PHASE7_5_POSTMERGE_RECERTIFICATION.md') errors.push('Phase 7.5 closure evidence pointers drifted');

if (phase81.phase !== '8.1' || phase81.implementationHead !== 'fe19308c8707dc346a3254b92292c048c8c1bc4a' || phase81.pullRequest !== 107) errors.push('Phase 8.1 certified implementation/PR evidence drifted');
if (phase81.preClosure?.workflowCount !== 30 || phase81.preClosure?.successCount !== 30 || phase81.preClosure?.failureCount !== 0 || phase81.preClosure?.inProgressCount !== 0 || phase81.preClosure?.queuedCount !== 0 || phase81.preClosure?.cancelledCount !== 0 || phase81.preClosure?.realChromium !== 'PASS') errors.push('Phase 8.1 must preserve 30/30 pre-closure evidence and Real Chromium PASS');
if (phase81.realCloudVerification?.status !== 'COMPLETE' || phase81.realCloudVerification?.catalog !== 'PASS' || phase81.realCloudVerification?.prerequisites !== 'PASS' || phase81.realCloudVerification?.idempotency !== 'PASS' || phase81.realCloudVerification?.staleState !== 'PASS' || phase81.realCloudVerification?.complete !== 'PASS' || phase81.realCloudVerification?.reopen !== 'PASS') errors.push('Phase 8.1 Real Cloud evidence drifted');
if (phase81.mergeCommit !== '95f988ac305d9003ee19a5f0f474c499f51d288b') errors.push('Phase 8.1 implementation merge commit drifted');
if (phase81.postMergeRecertification?.status !== 'COMPLETE' || phase81.postMergeRecertification?.mainCommit !== '95f988ac305d9003ee19a5f0f474c499f51d288b') errors.push('Phase 8.1 implementation post-merge recertification must remain COMPLETE on the exact canonical SHA');
if (phase81.postMergeRecertification?.workflowCount !== 15 || phase81.postMergeRecertification?.successCount !== 15 || phase81.postMergeRecertification?.failureCount !== 0 || phase81.postMergeRecertification?.inProgressCount !== 0 || phase81.postMergeRecertification?.queuedCount !== 0 || phase81.postMergeRecertification?.cancelledCount !== 0) errors.push('Phase 8.1 must preserve 15/15 exact-SHA recertification evidence');
if (phase81.postMergeRecertification?.phaseGateRunId !== 34117766941 || phase81.postMergeRecertification?.pagesPreviewRunId !== 34117816460 || phase81.postMergeRecertification?.pagesDeploymentRunId !== 34117766836 || phase81.postMergeRecertification?.realBrowserRunId !== 34117766978 || phase81.postMergeRecertification?.liveExternalRunId !== 34117875655 || phase81.postMergeRecertification?.publishedApplicationAttack !== 'SUCCESS') errors.push('Phase 8.1 deployed post-merge evidence drifted');
if (phase81.m1AnchorStatus !== 'CLOSURE_CANDIDATE' || phase81.m1OverallSystemClosed !== false || phase81.m1RemainingClosureAuthority !== 'Phase 8.7 individual Zero-Escape destruction evidence') errors.push('Phase 8.1 must keep M1 fail-closed until Phase 8.7');
if (phase81.phase8_2Allowed !== true || phase81.nextPhase !== '8.2') errors.push('Phase 8.2 must be the sole next stage authorized by closed Phase 8.1');
if (phase81.closureEvidence !== 'docs/PHASE8_1_CLOSURE.md' || phase81.postMergeEvidence !== 'docs/PHASE8_1_POSTMERGE_RECERTIFICATION.md') errors.push('Phase 8.1 closure evidence pointers drifted');
if (phase81.criticalDefectCount !== 0 || phase81.highDefectCount !== 0 || phase81.functionalBlockerCount !== 0) errors.push('Phase 8.1 defect gate must remain zero');

for (const marker of [
  'الحالة الرسمية: **Phase 8.1 — Workflow Engine & Government Procedure OS — M1 ✅ CLOSED + POST-MERGE RECERTIFIED**',
  'التالي المسموح: **Phase 8.2 — Automation Engine**',
  '**Phase 8.1 — Workflow Engine & Government Procedure OS — M1** ✅ complete + post-merge recertified',
  '**M1 — Government Procedure Operating System** 🟠 `CLOSURE_CANDIDATE`',
  '**Next: Phase 8.2 — Automation Engine**',
  'fe19308c8707dc346a3254b92292c048c8c1bc4a',
  '95f988ac305d9003ee19a5f0f474c499f51d288b',
  '34117875655',
  'Phase 8.7',
  'Attack the actual published application',
  'Zero-Escape rule',
  'Gate Escape',
  'docs/ENJAZ_MASTER_ROADMAP.md',
  'docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json',
  'docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md',
  'docs/PHASE8_1_STATE.json',
  'docs/PHASE8_1_POSTMERGE_RECERTIFICATION.md',
]) requireMarker(readme, marker, 'README');

for (const stale of [
  'التالي المسموح: **Phase 7.1 — Financial Ledger & Summary**',
  'التالي المسموح: **Phase 7.2 — Payments & Receipts**',
  'التالي المسموح: **Phase 7.3 — Financial Intelligence**',
  'التالي المسموح: **Phase 7.4 — Financial Reports**',
  '**Next: Phase 7.1 — Financial Ledger & Summary**',
  '**Next: Phase 7.2 — Payments & Receipts**',
  '**Next: Phase 7.3 — Financial Intelligence**',
  '**Next: Phase 7.4 — Financial Reports**',
  '**Next: Phase 7.5 — Finance Destruction & Reconciliation Gate**',
  '**Next: Phase 6.1 — Companies**',
  '**M1 — Government Procedure Operating System** ✅ CLOSED',
  'Phase 8.1 and M1 are CLOSED + POST-MERGE RECERTIFIED',
]) forbidMarker(readme, stale, 'README');

for (const marker of ['**Phase 7.5 — Finance Destruction & Reconciliation Gate** ✅ complete + post-merge recertified','30/30 pull-request workflows SUCCESS','11/11 canonical main push workflows SUCCESS','c479af8341b9699baf639deabbd61d356ea01c4e','761073812fc0e43f481ac20532ea6c10979d805d','34103828264','Phase 7 exit is satisfied']) requireMarker(readme, marker, 'README Phase 7.5 historical evidence');

if (errors.length) {
  console.error(`ENJAZ ROADMAP AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ ROADMAP AUDIT PASS — Phases 0-18 ordered; Phase 8.1 CLOSED + exact deployed recertification preserved; M1=CLOSURE_CANDIDATE until Phase 8.7; next=Phase 8.2 only.');
}
