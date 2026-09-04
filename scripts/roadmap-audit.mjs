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
  '# Phase 3 — Application Shell & Navigation ✅',
  '## 3.4 — Shell Destruction Gate ✅',
  'Phase 3.4 ✅',
  '# Phase 4 — Home, Daily Work & Executive Overview 🚧',
  'Phase 4.1, Phase 4.2 and Phase 4.3 are closed ✅',
  '## 4.1 — Home / Dashboard ✅',
  '## 4.2 — Daily Work / Universal Inbox ✅',
  '## 4.3 — Executive Briefing ✅',
  '## 4.4 — Home Destruction Gate ⏭ CURRENT NEXT PHASE',
  'Next: Phase 4.4 — Home Destruction Gate',
  'Phase 4.4 becomes the next permitted subphase but remains not started',
]) {
  if (!roadmap.includes(marker)) errors.push(`roadmap marker missing: ${marker}`);
}

for (const marker of [
  'docs/ENJAZ_MASTER_ROADMAP.md',
  'Phase 2.8 — Visual Destruction & Quality Gate ✅',
  'ENJAZ Design System 1.0',
  'Phase 3 — Application Shell & Navigation',
  'Phase 4 — Home, Daily Work & Executive Overview',
  'Phase 4.1 — Home / Dashboard** ✅ complete',
  'Phase 4.2 — Daily Work / Universal Inbox** ✅ complete',
  'Phase 4.3 — Executive Briefing** ✅ complete',
]) {
  if (!readme.includes(marker)) errors.push(`README marker missing: ${marker}`);
}

if (!/Phase 3\.4 — Shell Destruction Gate\*{0,2}\s*✅/.test(readme)) {
  errors.push('README must keep Phase 3.4 explicitly complete');
}

const phase42StatusLines = readme.split(/\r?\n/).filter((line) => line.includes('Phase 4.2 — Daily Work / Universal Inbox'));
const canonicalPhase42Line = phase42StatusLines.filter((line) => /^\s*-\s+\*\*Phase 4\.2 — Daily Work \/ Universal Inbox\*\*\s+✅\s+complete\s*$/.test(line));
if (canonicalPhase42Line.length !== 1) errors.push('README must keep exactly one canonical Phase 4.2 complete status line');

const phase43StatusLines = readme.split(/\r?\n/).filter((line) => line.includes('Phase 4.3 — Executive Briefing'));
const canonicalPhase43Line = phase43StatusLines.filter((line) => /^\s*-\s+\*\*Phase 4\.3 — Executive Briefing\*\*\s+✅\s+complete\s*$/.test(line));
if (canonicalPhase43Line.length !== 1) {
  errors.push('README must contain exactly one canonical Phase 4.3 status line marked complete');
}
if (/Phase 4\.3 — Executive Briefing[^\n]*(?:⏳\s+not started|CURRENT NEXT PHASE)/.test(readme)) {
  errors.push('README must not claim Phase 4.3 is pending after closure');
}

const phase44StatusLines = readme.split(/\r?\n/).filter((line) => line.includes('Phase 4.4 — Home Destruction Gate'));
const canonicalPhase44Line = phase44StatusLines.filter((line) => /^\s*-\s+\*\*Phase 4\.4 — Home Destruction Gate\*\*\s+⏳\s+not started\s*$/.test(line));
if (canonicalPhase44Line.length !== 1) {
  errors.push('README must contain exactly one canonical Phase 4.4 status line marked not started');
}
if (/Phase 4\.4 — Home Destruction Gate[^\n]*(?:🚧|✅\s+complete)/.test(readme)) {
  errors.push('README must not claim Phase 4.4 has started during the Phase 4.3 closure');
}

if (errors.length) {
  console.error('ENJAZ ROADMAP AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ ROADMAP AUDIT PASS — ${phases.length} delivery phases, Phase 2 frozen, Phase 3 complete, Phase 4.1/4.2/4.3 closed, and Phase 4.4 handoff locked/not started.`);
}
