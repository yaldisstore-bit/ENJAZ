import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, root));

const decision = read('docs/UI_UX_REBIRTH_2_0_MASTER_PLAN.md');
const readme = read('README.md');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const core = read('src/ui-v2/runtime/CoreApp.tsx');
const errors = [];

for (const marker of [
  'Phase 5.5 — Transaction Destruction Gate is PAUSED / LOCKED',
  'Calm Command Interface',
  'الرئيسية',
  'المعاملات',
  'اليوم',
  'المزيد',
  'Every capability has one canonical home',
]) if (!decision.includes(marker)) errors.push(`Rebirth 2.0 decision missing marker: ${marker}`);

if (!readme.includes('Phase 5.5 — Transaction Destruction Gate** ⏳ not started')) {
  errors.push('README must keep Phase 5.5 explicitly not started while Rebirth 2.0 freeze is active');
}

if (!roadmap.includes('Phase 5.5 remains not started')) {
  errors.push('roadmap must keep Phase 5.5 not started while Rebirth 2.0 freeze is active');
}

if (!core.includes('data-product-phase="5.4"')) {
  errors.push('runtime product phase must remain 5.4 while Phase 5.5 is frozen');
}

for (const path of [
  'docs/PHASE5_5_TRANSACTION_DESTRUCTION_KICKOFF.md',
  '.github/workflows/phase5-5-transaction-destruction.yml',
  'scripts/phase5-5-transaction-destruction-audit.mjs',
]) if (exists(path)) errors.push(`Phase 5.5 implementation artifact is forbidden during UI/UX Rebirth 2.0 freeze: ${path}`);

if (errors.length) {
  console.error('ENJAZ UI/UX REBIRTH 2.0 FREEZE AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ UI/UX REBIRTH 2.0 FREEZE AUDIT PASS — Phase 5.5 remains locked and runtime stays at Phase 5.4.');
}
