import fs from 'node:fs';

const roadmap = fs.readFileSync(new URL('../docs/ENJAZ_MASTER_ROADMAP.md', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');

const phases = [
  '# Phase 0 — Product Freeze & Migration Contract', '# Phase 1 — Engineering Foundation', '# Phase 2 — ENJAZ Design System 1.0',
  '# Phase 3 — Application Shell & Navigation', '# Phase 4 — Home, Daily Work & Executive Overview', '# Phase 5 — Transactions Core',
  '# Phase 6 — Companies & People', '# Phase 7 — Finance', '# Phase 8 — Workflow, Automation & Operations',
  '# Phase 9 — Risk, Saved Views & Intelligence', '# Phase 10 — Documents, Vault, OCR & Reports',
  '# Phase 11 — Notifications, Follow-ups & Communication Surfaces', '# Phase 12 — ENJAZ AI Copilot',
  '# Phase 13 — Legacy Import & Reconciliation', '# Phase 14 — Full-system Integration & Real E2E',
  '# Phase 15 — Performance, Security & Reliability Hardening', '# Phase 16 — Final Visual & UX Destruction',
  '# Phase 17 — Release Candidate & Production Validation', '# Phase 18 — Final Delivery & Handoff',
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
checkOrder(phase5, 'Phase 5 sequence');

for (const marker of [
  'ENJAZ 1.0 — Delivered', 'Change-control rule',
  '# Phase 2 — ENJAZ Design System 1.0 ✅', '## 2.8 — Visual Destruction & Quality Gate ✅', 'Phase 2.8 ✅',
  '# Phase 3 — Application Shell & Navigation ✅', '## 3.4 — Shell Destruction Gate ✅', 'Phase 3.4 ✅',
  '# Phase 4 — Home, Daily Work & Executive Overview ✅', 'Phase 4.1, Phase 4.2, Phase 4.3 and Phase 4.4 are closed ✅',
  '## 4.1 — Home / Dashboard ✅', '## 4.2 — Daily Work / Universal Inbox ✅', '## 4.3 — Executive Briefing ✅',
  '## 4.4 — Home Destruction Gate ✅', 'docs/PHASE4_4_HOME_DESTRUCTION_CLOSURE.md',
  '## 5.1 — Transaction List & Search ✅', 'docs/PHASE5_1_TRANSACTION_LIST_SEARCH_CLOSURE.md',
  'Next: Phase 5.2 — Transaction Create/Edit', 'Phase 5.2 remains not started',
]) if (!roadmap.includes(marker)) errors.push(`roadmap marker missing: ${marker}`);

for (const marker of [
  'docs/ENJAZ_MASTER_ROADMAP.md', 'docs/PHASE4_4_HOME_DESTRUCTION_CLOSURE.md', 'docs/PHASE5_1_TRANSACTION_LIST_SEARCH_CLOSURE.md',
  'Phase 2.8 — Visual Destruction & Quality Gate ✅', 'ENJAZ Design System 1.0', 'Phase 3 — Application Shell & Navigation',
  'Phase 4 — Home, Daily Work & Executive Overview', 'Phase 4.1 — Home / Dashboard** ✅ complete',
  'Phase 4.2 — Daily Work / Universal Inbox** ✅ complete', 'Phase 4.3 — Executive Briefing** ✅ complete',
  'Phase 4.4 — Home Destruction Gate** ✅ complete', 'Phase 5.1 — Transaction List & Search** ✅ complete',
  'Phase 5.2 — Transaction Create/Edit** ⏳ not started',
]) if (!readme.includes(marker)) errors.push(`README marker missing: ${marker}`);

if (!/Phase 3\.4 — Shell Destruction Gate\*{0,2}\s*✅/.test(readme)) errors.push('README must keep Phase 3.4 explicitly complete');

for (const [label, expression] of [
  ['Phase 4.2', /^\s*-\s+\*\*Phase 4\.2 — Daily Work \/ Universal Inbox\*\*\s+✅\s+complete\s*$/],
  ['Phase 4.3', /^\s*-\s+\*\*Phase 4\.3 — Executive Briefing\*\*\s+✅\s+complete\s*$/],
  ['Phase 4.4', /^\s*-\s+\*\*Phase 4\.4 — Home Destruction Gate\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.1', /^\s*-\s+\*\*Phase 5\.1 — Transaction List & Search\*\*\s+✅\s+complete\s*$/],
  ['Phase 5.2', /^\s*-\s+\*\*Phase 5\.2 — Transaction Create\/Edit\*\*\s+⏳\s+not started\s*$/],
]) {
  const matches = readme.split(/\r?\n/).filter((line) => expression.test(line));
  if (matches.length !== 1) errors.push(`README must contain exactly one canonical ${label} status line`);
}

if (/Phase 4\.4 — Home Destruction Gate[^\n]*(?:⏳\s+not started|CURRENT NEXT PHASE)/.test(readme)) errors.push('README must not claim Phase 4.4 is pending after closure');
if (/Phase 5\.1 — Transaction List & Search[^\n]*⏳\s+not started/.test(readme)) errors.push('README must not claim Phase 5.1 is pending after closure');
if (/Phase 5\.2 — Transaction Create\/Edit[^\n]*(?:🚧|✅\s+complete)/.test(readme)) errors.push('README must not claim Phase 5.2 started during Phase 5.1 closure');
if (/## 5\.1 — Transaction List & Search(?! ✅)/.test(roadmap)) errors.push('roadmap must mark Phase 5.1 complete');
if (/Next: Phase 5\.1 — Transaction List & Search/.test(roadmap)) errors.push('roadmap next pointer must advance beyond closed Phase 5.1');
if (/## 5\.2 — Transaction Create\/Edit[^\n]*✅/.test(roadmap)) errors.push('roadmap must not close Phase 5.2 during Phase 5.1 closure');

if (errors.length) {
  console.error('ENJAZ ROADMAP AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ ROADMAP AUDIT PASS — ${phases.length} delivery phases, Phase 2 frozen, Phase 3 and Phase 4 complete, Phase 5.1 closed, and Phase 5.2 locked/not started.`);
}
