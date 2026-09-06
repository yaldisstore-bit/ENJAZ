import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const exists = (p) => fs.existsSync(new URL(p, root));
const errors = [];
const decision = read('docs/UI_UX_REBIRTH_2_0_MASTER_PLAN.md');
const acceptance = read('docs/UI_UX_REBIRTH_2_0_ACCEPTANCE_CONTRACT.md');
const state = JSON.parse(read('docs/UI_UX_REBIRTH_2_0_STATE.json'));
const readme = read('README.md');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const main = read('src/main.tsx');

for (const marker of ['Phase 5.5 — Transaction Destruction Gate is PAUSED / LOCKED','ENJAZ Workspace — Clear, Spatial, Contextual','Beauty Gate','Professional UX / No-Maze Gate','Golden Experience','Legacy Eradication']) if (!decision.includes(marker)) errors.push(`Rebirth plan missing marker: ${marker}`);
for (const marker of ['One pillar may never compensate for failure of the other','Feature Parity Gate','Legacy-Zero Gate','Golden Experience approval is a hard stage barrier']) if (!acceptance.includes(marker)) errors.push(`acceptance contract missing marker: ${marker}`);
if (state.phase55Locked !== true) errors.push('machine state must keep Phase 5.5 locked');
if (!readme.includes('Phase 5.5 — Transaction Destruction Gate** ⏳ not started')) errors.push('README must keep Phase 5.5 not started');
if (!roadmap.includes('Phase 5.5 remains not started')) errors.push('roadmap must keep Phase 5.5 not started');
for (const p of ['docs/PHASE5_5_TRANSACTION_DESTRUCTION_KICKOFF.md','.github/workflows/phase5-5-transaction-destruction.yml','scripts/phase5-5-transaction-destruction-audit.mjs']) if (exists(p)) errors.push(`Phase 5.5 artifact forbidden during Rebirth: ${p}`);

if (exists('src/ui-v2/runtime/CoreApp.tsx')) {
  if (!read('src/ui-v2/runtime/CoreApp.tsx').includes('data-product-phase="5.4"')) errors.push('legacy runtime must remain pinned to product phase 5.4 while present');
} else {
  const candidateAllowed = state.stage === 'R2.0-10'
    && ['ACTIVE_ERADICATION','CLOSED'].includes(state.legacyEradication?.status)
    && state.featureParity?.migratedCapabilities === state.featureParity?.totalCapabilities
    && state.featureParity?.testedCapabilities === state.featureParity?.totalCapabilities
    && state.featureParity?.unresolvedCapabilities === 0
    && /ui-r2\/runtime\/UiR2ProductionRoot/.test(main)
    && state.promotion?.requested === false
    && state.promotion?.allowed === false;
  if (!candidateAllowed && state.stage !== 'R2.0-11') errors.push('ui-v2 absence is allowed only for the guarded R2.0-10 Legacy-Zero candidate or R2.0-11');
}

if (errors.length) {
  console.error('ENJAZ UI/UX REBIRTH 2.0 FREEZE AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else console.log('ENJAZ UI/UX REBIRTH 2.0 FREEZE AUDIT PASS — Phase 5.5 remains locked through Legacy-Zero.');
