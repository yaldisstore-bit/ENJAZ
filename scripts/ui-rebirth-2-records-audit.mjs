import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const exists = (p) => fs.existsSync(path.join(root, p));
const errors = [];
const stageOrder = ['R2.0-0','R2.0-1','R2.0-2','R2.0-3','R2.0-4','R2.0-5','R2.0-6','R2.0-7','R2.0-8','R2.0-9','R2.0-10','R2.0-11'];

const paths = {
  state: 'docs/UI_UX_REBIRTH_2_0_STATE.json',
  parity: 'docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json',
  evidence: 'docs/UI_UX_REBIRTH_2_0_RECORDS_EVIDENCE.json',
  component: 'src/ui-r2/records/RecordsRelationshipsExperience.tsx',
  css: 'src/ui-r2/records/records.css',
  root: 'src/ui-r2/runtime/UiR2Root.tsx',
  preview: 'src/ui-r2/preview-main.tsx',
  browser: 'tests-external/r2-records.spec.cjs',
  main: 'src/main.tsx',
};
for (const [name, file] of Object.entries(paths)) if (!exists(file)) errors.push(`missing R2.0-6 ${name}: ${file}`);
if (errors.length) { console.error('ENJAZ R2.0-6 RECORDS AUDIT FAIL'); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }

const state = json(paths.state);
const parity = json(paths.parity);
const evidence = json(paths.evidence);
const component = read(paths.component);
const css = read(paths.css);
const uiRoot = read(paths.root);
const preview = read(paths.preview);
const browser = read(paths.browser);
const main = read(paths.main);
const stageIndex = stageOrder.indexOf(state.stage);

if (stageIndex < 6) errors.push(`records guard requires R2.0-6 or later, found ${state.stage}`);
if (stageIndex > 6 && state.recordsRelationships?.status !== 'CLOSED') errors.push(`R2.0-6 must remain CLOSED after advancing to ${state.stage}`);
if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked');
if (state.runtime !== 'ui-v2') errors.push('canonical runtime must remain ui-v2 before R2.0-11');
if (state.goldenExperience?.status !== 'APPROVED' || state.goldenExperience?.userApproved !== true) errors.push('R2.0-6 requires approved Golden identity');
if (state.coreWorkMigration?.status !== 'CLOSED' || state.coreWorkMigration?.exitGatePassed !== true) errors.push('R2.0-5 must remain closed before R2.0-6');
if (!['ACTIVE','CLOSED'].includes(state.recordsRelationships?.status)) errors.push('recordsRelationships status must be ACTIVE or CLOSED');
if (state.recordsRelationships?.entityFirstComposition !== true) errors.push('R2.0-6 requires entity-first composition');
if (state.recordsRelationships?.canonicalRuntimeChanged !== false) errors.push('R2.0-6 cannot change canonical runtime');
if (state.promotion?.requested !== false || state.promotion?.allowed !== false) errors.push('canonical promotion must remain blocked');
if (/ui-r2\/runtime\/UiR2Root/.test(main)) errors.push('src/main.tsx must not boot UiR2Root before R2.0-11');

const expectedScope = ['companies','peopleLawyers','documentsReports'];
if (evidence.stage !== 'R2.0-6') errors.push('records evidence stage must be R2.0-6');
if (JSON.stringify(evidence.scope) !== JSON.stringify(expectedScope)) errors.push('R2.0-6 scope drifted');
if (JSON.stringify(evidence.targetCapabilities) !== JSON.stringify(['companies.workspace','people.workspace','documents.workspace'])) errors.push('R2.0-6 target capabilities drifted');
if (JSON.stringify(evidence.hardWidths) !== JSON.stringify([1280,430,390,360,320])) errors.push('R2.0-6 hard widths drifted');
if (evidence.composition?.entityFirst !== true || evidence.composition?.universalCardTemplateForbidden !== true) errors.push('entity-first evidence contract drifted');
if (evidence.truthfulness?.canonicalRuntimeChanged !== false || evidence.truthfulness?.phase55Locked !== true || evidence.truthfulness?.fakeCrudClaimed !== false || evidence.truthfulness?.fakeUploadClaimed !== false || evidence.truthfulness?.productionWritesClaimedByPreview !== false) errors.push('R2.0-6 truthfulness contract drifted');

const parityById = new Map((parity.capabilities ?? []).map((item) => [item.id, item]));
for (const id of evidence.targetCapabilities) if (!parityById.has(id)) errors.push(`unknown parity capability: ${id}`);
for (const forbidden of ['finance.workspace','workflow.workspace','automation.workspace','operations.workspace','command.workspace','risk.workspace','copilot.workspace','followups.workspace','global.notifications']) if (evidence.targetCapabilities.includes(forbidden)) errors.push(`R2.0-6 may not overclaim later capability: ${forbidden}`);

for (const marker of [
  'data-records-stage="R2.0-6"',
  'data-records-domain="companies"',
  'data-records-domain="people"',
  'data-records-domain="documents"',
  'data-entity-first="true"',
  'RecordsRelationshipsExperience',
  'بحث الشركات',
  'بحث الأشخاص',
  'فئات الوثائق',
  'خريطة العلاقات',
  'عرض فقط في R2.0-6',
  'لا تنفّذ إنشاءً أو تعديلًا أو رفع ملفات إنتاجية',
]) if (!component.includes(marker)) errors.push(`records component missing required marker: ${marker}`);

for (const forbidden of ['ui-v2','ui-rebirth']) if (component.includes(forbidden)) errors.push(`records component references legacy presentation marker: ${forbidden}`);
if (/\b(?:fetch|localStorage|sessionStorage)\s*\(/.test(component)) errors.push('records presentation may not create ad-hoc persistence/data channels');

for (const marker of [
  "../records/RecordsRelationshipsExperience.tsx",
  "id === 'companies' || id === 'people' || id === 'documents'",
  'data-records-stage="R2.0-6"',
]) if (!uiRoot.includes(marker)) errors.push(`UiR2Root missing R2.0-6 integration marker: ${marker}`);
if (!preview.includes("'./records/records.css'")) errors.push('preview must load R2.0-6 records CSS');

for (const marker of ['.r2-records-workspace','.r2-records-entity-profile','.r2-records-person-profile','.r2-documents-layout','border-radius','box-shadow','@media (max-width:42rem)','@media (max-width:22rem)','@media (prefers-reduced-motion:reduce)']) if (!css.includes(marker)) errors.push(`records CSS missing composition/resilience marker: ${marker}`);
const rawColors = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
if (rawColors.length) errors.push(`records CSS contains raw color literals: ${[...new Set(rawColors)].join(', ')}`);
if (/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/i.test(css)) errors.push('records CSS contains forbidden functional color syntax');
if (css.includes('!important')) errors.push('records CSS may not use !important');

for (const width of [1280,430,390,360,320]) if (!browser.includes(String(width))) errors.push(`records browser test missing hard width ${width}`);
for (const marker of ['بحث الشركات','فتح شركة شركة الفجر','بحث الأشخاص','فتح شخص نور حسين','معاينة عقد تأسيس.pdf','assertNoHorizontalOverflow','assertTouchTargets']) if (!browser.includes(marker)) errors.push(`records browser test missing scenario marker: ${marker}`);

if (state.recordsRelationships?.status === 'CLOSED') {
  if (state.recordsRelationships?.exitGatePassed !== true || evidence.exitGatePassed !== true || evidence.status !== 'CLOSED') errors.push('closed R2.0-6 requires closed evidence and exit gate PASS');
  if (state.recordsRelationships?.evidenceManifest !== paths.evidence) errors.push('closed R2.0-6 state must pin records evidence manifest');
  if (!state.recordsRelationships?.closureRecord || !exists(state.recordsRelationships.closureRecord)) errors.push('closed R2.0-6 requires closure record');
  const migrated = new Set((parity.capabilities ?? []).filter((item) => item.migrated === true).map((item) => item.id));
  const tested = new Set((parity.capabilities ?? []).filter((item) => item.tested === true).map((item) => item.id));
  for (const id of evidence.targetCapabilities) {
    if (!migrated.has(id)) errors.push(`closed R2.0-6 capability not marked migrated: ${id}`);
    if (!tested.has(id)) errors.push(`closed R2.0-6 capability not marked tested: ${id}`);
  }
  if (state.featureParity?.migratedCapabilities !== migrated.size || state.featureParity?.testedCapabilities !== tested.size) errors.push('state parity counts must match parity registry');
}

if (errors.length) { console.error(`ENJAZ R2.0-6 RECORDS AUDIT FAIL (${errors.length})`); errors.forEach((e) => console.error(`- ${e}`)); process.exitCode = 1; }
else console.log(`ENJAZ R2.0-6 RECORDS AUDIT PASS — preserved at ${state.stage}; entity-first records stay truthful, responsive and isolated.`);
