import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const errors = [];

const paths = {
  state: 'docs/UI_UX_REBIRTH_2_0_STATE.json', parity: 'docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json',
  evidence: 'docs/UI_UX_REBIRTH_2_0_CORE_WORK_EVIDENCE.json', component: 'src/ui-r2/core-work/CoreWorkExperience.tsx',
  connected: 'src/ui-r2/core-work/CoreWorkConnected.tsx', css: 'src/ui-r2/core-work/core-work.css',
  root: 'src/ui-r2/runtime/UiR2Root.tsx', preview: 'src/ui-r2/preview-main.tsx',
  browser: 'tests-external/r2-core-work.spec.cjs', main: 'src/main.tsx',
};
for (const [name, file] of Object.entries(paths)) if (!exists(file)) errors.push(`missing R2.0-5 ${name}: ${file}`);
if (errors.length) { console.error('ENJAZ R2.0-5 CORE WORK AUDIT FAIL'); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }

const state = json(paths.state);
const parity = json(paths.parity);
const evidence = json(paths.evidence);
const component = read(paths.component);
const connected = read(paths.connected);
const css = read(paths.css);
const uiRoot = read(paths.root);
const preview = read(paths.preview);
const browser = read(paths.browser);
const main = read(paths.main);

if (state.stage !== 'R2.0-5') errors.push(`core work guard requires stage R2.0-5, found ${state.stage}`);
if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked');
if (state.runtime !== 'ui-v2') errors.push('canonical runtime must remain ui-v2 during R2.0-5');
if (state.goldenExperience?.status !== 'APPROVED' || state.goldenExperience?.userApproved !== true) errors.push('R2.0-5 requires the approved Golden Experience');
if (state.coreWorkMigration?.status !== 'ACTIVE' && state.coreWorkMigration?.status !== 'CLOSED') errors.push('coreWorkMigration status must be ACTIVE or CLOSED');
if (state.coreWorkMigration?.canonicalRuntimeChanged !== false) errors.push('R2.0-5 cannot change canonical runtime');
if (state.promotion?.requested !== false || state.promotion?.allowed !== false) errors.push('canonical promotion must remain blocked');
if (/ui-r2\/runtime\/UiR2Root/.test(main)) errors.push('src/main.tsx must not boot UiR2Root before R2.0-11');

if (evidence.stage !== 'R2.0-5') errors.push('core evidence stage must be R2.0-5');
if (JSON.stringify(evidence.scope) !== JSON.stringify(['transactions','today','followups','relatedDocuments','createEdit','lifecyclePresentation'])) errors.push('R2.0-5 scope drifted');
if (JSON.stringify(evidence.hardWidths) !== JSON.stringify([1280,430,390,360,320])) errors.push('R2.0-5 hard widths drifted');
if (evidence.truthfulness?.canonicalRuntimeChanged !== false || evidence.truthfulness?.productionWritesClaimedByPreview !== false || evidence.truthfulness?.generalNotificationsClaimedAuthoritative !== false || evidence.truthfulness?.fullDocumentsVaultClaimedAuthoritative !== false || evidence.truthfulness?.phase55Locked !== true) errors.push('R2.0-5 truthfulness contract drifted');

const parityIds = new Set((parity.capabilities ?? []).map((item) => item.id));
if (!Array.isArray(evidence.targetCapabilities) || evidence.targetCapabilities.length !== 16) errors.push('R2.0-5 must track exactly 16 scoped capability IDs');
for (const id of evidence.targetCapabilities ?? []) if (!parityIds.has(id)) errors.push(`R2.0-5 evidence references unknown parity capability: ${id}`);
for (const forbiddenId of ['global.notifications','documents.workspace','followups.workspace']) if (evidence.targetCapabilities?.includes(forbiddenId)) errors.push(`R2.0-5 may not overclaim later capability: ${forbiddenId}`);

for (const marker of [
  "daily-work/dailyWorkPreview.ts", "transactions/transactionListPreview.ts", "transactions/transactionListModel.ts",
  "transactions/transactionEditorPreview.ts", "transactions/transactionEditorModel.ts", "transactions/transaction360Preview.ts",
  "transactions/transaction360Model.ts", "transactions/transactionLifecycleModel.ts",
  'buildTransactionListSnapshot', 'buildDailyWorkPreviewSnapshot', 'validateTransactionEditorDraft', 'normalizeTransactionEditorDraft',
  'buildTransaction360Snapshot', 'transactionLifecycleCapabilities', 'buildTransactionLifecyclePatch',
  'data-core-work="transactions"', 'data-core-work="today"', 'data-screen="core-followups"', 'data-core-work="create"',
  'data-core-work="transaction-360"', 'data-core-work="transaction-editor"', 'data-core-work="transaction-lifecycle"',
  'لم تتغير أي بيانات إنتاجية', 'الإشعارات العامة',
]) if (!component.includes(marker)) errors.push(`core work preview component missing authoritative/truthfulness marker: ${marker}`);

for (const marker of [
  "daily-work/useDailyWork.ts", "transactions/useTransactionList.ts", "transactions/useTransactionEditor.ts",
  "transactions/useTransaction360.ts", "transactions/useTransactionLifecycle.ts",
  'useDailyWork()', 'useTransactionList()', 'useTransactionEditor(', 'useTransaction360(', 'useTransactionLifecycle(',
  'controller.complete(item)', 'controller.snooze(item)', 'controller.submit()', 'controller.execute(action, note)',
  'data-core-connected="transactions"', "data-core-connected={followupsOnly ? 'followups' : 'today'}",
  'data-core-connected="transaction-editor"', 'data-core-connected="transaction-360"', 'data-core-connected="transaction-lifecycle"',
  'ConnectedCoreWorkRouter', 'transactionEditorService', 'transaction360Service', 'transactionLifecycleService',
]) if (!connected.includes(marker)) errors.push(`R2.0-5 live adapter missing connection marker: ${marker}`);

for (const text of [component, connected]) {
  for (const forbidden of ['ui-v2','ui-rebirth']) if (text.includes(forbidden)) errors.push(`core work code imports/references forbidden legacy presentation marker: ${forbidden}`);
  if (/\b(?:fetch|localStorage|sessionStorage)\s*\(/.test(text)) errors.push('core work presentation may not create an ad-hoc persistence/data channel');
}
if (/PreviewSource|PreviewSnapshot|buildTransactionListPreviewSource|buildDailyWorkPreviewSnapshot/.test(connected)) errors.push('live CoreWorkConnected adapter may not import preview fixtures');

for (const marker of ['data-core-work-stage="R2.0-5"','CoreTransactions','CoreToday','CoreCreate','CoreFollowups','CoreTransactionExperience','searchParams.set(\'tx\'','transactionId']) if (!uiRoot.includes(marker)) errors.push(`UiR2Root missing R2.0-5 preview integration marker: ${marker}`);
if (!preview.includes("'./core-work/core-work.css'")) errors.push('preview must load R2.0-5 core-work CSS');

for (const marker of ['.r2-core-toolbar','.r2-core-focus','.r2-core-work-row','.r2-core-lifecycle-facts','border-radius','box-shadow','@media (max-width:42rem)','@media (max-width:22rem)','@media (prefers-reduced-motion:reduce)']) if (!css.includes(marker)) errors.push(`core work CSS missing polish/resilience marker: ${marker}`);
const rawColors = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
if (rawColors.length) errors.push(`core work CSS contains raw color literals: ${[...new Set(rawColors)].join(', ')}`);
if (/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/i.test(css)) errors.push('core work CSS contains forbidden functional color syntax');
if (css.includes('!important')) errors.push('core work CSS may not use !important');

for (const width of [1280,430,390,360,320]) if (!browser.includes(String(width))) errors.push(`R2.0-5 browser test missing hard width ${width}`);
for (const marker of ['data-core-work-stage="R2.0-5"','بحث المعاملات','فتح المعاملة 1038','سببًا واضحًا','محاكاة الأرشفة','محاكاة إعادة التنشيط','data-work-source="followup"','assertNoHorizontalOverflow','assertTouchTargets']) if (!browser.includes(marker)) errors.push(`R2.0-5 browser test missing real scenario marker: ${marker}`);

if (state.coreWorkMigration?.status === 'CLOSED') {
  if (state.coreWorkMigration?.exitGatePassed !== true || evidence.exitGatePassed !== true || evidence.status !== 'CLOSED') errors.push('closed R2.0-5 requires closed evidence and exit gate PASS');
  if (!state.coreWorkMigration?.evidenceManifest || state.coreWorkMigration.evidenceManifest !== paths.evidence) errors.push('closed R2.0-5 state must point to core evidence');
  if (evidence.connectedAdapter !== paths.connected) errors.push('closed R2.0-5 evidence must pin the live connected adapter');
  const migrated = new Set((parity.capabilities ?? []).filter((item) => item.migrated === true).map((item) => item.id));
  const tested = new Set((parity.capabilities ?? []).filter((item) => item.tested === true).map((item) => item.id));
  for (const id of evidence.targetCapabilities) {
    if (!migrated.has(id)) errors.push(`closed R2.0-5 capability not marked migrated: ${id}`);
    if (!tested.has(id)) errors.push(`closed R2.0-5 capability not marked tested: ${id}`);
  }
  if (state.featureParity?.migratedCapabilities !== migrated.size || state.featureParity?.testedCapabilities !== tested.size) errors.push('state parity counts must match parity registry');
}

if (errors.length) { console.error(`ENJAZ R2.0-5 CORE WORK AUDIT FAIL (${errors.length})`); errors.forEach((e) => console.error(`- ${e}`)); process.exitCode = 1; }
else console.log(`ENJAZ R2.0-5 CORE WORK AUDIT PASS — ${state.coreWorkMigration?.status}; preview proof + live feature-hook adapters preserve services, data truth and visual contract without canonical cutover.`);
