import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, root));
const json = (path) => JSON.parse(read(path));
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const readme = read('README.md');
const major = json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
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
const assertClosedState = (path, label) => {
  if (!exists(path)) {
    errors.push(`${label} state missing: ${path}`);
    return null;
  }
  const state = json(path);
  if (state.status !== 'CLOSED' || state.exitGatePassed !== true) errors.push(`${label} must remain CLOSED with exitGatePassed=true`);
  if ('unresolvedDefectCount' in state && state.unresolvedDefectCount !== 0) errors.push(`${label} unresolved defects must remain zero`);
  if ('criticalDefectCount' in state && state.criticalDefectCount !== 0) errors.push(`${label} critical defects must remain zero`);
  if ('highDefectCount' in state && state.highDefectCount !== 0) errors.push(`${label} high defects must remain zero`);
  if ('functionalBlockerCount' in state && state.functionalBlockerCount !== 0) errors.push(`${label} functional blockers must remain zero`);
  return state;
};

checkOrder([
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
], 'delivery phases');

checkOrder([
  '## 2.1 — Visual Identity Foundation', '## 2.2 — Design Tokens', '## 2.3 — Typography & RTL System',
  '## 2.4 — Core Component System', '## 2.5 — Motion & Interaction System', '## 2.6 — Mobile & Android Hardening',
  '## 2.7 — Premium Pattern Library', '## 2.8 — Visual Destruction & Quality Gate',
], 'Phase 2 sequence');
checkOrder([
  '## 5.1 — Transaction List & Search', '## 5.2 — Transaction Create/Edit', '## 5.3 — Transaction Details / 360°',
  '## 5.4 — Archive/Restore/Lifecycle', '## 5.5 — Transaction Destruction Gate',
], 'Phase 5 sequence');
checkOrder([
  '## 6.1 — Companies', '## 6.2 — Lawyers / Contacts', '## 6.3 — Company / Lawyer 360°',
  '## 6.4 — Companies & People Destruction Gate',
], 'Phase 6 sequence');
checkOrder([
  '## 7.1 — Financial Ledger & Summary', '## 7.2 — Payments & Receipts', '## 7.3 — Financial Intelligence',
  '## 7.4 — Financial Reports', '## 7.5 — Finance Destruction & Reconciliation Gate',
], 'Phase 7 sequence');
checkOrder([
  '## 8.1 — Workflow Engine & Government Procedure OS — M1', '## 8.2 — Automation Engine',
  '## 8.3 — Operations Center + Field Operations — M5', '## 8.4 — CRM, Service Catalog & Smart Intake — M6 + M17',
  '## 8.5 — Multi-Branch / Departments / Teams — M15 foundation', '## 8.6 — Global Command Center',
  '## 8.7 — Operations Zero-Escape Destruction Gate',
], 'Phase 8 sequence');
checkOrder([
  '## 9.1 — Smart Risk Engine', '## 9.2 — Smart Saved Views & Cross-domain Search Intelligence',
  '## 9.3 — Corporate Governance & Ownership Engine — M2', '## 9.4 — Regulatory / Knowledge Base Engine — M8 foundation',
  '## 9.5 — Business Intelligence & Forecasting Center — M13', '## 9.6 — Process Mining & Predictive Operations — M18',
  '## 9.7 — Intelligence Zero-Escape Gate',
], 'Phase 9 sequence');

for (const marker of [
  'ENJAZ 1.0 — Delivered',
  'Zero-Escape closure law for M1–M18',
  'Current position — canonical reconciled state',
  'Major-system anchor matrix',
  'Gate Escape',
  '**Phase 8.7 — Operations Zero-Escape Destruction Gate ✅ CLOSED + post-merge recertified**',
  '**Phase 8 — Workflow, Automation & Operations ✅ CLOSED + post-merge recertified**',
  'Historical satisfied marker: **Next: Phase 9.1 — Smart Risk Engine**',
  '**Phase 9.1 — Smart Risk Engine ✅ CLOSED + post-merge recertified**',
  '**Next: Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence**',
  '9b116d39ad3cebc62e6c4f15d4fb72fef1b25fde',
  '19/19 exact-main push workflows SUCCESS',
  '22/22 cumulative exact-SHA workflow runs SUCCESS',
  '34411497055', '34411497023', '34411495854', '34411566669', '34411616353',
  '669992/670000 PASS',
  'docs/PHASE9_1_STATE.json', 'docs/PHASE9_1_CLOSURE.md', 'docs/PHASE9_1_POSTMERGE_RECERTIFICATION.md',
  'docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json', 'docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md',
]) requireMarker(roadmap, marker, 'roadmap');

for (const stale of [
  'Phase 9.1 is the sole newly authorized implementation stage after the formal Phase 8.7 closure.',
  'No later Phase 9 stage is pre-authorized by this transition.',
  'This reconciliation originally made nine explicit changes and now records a tenth canonical transition:',
  'authorize work beyond Phase 9.1',
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

for (const id of ['M1', 'M5', 'M6']) {
  const system = major.systems.find((candidate) => candidate.id === id);
  if (system?.status !== 'CLOSURE_CANDIDATE') errors.push(`${id} must remain CLOSURE_CANDIDATE; phase closure cannot fabricate global closure`);
}
for (const id of ['M15', 'M17']) {
  const system = major.systems.find((candidate) => candidate.id === id);
  if (system?.status !== 'ACTIVE') errors.push(`${id} must remain ACTIVE because later governing anchors remain`);
}

const historicalClosedStates = [
  ['docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json', 'Phase 5.5'],
  ['docs/PHASE6_1_COMPANIES_STATE.json', 'Phase 6.1'],
  ['docs/PHASE6_2_LAWYERS_CONTACTS_STATE.json', 'Phase 6.2'],
  ['docs/PHASE6_3_COMPANY_LAWYER_360_STATE.json', 'Phase 6.3'],
  ['docs/PHASE6_4_COMPANIES_PEOPLE_DESTRUCTION_STATE.json', 'Phase 6.4'],
  ['docs/PHASE7_1_FINANCIAL_LEDGER_STATE.json', 'Phase 7.1'],
  ['docs/PHASE7_2_STATE.json', 'Phase 7.2'],
  ['docs/PHASE7_3_STATE.json', 'Phase 7.3'],
  ['docs/PHASE7_4_STATE.json', 'Phase 7.4'],
  ['docs/PHASE7_5_STATE.json', 'Phase 7.5'],
  ['docs/PHASE8_1_STATE.json', 'Phase 8.1'],
  ['docs/PHASE8_2_STATE.json', 'Phase 8.2'],
  ['docs/PHASE8_3_STATE.json', 'Phase 8.3'],
  ['docs/PHASE8_4_STATE.json', 'Phase 8.4'],
  ['docs/PHASE8_5_STATE.json', 'Phase 8.5'],
  ['docs/PHASE8_6_STATE.json', 'Phase 8.6'],
  ['docs/PHASE8_7_STATE.json', 'Phase 8.7'],
];
for (const [path, label] of historicalClosedStates) assertClosedState(path, label);

const phase87 = json('docs/PHASE8_7_STATE.json');
if (phase87.phase9_1Allowed !== true || phase87.nextPhase !== '9.1' || phase87.successorStatus !== 'AUTHORIZED') errors.push('Phase 8.7 historical successor evidence must continue to authorize Phase 9.1');

const phase91 = assertClosedState('docs/PHASE9_1_STATE.json', 'Phase 9.1');
if (phase91) {
  if (phase91.phase !== '9.1' || phase91.name !== 'Smart Risk Engine') errors.push('Phase 9.1 identity drifted');
  if (phase91.authority?.mode !== 'READ_ONLY_DERIVED_INTELLIGENCE' || phase91.authority?.riskOwnedTables !== 'NONE' || phase91.authority?.riskOwnedWriteRpc !== 'NONE') errors.push('Phase 9.1 read-only authority drifted');
  if (phase91.javascriptBudgetBytes !== 670000 || phase91.budgetIncreaseAllowed !== false) errors.push('Phase 9.1 JavaScript hard budget drifted');
  if (phase91.implementationEvidence?.implementationPullRequest !== 124 || phase91.implementationEvidence?.implementationFinalHead !== '0932a33d8b28b15509bfe3da456d09c51ce344fa' || phase91.implementationEvidence?.implementationPullRequestWorkflowSuccess !== 37) errors.push('Phase 9.1 implementation PR evidence drifted');
  if (phase91.implementationEvidence?.finalExternalRepairPullRequest !== 127 || phase91.implementationEvidence?.finalExternalRepairHead !== '549ea2205fbe9cba91a9d71631f22433afff4eaf' || phase91.implementationEvidence?.finalExternalRepairPullRequestWorkflowSuccess !== 39) errors.push('Phase 9.1 final repair PR evidence drifted');
  if (phase91.implementationEvidence?.canonicalRuntimeMerge !== '9b116d39ad3cebc62e6c4f15d4fb72fef1b25fde' || phase91.implementationEvidence?.productionJavaScriptBytes !== 669992) errors.push('Phase 9.1 canonical runtime/budget evidence drifted');
  const post = phase91.postMergeRecertification ?? {};
  if (post.status !== 'COMPLETE' || post.mainCommit !== '9b116d39ad3cebc62e6c4f15d4fb72fef1b25fde') errors.push('Phase 9.1 post-merge recertification SHA drifted');
  if (post.pushWorkflowCount !== 19 || post.pushWorkflowSuccess !== 19 || post.exactShaWorkflowRunCount !== 22 || post.exactShaWorkflowRunSuccess !== 22 || post.failureCount !== 0 || post.queuedCount !== 0 || post.inProgressCount !== 0 || post.cancelledCount !== 0) errors.push('Phase 9.1 exact-main workflow census drifted');
  if (post.phase9GateRunId !== 34411497055 || post.realBrowserRunId !== 34411497023 || post.pagesBuildRunId !== 34411495854 || post.pagesPreviewRunId !== 34411566669 || post.liveExternalRunId !== 34411616353) errors.push('Phase 9.1 canonical run IDs drifted');
  if (post.pagesBuild !== 'SUCCESS' || post.pagesPreview !== 'SUCCESS' || post.realBrowser !== 'SUCCESS' || post.liveExternal !== 'SUCCESS' || post.publishedApplicationAttack !== 'SUCCESS') errors.push('Phase 9.1 deployed-live result drifted');
  if (phase91.phase9_2Allowed !== true || phase91.nextPhase !== '9.2' || phase91.successorStatus !== 'AUTHORIZED') errors.push('Phase 9.1 must authorize only Phase 9.2');
}

for (const marker of [
  'الحالة الرسمية: **Phase 9.1 — Smart Risk Engine ✅ CLOSED + POST-MERGE RECERTIFIED**',
  'آخر مرحلة مغلقة: **Phase 9.1 — Smart Risk Engine ✅**',
  'التالي المسموح: **Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence**',
  '**Phase 9.1 — Smart Risk Engine: ✅ CLOSED + POST-MERGE RECERTIFIED.**',
  '**Next: Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence — AUTHORIZED.**',
  '9b116d39ad3cebc62e6c4f15d4fb72fef1b25fde',
  '19/19 SUCCESS', '22/22 SUCCESS', '34411616353', '669992 / 670000 PASS',
  'READ_ONLY_DERIVED_INTELLIGENCE',
  'docs/PHASE9_1_STATE.json', 'docs/PHASE9_1_CLOSURE.md', 'docs/PHASE9_1_POSTMERGE_RECERTIFICATION.md',
  'Zero-Escape rule', 'Gate Escape',
]) requireMarker(readme, marker, 'README');
for (const stale of [
  'الحالة الرسمية: **Phase 8.1 — Workflow Engine & Government Procedure OS — M1',
  'التالي المسموح: **Phase 8.2 — Automation Engine**',
  '**Next: Phase 9.1 — Smart Risk Engine**',
]) forbidMarker(readme, stale, 'README');

if (errors.length) {
  console.error(`ENJAZ ROADMAP AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ ROADMAP AUDIT PASS — Phases 0-18 ordered; Phase 8 remains closed; Phase 9.1 CLOSED + exact-main/Pages/Real-Browser/Live-External recertified; M1/M5/M6 remain CLOSURE_CANDIDATE; M15/M17 remain ACTIVE; next=Phase 9.2 only.');
}
