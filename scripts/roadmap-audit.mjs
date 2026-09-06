import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const roadmap = fs.readFileSync(new URL('docs/ENJAZ_MASTER_ROADMAP.md', root), 'utf8');
const readme = fs.readFileSync(new URL('README.md', root), 'utf8');
const phase55State = JSON.parse(fs.readFileSync(new URL('docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json', root), 'utf8'));
const phase61State = JSON.parse(fs.readFileSync(new URL('docs/PHASE6_1_COMPANIES_STATE.json', root), 'utf8'));
const phase62State = JSON.parse(fs.readFileSync(new URL('docs/PHASE6_2_LAWYERS_CONTACTS_STATE.json', root), 'utf8'));
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
const phase6 = ['## 6.1 — Companies', '## 6.2 — Lawyers / Contacts', '## 6.3 — Company / Lawyer 360°'];

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

for (const marker of [
  'ENJAZ 1.0 — Delivered',
  '# Phase 2 — ENJAZ Design System 1.0 ✅',
  '## 2.8 — Visual Destruction & Quality Gate ✅',
  '# Phase 3 — Application Shell & Navigation ✅',
  '## 3.4 — Shell Destruction Gate ✅',
  '# Phase 4 — Home, Daily Work & Executive Overview ✅',
  '## 4.4 — Home Destruction Gate ✅',
  '# Phase 5 — Transactions Core ✅',
  '## 5.1 — Transaction List & Search ✅',
  '## 5.2 — Transaction Create/Edit ✅',
  '## 5.3 — Transaction Details / 360° ✅',
  '## 5.4 — Archive/Restore/Lifecycle ✅',
  '## 5.5 — Transaction Destruction Gate ✅',
  '## 6.1 — Companies',
  '## 6.2 — Lawyers / Contacts',
  '## 6.3 — Company / Lawyer 360°',
  'Change-control rule',
]) if (!roadmap.includes(marker)) errors.push(`roadmap marker missing: ${marker}`);

for (const marker of [
  'الحالة الرسمية: **Phase 6.2 — Lawyers / Contacts ✅ CLOSED**',
  'آخر مرحلة مغلقة: **Phase 6.2 — Lawyers / Contacts ✅**',
  'التالي المسموح: **Phase 6.3 — Company / Lawyer 360°**',
  'docs/ENJAZ_MASTER_ROADMAP.md',
  'docs/PHASE6_2_LAWYERS_CONTACTS_STATE.json',
  'docs/PHASE6_2_LAWYERS_CONTACTS_CLOSURE.md',
  'docs/PHASE6_2_POSTMERGE_RECERTIFICATION.md',
  '**Phase 5 — Transactions Core** ✅',
  '**Phase 5.5 — Transaction Destruction Gate** ✅ complete',
  '**Phase 6.1 — Companies** ✅ complete',
  '**Phase 6.2 — Lawyers / Contacts** ✅ complete',
  '**Next: Phase 6.3 — Company / Lawyer 360°**',
  '21/21 workflows SUCCESS',
  '8/8 post-merge workflows SUCCESS، 0 failures',
  'e35555237d6a631e55a0c248bea0f22d0cbd0c37',
]) if (!readme.includes(marker)) errors.push(`README marker missing: ${marker}`);

for (const [label, expression] of [
  ['Phase 5.1', /^\s*-\s+\*\*Phase 5\.1 — Transaction List & Search\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.2', /^\s*-\s+\*\*Phase 5\.2 — Transaction Create\/Edit\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.3', /^\s*-\s+\*\*Phase 5\.3 — Transaction Details \/ 360°\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.4', /^\s*-\s+\*\*Phase 5\.4 — Archive\/Restore\/Lifecycle\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.5', /^\s*-\s+\*\*Phase 5\.5 — Transaction Destruction Gate\*\*\s+✅\s+complete\s*$/],
  ['Phase 6.1', /^\s*-\s+\*\*Phase 6\.1 — Companies\*\*\s+✅\s+complete\s*$/],
  ['Phase 6.2', /^\s*-\s+\*\*Phase 6\.2 — Lawyers \/ Contacts\*\*\s+✅\s+complete\s*$/],
]) {
  const matches = readme.split(/\r?\n/).filter((line) => expression.test(line));
  if (matches.length !== 1) errors.push(`README must contain exactly one canonical ${label} status line`);
}

if (/Phase 5\.5[^\n]*(?:⏳\s+not started|remains not started)/i.test(readme)) errors.push('README must not claim Phase 5.5 is pending after canonical recertification');
if (/Phase 6\.1[^\n]*(?:⏳\s+not started|remains not started|Next:)/i.test(readme)) errors.push('README must not claim Phase 6.1 is pending after canonical recertification');
if (/Phase 6\.2[^\n]*(?:⏳\s+not started|remains not started|Next:)/i.test(readme)) errors.push('README must not claim Phase 6.2 is pending after canonical recertification');
if (/\*\*Next: Phase 6\.2 — Lawyers \/ Contacts\*\*/.test(readme)) errors.push('README next pointer must advance beyond closed Phase 6.2');

if (phase55State.status !== 'CLOSED' || phase55State.exitGatePassed !== true || phase55State.unresolvedDefectCount !== 0) errors.push('Phase 5.5 machine state must remain closed with zero unresolved defects');
if (phase55State.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 5.5 post-merge recertification must remain COMPLETE');
if (phase55State.phase6Allowed !== true || phase55State.nextPhase !== '6.1') errors.push('Phase 5.5 transition evidence must continue to authorize Phase 6.1 historically');

if (phase61State.status !== 'CLOSED' || phase61State.exitGatePassed !== true || phase61State.unresolvedDefectCount !== 0) errors.push('Phase 6.1 machine state must be closed with zero unresolved defects');
if (phase61State.implementationHead !== '9397131afab3688749d57bcaa721e6eb858aef30') errors.push('Phase 6.1 implementation head drifted');
if (phase61State.preClosure?.workflowCount !== 20 || phase61State.preClosure?.successCount !== 20 || phase61State.preClosure?.failureCount !== 0) errors.push('Phase 6.1 requires 20/20 pre-closure workflows SUCCESS');
if (phase61State.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 6.1 post-merge recertification must be COMPLETE');
if (phase61State.postMergeRecertification?.mainCommit !== '6d70069995164500b3c05b027145bcdfed96e877') errors.push('Phase 6.1 canonical recertified main commit drifted');
if (phase61State.postMergeRecertification?.workflowCount !== 8 || phase61State.postMergeRecertification?.successCount !== 8 || phase61State.postMergeRecertification?.failureCount !== 0) errors.push('Phase 6.1 requires 8/8 post-merge workflows SUCCESS');
if (phase61State.phase6_2Allowed !== true || phase61State.nextPhase !== '6.2') errors.push('Phase 6.2 transition evidence must remain historically authorized by Phase 6.1');

if (phase62State.status !== 'CLOSED' || phase62State.exitGatePassed !== true || phase62State.unresolvedDefectCount !== 0) errors.push('Phase 6.2 machine state must be closed with zero unresolved defects');
if (phase62State.implementationHead !== 'd11875962963fb0c734fe1695ca4bd9c7de081b1') errors.push('Phase 6.2 implementation head drifted');
if (phase62State.preClosure?.workflowCount !== 21 || phase62State.preClosure?.successCount !== 21 || phase62State.preClosure?.failureCount !== 0) errors.push('Phase 6.2 requires 21/21 pre-closure workflows SUCCESS');
if (phase62State.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 6.2 post-merge recertification must be COMPLETE');
if (phase62State.postMergeRecertification?.mainCommit !== 'e35555237d6a631e55a0c248bea0f22d0cbd0c37') errors.push('Phase 6.2 canonical recertified main commit drifted');
if (phase62State.postMergeRecertification?.workflowCount !== 8 || phase62State.postMergeRecertification?.successCount !== 8 || phase62State.postMergeRecertification?.failureCount !== 0) errors.push('Phase 6.2 requires 8/8 post-merge workflows SUCCESS');
if (phase62State.phase6_3Allowed !== true || phase62State.nextPhase !== '6.3') errors.push('Phase 6.3 may be next only after Phase 6.2 canonical recertification');

if (errors.length) {
  console.error('ENJAZ ROADMAP AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ ROADMAP AUDIT PASS — ${phases.length} delivery phases preserved; Phase 6.2 closed and recertified on canonical main; next=Phase 6.3.`);
}
