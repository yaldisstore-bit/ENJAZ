import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const readJson = (p) => JSON.parse(read(p));
const errors = [];

const contractPath = 'docs/UI_UX_REBIRTH_2_0_GLOBAL_VISUAL_POLISH_CONTRACT.json';
const kickoffPath = 'docs/R2_0_4_GOLDEN_EXPERIENCE_KICKOFF.md';
const statePath = 'docs/UI_UX_REBIRTH_2_0_STATE.json';
const goldenCssPath = 'src/ui-r2/golden/golden.css';
const previewPath = 'src/ui-r2/preview-main.tsx';
const mainPath = 'src/main.tsx';

for (const required of [contractPath, kickoffPath, statePath, goldenCssPath, previewPath, mainPath]) {
  if (!exists(required)) errors.push(`missing R2.0-4 visual-polish artifact: ${required}`);
}

if (errors.length) {
  console.error('ENJAZ R2.0-4 GLOBAL VISUAL POLISH GUARD FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const contract = readJson(contractPath);
const state = readJson(statePath);
const css = read(goldenCssPath);
const preview = read(previewPath);
const main = read(mainPath);

if (contract.schemaVersion !== 1) errors.push('visual polish contract schemaVersion must be 1');
if (contract.status !== 'LOCKED') errors.push('visual polish contract must remain LOCKED');
if (contract.appliesFrom !== 'R2.0-4') errors.push('visual polish contract must apply from R2.0-4');
if (contract.scope !== 'all-r2-presentation') errors.push('visual polish contract scope must remain global to all R2 presentation');
if (contract.goldenFirst !== true) errors.push('visual polish must be proven in Golden Experience first');

for (const [key, expected] of Object.entries({
  preserveCurrentIdentity: true,
  noFullRedesign: true,
  noLegacyDnaReintroduction: true,
  noPaletteDrift: true,
  noBusinessLogicChange: true,
  noFeatureRemoval: true,
})) {
  if (contract.preservation?.[key] !== expected) errors.push(`preservation.${key} must remain true`);
}

for (const key of [
  'hierarchy',
  'depth',
  'layerSeparation',
  'softCorners',
  'composition',
  'coherentSinglePage',
  'avoidFlatSingleSurfacePages',
  'restrainedEffects',
  'avoidCardWall',
]) {
  if (contract.requiredQualities?.[key] !== true) errors.push(`requiredQualities.${key} must remain true`);
}

const requiredLayers = ['identity', 'title', 'body', 'status', 'actions'];
if (JSON.stringify(contract.layerModel) !== JSON.stringify(requiredLayers)) {
  errors.push(`layerModel must remain exactly: ${requiredLayers.join(', ')}`);
}

if (contract.knownCorrections?.homePriorityInsetMustBeRounded !== true) errors.push('Home priority inset rounding correction must remain locked');
if (contract.knownCorrections?.destinationPagesNeedTitleBodyActionSeparation !== true) errors.push('destination title/body/action separation must remain locked');
if (contract.knownCorrections?.sectionHeadersNeedDistinctButIntegratedTreatment !== true) errors.push('section-header hierarchy treatment must remain locked');
if (contract.propagation?.required !== true) errors.push('visual polish propagation to the whole app must remain required');

if (state.stage !== 'R2.0-4') errors.push(`Golden visual guard requires active stage R2.0-4, found ${state.stage}`);
if (state.runtime !== 'ui-v2') errors.push('canonical runtime must remain ui-v2 while R2.0-4 is under approval');
if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked during R2.0-4');
if (state.goldenExperience?.status !== 'ACTIVE') errors.push('goldenExperience.status must be ACTIVE at R2.0-4 kickoff');
if (state.goldenExperience?.visualPolishContract !== contractPath) errors.push('state must point to the locked visual polish contract');
if (state.goldenExperience?.visualPolishContractLocked !== true) errors.push('state must keep visualPolishContractLocked=true');
if (state.goldenExperience?.userApproved !== false) errors.push('Golden user approval must remain false until explicit user acceptance');
if (state.promotion?.requested !== false || state.promotion?.allowed !== false) errors.push('canonical promotion must remain blocked during Golden work');

if (!preview.includes("./golden/golden.css")) errors.push('R2 preview must load the Golden visual polish layer');

const selectorContracts = [
  ['Home priority inset', '.r2-hero__signal', 'border-radius: var(--ez-r2-radius-xl)'],
  ['page hero layer', '.r2-section-heading--hero', 'border-radius: var(--ez-r2-radius-xl)'],
  ['destination body layer', '.r2-destination-placeholder > p:not(.r2-eyebrow)', 'border-radius: var(--ez-r2-radius-lg)'],
  ['record containing layer', '.r2-record-list', 'border-radius: var(--ez-r2-radius-xl)'],
  ['More intent group layer', '.r2-launcher-group', 'border-radius: var(--ez-r2-radius-xl)'],
  ['transaction context layer', '.r2-context-preview', 'border-radius: var(--ez-r2-radius-xl)'],
];

for (const [label, selector, rule] of selectorContracts) {
  if (!css.includes(selector)) errors.push(`${label}: missing selector ${selector}`);
  if (!css.includes(rule)) errors.push(`${label}: missing locked radius rule ${rule}`);
}

for (const marker of [
  '--r2-golden-shadow-soft',
  '--r2-golden-shadow-tight',
  'linear-gradient',
  'var(--ez-r2-surface-warm)',
  'var(--ez-r2-structure)',
  '@media (max-width: 42rem)',
  '@media (prefers-reduced-motion: reduce)',
]) {
  if (!css.includes(marker)) errors.push(`Golden polish CSS missing required depth/resilience marker: ${marker}`);
}

// The Golden polish layer must use the locked token system instead of inventing raw colors.
const rawColorMatches = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
if (rawColorMatches.length) errors.push(`Golden polish CSS must not contain raw color literals: ${[...new Set(rawColorMatches)].join(', ')}`);

for (const forbidden of ['ui-v2', 'ui-rebirth', '!important']) {
  if (css.includes(forbidden)) errors.push(`Golden polish CSS contains forbidden presentation marker: ${forbidden}`);
}

// Rebirth 2.0 is still parallel. Starting Golden must never silently cut over canonical runtime.
if (/ui-r2\/runtime\/UiR2Root/.test(main)) errors.push('R2.0-4 may not boot UiR2Root from canonical src/main.tsx');
if (!/ui-v2\/runtime\/UiV2Root/.test(main)) errors.push('R2.0-4 must preserve canonical ui-v2 runtime until final promotion');

if (errors.length) {
  console.error(`ENJAZ R2.0-4 GLOBAL VISUAL POLISH GUARD FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ R2.0-4 GLOBAL VISUAL POLISH GUARD PASS — identity preserved; hierarchy + depth + separation + soft corners + no-card-wall contract locked globally.');
}
