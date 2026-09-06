import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const json = (p) => JSON.parse(read(p));
const errors = [];
const stageOrder = ['R2.0-0','R2.0-1','R2.0-2','R2.0-3','R2.0-4','R2.0-5','R2.0-6','R2.0-7','R2.0-8','R2.0-9','R2.0-10','R2.0-11'];

const required = ['docs/UI_UX_REBIRTH_2_0_STATE.json','docs/UI_UX_REBIRTH_2_0_SHELL_MANIFEST.json','r2-preview.html','src/ui-r2/preview-main.tsx','src/ui-r2/runtime/UiR2Root.tsx','src/ui-r2/runtime/shell-base.css','src/ui-r2/runtime/shell.css','src/ui-r2/architecture/navigation-contract.ts','src/main.tsx','vite.config.ts','vite.r2-preview.config.ts','scripts/ui-rebirth-2-preview-budget-audit.mjs'];
for (const file of required) if (!exists(file)) errors.push(`missing frozen R2 shell artifact: ${file}`);
if (errors.length) { console.error('ENJAZ REBIRTH 2.0 FROZEN APPLICATION SHELL AUDIT FAIL'); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }

const state = json('docs/UI_UX_REBIRTH_2_0_STATE.json');
const manifest = json('docs/UI_UX_REBIRTH_2_0_SHELL_MANIFEST.json');
const shell = read('src/ui-r2/runtime/UiR2Root.tsx');
const css = read('src/ui-r2/runtime/shell.css');
const preview = read('src/ui-r2/preview-main.tsx');
const main = read('src/main.tsx');
const previewVite = read('vite.r2-preview.config.ts');
const stageIndex = stageOrder.indexOf(state.stage);
const uiV2Exists = exists('src/ui-v2');
const mainUsesProductionR2 = /ui-r2\/runtime\/UiR2ProductionRoot/.test(main);
const mainUsesLegacy = /ui-v2|ui-rebirth/.test(main);
const r210Candidate = state.stage === 'R2.0-10' && ['ACTIVE_ERADICATION','CLOSED'].includes(state.legacyEradication?.status) && !uiV2Exists && !exists('src/ui-rebirth') && state.featureParity?.migratedCapabilities === state.featureParity?.totalCapabilities && state.featureParity?.testedCapabilities === state.featureParity?.totalCapabilities && state.featureParity?.unresolvedCapabilities === 0 && mainUsesProductionR2 && !mainUsesLegacy && state.promotion?.requested === false && state.promotion?.allowed === false;

if (stageIndex < 3) errors.push(`Application Shell requires R2.0-3+, found ${state.stage}`);
if (stageIndex < 11 && state.runtime !== 'ui-v2') errors.push('machine canonical runtime label must remain ui-v2 until R2.0-11');
if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked');
if (state.applicationShell?.status !== 'CLOSED' || state.applicationShell?.exitGatePassed !== true || state.applicationShell?.canonicalRuntimeChanged !== false) errors.push('R2.0-3 shell closure must remain frozen');
if (manifest.stage !== 'R2.0-3' || manifest.status !== 'FROZEN' || manifest.primaryDoorCount !== 5 || manifest.minimumTouchPx !== 44) errors.push('shell manifest drifted');
for (const width of [1280,430,390,360,320]) if (!manifest.responsive?.hardWidths?.includes(width)) errors.push(`shell manifest missing width ${width}`);

const shellMarkers = ['data-r2-shell={SHELL_STAGE}','R2_PRIMARY_NAVIGATION.map','R2_LAUNCHER_GROUPS.map','R2_SEARCH_ALIASES','window.history[method]',"window.addEventListener('popstate'",'data-overlay="search"','data-overlay="account"','r2-shell__mobile-nav','r2-shell__rail'];
for (const marker of shellMarkers) if (!shell.includes(marker)) errors.push(`UiR2Root missing shell marker: ${marker}`);
for (const label of ['الرئيسية','المعاملات','جديد','اليوم','المزيد']) if (!read('src/ui-r2/architecture/navigation-contract.ts').includes(label)) errors.push(`navigation contract missing ${label}`);
if (!css.includes('min-inline-size: 20rem')) errors.push('shell must preserve 320px hard minimum');
if (!css.includes('@media (min-width: 60rem)')) errors.push('shell desktop breakpoint missing');
if (!css.includes('@media (prefers-reduced-motion: reduce)')) errors.push('shell reduced-motion treatment missing');

const isolatedPreviewPath = 'src/ui-r2/runtime/UiR2PreviewRoot.tsx';
if (stageIndex >= 10 && exists(isolatedPreviewPath)) {
  const isolated = read(isolatedPreviewPath);
  for (const marker of shellMarkers) if (!isolated.includes(marker)) errors.push(`UiR2PreviewRoot missing frozen marker: ${marker}`);
  if (/ConnectedCoreWorkRouter|ConnectedR2Home|UiR2ProductionRoot|features\/auth|data\//.test(isolated)) errors.push('isolated preview may not import production adapters');
  if (!preview.includes("from './runtime/UiR2PreviewRoot.tsx'")) errors.push('R2.0-10 isolated preview must boot UiR2PreviewRoot');
} else if (!preview.includes("from './runtime/UiR2Root.tsx'")) errors.push('preview must boot UiR2Root before isolation');
if (!preview.includes("./runtime/shell.css") || !preview.includes("./runtime/shell-base.css")) errors.push('preview must load shell layers');
if (!previewVite.includes("input: 'r2-preview.html'") || !previewVite.includes("outDir: 'dist-r2-preview'")) errors.push('isolated preview Vite contract drifted');

if (state.stage === 'R2.0-10') {
  if (uiV2Exists && mainUsesProductionR2) errors.push('R2 candidate may not boot before ui-v2 physical deletion');
  if (!uiV2Exists && !r210Candidate) errors.push('post-delete R2.0-10 must boot guarded UiR2ProductionRoot candidate with 35/35 parity');
}
if (stageIndex < 10 && (mainUsesProductionR2 || /ui-r2\/runtime\/UiR2Root/.test(main))) errors.push('R2 boot forbidden before R2.0-10 eradication');
if (/ui-v2|ui-rebirth/.test(shell) || /ui-v2|ui-rebirth/.test(css)) errors.push('R2 shell contains legacy presentation DNA');

if (errors.length) {
  console.error(`ENJAZ REBIRTH 2.0 FROZEN APPLICATION SHELL AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else console.log(`ENJAZ REBIRTH 2.0 FROZEN APPLICATION SHELL AUDIT PASS — shell preserved at ${state.stage}.`);
