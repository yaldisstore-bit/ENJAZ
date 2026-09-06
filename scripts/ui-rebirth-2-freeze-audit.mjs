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
const phase55StatePath = 'docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json';
const phase55DecisionPath = 'docs/PHASE5_5_UNLOCK_DECISION.md';
const phase55Active = exists(phase55StatePath);
const phase55State = phase55Active ? JSON.parse(read(phase55StatePath)) : null;

for (const marker of ['Phase 5.5 — Transaction Destruction Gate is PAUSED / LOCKED','ENJAZ Workspace — Clear, Spatial, Contextual','Beauty Gate','Professional UX / No-Maze Gate','Golden Experience','Legacy Eradication']) if (!decision.includes(marker)) errors.push(`Rebirth plan missing marker: ${marker}`);
for (const marker of ['One pillar may never compensate for failure of the other','Feature Parity Gate','Legacy-Zero Gate','Golden Experience approval is a hard stage barrier']) if (!acceptance.includes(marker)) errors.push(`acceptance contract missing marker: ${marker}`);

const r2ClosedForUnlock = state.stage === 'R2.0-11'
  && state.runtime === 'ui-r2'
  && state.promotion?.status === 'CLOSED'
  && state.promotion?.allowed === true
  && state.promotion?.exitGatePassed === true
  && state.promotion?.canonicalMainRecertified === true
  && state.promotion?.pagesRecertified === true
  && state.promotion?.liveExternalRecertified === true
  && state.legacyEradication?.status === 'CLOSED'
  && state.legacyEradication?.legacyZero === true
  && state.featureParity?.migratedCapabilities === state.featureParity?.totalCapabilities
  && state.featureParity?.testedCapabilities === state.featureParity?.totalCapabilities
  && state.featureParity?.unresolvedCapabilities === 0;

if (!phase55Active) {
  if (state.phase55Locked !== true) errors.push('R2 closure snapshot must keep Phase 5.5 locked until an explicit post-R2 decision exists');
  if (!readme.includes('Phase 5.5 — Transaction Destruction Gate** ⏳ not started')) errors.push('README must keep Phase 5.5 not started before unlock');
  if (!roadmap.includes('Phase 5.5 remains not started')) errors.push('roadmap must keep Phase 5.5 not started before unlock');
  for (const p of ['docs/PHASE5_5_TRANSACTION_DESTRUCTION_KICKOFF.md','.github/workflows/phase5-5-transaction-destruction.yml','scripts/phase5-5-transaction-destruction-audit.mjs']) if (exists(p)) errors.push(`Phase 5.5 artifact forbidden before explicit post-R2 unlock: ${p}`);
} else {
  if (!r2ClosedForUnlock) errors.push('Phase 5.5 unlock is legal only after fully closed and recertified R2.0-11');
  if (!exists(phase55DecisionPath)) errors.push('Phase 5.5 active state requires an explicit governance unlock decision');
  if (!['ACTIVE', 'CLOSED'].includes(phase55State?.status)) errors.push('Phase 5.5 state must be ACTIVE or CLOSED after unlock');
  if (phase55State?.baseCommit !== 'defc0bf964b4446f92f6e96931f5643f586d9cfd') errors.push('Phase 5.5 unlock must remain anchored to the final R2.0-11 recertified base');
  for (const p of ['docs/PHASE5_5_TRANSACTION_DESTRUCTION_KICKOFF.md','.github/workflows/phase5-5-transaction-destruction.yml','scripts/phase5-5-transaction-destruction-audit.mjs','tests/transactionDestructionGate.test.ts']) if (!exists(p)) errors.push(`Phase 5.5 active state missing required artifact: ${p}`);
}

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
} else if (phase55Active) {
  console.log(`ENJAZ UI/UX REBIRTH 2.0 FREEZE AUDIT PASS — R2.0-11 is closed; Phase 5.5 explicit post-R2 state is ${phase55State.status}.`);
} else {
  console.log('ENJAZ UI/UX REBIRTH 2.0 FREEZE AUDIT PASS — Phase 5.5 remains locked pending an explicit post-R2 governance decision.');
}
