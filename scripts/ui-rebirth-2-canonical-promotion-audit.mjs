import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const json = (p) => JSON.parse(read(p));
const errors = [];

const required = [
  'docs/UI_UX_REBIRTH_2_0_STATE.json',
  'docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json',
  'docs/UI_UX_REBIRTH_2_0_MASTER_PLAN.md',
  'docs/R2_0_11_CANONICAL_PROMOTION_KICKOFF.md',
  'src/main.tsx',
  'src/ui-r2/runtime/UiR2ProductionRoot.tsx',
];
for (const file of required) if (!exists(file)) errors.push(`missing canonical-promotion artifact: ${file}`);
if (errors.length) {
  console.error('ENJAZ R2.0-11 CANONICAL PROMOTION AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const state = json('docs/UI_UX_REBIRTH_2_0_STATE.json');
const parity = json('docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json');
const main = read('src/main.tsx');
const productionRoot = read('src/ui-r2/runtime/UiR2ProductionRoot.tsx');
const promotion = state.promotion ?? {};
const caps = Array.isArray(parity.capabilities) ? parity.capabilities : [];
const migrated = caps.filter((cap) => cap?.migrated === true).length;
const tested = caps.filter((cap) => cap?.tested === true).length;
const unresolved = caps.filter((cap) => cap?.migrated !== true || cap?.tested !== true).length;

if (state.stage !== 'R2.0-11') errors.push(`stage must be R2.0-11, found ${state.stage}`);
if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked during Canonical Promotion');

const golden = state.goldenExperience ?? {};
if (golden.status !== 'APPROVED' || golden.userApproved !== true || golden.visualEvidenceReady !== true || golden.professionalUxEvidenceReady !== true) {
  errors.push('Golden Beauty + Professional UX approval is incomplete');
}

if (parity.inventoryComplete !== true || state.featureParity?.inventoryComplete !== true) errors.push('Feature Parity inventory is incomplete');
if (caps.length !== 35 || state.featureParity?.totalCapabilities !== 35) errors.push(`Feature Parity must remain exactly 35 capabilities, found ${caps.length}`);
if (migrated !== 35 || tested !== 35 || unresolved !== 0) errors.push(`Feature Parity must be 35/35 migrated + 35/35 tested + 0 unresolved; got ${migrated}/${tested}/${unresolved}`);
if (state.featureParity?.migratedCapabilities !== 35 || state.featureParity?.testedCapabilities !== 35 || state.featureParity?.unresolvedCapabilities !== 0) {
  errors.push('state Feature Parity counters are not promotion-ready');
}

const legacy = state.legacyEradication ?? {};
if (legacy.status !== 'CLOSED' || legacy.legacyZero !== true || legacy.exitGatePassed !== true) errors.push('R2.0-10 Legacy Eradication must be CLOSED + Legacy-Zero + exitGatePassed');
if (state.legacy?.eradicated !== true || state.legacy?.presentationIsolationEnforced !== true) errors.push('legacy presentation eradication/isolation contract is not intact');
if (exists('src/ui-v2')) errors.push('src/ui-v2 physically exists during promotion');
if (exists('src/ui-rebirth')) errors.push('src/ui-rebirth physically exists during promotion');
if (/ui-v2|ui-rebirth/.test(main)) errors.push('canonical entrypoint references legacy presentation');
if (!/ui-r2\/runtime\/UiR2ProductionRoot/.test(main) && !/ui-r2\/runtime\/UiR2Root/.test(main)) errors.push('canonical entrypoint does not boot R2');

if (!/createSupabaseAuthGateway/.test(productionRoot) || !/createEnjazDataLayerFactory/.test(productionRoot) || !/DataLayerProvider/.test(productionRoot) || !/AuthProvider/.test(productionRoot)) {
  errors.push('R2 production root lost authoritative Auth/Data Layer wiring');
}
if (/fixture|mock|localStorage/i.test(productionRoot)) errors.push('R2 production root contains a fixture/mock/localStorage production fallback');

if (state.designSystem?.palettePurity !== true || state.designSystem?.presentationIsolation !== true || state.designSystem?.exitGatePassed !== true) {
  errors.push('Design System palette purity/presentation isolation is not promotion-ready');
}

const noMaze = state.noMaze ?? {};
if (noMaze.validated !== true || noMaze.scenarioCount < 15 || noMaze.passedCount !== noMaze.scenarioCount || noMaze.maxMajorCapabilityActions !== 3 || noMaze.hiddenPrimaryNavigationCount !== 0 || noMaze.duplicateCanonicalHomesCount !== 0 || noMaze.backPathFailures !== 0) {
  errors.push('Professional UX / No-Maze proof is incomplete');
}

const destruction = state.destructionRealityQa ?? {};
if (destruction.status !== 'CLOSED' || destruction.exitGatePassed !== true || destruction.unresolvedDefectCount !== 0 || destruction.passedScenarioCount !== destruction.declaredScenarioCount) {
  errors.push('Destruction & Reality QA is not fully closed');
}

if (promotion.requested !== true) errors.push('Canonical Promotion must be explicitly requested');
if (!['ACTIVE_PROMOTION','CLOSED'].includes(promotion.status)) errors.push(`invalid promotion status: ${promotion.status}`);

if (promotion.status === 'ACTIVE_PROMOTION') {
  if (promotion.allowed !== false) errors.push('ACTIVE_PROMOTION must keep allowed=false');
  if (state.runtime !== 'ui-r2-candidate') errors.push('ACTIVE_PROMOTION runtime must be ui-r2-candidate');
  if (promotion.preconditionsVerified !== true) errors.push('ACTIVE_PROMOTION requires preconditionsVerified=true');
  if (promotion.exitGatePassed !== false) errors.push('ACTIVE_PROMOTION cannot pass its exit gate yet');
  for (const key of ['canonicalMainRecertified','pagesRecertified','liveExternalRecertified']) {
    if (promotion[key] === true) errors.push(`ACTIVE_PROMOTION cannot pre-claim ${key}`);
  }
}

if (promotion.status === 'CLOSED') {
  if (promotion.allowed !== true) errors.push('CLOSED promotion requires allowed=true');
  if (state.runtime !== 'ui-r2') errors.push('CLOSED promotion runtime must be ui-r2');
  if (promotion.canonicalMainRecertified !== true || promotion.pagesRecertified !== true || promotion.liveExternalRecertified !== true || promotion.exitGatePassed !== true) {
    errors.push('CLOSED promotion requires main + Pages + Live External recertification and exitGatePassed');
  }
}

if (errors.length) {
  console.error(`ENJAZ R2.0-11 CANONICAL PROMOTION AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ R2.0-11 CANONICAL PROMOTION AUDIT PASS — ${promotion.status}; 35/35 parity, Legacy-Zero, Beauty, No-Maze and authoritative production wiring intact.`);
}
