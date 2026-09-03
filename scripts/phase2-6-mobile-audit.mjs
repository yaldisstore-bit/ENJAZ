import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const failures = [];
let checks = 0;

async function text(path) {
  return readFile(resolve(root, path), 'utf8');
}

function check(name, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

const html = await text('index.html');
const mobileCss = await text('src/styles/mobile-hardening.css');
const labCss = await text('src/styles/mobile-lab.css');
const contract = await text('src/core/mobile/mobileContract.ts');
const routes = await text('src/core/routing/routes.ts');
const router = await text('src/app/router.tsx');
const previewRouter = await text('src/app/previewRouter.tsx');
const lab = await text('src/features/foundation/pages/MobileLabPage.tsx');
const foundationCss = await text('src/styles/foundation.css');
const statusPage = await text('src/features/foundation/pages/FoundationStatusPage.tsx');
const version = await text('src/core/version/version.ts');
const pkg = JSON.parse(await text('package.json'));
const workflow = await text('.github/workflows/enjaz-quality-gate.yml');
const doc = await text('docs/PHASE_2_6_MOBILE_ANDROID_HARDENING.md');

check('viewport declares cover safe-area support', html.includes('viewport-fit=cover'));
check('viewport opts into Android interactive widget resizing', html.includes('interactive-widget=resizes-content'));
check('viewport keeps user zoom available', !/user-scalable\s*=\s*no/i.test(html) && !/maximum-scale\s*=\s*1/i.test(html));

for (const inset of ['top', 'bottom', 'left', 'right']) {
  check(`safe-area ${inset} is consumed`, mobileCss.includes(`safe-area-inset-${inset}`));
}
check('100vh fallback exists', mobileCss.includes('min-block-size: 100vh'));
check('dynamic viewport enhancement exists', mobileCss.includes('@supports (height: 100dvh)') && mobileCss.includes('min-block-size: 100dvh'));
check('horizontal viewport leakage is contained', mobileCss.includes('overflow-x: hidden') && mobileCss.includes('overflow-x: clip'));
check('horizontal overscroll is contained', mobileCss.includes('overscroll-behavior-x: none'));
check('touch actions avoid delayed gesture handling', mobileCss.includes('touch-action: manipulation'));
check('coarse-pointer rules are capability scoped', mobileCss.includes('@media (pointer: coarse)'));
check('coarse-pointer controls consume touch floor', mobileCss.includes('min-block-size: var(--size-touch-min);'));
check('keyboard probes get scroll margins', mobileCss.includes('scroll-margin-block'));
check('field font remains at body floor', mobileCss.includes('font-size: var(--font-size-body);'));
check('overlay panel has vh fallback', mobileCss.includes('max-block-size: calc(100vh'));
check('overlay panel has dvh hardening', mobileCss.includes('max-block-size: calc(100dvh'));
check('overlay body contains overscroll', mobileCss.includes('overscroll-behavior: contain'));
check('overlay body preserves momentum touch scroll', mobileCss.includes('-webkit-overflow-scrolling: touch'));
check('sheet footer respects bottom safe area', /\.ui-sheet \.ui-overlay__footer[\s\S]*safe-area-inset-bottom/.test(mobileCss));
check('mobile styles do not disable touch scrolling', !/touch-action\s*:\s*none/i.test(`${mobileCss}\n${labCss}`));

check('typed mobile touch floor is 44px', contract.includes('MOBILE_TOUCH_TARGET_PX = 44'));
check('typed mobile breakpoint is 768px', contract.includes('MOBILE_BREAKPOINT_PX = 768'));
check('typed viewport contract includes Android resize policy', contract.includes('interactive-widget=resizes-content'));
check('typed pointer query is coarse', contract.includes("MOBILE_POINTER_QUERY = '(pointer: coarse)'"));
check('mobile runtime avoids direct window dependency', !/\bwindow\b/.test(contract));
check('mobile runtime reads from globalThis boundary', contract.includes('globalThis as unknown as MobileRuntime'));
check('dynamic viewport capability is queryable', contract.includes("CSS?.supports?.('height', '100dvh')"));

check('mobile route is canonical', routes.includes("mobile: '/foundation/mobile'"));
check('main router exposes mobile lab', router.includes('MobileLabPage') && router.includes('ROUTES.mobile'));
check('preview router exposes mobile lab', previewRouter.includes('MobileLabPage') && previewRouter.includes('ROUTES.mobile'));
for (const marker of ['Viewport & Safe Area', 'لوحة المفاتيح', 'Bottom Sheet', 'Touch / Pointer', 'mobile-keyboard-probe', 'mobile-sheet-keyboard-probe']) {
  check(`mobile lab proves ${marker}`, lab.includes(marker));
}
check('mobile lab CSS is responsive', labCss.includes('@media (max-width: 48rem)'));
check('mobile lab CSS uses no raw colors', !/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(labCss));
check('mobile hardening loads after motion system', foundationCss.indexOf("@import './mobile-hardening.css';") > foundationCss.indexOf("@import './motion-lab.css';"));
check('mobile lab loads after mobile hardening', foundationCss.indexOf("@import './mobile-lab.css';") > foundationCss.indexOf("@import './mobile-hardening.css';"));
check('foundation status declares Phase 2.6', statusPage.includes('Mobile / Android Hardening 2.6') && statusPage.includes('ROUTES.mobile'));
const appVersionPhase = Number(version.match(/APP_VERSION = '0\.9\.0-phase2\.(\d+)'/)?.[1] ?? -1);
const packageVersionPhase = Number(String(pkg.version ?? '').match(/^0\.9\.0-phase2\.(\d+)$/)?.[1] ?? -1);
check('application version preserves Phase 2.6 or later', appVersionPhase >= 6);
check('package version preserves Phase 2.6 or later', packageVersionPhase >= 6);
check('Phase 2.6 gate extends Phase 2.5', pkg.scripts?.['verify:phase2.6'] === 'npm run verify:phase2.5 && npm run audit:mobile && npm run audit:mobile:selftest');
check('mobile audit script is registered', pkg.scripts?.['audit:mobile'] === 'node scripts/phase2-6-mobile-audit.mjs');
check('mobile selftest script is registered', pkg.scripts?.['audit:mobile:selftest'] === 'node scripts/phase2-6-mobile-selftest.mjs');
const workflowCommandPhase = Number(workflow.match(/npm run verify:phase2\.(\d+)/)?.[1] ?? -1);
const workflowLabelPhase = Number(workflow.match(/Full Phase 2\.(\d+) verification/)?.[1] ?? -1);
check('GitHub quality gate covers Phase 2.6 or later', workflowCommandPhase >= 6 && workflowLabelPhase >= 6);
check('Phase 2.6 documentation declares core contracts', ['viewport-fit=cover', 'interactive-widget=resizes-content', '100dvh', 'Safe Area', '44px', '/foundation/mobile'].every((marker) => doc.includes(marker)));

if (failures.length) {
  console.error(`ENJAZ PHASE 2.6 MOBILE AUDIT FAIL — ${failures.length}/${checks} checks failed`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`ENJAZ PHASE 2.6 MOBILE AUDIT PASS — ${checks}/${checks} viewport, keyboard, safe-area, touch and Android invariants satisfied.`);
