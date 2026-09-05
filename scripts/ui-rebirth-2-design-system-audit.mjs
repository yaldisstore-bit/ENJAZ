import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));
const errors = [];

const statePath = 'docs/UI_UX_REBIRTH_2_0_STATE.json';
const manifestPath = 'docs/UI_UX_REBIRTH_2_0_DESIGN_SYSTEM_MANIFEST.json';
const foundationPath = 'src/ui-r2/tokens/foundation.css';
const palettePath = 'src/ui-r2/tokens/palette.css';
const cssPath = 'src/ui-r2/design-system/design-system.css';
const primitivesPath = 'src/ui-r2/design-system/primitives.tsx';
const indexPath = 'src/ui-r2/design-system/index.ts';

const stageOrder = ['R2.0-0','R2.0-1','R2.0-2','R2.0-3','R2.0-4','R2.0-5','R2.0-6','R2.0-7','R2.0-8','R2.0-9','R2.0-10','R2.0-11'];

if (!exists(statePath)) {
  console.error('ENJAZ R2.0 DESIGN SYSTEM AUDIT FAIL');
  console.error(`- missing ${statePath}`);
  process.exit(1);
}

const state = readJson(statePath);
const stageIndex = stageOrder.indexOf(state.stage);
if (stageIndex < 2) {
  console.log(`ENJAZ R2.0 DESIGN SYSTEM AUDIT SKIP — current stage ${state.stage}`);
  process.exit(0);
}

for (const required of [manifestPath, foundationPath, palettePath, cssPath, primitivesPath, indexPath]) {
  if (!exists(required)) errors.push(`missing Design System artifact: ${required}`);
}

if (errors.length) {
  console.error('ENJAZ R2.0 DESIGN SYSTEM AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const manifest = readJson(manifestPath);
const foundation = read(foundationPath);
const css = read(cssPath);
const primitives = read(primitivesPath);
const index = read(indexPath);

const approvedPalette = ['#F2F3F4', '#DED1C6', '#A77693', '#174871', '#0F2D4D'];
if (JSON.stringify(manifest.palette) !== JSON.stringify(approvedPalette)) {
  errors.push('Design System manifest palette must exactly match the locked five-color palette in canonical order');
}

const requiredFamilies = [
  'typography',
  'spacing',
  'radii',
  'elevation',
  'icons',
  'buttons',
  'fields',
  'overlays',
  'listsTables',
  'headers',
  'navigation',
  'feedback',
  'motion',
  'responsive',
];

const familyIds = new Set((manifest.families ?? []).map((family) => family.id));
for (const id of requiredFamilies) {
  if (!familyIds.has(id)) errors.push(`missing Design System family: ${id}`);
}
if ((manifest.families ?? []).length !== requiredFamilies.length) {
  errors.push(`Design System must contain exactly ${requiredFamilies.length} required families`);
}

for (const token of [
  '--ez-r2-font-sans',
  '--ez-r2-type-md',
  '--ez-r2-space-4',
  '--ez-r2-radius-lg',
  '--ez-r2-depth-offset-2',
  '--ez-r2-touch-min: 44px',
  '--ez-r2-motion-standard',
  '--ez-r2-content-wide',
]) {
  if (!foundation.includes(token)) errors.push(`foundation token contract missing: ${token}`);
}

for (const marker of [
  '.ez-r2-root',
  '.ez-r2-surface',
  '.ez-r2-button',
  '.ez-r2-field__control',
  '.ez-r2-dialog',
  '.ez-r2-sheet',
  '.ez-r2-list-row',
  '.ez-r2-table',
  '.ez-r2-page-header',
  '.ez-r2-nav-item',
  '.ez-r2-notice',
  '.ez-r2-skeleton',
  '.ez-r2-frame',
  '.ez-r2-split',
  '@media (prefers-reduced-motion: reduce)',
  'unicode-bidi: plaintext',
]) {
  if (!css.includes(marker)) errors.push(`Design System CSS missing required marker: ${marker}`);
}

const requiredExports = [
  'R2Surface',
  'R2Button',
  'R2TextField',
  'R2TextArea',
  'R2DialogFrame',
  'R2SheetFrame',
  'R2List',
  'R2ListRow',
  'R2TableFrame',
  'R2PageHeader',
  'R2Location',
  'R2Nav',
  'R2NavItem',
  'R2Notice',
  'R2Skeleton',
  'R2EmptyState',
  'R2Frame',
  'R2Stack',
  'R2Cluster',
  'R2Split',
];
for (const name of requiredExports) {
  if (!primitives.includes(`function ${name}`)) errors.push(`missing reusable primitive implementation: ${name}`);
  if (!index.includes(name)) errors.push(`Design System entrypoint does not export: ${name}`);
}

for (const forbidden of ['ui-v2', 'ui-rebirth', 'ez-domain-rail', 'domain-explorer', 'onBrandAction']) {
  if (foundation.includes(forbidden) || css.includes(forbidden) || primitives.includes(forbidden) || index.includes(forbidden)) {
    errors.push(`legacy presentation DNA leaked into Design System: ${forbidden}`);
  }
}

if (manifest.rules?.cardWallAsDefault !== false) errors.push('Design System must explicitly forbid card-wall composition as the default');
if (manifest.rules?.statusRequiresNonColorCue !== true) errors.push('status semantics must require a non-color cue');
if (manifest.rules?.primaryActionPerRegion !== 1) errors.push('Design System must encode one primary action per decision region');
if (manifest.rules?.minimumTouchPx !== 44) errors.push('minimum touch geometry must remain exactly 44px or greater by primitive contract');
if (manifest.rules?.rtlFirst !== true) errors.push('Design System must remain RTL-first');
if (manifest.rules?.mixedDirectionSafe !== true) errors.push('Design System must remain mixed-direction safe');
if (manifest.rules?.reducedMotionRequired !== true) errors.push('reduced-motion behavior is mandatory');

const ds = state.designSystem ?? {};
if (ds.requiredFamilies !== requiredFamilies.length) errors.push('state requiredFamilies does not match hard Design System family count');
if (ds.touchMinimumPx !== 44) errors.push('state touchMinimumPx must remain 44');
if (ds.presentationIsolation !== true) errors.push('Design System presentation isolation must remain enabled');

if (ds.exitGatePassed === true || ds.status === 'CLOSED' || stageIndex >= 3) {
  if (manifest.status !== 'FROZEN') errors.push('closed Design System requires manifest status FROZEN');
  if (ds.status !== 'CLOSED') errors.push('closed Design System requires state status CLOSED');
  if (ds.implementedFamilies !== requiredFamilies.length) errors.push('closed Design System requires all 14 families implemented');
  if (ds.reducedMotionEncoded !== true) errors.push('closed Design System requires reduced motion encoded');
  if (ds.rtlSafeDefaultsEncoded !== true) errors.push('closed Design System requires RTL-safe defaults encoded');
  if (ds.palettePurity !== true) errors.push('closed Design System requires palettePurity=true');
  if (ds.exitGatePassed !== true) errors.push('stage advancement requires Design System exitGatePassed=true');
}

if (errors.length) {
  console.error('ENJAZ R2.0 DESIGN SYSTEM AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ R2.0 DESIGN SYSTEM AUDIT PASS — ${requiredFamilies.length} families, isolated primitives, 44px touch, RTL and reduced-motion contracts intact.`);
}
