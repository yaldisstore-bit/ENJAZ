import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const failures = [];
let checks = 0;

async function text(path) { return readFile(resolve(root, path), 'utf8'); }
function check(name, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

async function collectFiles(dir, extension) {
  const absolute = resolve(root, dir);
  const output = [];
  for (const entry of await readdir(absolute, { withFileTypes: true })) {
    const path = join(absolute, entry.name);
    if (entry.isDirectory()) output.push(...await collectFiles(relative(root, path), extension));
    else if (extname(entry.name) === extension) output.push(path);
  }
  return output;
}

const contract = await text('src/core/quality/visualDestructionContract.ts');
const lab = await text('src/features/foundation/pages/VisualDestructionLabPage.tsx');
const labCss = await text('src/styles/visual-destruction-lab.css');
const routes = await text('src/core/routing/routes.ts');
const router = await text('src/app/router.tsx');
const previewRouter = await text('src/app/previewRouter.tsx');
const foundationCss = await text('src/styles/foundation.css');
const statusPage = await text('src/features/foundation/pages/FoundationStatusPage.tsx');
const version = await text('src/core/version/version.ts');
const indexHtml = await text('index.html');
const packageJson = JSON.parse(await text('package.json'));
const workflow = await text('.github/workflows/enjaz-quality-gate.yml');
const doc = await text('docs/PHASE_2_8_VISUAL_DESTRUCTION_QUALITY_GATE.md');
const patternFiles = [
  await text('src/design-system/patterns/EntityPatterns.tsx'),
  await text('src/design-system/patterns/OperationsPatterns.tsx'),
  await text('src/design-system/patterns/DiscoveryPatterns.tsx'),
].join('\n');

for (const marker of [
  'longCompanyMinimumCharacters: 200',
  'notificationStormCount: 20',
  'denseTimelineCount: 24',
  'narrowViewportPx: 320',
  'keyboardViewportPx: 360',
  'minimumTouchTargetPx: 44',
  'hugeMoneyValue: 8_888_888_888_888_888',
  'zoomMustRemainEnabled: true',
  'reducedMotionMustRemainSupported: true',
  'tokenOnlyVisuals: true',
  'arbitraryZIndexForbidden: true',
  'importantOverridesForbidden: true',
  'rawColorsForbidden: true',
  'tinyProductTextForbidden: true',
  'phase3ForbiddenUntilGreen: true',
]) check(`destruction contract contains ${marker}`, contract.includes(marker));

for (const marker of [
  'createLongCompanyName()',
  'createNotificationStorm()',
  'createDenseTimeline()',
  '8,888,888,888,888,888 IQD',
  'data-viewport="320"',
  'data-keyboard="open"',
  '320 × 360',
  'tone="offline"',
  'tone="error"',
  'tone="conflict"',
  'tone="recovery"',
  'MIXED_DIRECTION_STRESS_TEXT',
  'TimelinePattern',
  'ActionMenuPattern',
  'destruction-focus-probe',
  'Dark mode غير مفعّل في 2.8',
  'Phase 3 locked',
]) check(`destruction lab proves ${marker}`, lab.includes(marker));

check('destruction lab uses semantic ordered notification list', lab.includes('<ol className="destruction-notification-storm"'));
check('destruction lab renders notification storm dynamically', lab.includes('notificationStorm.map'));
check('destruction lab renders dense timeline fixture', lab.includes('items={denseTimeline}'));
check('keyboard torture uses real TextField controls', lab.includes('id="destruction-keyboard-field"') && lab.includes('id="destruction-reference-field"'));
check('focus probe includes buttons, field, action menu and link', lab.includes('أول إجراء') && lab.includes('destruction-focus-field') && lab.includes('ActionMenuPattern') && lab.includes('destruction-focus-link'));

check('destruction CSS contains no raw color literals', !/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(labCss));
check('destruction CSS contains no important override', !/!important/i.test(labCss));
check('destruction CSS contains no numeric z-index', !/z-index\s*:\s*-?\d+/i.test(labCss));
check('destruction CSS avoids transition all', !/transition\s*:\s*all\b/i.test(labCss));
check('destruction CSS avoids physical horizontal spacing', !/(?:margin-left|margin-right|padding-left|padding-right)\s*:/i.test(labCss));
check('destruction CSS preserves long text wrapping', labCss.includes('overflow-wrap: anywhere'));
check('destruction CSS models narrow 320px viewport as 20rem', labCss.includes('inline-size: min(100%, 20rem)'));
check('destruction CSS models keyboard-constrained viewport', labCss.includes('max-block-size: 22.5rem') && labCss.includes('overflow-y: auto'));
check('destruction CSS preserves keyboard scroll margins', labCss.includes('scroll-margin-block: var(--space-8)'));
check('destruction CSS preserves safe areas', labCss.includes('safe-area-inset-top') && labCss.includes('safe-area-inset-bottom'));
check('destruction CSS preserves dynamic viewport', labCss.includes('@supports (height: 100dvh)'));
check('destruction CSS handles reduced motion', labCss.includes('@media (prefers-reduced-motion: reduce)'));
check('destruction CSS has explicit narrow-phone breakpoint', labCss.includes('@media (max-width: 22.5rem)'));
check('destruction CSS has visible focus treatment', labCss.includes(':focus-visible') && labCss.includes('var(--color-focus)'));
check('destruction lab source has no inline style escape', !/\bstyle\s*=\s*\{/.test(lab));
check('pattern sources remain free of inline style escape', !/\bstyle\s*=\s*\{/.test(patternFiles));

const cssFiles = await collectFiles('src/styles', '.css');
const nonTokenCssFiles = cssFiles.filter((path) => !relative(root, path).startsWith('src/styles/tokens/'));
const rawColorFiles = [];
const importantFiles = [];
const numericZFiles = [];
const tinyFontFiles = [];
const transitionAllFiles = [];
for (const path of nonTokenCssFiles) {
  const source = await readFile(path, 'utf8');
  const rel = relative(root, path);
  if (/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(source)) rawColorFiles.push(rel);
  if (/!important/i.test(source)) importantFiles.push(rel);
  if (/z-index\s*:\s*-?\d+/i.test(source)) numericZFiles.push(rel);
  if (/font-size\s*:\s*(?:[0-9]|1[0-2](?:\.\d+)?)px\b/i.test(source)) tinyFontFiles.push(rel);
  if (/transition\s*:\s*all\b/i.test(source)) transitionAllFiles.push(rel);
}
check('all non-token CSS rejects raw colors', rawColorFiles.length === 0, rawColorFiles.join(', '));
check('all non-token CSS rejects !important', importantFiles.length === 0, importantFiles.join(', '));
check('all non-token CSS rejects numeric z-index', numericZFiles.length === 0, numericZFiles.join(', '));
check('all non-token CSS rejects raw sub-13px font sizes', tinyFontFiles.length === 0, tinyFontFiles.join(', '));
check('all non-token CSS rejects transition all', transitionAllFiles.length === 0, transitionAllFiles.join(', '));

check('viewport keeps user zoom enabled', !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0+)?/i.test(indexHtml));
check('viewport keeps Android interactive-widget resizing', indexHtml.includes('interactive-widget=resizes-content'));
check('destruction route is canonical', routes.includes("destruction: '/foundation/destruction'"));
check('main router exposes destruction lab', router.includes('VisualDestructionLabPage') && router.includes('ROUTES.destruction'));
check('preview router exposes destruction lab', previewRouter.includes('VisualDestructionLabPage') && previewRouter.includes('ROUTES.destruction'));
check('destruction CSS loads after Pattern Lab', foundationCss.indexOf("@import './visual-destruction-lab.css';") > foundationCss.indexOf("@import './pattern-lab.css';"));
check('foundation status declares Phase 2.8', statusPage.includes('Visual Destruction & Quality Gate 2.8') && statusPage.includes('ROUTES.destruction'));

const appVersionPhase = Number(version.match(/APP_VERSION = '0\.9\.0-phase2\.(\d+)'/)?.[1] ?? -1);
const packageVersionPhase = Number(String(packageJson.version ?? '').match(/^0\.9\.0-phase2\.(\d+)$/)?.[1] ?? -1);
check('application version declares Phase 2.8 or later', appVersionPhase >= 8);
check('package version declares Phase 2.8 or later', packageVersionPhase >= 8);
check('Phase 2.8 gate extends immutable 2.7 gate', packageJson.scripts?.['verify:phase2.8'] === 'npm run verify:phase2.7 && npm run audit:destruction && npm run audit:destruction:selftest && npm run audit:roadmap');
check('destruction audit script is registered', packageJson.scripts?.['audit:destruction'] === 'node scripts/phase2-8-visual-destruction-audit.mjs');
check('destruction selftest script is registered', packageJson.scripts?.['audit:destruction:selftest'] === 'node scripts/phase2-8-visual-destruction-selftest.mjs');
check('Phase 2.7 gate command remains unchanged', packageJson.scripts?.['verify:phase2.7'] === 'npm run verify:phase2.6 && npm run audit:patterns && npm run audit:patterns:selftest && npm run audit:roadmap');
check('GitHub quality gate covers Phase 2.8', workflow.includes('Full Phase 2.8 verification') && workflow.includes('npm run verify:phase2.8'));

for (const marker of [
  '200', '20 notifications', '320px', 'keyboard', 'huge financial', 'RTL/LTR', 'offline', 'conflict',
  'reduced motion', 'focus', 'zoom', '!important', 'z-index', 'raw colors', 'tiny fonts', 'ENJAZ Design System 1.0',
  '/foundation/destruction', 'Phase 3',
]) check(`Phase 2.8 documentation contains ${marker}`, doc.toLowerCase().includes(marker.toLowerCase()));

if (failures.length) {
  console.error(`ENJAZ PHASE 2.8 VISUAL DESTRUCTION AUDIT FAIL — ${failures.length}/${checks} checks failed`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`ENJAZ PHASE 2.8 VISUAL DESTRUCTION AUDIT PASS — ${checks}/${checks} torture fixtures, CSS drift guards, mobile/RTL/accessibility and Phase 3 lock invariants satisfied.`);
