import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const errors = [];

const paths = {
  state: 'docs/UI_UX_REBIRTH_2_0_STATE.json',
  evidence: 'docs/UI_UX_REBIRTH_2_0_GOLDEN_EVIDENCE.json',
  contract: 'docs/UI_UX_REBIRTH_2_0_GLOBAL_VISUAL_POLISH_CONTRACT.json',
  root: 'src/ui-r2/runtime/UiR2Root.tsx',
  journey: 'src/ui-r2/golden/GoldenTransactionExperience.tsx',
  css: 'src/ui-r2/golden/golden-journey.css',
  preview: 'src/ui-r2/preview-main.tsx',
  test: 'tests-external/r2-golden.spec.cjs',
};

for (const [name, file] of Object.entries(paths)) {
  if (!exists(file)) errors.push(`missing Golden ${name} artifact: ${file}`);
}

if (errors.length) {
  console.error('ENJAZ R2.0-4 GOLDEN SPECIMEN AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const state = json(paths.state);
const evidence = json(paths.evidence);
const contract = json(paths.contract);
const uiRoot = read(paths.root);
const journey = read(paths.journey);
const css = read(paths.css);
const preview = read(paths.preview);
const test = read(paths.test);

const requiredSpecimens = ['home', 'more', 'transactions', 'transactionJourney', 'transaction360'];
const hardWidths = [1280, 430, 390, 360, 320];

if (state.stage !== 'R2.0-4') errors.push(`Golden specimen guard requires stage R2.0-4, found ${state.stage}`);
if (state.runtime !== 'ui-v2') errors.push('canonical runtime must remain ui-v2 during Golden approval');
if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked during Golden work');
if (state.goldenExperience?.implemented !== true) errors.push('all five Golden specimens must be implemented before this guard passes');
if (state.goldenExperience?.completedSpecimens !== 5) errors.push('completedSpecimens must equal 5');
if (JSON.stringify(state.goldenExperience?.requiredSpecimens) !== JSON.stringify(requiredSpecimens)) errors.push('required Golden specimen list drifted');
if (state.goldenExperience?.evidenceManifest !== paths.evidence) errors.push('state must point to the Golden evidence manifest');
if (state.goldenExperience?.userApproved !== false) errors.push('userApproved must remain false until explicit user approval');
if (state.goldenExperience?.approvedCommit !== null) errors.push('approvedCommit must remain null before explicit user approval');
if (state.promotion?.requested !== false || state.promotion?.allowed !== false) errors.push('R2.0-4 may not request or allow canonical promotion');

if (contract.status !== 'LOCKED' || contract.scope !== 'all-r2-presentation') errors.push('global visual polish contract must remain globally locked');

for (const marker of [
  'data-screen="home"',
  'data-screen="transactions"',
  'data-screen="more"',
  "from '../golden/GoldenTransactionExperience.tsx'",
  'data-golden-stage="R2.0-4"',
  'r2-transaction-search',
]) if (!uiRoot.includes(marker)) errors.push(`UiR2Root missing Golden marker: ${marker}`);

for (const marker of [
  'data-screen="golden-transaction-360"',
  'data-screen="golden-transaction-editor"',
  'data-screen="golden-transaction-lifecycle"',
  "'overview'",
  "'activity'",
  "'followups'",
  "'documents'",
  "'finance'",
  "navigate('transactions.editor')",
  "navigate('transactions.lifecycle')",
  "navigate('transactions.detail')",
]) if (!journey.includes(marker)) errors.push(`Golden transaction journey missing marker: ${marker}`);

for (const marker of [
  '.r2-golden-transaction__hero',
  '.r2-golden-context-tabs',
  '.r2-golden-context-layout',
  '.r2-golden-panel',
  '.r2-golden-form',
  '.r2-golden-lifecycle__body',
  'border-radius',
  'box-shadow',
  '@media (min-width: 48rem)',
  '@media (max-width: 47.99rem)',
  '@media (max-width: 22rem)',
  '@media (prefers-reduced-motion: reduce)',
]) if (!css.includes(marker)) errors.push(`Golden journey CSS missing resilience marker: ${marker}`);

if (!preview.includes("'./golden/golden.css'") || !preview.includes("'./golden/golden-journey.css'")) {
  errors.push('isolated R2 preview must load both Golden presentation layers');
}

if (JSON.stringify(evidence.hardWidths) !== JSON.stringify(hardWidths)) errors.push('Golden evidence hard-width set drifted');
if (evidence.browserTest !== paths.test) errors.push('Golden evidence must point to the real browser test');
if (!Array.isArray(evidence.specimens) || evidence.specimens.length !== 5) errors.push('Golden evidence manifest must describe exactly five specimens');
for (const id of requiredSpecimens) if (!evidence.specimens?.some((item) => item.id === id)) errors.push(`Golden evidence manifest missing specimen: ${id}`);

for (const width of hardWidths) if (!test.includes(String(width))) errors.push(`Golden browser test missing hard width ${width}`);
for (const marker of [
  'golden-transaction-360',
  'golden-transaction-editor',
  'golden-transaction-lifecycle',
  'بحث المعاملات',
  'محاكاة الأرشفة',
  'assertNoHorizontalOverflow',
  'assertRoundedAndLayered',
]) if (!test.includes(marker)) errors.push(`Golden real-browser test missing scenario marker: ${marker}`);

for (const forbidden of ['ui-v2', 'ui-rebirth', '!important']) {
  if (journey.includes(forbidden) || css.includes(forbidden)) errors.push(`Golden specimen contains forbidden legacy/presentation marker: ${forbidden}`);
}

const rawColors = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
if (rawColors.length) errors.push(`Golden journey CSS contains raw color literals: ${[...new Set(rawColors)].join(', ')}`);

if (errors.length) {
  console.error(`ENJAZ R2.0-4 GOLDEN SPECIMEN AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ R2.0-4 GOLDEN SPECIMEN AUDIT PASS — Home + More + Transactions + full transaction journey + 360 are implemented, guarded and awaiting real-browser/user approval.');
}
