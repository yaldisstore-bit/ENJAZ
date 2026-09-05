import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const errors = [];
const stageOrder = ['R2.0-0','R2.0-1','R2.0-2','R2.0-3','R2.0-4','R2.0-5','R2.0-6','R2.0-7','R2.0-8','R2.0-9','R2.0-10','R2.0-11'];

const paths = {
  state: 'docs/UI_UX_REBIRTH_2_0_STATE.json', evidence: 'docs/UI_UX_REBIRTH_2_0_GOLDEN_EVIDENCE.json',
  contract: 'docs/UI_UX_REBIRTH_2_0_GLOBAL_VISUAL_POLISH_CONTRACT.json', root: 'src/ui-r2/runtime/UiR2Root.tsx',
  goldenJourney: 'src/ui-r2/golden/GoldenTransactionExperience.tsx', goldenCss: 'src/ui-r2/golden/golden-journey.css',
  preview: 'src/ui-r2/preview-main.tsx', test: 'tests-external/r2-golden.spec.cjs',
};
for (const [name, file] of Object.entries(paths)) if (!exists(file)) errors.push(`missing Golden ${name} artifact: ${file}`);
if (errors.length) { console.error('ENJAZ R2.0-4+ GOLDEN SPECIMEN AUDIT FAIL'); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }

const state = json(paths.state);
const evidence = json(paths.evidence);
const contract = json(paths.contract);
const uiRoot = read(paths.root);
const journey = read(paths.goldenJourney);
const css = read(paths.goldenCss);
const preview = read(paths.preview);
const test = read(paths.test);
const stageIndex = stageOrder.indexOf(state.stage);
const golden = state.goldenExperience ?? {};
const requiredSpecimens = ['home','more','transactions','transactionJourney','transaction360'];
const hardWidths = [1280,430,390,360,320];

if (stageIndex < 4) errors.push(`Golden specimen guard requires R2.0-4 or later, found ${state.stage}`);
if (stageIndex >= 4 && stageIndex < 11 && state.runtime !== 'ui-v2') errors.push('canonical runtime must remain ui-v2 before R2.0-11 promotion');
if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked during Rebirth 2.0');
if (golden.implemented !== true || golden.completedSpecimens !== 5) errors.push('all five approved Golden specimens must remain implemented');
if (JSON.stringify(golden.requiredSpecimens) !== JSON.stringify(requiredSpecimens)) errors.push('required Golden specimen list drifted');
if (golden.evidenceManifest !== paths.evidence) errors.push('state must point to Golden evidence');
if (golden.userApproved === true) {
  if (golden.status !== 'APPROVED') errors.push('approved Golden must stay APPROVED');
  if (!golden.approvedCommit || !golden.approvalRecord || !exists(golden.approvalRecord)) errors.push('approved Golden requires pinned commit and approval record');
  if (evidence.userApproval?.approved !== true || evidence.userApproval?.approvedCommit !== golden.approvedCommit) errors.push('Golden evidence must mirror approval');
} else if (stageIndex >= 5) errors.push('R2.0-5+ requires explicit Golden approval');
if (stageIndex < 11 && (state.promotion?.requested !== false || state.promotion?.allowed !== false)) errors.push('canonical promotion must remain blocked before R2.0-11');
if (contract.status !== 'LOCKED' || contract.scope !== 'all-r2-presentation') errors.push('global polish contract must remain locked');

for (const marker of ['data-screen="home"','data-screen="more"','data-golden-stage="R2.0-4"']) if (!uiRoot.includes(marker)) errors.push(`UiR2Root missing frozen Golden marker: ${marker}`);
if (stageIndex === 4) {
  for (const marker of ['data-screen="transactions"',"from '../golden/GoldenTransactionExperience.tsx'",'r2-transaction-search']) if (!uiRoot.includes(marker)) errors.push(`R2.0-4 root missing Golden marker: ${marker}`);
} else if (stageIndex >= 5) {
  for (const marker of ["from '../core-work/CoreWorkExperience.tsx'",'CoreTransactions','CoreTransactionExperience','data-core-work-stage="R2.0-5"']) if (!uiRoot.includes(marker)) errors.push(`post-Golden root missing approved migration marker: ${marker}`);
}

for (const marker of ['data-screen="golden-transaction-360"','data-screen="golden-transaction-editor"','data-screen="golden-transaction-lifecycle"',"'overview'","'activity'","'followups'","'documents'","'finance'","navigate('transactions.editor')","navigate('transactions.lifecycle')","navigate('transactions.detail')"]) {
  if (!journey.includes(marker)) errors.push(`frozen Golden source missing marker: ${marker}`);
}
for (const marker of ['.r2-golden-transaction__hero','.r2-golden-context-tabs','.r2-golden-context-layout','.r2-golden-panel','.r2-golden-form','.r2-golden-lifecycle__body','border-radius','box-shadow','@media (min-width: 48rem)','@media (max-width: 47.99rem)','@media (max-width: 22rem)','@media (prefers-reduced-motion: reduce)']) if (!css.includes(marker)) errors.push(`Golden CSS missing resilience marker: ${marker}`);
if (!preview.includes("'./golden/golden.css'") || !preview.includes("'./golden/golden-journey.css'")) errors.push('R2 preview must keep approved Golden presentation layers');
if (JSON.stringify(evidence.hardWidths) !== JSON.stringify(hardWidths)) errors.push('Golden hard widths drifted');
if (evidence.browserTest !== paths.test) errors.push('Golden evidence must point to browser test');
if (!Array.isArray(evidence.specimens) || evidence.specimens.length !== 5) errors.push('Golden evidence must describe five specimens');
for (const id of requiredSpecimens) if (!evidence.specimens?.some((item) => item.id === id)) errors.push(`Golden evidence missing specimen: ${id}`);
for (const width of hardWidths) if (!test.includes(String(width))) errors.push(`Golden browser regression missing width ${width}`);
for (const marker of ['golden-transaction-360','golden-transaction-editor','golden-transaction-lifecycle','بحث المعاملات','محاكاة الأرشفة','assertNoHorizontalOverflow','assertRoundedAndLayered']) if (!test.includes(marker)) errors.push(`Golden browser regression missing marker: ${marker}`);
for (const forbidden of ['ui-v2','ui-rebirth','!important']) if (journey.includes(forbidden) || css.includes(forbidden)) errors.push(`frozen Golden source contains forbidden marker: ${forbidden}`);
const rawColors = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
if (rawColors.length) errors.push(`Golden CSS contains raw colors: ${[...new Set(rawColors)].join(', ')}`);

if (errors.length) { console.error(`ENJAZ R2.0-4+ GOLDEN SPECIMEN AUDIT FAIL (${errors.length})`); errors.forEach((e) => console.error(`- ${e}`)); process.exitCode = 1; }
else console.log(`ENJAZ R2.0-4+ GOLDEN SPECIMEN AUDIT PASS — ${state.stage}; approved specimen remains frozen while authoritative presentation may migrate.`);
