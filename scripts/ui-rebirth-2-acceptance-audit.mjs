import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const json = (p) => JSON.parse(read(p));
const errors = [];
const stageOrder = ['R2.0-0','R2.0-1','R2.0-2','R2.0-3','R2.0-4','R2.0-5','R2.0-6','R2.0-7','R2.0-8','R2.0-9','R2.0-10','R2.0-11'];

for (const file of ['docs/UI_UX_REBIRTH_2_0_MASTER_PLAN.md','docs/UI_UX_REBIRTH_2_0_ACCEPTANCE_CONTRACT.md','docs/UI_UX_REBIRTH_2_0_STATE.json','docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json','src/main.tsx']) {
  if (!exists(file)) errors.push(`missing Rebirth acceptance artifact: ${file}`);
}
if (errors.length) { console.error('ENJAZ REBIRTH 2.0 HARD ACCEPTANCE AUDIT FAIL'); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }

const plan = read('docs/UI_UX_REBIRTH_2_0_MASTER_PLAN.md');
const contract = read('docs/UI_UX_REBIRTH_2_0_ACCEPTANCE_CONTRACT.md');
const state = json('docs/UI_UX_REBIRTH_2_0_STATE.json');
const parity = json('docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json');
const main = read('src/main.tsx');
const stageIndex = stageOrder.indexOf(state.stage);

for (const marker of ['Beauty Gate','Professional UX / No-Maze Gate','Golden Experience','Legacy-Zero','Feature Parity','R2.0-11']) {
  if (!plan.includes(marker) && !contract.includes(marker)) errors.push(`governance missing marker: ${marker}`);
}
if (state.schemaVersion !== 1 || stageIndex < 0) errors.push(`invalid Rebirth state/stage: ${state.stage}`);
if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked during Rebirth 2.0');
if (state.legacy?.presentationIsolationEnforced !== true) errors.push('presentation isolation must remain enforced');
if (state.noMaze?.maxMajorCapabilityActions !== 3) errors.push('No-Maze ceiling must remain 3 actions');

const capabilities = Array.isArray(parity.capabilities) ? parity.capabilities : [];
const migrated = capabilities.filter((cap) => cap?.migrated === true).length;
const tested = capabilities.filter((cap) => cap?.tested === true).length;
const unresolved = capabilities.filter((cap) => cap?.migrated !== true || cap?.tested !== true).length;
if (parity.inventoryComplete !== true || state.featureParity?.inventoryComplete !== true) errors.push('feature inventory must remain complete');
if (capabilities.length !== state.featureParity?.totalCapabilities) errors.push('feature parity total drifted');
if (state.featureParity?.migratedCapabilities !== migrated || state.featureParity?.testedCapabilities !== tested) errors.push('state parity counts must match registry');
if (state.featureParity?.unresolvedCapabilities !== unresolved) errors.push('state unresolved parity count must match registry');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk(path.join(root, 'src', 'ui-r2'))) {
  if (!/\.(?:ts|tsx|js|jsx|mjs|css)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  if (/from\s+['"][^'"]*ui-v2|import\s+['"][^'"]*ui-v2|from\s+['"][^'"]*ui-rebirth|import\s+['"][^'"]*ui-rebirth/i.test(text)) errors.push(`${rel}: imports deleted legacy presentation`);
  for (const forbidden of ['ez-domain-rail','domain-explorer','onBrandAction']) if (text.includes(forbidden)) errors.push(`${rel}: forbidden legacy DNA ${forbidden}`);
}

if (stageIndex >= 5) {
  const g = state.goldenExperience ?? {};
  if (g.status !== 'APPROVED' || g.userApproved !== true || g.visualEvidenceReady !== true || g.professionalUxEvidenceReady !== true) errors.push('approved Golden Beauty + UX evidence must remain locked');
}
if (stageIndex >= 10) {
  const n = state.noMaze ?? {};
  if (n.validated !== true || n.scenarioCount < 15 || n.passedCount !== n.scenarioCount || n.hiddenPrimaryNavigationCount !== 0 || n.duplicateCanonicalHomesCount !== 0 || n.backPathFailures !== 0) errors.push('full No-Maze proof must remain intact before/during Legacy Eradication');
}

const uiV2Exists = exists('src/ui-v2');
const uiRebirthExists = exists('src/ui-rebirth');
const mainUsesProductionR2 = /ui-r2\/runtime\/UiR2ProductionRoot/.test(main);
const mainUsesDirectR2 = /ui-r2\/runtime\/UiR2Root/.test(main);
const mainUsesLegacy = /ui-v2|ui-rebirth/.test(main);
const parityComplete = capabilities.length > 0 && migrated === capabilities.length && tested === capabilities.length && unresolved === 0;
const r210Candidate = state.stage === 'R2.0-10'
  && ['ACTIVE_ERADICATION','CLOSED'].includes(state.legacyEradication?.status)
  && parityComplete
  && !uiV2Exists && !uiRebirthExists
  && mainUsesProductionR2 && !mainUsesLegacy
  && state.promotion?.requested === false && state.promotion?.allowed === false;

if (stageIndex < 10 && (mainUsesProductionR2 || mainUsesDirectR2)) errors.push('R2 production boot is forbidden before Legacy Eradication');
if (state.stage === 'R2.0-10' && !uiV2Exists && !r210Candidate) errors.push('R2.0-10 after ui-v2 deletion requires a 35/35 UiR2ProductionRoot candidate with promotion still blocked');
if (state.stage === 'R2.0-10' && uiV2Exists && (mainUsesProductionR2 || mainUsesDirectR2)) errors.push('R2.0-10 may not boot R2 while ui-v2 still physically exists');
if (mainUsesDirectR2 && state.stage !== 'R2.0-11') errors.push('direct UiR2Root canonical boot belongs only to R2.0-11');

if (stageIndex < 11 && state.runtime !== 'ui-v2') errors.push('machine canonical runtime label must remain ui-v2 until R2.0-11');
if (stageIndex < 11 && (state.promotion?.requested !== false || state.promotion?.allowed !== false)) errors.push('promotion must remain blocked before R2.0-11');

if (state.stage === 'R2.0-11' || state.promotion?.requested === true || state.promotion?.allowed === true) {
  if (!parityComplete) errors.push('promotion requires 100% migrated/tested parity');
  if (state.legacy?.eradicated !== true || uiV2Exists || uiRebirthExists || mainUsesLegacy) errors.push('promotion requires physical Legacy-Zero');
  if (!mainUsesProductionR2 && !mainUsesDirectR2) errors.push('promotion requires R2 production entrypoint');
  if (state.promotion?.requested !== true || state.promotion?.allowed !== true) errors.push('R2.0-11 promotion requires requested=true and allowed=true');
}

if (errors.length) {
  console.error(`ENJAZ REBIRTH 2.0 HARD ACCEPTANCE AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ REBIRTH 2.0 HARD ACCEPTANCE AUDIT PASS — ${state.stage}; Beauty + UX + parity + Legacy-Zero remain fail-closed.`);
}
