import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const roadmap = fs.readFileSync(new URL('docs/ENJAZ_MASTER_ROADMAP.md', root), 'utf8');
const readme = fs.readFileSync(new URL('README.md', root), 'utf8');
const phase55State = JSON.parse(fs.readFileSync(new URL('docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json', root), 'utf8'));
const phase61State = JSON.parse(fs.readFileSync(new URL('docs/PHASE6_1_COMPANIES_STATE.json', root), 'utf8'));
const phase62State = JSON.parse(fs.readFileSync(new URL('docs/PHASE6_2_LAWYERS_CONTACTS_STATE.json', root), 'utf8'));
const phase63State = JSON.parse(fs.readFileSync(new URL('docs/PHASE6_3_COMPANY_LAWYER_360_STATE.json', root), 'utf8'));
const phase64State = JSON.parse(fs.readFileSync(new URL('docs/PHASE6_4_COMPANIES_PEOPLE_DESTRUCTION_STATE.json', root), 'utf8'));
const phase71State = JSON.parse(fs.readFileSync(new URL('docs/PHASE7_1_FINANCIAL_LEDGER_STATE.json', root), 'utf8'));
const errors = [];

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
  '# Phase 9 — Risk, Saved Views & Intelligence',
  '# Phase 10 — Documents, Vault, OCR & Reports',
  '# Phase 11 — Notifications, Follow-ups & Communication Surfaces',
  '# Phase 12 — ENJAZ AI Copilot',
  '# Phase 13 — Legacy Import & Reconciliation',
  '# Phase 14 — Full-system Integration & Real E2E',
  '# Phase 15 — Performance, Security & Reliability Hardening',
  '# Phase 16 — Final Visual & UX Destruction',
  '# Phase 17 — Release Candidate & Production Validation',
  '# Phase 18 — Final Delivery & Handoff',
];
const phase2 = [
  '## 2.1 — Visual Identity Foundation', '## 2.2 — Design Tokens', '## 2.3 — Typography & RTL System',
  '## 2.4 — Core Component System', '## 2.5 — Motion & Interaction System', '## 2.6 — Mobile & Android Hardening',
  '## 2.7 — Premium Pattern Library', '## 2.8 — Visual Destruction & Quality Gate',
];
const phase5 = [
  '## 5.1 — Transaction List & Search', '## 5.2 — Transaction Create/Edit', '## 5.3 — Transaction Details / 360°',
  '## 5.4 — Archive/Restore/Lifecycle', '## 5.5 — Transaction Destruction Gate',
];
const phase6 = [
  '## 6.1 — Companies', '## 6.2 — Lawyers / Contacts', '## 6.3 — Company / Lawyer 360°',
  '## 6.4 — Companies & People Destruction Gate',
];
const phase7 = [
  '## 7.1 — Financial Ledger & Summary', '## 7.2 — Payments & Receipts', '## 7.3 — Financial Intelligence',
];

function checkOrder(items, label) {
  let last = -1;
  for (const item of items) {
    const pos = roadmap.indexOf(item);
    if (pos < 0) errors.push(`${label}: missing ${item}`);
    else if (pos <= last) errors.push(`${label}: out of order ${item}`);
    last = Math.max(last, pos);
  }
}

checkOrder(phases, 'delivery phases');
checkOrder(phase2, 'Phase 2 sequence');
checkOrder(phase5, 'Phase 5 sequence');
checkOrder(phase6, 'Phase 6 sequence');
checkOrder(phase7, 'Phase 7 sequence');

for (const marker of [
  'ENJAZ 1.0 — Delivered', '# Phase 2 — ENJAZ Design System 1.0 ✅', '## 2.8 — Visual Destruction & Quality Gate ✅',
  '# Phase 3 — Application Shell & Navigation ✅', '## 3.4 — Shell Destruction Gate ✅',
  '# Phase 4 — Home, Daily Work & Executive Overview ✅', '## 4.4 — Home Destruction Gate ✅',
  '# Phase 5 — Transactions Core ✅', '## 5.5 — Transaction Destruction Gate ✅',
  '## 6.1 — Companies', '## 6.2 — Lawyers / Contacts', '## 6.3 — Company / Lawyer 360°',
  '## 6.4 — Companies & People Destruction Gate', '# Phase 7 — Finance',
  '## 7.1 — Financial Ledger & Summary', '## 7.2 — Payments & Receipts', 'Change-control rule',
]) if (!roadmap.includes(marker)) errors.push(`roadmap marker missing: ${marker}`);

for (const marker of [
  'الحالة الرسمية: **Phase 7.1 — Financial Ledger & Summary ✅ CLOSED**',
  'آخر مرحلة مغلقة: **Phase 7.1 — Financial Ledger & Summary ✅**',
  'التالي المسموح: **Phase 7.2 — Payments & Receipts**',
  'docs/ENJAZ_MASTER_ROADMAP.md',
  'docs/PHASE6_4_COMPANIES_PEOPLE_DESTRUCTION_STATE.json',
  'docs/PHASE6_4_POSTMERGE_RECERTIFICATION.md',
  'docs/PHASE7_1_FINANCIAL_LEDGER_STATE.json',
  'docs/PHASE7_1_FINANCIAL_LEDGER_CLOSURE.md',
  'docs/PHASE7_1_POSTMERGE_RECERTIFICATION.md',
  '**Phase 5 — Transactions Core** ✅',
  '**Phase 6.1 — Companies** ✅ complete',
  '**Phase 6.2 — Lawyers / Contacts** ✅ complete',
  '**Phase 6.3 — Company / Lawyer 360°** ✅ complete',
  '**Phase 6.4 — Companies & People Destruction Gate** ✅ complete',
  '**Phase 7.1 — Financial Ledger & Summary** ✅ complete',
  '**Next: Phase 7.2 — Payments & Receipts**',
  '22/22 workflows SUCCESS', '23/23 workflows SUCCESS', '24/24 workflows SUCCESS',
  '9/9 post-merge workflows SUCCESS، 0 failures',
  '8/8 post-merge workflows SUCCESS، 0 failures، 0 in-progress',
  '46165bfc9f3237b7ff77e7ca11baed3272910831',
  'bd5d66a4e5e7e9e1a47dfa12a2d710dd0ce4537a',
  '3d4043c8e5d6784f327ff8ac9879402b7d933422',
  '628924/670000', '34047603734', 'Attack the actual published application', '/latest/',
]) if (!readme.includes(marker)) errors.push(`README marker missing: ${marker}`);

for (const [label, expression] of [
  ['Phase 5.1', /^\s*-\s+\*\*Phase 5\.1 — Transaction List & Search\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.2', /^\s*-\s+\*\*Phase 5\.2 — Transaction Create\/Edit\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.3', /^\s*-\s+\*\*Phase 5\.3 — Transaction Details \/ 360°\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.4', /^\s*-\s+\*\*Phase 5\.4 — Archive\/Restore\/Lifecycle\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.5', /^\s*-\s+\*\*Phase 5\.5 — Transaction Destruction Gate\*\*\s+✅\s+complete\s*$/],
  ['Phase 6.1', /^\s*-\s+\*\*Phase 6\.1 — Companies\*\*\s+✅\s+complete\s*$/],
  ['Phase 6.2', /^\s*-\s+\*\*Phase 6\.2 — Lawyers \/ Contacts\*\*\s+✅\s+complete\s*$/],
  ['Phase 6.3', /^\s*-\s+\*\*Phase 6\.3 — Company \/ Lawyer 360°\*\*\s+✅\s+complete\s*$/],
  ['Phase 6.4', /^\s*-\s+\*\*Phase 6\.4 — Companies & People Destruction Gate\*\*\s+✅\s+complete\s*$/],
  ['Phase 7.1', /^\s*-\s+\*\*Phase 7\.1 — Financial Ledger & Summary\*\*\s+✅\s+complete\s*$/],
]) {
  const matches = readme.split(/\r?\n/).filter((line) => expression.test(line));
  if (matches.length !== 1) errors.push(`README must contain exactly one canonical ${label} status line`);
}

for (const stale of [
  /\*\*Next: Phase 6\.2 — Lawyers \/ Contacts\*\*/,
  /\*\*Next: Phase 6\.3 — Company \/ Lawyer 360°\*\*/,
  /\*\*Next: Phase 6\.4 — Companies & People Destruction Gate\*\*/,
  /\*\*Next: Phase 7\.1 — Financial Ledger & Summary\*\*/,
]) if (stale.test(readme)) errors.push(`README contains stale next pointer: ${stale}`);
if (!/\*\*Next: Phase 7\.2 — Payments & Receipts\*\*/.test(readme)) errors.push('README next pointer must authorize exactly Phase 7.2');

if (phase55State.status !== 'CLOSED' || phase55State.exitGatePassed !== true || phase55State.unresolvedDefectCount !== 0 || phase55State.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 5.5 historical closure drifted');
if (phase61State.status !== 'CLOSED' || phase61State.exitGatePassed !== true || phase61State.unresolvedDefectCount !== 0 || phase61State.postMergeRecertification?.status !== 'COMPLETE' || phase61State.phase6_2Allowed !== true || phase61State.nextPhase !== '6.2') errors.push('Phase 6.1 historical closure drifted');
if (phase62State.status !== 'CLOSED' || phase62State.exitGatePassed !== true || phase62State.unresolvedDefectCount !== 0 || phase62State.implementationHead !== 'd11875962963fb0c734fe1695ca4bd9c7de081b1' || phase62State.postMergeRecertification?.status !== 'COMPLETE' || phase62State.postMergeRecertification?.mainCommit !== 'e35555237d6a631e55a0c248bea0f22d0cbd0c37' || phase62State.phase6_3Allowed !== true || phase62State.nextPhase !== '6.3') errors.push('Phase 6.2 historical closure drifted');
if (phase63State.status !== 'CLOSED' || phase63State.exitGatePassed !== true || phase63State.unresolvedDefectCount !== 0 || phase63State.implementationHead !== 'c3d8d886424c52113b8bf78bdace95528f429c5f' || phase63State.postMergeRecertification?.status !== 'COMPLETE' || phase63State.postMergeRecertification?.mainCommit !== '46165bfc9f3237b7ff77e7ca11baed3272910831' || phase63State.phase6_4Allowed !== true || phase63State.nextPhase !== '6.4') errors.push('Phase 6.3 historical closure drifted');
if (phase64State.status !== 'CLOSED' || phase64State.exitGatePassed !== true || phase64State.unresolvedDefectCount !== 0 || phase64State.implementationHead !== '90f6c3bcc718a49ef8ca55dfa2b9e6abff4dff03' || phase64State.productionJavaScriptBudget !== 670000 || phase64State.mergeCommit !== 'bd5d66a4e5e7e9e1a47dfa12a2d710dd0ce4537a' || phase64State.postMergeRecertification?.status !== 'COMPLETE' || phase64State.postMergeRecertification?.mainCommit !== 'bd5d66a4e5e7e9e1a47dfa12a2d710dd0ce4537a' || phase64State.phase7Allowed !== true || phase64State.nextPhase !== '7.1') errors.push('Phase 6.4 historical closure drifted');

if (phase71State.status !== 'CLOSED' || phase71State.exitGatePassed !== true || phase71State.unresolvedDefectCount !== 0) errors.push('Phase 7.1 machine state must be closed with zero unresolved defects');
if (phase71State.implementationHead !== '0ac2174272d7ac0e5f79020ed78ad3872177af31') errors.push('Phase 7.1 implementation head drifted');
if (phase71State.preClosure?.workflowCount !== 24 || phase71State.preClosure?.successCount !== 24 || phase71State.preClosure?.failureCount !== 0 || phase71State.preClosure?.productionJavaScriptBytes !== 628924 || phase71State.productionJavaScriptBudget !== 670000) errors.push('Phase 7.1 pre-closure certification drifted');
if (phase71State.mergeCommit !== '3d4043c8e5d6784f327ff8ac9879402b7d933422') errors.push('Phase 7.1 canonical merge commit drifted');
if (phase71State.postMergeRecertification?.status !== 'COMPLETE' || phase71State.postMergeRecertification?.mainCommit !== '3d4043c8e5d6784f327ff8ac9879402b7d933422') errors.push('Phase 7.1 canonical recertification drifted');
if (phase71State.postMergeRecertification?.workflowCount !== 9 || phase71State.postMergeRecertification?.successCount !== 9 || phase71State.postMergeRecertification?.failureCount !== 0 || phase71State.postMergeRecertification?.inProgressCount !== 0) errors.push('Phase 7.1 requires 9/9 final post-merge workflows SUCCESS');
if (phase71State.phase7_2Allowed !== true || phase71State.nextPhase !== '7.2') errors.push('Phase 7.2 may be next only after Phase 7.1 canonical recertification');

if (errors.length) {
  console.error('ENJAZ ROADMAP AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ ROADMAP AUDIT PASS — ${phases.length} delivery phases preserved; Phase 7.1 closed and recertified on canonical main; next=Phase 7.2.`);
}
