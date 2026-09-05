import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const readJson = (p) => JSON.parse(read(p));
const errors = [];

const stageOrder = [
  'R2.0-0',
  'R2.0-1',
  'R2.0-2',
  'R2.0-3',
  'R2.0-4',
  'R2.0-5',
  'R2.0-6',
  'R2.0-7',
  'R2.0-8',
  'R2.0-9',
  'R2.0-10',
  'R2.0-11',
];

const required = [
  'docs/UI_UX_REBIRTH_2_0_STATE.json',
  'docs/UI_UX_REBIRTH_2_0_SHELL_MANIFEST.json',
  'r2-preview.html',
  'src/ui-r2/preview-main.tsx',
  'src/ui-r2/runtime/UiR2Root.tsx',
  'src/ui-r2/runtime/shell-base.css',
  'src/ui-r2/runtime/shell.css',
  'src/ui-r2/architecture/navigation-contract.ts',
  'src/main.tsx',
  'vite.config.ts',
  'vite.r2-preview.config.ts',
  'scripts/ui-rebirth-2-preview-budget-audit.mjs',
];

for (const file of required) if (!exists(file)) errors.push(`missing frozen R2.0-3 shell artifact: ${file}`);

if (!errors.length) {
  const state = readJson('docs/UI_UX_REBIRTH_2_0_STATE.json');
  const manifest = readJson('docs/UI_UX_REBIRTH_2_0_SHELL_MANIFEST.json');
  const shell = read('src/ui-r2/runtime/UiR2Root.tsx');
  const css = read('src/ui-r2/runtime/shell.css');
  const preview = read('src/ui-r2/preview-main.tsx');
  const previewHtml = read('r2-preview.html');
  const main = read('src/main.tsx');
  const vite = read('vite.config.ts');
  const previewVite = read('vite.r2-preview.config.ts');
  const stageIndex = stageOrder.indexOf(state.stage);
  const isolatedPreviewAllowed = stageIndex >= 10;
  const isolatedPreviewPath = 'src/ui-r2/runtime/UiR2PreviewRoot.tsx';
  const isolatedPreview = isolatedPreviewAllowed && exists(isolatedPreviewPath) ? read(isolatedPreviewPath) : null;

  if (stageIndex < 3) errors.push(`frozen Application Shell requires stage R2.0-3 or later, found ${state.stage}`);
  if (stageIndex < 11 && state.runtime !== 'ui-v2') errors.push('canonical runtime must remain ui-v2 until R2.0-11 promotion');
  if (state.phase55Locked !== true) errors.push('Phase 5.5 must remain locked while Rebirth 2.0 is active');
  if (state.applicationShell?.status !== 'CLOSED' || state.applicationShell?.exitGatePassed !== true) errors.push('applicationShell state must remain CLOSED with exitGatePassed=true');
  if (state.applicationShell?.canonicalRuntimeChanged !== false) errors.push('the frozen R2.0-3 shell may not claim canonical runtime cutover');
  if (stageIndex === 3 && (state.goldenExperience?.implemented !== false || state.goldenExperience?.userApproved !== false)) {
    errors.push('R2.0-3 itself must not claim Golden Experience implementation or approval');
  }

  if (manifest.stage !== 'R2.0-3' || manifest.status !== 'FROZEN' || manifest.exitGatePassed !== true) errors.push('shell manifest must remain frozen for R2.0-3 with exitGatePassed=true');
  if (manifest.primaryDoorCount !== 5 || manifest.primaryDoors?.length !== 5) errors.push('shell must contain exactly five primary doors');
  if (new Set(manifest.primaryDoors ?? []).size !== 5) errors.push('primary shell doors must be unique');
  if (manifest.canonicalRuntimeChanged !== false || manifest.canonicalRuntime !== 'ui-v2') errors.push('manifest must preserve ui-v2 canonical runtime');
  if (manifest.minimumTouchPx !== 44) errors.push('frozen shell minimum touch target must remain 44px');
  if (!manifest.historyFoundations?.pushState || !manifest.historyFoundations?.popState || !manifest.historyFoundations?.deepLinkQueryState) errors.push('shell history/deep-link foundations are incomplete');
  if (!manifest.responsive?.mobileDock || !manifest.responsive?.desktopRail) errors.push('shell must define both mobile dock and desktop rail behavior');
  for (const width of [1280, 430, 390, 360, 320]) if (!manifest.responsive?.hardWidths?.includes(width)) errors.push(`shell manifest missing hard viewport ${width}`);

  const shellMarkers = [
    'data-r2-shell={SHELL_STAGE}',
    'R2_PRIMARY_NAVIGATION.map',
    'R2_LAUNCHER_GROUPS.map',
    'R2_SEARCH_ALIASES',
    'window.history[method]',
    "window.addEventListener('popstate'",
    'data-overlay="search"',
    'data-overlay="account"',
    'r2-shell__mobile-nav',
    'r2-shell__rail',
  ];
  for (const marker of shellMarkers) if (!shell.includes(marker)) errors.push(`UiR2Root missing shell contract marker: ${marker}`);

  if (isolatedPreview) {
    for (const marker of shellMarkers) if (!isolatedPreview.includes(marker)) errors.push(`UiR2PreviewRoot missing frozen shell marker: ${marker}`);
    if (/ConnectedCoreWorkRouter|ConnectedR2Home|UiR2ProductionRoot|features\/auth|data\//.test(isolatedPreview)) {
      errors.push('isolated R2 preview root may not import production-connected adapters');
    }
  }

  for (const label of ['الرئيسية', 'المعاملات', 'جديد', 'اليوم', 'المزيد']) if (!read('src/ui-r2/architecture/navigation-contract.ts').includes(label)) errors.push(`navigation contract missing primary label: ${label}`);

  if (!css.includes('min-inline-size: 20rem')) errors.push('shell CSS must encode a 320px hard minimum viewport');
  if (!css.includes('min-block-size: var(--ez-r2-touch-min)') && !css.includes('min-block-size: 3.75rem')) errors.push('shell CSS missing production touch geometry');
  if (!css.includes('@media (min-width: 60rem)')) errors.push('shell CSS missing desktop composition breakpoint');
  if (!css.includes('@media (prefers-reduced-motion: reduce)')) errors.push('shell CSS missing reduced-motion treatment');

  const directPreviewBoot = preview.includes("from './runtime/UiR2Root.tsx'");
  const isolatedPreviewBoot = preview.includes("from './runtime/UiR2PreviewRoot.tsx'");
  if (!directPreviewBoot && !(isolatedPreviewAllowed && isolatedPreview && isolatedPreviewBoot)) {
    errors.push('isolated preview entry must boot UiR2Root or the guarded frozen UiR2PreviewRoot during R2.0-10+');
  }
  if (!preview.includes("./runtime/shell.css")) errors.push('isolated preview entry must load shell visual grammar');
  if (!preview.includes("./runtime/shell-base.css")) errors.push('isolated preview entry must load its bounded shell foundation');
  if (!previewHtml.includes('id="r2-root"')) errors.push('r2-preview.html missing isolated r2 root');

  if (vite.includes('r2-preview.html') || vite.includes('r2Preview')) errors.push('canonical Vite config must not package the R2 preview into the production runtime budget');
  if (!previewVite.includes("input: 'r2-preview.html'")) errors.push('dedicated preview Vite config must build r2-preview.html');
  if (!previewVite.includes("outDir: 'dist-r2-preview'")) errors.push('dedicated preview Vite config must isolate output in dist-r2-preview');

  if (stageIndex < 11 && /ui-r2\/runtime\/UiR2Root/.test(main)) errors.push('canonical src/main.tsx must not boot UiR2Root before R2.0-11');
  if (stageIndex < 11 && !/ui-v2\/runtime\/UiV2Root/.test(main)) errors.push('canonical src/main.tsx must continue to boot UiV2Root before R2.0-11');
  if (/ui-v2|ui-rebirth/.test(shell) || /ui-v2|ui-rebirth/.test(css)) errors.push('R2 shell may not import or reference old presentation generations');
}

if (errors.length) {
  console.error('ENJAZ REBIRTH 2.0 FROZEN APPLICATION SHELL AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const state = readJson('docs/UI_UX_REBIRTH_2_0_STATE.json');
  console.log(`ENJAZ REBIRTH 2.0 FROZEN APPLICATION SHELL AUDIT PASS — R2.0-3 shell preserved while current stage is ${state.stage}.`);
}
