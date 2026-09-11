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
  '**Phase 9.1 — Smart Risk Engine ✅ CLOSED + post-merge recertified**',
  '**Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence ✅ CLOSED + post-merge recertified**',
  '**Phase 9.3 — Corporate Governance & Ownership Engine — M2 ✅ CLOSED + post-merge recertified**',
  '**Phase 9.4 — Regulatory / Knowledge Base Engine — M8 🚧 IN PROGRESS — foundation PASS + Real Cloud persistence CERTIFIED**',
  'c81cc8fa3732ac97248fdaaabc72cc5f7f26b29f',
  '34572856756',
  'REAL_CLOUD_CERTIFIED / PASS_ZERO_RESIDUE',
  '20260911141412',
  'Runtime/UI is now **AUTHORIZED_FOR_IMPLEMENTATION**',
  'docs/PHASE9_4_STATE.json', 'docs/PHASE9_4_KICKOFF.md',
  '563529/670000 PASS',
  'Phase 9.5 remains LOCKED',
  'M8 — Regulatory / Knowledge Base Engine: `ACTIVE`',
]) requireMarker(roadmap, marker, 'roadmap');

for (const stale of [
  '**Next: Phase 9.4 — Regulatory / Knowledge Base Engine — M8 foundation**',
  'Phase 9.4 is the sole newly authorized implementation stage after formal Phase 9.3 closure.',
  '**AUTHORIZED as the sole successor after formal Phase 9.3 closure.**',
  'Persistence is now `AUTHORIZED_FOR_IMPLEMENTATION`; runtime/UI remains locked until persistence receives Real Cloud certification.',
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

for (const id of ['M1', 'M2', 'M5', 'M6']) {
  const system = major.systems.find((candidate) => candidate.id === id);
  if (system?.status !== 'CLOSURE_CANDIDATE') errors.push(`${id} must remain CLOSURE_CANDIDATE; phase closure cannot fabricate global closure`);
  if (typeof system?.closureEvidence !== 'string' || !system.closureEvidence.startsWith('docs/')) errors.push(`${id} closure candidate must reference closure evidence`);
}
for (const id of ['M8', 'M15', 'M17']) {
  const system = major.systems.find((candidate) => candidate.id === id);
  if (system?.status !== 'ACTIVE') errors.push(`${id} must remain ACTIVE while governing anchors are open`);
}
const m8 = major.systems.find((candidate) => candidate.id === 'M8');
if (!Array.isArray(m8?.anchors) || !m8.anchors.includes('9') || !m8.anchors.includes('12') || m8?.closureEvidence !== null) errors.push('M8 must preserve Phase 9 + Phase 12 anchors without fabricated closure evidence');

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
  ['docs/PHASE9_1_STATE.json', 'Phase 9.1'],
  ['docs/PHASE9_2_STATE.json', 'Phase 9.2'],
  ['docs/PHASE9_3_STATE.json', 'Phase 9.3'],
];
for (const [path, label] of historicalClosedStates) assertClosedState(path, label);

const phase87 = json('docs/PHASE8_7_STATE.json');
if (phase87.phase9_1Allowed !== true || phase87.nextPhase !== '9.1' || phase87.successorStatus !== 'AUTHORIZED') errors.push('Phase 8.7 historical successor evidence must authorize Phase 9.1');
const phase91 = json('docs/PHASE9_1_STATE.json');
if (phase91.phase9_2Allowed !== true || phase91.nextPhase !== '9.2' || phase91.successorStatus !== 'AUTHORIZED') errors.push('Phase 9.1 historical successor evidence must authorize Phase 9.2');
const phase92 = json('docs/PHASE9_2_STATE.json');
if (phase92.phase9_3Allowed !== true || phase92.nextPhase !== '9.3' || phase92.successorStatus !== 'AUTHORIZED') errors.push('Phase 9.2 historical successor evidence must authorize Phase 9.3');
const phase93 = json('docs/PHASE9_3_STATE.json');
if (phase93.phase9_4Allowed !== true || phase93.nextPhase !== '9.4' || phase93.successorStatus !== 'AUTHORIZED') errors.push('Phase 9.3 historical successor evidence must authorize Phase 9.4');
if (phase93.canonicalRuntime?.mainSha !== '1c38e388285b1c566d202258d78aadb1b85b9342' || phase93.canonicalRuntime?.postMergeRecertification !== 'PASS') errors.push('Phase 9.3 canonical runtime evidence drifted');

if (!exists('docs/PHASE9_4_STATE.json') || !exists('docs/PHASE9_4_KICKOFF.md')) errors.push('Phase 9.4 kickoff/state evidence is missing');
else {
  const phase94 = json('docs/PHASE9_4_STATE.json');
  if (phase94.phase !== '9.4' || phase94.status !== 'IN_PROGRESS') errors.push('Phase 9.4 must be IN_PROGRESS');
  if (phase94.baseCommit !== 'c81cc8fa3732ac97248fdaaabc72cc5f7f26b29f') errors.push('Phase 9.4 base must be the formal 9.3 closure merge');
  if (phase94.majorSystem?.id !== 'M8' || phase94.majorSystem?.status !== 'ACTIVE' || phase94.majorSystem?.globalClosureAllowed !== false) errors.push('Phase 9.4 M8 lifecycle drifted');
  if (phase94.foundation?.status !== 'LOCAL_GATE_PASS' || phase94.foundation?.gateRunId !== 34572856756 || phase94.foundation?.destructionTestsPassed !== 12) errors.push('Phase 9.4 foundation gate evidence drifted');
  if (phase94.persistence?.status !== 'REAL_CLOUD_CERTIFIED' || phase94.persistence?.realCloudVerification !== 'PASS_ZERO_RESIDUE' || phase94.persistence?.zeroResidue !== true) errors.push('Phase 9.4 persistence must remain Real Cloud certified with zero residue');
  if (phase94.persistence?.phaseOwnedSecurityAdvisorWarnings !== 0 || phase94.persistence?.phaseOwnedUnindexedForeignKeys !== 0) errors.push('Phase 9.4 persistence advisor ownership must remain clean');
  if (phase94.runtime?.status !== 'AUTHORIZED_FOR_IMPLEMENTATION') errors.push('Phase 9.4 runtime must be authorized only after Real Cloud persistence certification');
  if (!exists('docs/PHASE9_4_REAL_CLOUD_EVIDENCE.md')) errors.push('Phase 9.4 Real Cloud evidence is missing');
  if (phase94.phase9_5Allowed !== false || phase94.exitGatePassed !== false || phase94.successorStatus !== 'LOCKED') errors.push('Phase 9.5 must remain locked while 9.4 is open');
  if (phase94.javascriptBudgetBytes !== 670000 || phase94.budgetIncreaseAllowed !== false) errors.push('Phase 9.4 startup JavaScript budget drifted');
  if (phase94.authority?.aiOutputAuthority !== 'NEVER_AUTHORITATIVE' || phase94.authority?.officialSourceProvenance !== 'REQUIRED') errors.push('Phase 9.4 authority/provenance law drifted');
}

for (const marker of [
  'الحالة الرسمية: **Phase 9.4 — Regulatory / Knowledge Base Engine — M8 🚧 IN PROGRESS — FOUNDATION + REAL CLOUD PERSISTENCE PASS**',
  'آخر مرحلة مغلقة: **Phase 9.3 — Corporate Governance & Ownership Engine — M2 ✅ CLOSED + POST-MERGE RECERTIFIED**',
  '**Phase 9.4 — Regulatory / Knowledge Base Engine — M8: 🚧 IN PROGRESS — FOUNDATION PASS + REAL CLOUD PERSISTENCE CERTIFIED؛ Runtime/UI AUTHORIZED.**',
  '34572856756', '12/12', 'LOCAL_GATE_PASS', 'REAL_CLOUD_CERTIFIED', 'PASS_ZERO_RESIDUE',
  '`ACTIVE`; Phase 9.4 Foundation PASS + Real Cloud Persistence CERTIFIED',
  'docs/PHASE9_4_STATE.json', 'docs/PHASE9_4_KICKOFF.md', 'docs/PHASE9_4_REAL_CLOUD_EVIDENCE.md',
  'Runtime/UI: **AUTHORIZED_FOR_IMPLEMENTATION**',
  'Phase 9.5+ تبقى مقفلة',
]) requireMarker(readme, marker, 'README');

for (const stale of [
  '**Phase 9.4 — Regulatory / Knowledge Base Engine — M8 foundation: AUTHORIZED NEXT.**',
  'المرحلة التالية المصرح بها: **Phase 9.4 — Regulatory / Knowledge Base Engine — M8 foundation**',
  'Persistence: **AUTHORIZED_FOR_IMPLEMENTATION**؛ Real Cloud ما زال PENDING.',
  'Runtime/UI: **LOCKED** حتى شهادة persistence',
]) forbidMarker(readme, stale, 'README');

if (errors.length) {
  console.error(`ENJAZ ROADMAP AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ ROADMAP AUDIT PASS — Phases 0-18 ordered; Phase 9.3 remains CLOSED; Phase 9.4 M8 is IN_PROGRESS with Foundation PASS + Real Cloud Persistence CERTIFIED; Runtime/UI is authorized; M8 is ACTIVE; Phase 9.5 remains LOCKED.');
}
