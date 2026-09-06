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

for (const marker of [
  'ENJAZ 1.0 — Delivered',
  'Zero-Escape closure law for M1–M18',
  'Current position — canonical reconciled state',
  'Major-system anchor matrix',
  '**Next: Phase 7.2 — Payments & Receipts**',
  'Phase 7.1 — Financial Ledger & Summary ✅ CLOSED + post-merge recertified',
  'docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json',
  'docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md',
  'Gate Escape',
]) requireMarker(roadmap, marker, 'roadmap');

for (const stale of [
  '**Next: Phase 6.1 — Companies**',
  '**Next: Phase 7.1 — Financial Ledger & Summary**',
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
if (phase71.phase7_2Allowed !== true || phase71.nextPhase !== '7.2') errors.push('Phase 7.2 must be the only next stage authorized by Phase 7.1');
if (phase71.postMergeEvidence !== 'docs/PHASE7_1_POSTMERGE_RECERTIFICATION.md') errors.push('Phase 7.1 post-merge evidence pointer drifted');

for (const marker of [
  'الحالة الرسمية: **Phase 7.1 — Financial Ledger & Summary ✅ CLOSED + POST-MERGE RECERTIFIED**',
  'التالي المسموح: **Phase 7.2 — Payments & Receipts**',
  '**Phase 7.1 — Financial Ledger & Summary** ✅ complete + post-merge recertified',
  '**Next: Phase 7.2 — Payments & Receipts**',
  '24/24 pull-request workflows SUCCESS',
  '9/9 canonical post-merge workflows SUCCESS',
  '3d4043c8e5d6784f327ff8ac9879402b7d933422',
  'Attack the actual published application',
  'Zero-Escape rule',
  'Gate Escape',
  'docs/ENJAZ_MASTER_ROADMAP.md',
  'docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json',
  'docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md',
  'docs/PHASE7_1_POSTMERGE_RECERTIFICATION.md',
]) requireMarker(readme, marker, 'README');

for (const stale of [
  'التالي المسموح: **Phase 7.1 — Financial Ledger & Summary**',
  '**Next: Phase 7.1 — Financial Ledger & Summary**',
  '**Next: Phase 6.1 — Companies**',
]) forbidMarker(readme, stale, 'README');

if (errors.length) {
  console.error(`ENJAZ ROADMAP AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ ROADMAP AUDIT PASS — Phases 0-18 ordered; Phase 7.1 CLOSED + 9/9 canonical recertified; M1-M18 integrated under ZERO_ESCAPE_V1; next=Phase 7.2 only.');
}
