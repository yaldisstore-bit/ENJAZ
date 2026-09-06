import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const roadmap = fs.readFileSync(new URL('docs/ENJAZ_MASTER_ROADMAP.md', root), 'utf8');
const readme = fs.readFileSync(new URL('README.md', root), 'utf8');
const phase55State = JSON.parse(fs.readFileSync(new URL('docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json', root), 'utf8'));
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

for (const marker of [
  'ENJAZ 1.0 — Delivered',
  '# Phase 2 — ENJAZ Design System 1.0 ✅',
  '## 2.8 — Visual Destruction & Quality Gate ✅',
  '# Phase 3 — Application Shell & Navigation ✅',
  '## 3.4 — Shell Destruction Gate ✅',
  '# Phase 4 — Home, Daily Work & Executive Overview ✅',
  '## 4.4 — Home Destruction Gate ✅',
  '# Phase 5 — Transactions Core ✅',
  'Phase 5.1, Phase 5.2, Phase 5.3, Phase 5.4 and Phase 5.5 are closed ✅',
  '## 5.1 — Transaction List & Search ✅',
  '## 5.2 — Transaction Create/Edit ✅',
  '## 5.3 — Transaction Details / 360° ✅',
  '## 5.4 — Archive/Restore/Lifecycle ✅',
  '## 5.5 — Transaction Destruction Gate ✅',
  'docs/PHASE5_5_TRANSACTION_DESTRUCTION_CLOSURE.md',
  'docs/PHASE5_5_POSTMERGE_RECERTIFICATION.md',
  '218a7bb85ff6098d9a3642063c6c406a57917e86',
  '8/8 post-merge workflows SUCCESS, 0 failures',
  '**Phase 5 exit:**',
  '**Exit verified ✅.**',
  '**Phase 5.5 — Transaction Destruction Gate ✅**',
  '**Phase 5 — Transactions Core ✅**',
  '**Next: Phase 6.1 — Companies**',
  'Change-control rule',
]) if (!roadmap.includes(marker)) errors.push(`roadmap marker missing: ${marker}`);

for (const marker of [
  'الحالة الرسمية: **Phase 5 — Transactions Core ✅ CLOSED**',
  'آخر مرحلة مغلقة: **Phase 5.5 — Transaction Destruction Gate ✅**',
  'التالي المسموح: **Phase 6.1 — Companies**',
  'docs/ENJAZ_MASTER_ROADMAP.md',
  'docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json',
  'docs/PHASE5_5_TRANSACTION_DESTRUCTION_CLOSURE.md',
  'docs/PHASE5_5_POSTMERGE_RECERTIFICATION.md',
  '**Phase 5 — Transactions Core** ✅',
  '**Phase 5.1 — Transaction List & Search** ✅ complete',
  '**Phase 5.2 — Transaction Create/Edit** ✅ complete',
  '**Phase 5.3 — Transaction Details / 360°** ✅ complete',
  '**Phase 5.4 — Archive/Restore/Lifecycle** ✅ complete',
  '**Phase 5.5 — Transaction Destruction Gate** ✅ complete',
  '**Next: Phase 6.1 — Companies**',
  '19/19 workflows SUCCESS',
  '8/8 post-merge workflows SUCCESS، 0 failures',
  '218a7bb85ff6098d9a3642063c6c406a57917e86',
]) if (!readme.includes(marker)) errors.push(`README marker missing: ${marker}`);

for (const [label, expression] of [
  ['Phase 5.1', /^\s*-\s+\*\*Phase 5\.1 — Transaction List & Search\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.2', /^\s*-\s+\*\*Phase 5\.2 — Transaction Create\/Edit\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.3', /^\s*-\s+\*\*Phase 5\.3 — Transaction Details \/ 360°\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.4', /^\s*-\s+\*\*Phase 5\.4 — Archive\/Restore\/Lifecycle\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.5', /^\s*-\s+\*\*Phase 5\.5 — Transaction Destruction Gate\*\*\s+✅\s+complete\s*$/],
]) {
  const matches = readme.split(/\r?\n/).filter((line) => expression.test(line));
  if (matches.length !== 1) errors.push(`README must contain exactly one canonical ${label} status line`);
}

if (/Phase 5\.5[^\n]*(?:⏳\s+not started|remains not started)/i.test(readme)) errors.push('README must not claim Phase 5.5 is pending after canonical recertification');
if (/Phase 5\.5 remains not started/.test(roadmap)) errors.push('roadmap must not keep Phase 5.5 locked after canonical recertification');
if (/Next: Phase 5\.5 — Transaction Destruction Gate/.test(roadmap)) errors.push('roadmap next pointer must advance beyond closed Phase 5.5');
if (/## 5\.5 — Transaction Destruction Gate(?! ✅)/.test(roadmap)) errors.push('roadmap must mark Phase 5.5 complete');
if (!/# Phase 5 — Transactions Core ✅/.test(roadmap)) errors.push('roadmap must mark Phase 5 complete');

if (phase55State.status !== 'CLOSED' || phase55State.exitGatePassed !== true || phase55State.unresolvedDefectCount !== 0) errors.push('Phase 5.5 machine state must remain closed with zero unresolved defects');
if (phase55State.postMergeRecertification?.status !== 'COMPLETE') errors.push('Phase 5.5 post-merge recertification must be COMPLETE');
if (phase55State.postMergeRecertification?.mainCommit !== '218a7bb85ff6098d9a3642063c6c406a57917e86') errors.push('roadmap transition must preserve the recertified canonical main commit');
if (phase55State.phase6Allowed !== true || phase55State.nextPhase !== '6.1') errors.push('Phase 6.1 may be next only after Phase 5.5 canonical recertification');

if (errors.length) {
  console.error('ENJAZ ROADMAP AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ ROADMAP AUDIT PASS — ${phases.length} delivery phases preserved; Phase 5 closed; Phase 5.5 recertified on canonical main; next=Phase 6.1.`);
}
