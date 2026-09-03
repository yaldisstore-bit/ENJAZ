import fs from 'node:fs';

const roadmap = fs.readFileSync(new URL('../docs/ENJAZ_MASTER_ROADMAP.md', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');

const phases = [
  'Phase 0 — Product Freeze & Migration Contract',
  'Phase 1 — Engineering Foundation',
  'Phase 2 — ENJAZ Design System 1.0',
  'Phase 3 — Application Shell & Navigation',
  'Phase 4 — Home, Daily Work & Executive Overview',
  'Phase 5 — Transactions Core',
  'Phase 6 — Companies & People',
  'Phase 7 — Finance',
  'Phase 8 — Workflow, Automation & Operations',
  'Phase 9 — Risk, Saved Views & Intelligence',
  'Phase 10 — Documents, Vault, OCR & Reports',
  'Phase 11 — Notifications, Follow-ups & Communication Surfaces',
  'Phase 12 — ENJAZ AI Copilot',
  'Phase 13 — Legacy Import & Reconciliation',
  'Phase 14 — Full-system Integration & Real E2E',
  'Phase 15 — Performance, Security & Reliability Hardening',
  'Phase 16 — Final Visual & UX Destruction',
  'Phase 17 — Release Candidate & Production Validation',
  'Phase 18 — Final Delivery & Handoff',
];

const phase2 = [
  '2.1 — Visual Identity Foundation',
  '2.2 — Design Tokens',
  '2.3 — Typography & RTL System',
  '2.4 — Core Component System',
  '2.5 — Motion & Interaction System',
  '2.6 — Mobile & Android Hardening',
  '2.7 — Premium Pattern Library',
  '2.8 — Visual Destruction & Quality Gate',
];

const errors = [];

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

for (const marker of [
  'ENJAZ 1.0 — Delivered',
  'Change-control rule',
  '# Phase 2 — ENJAZ Design System 1.0 ✅',
  '## 2.8 — Visual Destruction & Quality Gate ✅',
  'Phase 2.8 ✅',
  'Next: Phase 3 — Application Shell & Navigation',
]) {
  if (!roadmap.includes(marker)) errors.push(`roadmap marker missing: ${marker}`);
}

for (const marker of [
  'docs/ENJAZ_MASTER_ROADMAP.md',
  'Phase 2.8 — Visual Destruction & Quality Gate ✅',
  'ENJAZ Design System 1.0',
  'Phase 3 — Application Shell & Navigation',
]) {
  if (!readme.includes(marker)) errors.push(`README marker missing: ${marker}`);
}

if (errors.length) {
  console.error('ENJAZ ROADMAP AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ ROADMAP AUDIT PASS — ${phases.length} delivery phases, Phase 2.1→2.8 frozen, and Phase 3 handoff protected.`);
}
