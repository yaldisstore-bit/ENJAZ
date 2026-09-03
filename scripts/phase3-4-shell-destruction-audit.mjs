import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const failures = [];
let checks = 0;

async function text(path) { return readFile(resolve(root, path), 'utf8'); }
function check(name, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}
function exactNumber(source, property) {
  const match = source.match(new RegExp(`${property}:\\s*(\\d+)`));
  return match ? Number(match[1]) : Number.NaN;
}

const contract = await text('src/core/shell/shellDestructionContract.ts');
const frame = await text('src/shared/shell/AppShellFrame.tsx');
const shell = await text('src/app/AppShell.tsx');
const authContext = await text('src/features/auth/state/AuthContext.tsx');
const authGuards = await text('src/features/auth/pages/AuthRouteGuards.tsx');
const navigation = await text('src/core/routing/navigationContract.ts');
const routes = await text('src/core/routing/routes.ts');
const router = await text('src/app/router.tsx');
const previewRouter = await text('src/app/previewRouter.tsx');
const lab = await text('src/features/foundation/pages/ShellDestructionLabPage.tsx');
const status = await text('src/features/foundation/pages/FoundationStatusPage.tsx');
const shellCss = await text('src/styles/app-shell.css');
const labCss = await text('src/styles/shell-destruction-lab.css');
const foundationCss = await text('src/styles/foundation.css');
const mobileContract = await text('src/core/mobile/mobileContract.ts');
const version = await text('src/core/version/version.ts');
const packageJson = JSON.parse(await text('package.json'));
const workflow = await text('.github/workflows/enjaz-quality-gate.yml');
const pagesWorkflow = await text('.github/workflows/enjaz-pages-preview.yml');
const roadmap = await text('docs/ENJAZ_MASTER_ROADMAP.md');
const doc = await text('docs/PHASE_3_4_SHELL_DESTRUCTION_GATE.md');
const readme = await text('README.md');

const expectedScenarios = ['keyboard', 'back', 'rotation', 'deepLink', 'sessionExpiry', 'offline', 'narrowScreen', 'longLabels'];
for (const scenario of expectedScenarios) check(`contract includes destruction scenario ${scenario}`, contract.includes(`'${scenario}'`));
const scenarioBlock = contract.match(/SHELL_DESTRUCTION_SCENARIOS = Object\.freeze\(\[([\s\S]*?)\] as const\)/)?.[1] ?? '';
const scenarioIds = [...scenarioBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]);
check('destruction scenario count is exactly eight', scenarioIds.length === 8, `count=${scenarioIds.length}`);
check('destruction scenario order is frozen', JSON.stringify(scenarioIds) === JSON.stringify(expectedScenarios));
check('destruction scenario ids are unique', new Set(scenarioIds).size === 8);

check('narrow width torture is exactly 320px', exactNumber(contract, 'narrowWidthPx') === 320, `value=${exactNumber(contract, 'narrowWidthPx')}`);
check('portrait fixture height is exactly 640px', exactNumber(contract, 'portraitHeightPx') === 640);
check('landscape fixture width is exactly 640px', exactNumber(contract, 'landscapeWidthPx') === 640);
check('landscape fixture height is exactly 320px', exactNumber(contract, 'landscapeHeightPx') === 320);
check('keyboard occlusion threshold is exactly 120px', exactNumber(contract, 'keyboardOcclusionPx') === 120);
check('long-label torture is exactly 200 characters', exactNumber(contract, 'longLabelCharacters') === 200);
for (const marker of [
  'isKeyboardOccluding', 'Number.isFinite(layoutViewportHeight)', 'layoutViewportHeight - visualViewportHeight >= thresholdPx',
  'classifyShellViewport', "return width > height ? 'landscape' : 'portrait'", 'shouldRedirectExpiredSession',
  "return status === 'anonymous'", 'normalizeLongShellLabel', "value.trim().replace(/\\s+/g, ' ')",
  "[...normalized].slice(0, Math.max(1, maxCharacters)).join('')",
]) check(`destruction utility preserves ${marker}`, contract.includes(marker));
check('deep-link fixture targets canonical transactions route', contract.includes("deepLink: '/app/transactions'"));
check('expired-session fixture targets login', contract.includes("anonymousRedirect: '/auth/login'"));
check('offline fixture preserves shell message contract', contract.includes("offlineMessage: 'أنت غير متصل حاليًا'"));
check('long Arabic fixture is explicitly sliced to 200', contract.includes('.slice(0, 200)'));
check('destruction contract has no Supabase dependency', !/supabase|createClient|repository|DataLayer/i.test(contract));
check('destruction contract performs no write mutation', !/\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(/.test(contract));

check('App Shell still derives network state from navigator', shell.includes('navigator.onLine'));
check('App Shell subscribes to online recovery', shell.includes("window.addEventListener('online'"));
check('App Shell subscribes to offline transition', shell.includes("window.addEventListener('offline'"));
check('App Shell cleans online listener', shell.includes("window.removeEventListener('online'"));
check('App Shell cleans offline listener', shell.includes("window.removeEventListener('offline'"));
check('App Shell still owns sign-out via auth service', shell.includes('await service.signOut()'));
check('App Shell error path normalizes application errors', shell.includes('toAppError(error).userMessage'));
check('App Shell passes current location to frame', shell.includes('currentPath={location.pathname}'));

check('Auth provider subscribes to live auth state changes', authContext.includes('service.onAuthStateChange'));
check('Auth provider converts missing session to anonymous', authContext.includes("setStatus(session?.user ? 'authenticated' : 'anonymous')"));
check('ProtectedRoute fails closed while session checking', authGuards.includes("status === 'checking'"));
check('ProtectedRoute redirects expired anonymous session to login', authGuards.includes("status === 'anonymous'") && authGuards.includes('Navigate to={ROUTES.login} replace'));
check('Anonymous route redirects authenticated user back to app', authGuards.includes('Navigate to={ROUTES.appHome} replace'));

check('frame normalizes current route', frame.includes('normalizeNavigationPath(currentPath)'));
check('frame resolves active navigation centrally', frame.includes('resolvePrimaryNavigation(normalizedPath)'));
check('frame resolves back destination centrally', frame.includes('resolveBackDestination(normalizedPath)'));
check('back navigation is a canonical Link', frame.includes('to={backDestination}') && frame.includes('aria-label="العودة إلى المستوى السابق"'));
check('frame exposes offline state to DOM', frame.includes('data-network-state={networkState}'));
check('offline shell message uses live polite status', frame.includes('role="status" aria-live="polite"'));
check('offline state keeps shell instead of replacing content', frame.indexOf('app-shell__network-banner') < frame.indexOf('app-shell__workspace'));
check('main content remains focusable after route transitions', frame.includes('id="main-content" tabIndex={-1}'));
check('bottom navigation remains centralized in frozen slots', frame.includes('SHELL_NAV_SLOTS.map'));
check('route stage is keyed by normalized path', frame.includes('key={normalizedPath}'));
check('frame has no direct browser history manipulation', !/history\.(?:back|go|pushState|replaceState)/.test(frame));
check('frame has no domain data access', !/supabase|DataLayer|repository/i.test(frame));

const productRecords = [...navigation.matchAll(/contentState: 'reserved'/g)];
check('business product routes remain reserved during shell destruction', productRecords.length >= 18, `reserved=${productRecords.length}`);
check('Phase 3.4 does not prematurely implement business routes', !navigation.includes("contentState: 'implemented'"));
check('navigation contract retains deterministic back resolver', navigation.includes('resolveBackDestination'));
check('navigation contract retains path normalization', navigation.includes('normalizeNavigationPath'));

check('mobile contract freezes interactive-widget=resizes-content', mobileContract.includes('interactive-widget=resizes-content'));
check('mobile contract freezes viewport-fit=cover', mobileContract.includes('viewport-fit=cover'));
check('mobile touch floor stays at 44px', mobileContract.includes('MOBILE_TOUCH_TARGET_PX = 44'));
check('mobile dynamic viewport support remains explicit', mobileContract.includes("CSS?.supports?.('height', '100dvh')"));

for (const marker of ['100dvh', 'safe-area-inset-top', 'safe-area-inset-bottom', 'overflow-x: clip', 'position: fixed', '@media (max-width: 30rem)', '@media (prefers-reduced-motion: reduce)']) {
  check(`app shell CSS preserves ${marker}`, shellCss.includes(marker));
}
check('bottom navigation reserves safe-area bottom padding', /app-shell__navigation[\s\S]*?safe-area-inset-bottom/.test(shellCss));
check('main content reserves bottom navigation and safe area', /app-shell__main[\s\S]*?safe-area-inset-bottom/.test(shellCss));
check('long shell navigation labels are ellipsized safely', shellCss.includes('text-overflow: ellipsis') && shellCss.includes('white-space: nowrap'));
check('wide shell switches to desktop navigation', shellCss.includes('@media (min-width: 64rem)'));

for (const [name, stylesheet] of [['app shell CSS', shellCss], ['shell destruction lab CSS', labCss]]) {
  check(`${name} contains no raw color literal`, !/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(stylesheet));
  check(`${name} contains no !important`, !/!important/i.test(stylesheet));
  check(`${name} contains no numeric z-index`, !/z-index\s*:\s*-?\d+/i.test(stylesheet));
  check(`${name} avoids transition all`, !/transition\s*:\s*all\b/i.test(stylesheet));
  check(`${name} avoids physical horizontal positioning`, !/(?:margin-left|margin-right|padding-left|padding-right|left|right)\s*:/i.test(stylesheet));
  check(`${name} contains no tiny raw font size`, !/font-size\s*:\s*(?:[0-9]|1[0-2](?:\.\d+)?)px\b/i.test(stylesheet));
}
check('destruction lab CSS contains 22.5rem narrow-phone contract', labCss.includes('@media (max-width: 22.5rem)'));
check('destruction lab CSS contains landscape short-height contract', labCss.includes('@media (orientation: landscape) and (max-height: 25rem)'));
check('destruction lab CSS uses overflow-wrap for torture text', labCss.includes('overflow-wrap: anywhere'));
check('destruction lab CSS preserves reduced-motion behavior', labCss.includes('@media (prefers-reduced-motion: reduce)'));
check('destruction lab uses token-only focus-compatible surfaces', labCss.includes('var(--color-border)') && labCss.includes('var(--color-surface-raised)'));

for (const marker of [
  'Phase 3.4 — Shell Destruction Gate', 'SHELL_DESTRUCTION_SCENARIOS.map', '320px / Offline / Long-label fixture',
  'networkState="offline"', 'currentPath={ROUTES.appTransactions}', 'inboxCount={999}', 'longArabicLabel', 'keyboardDetected', 'landscapeClass',
]) check(`shell destruction lab proves ${marker}`, lab.includes(marker));
check('destruction lab contains no Supabase/data-layer access', !/supabase|useAuth|DataLayer|repository/i.test(lab));
check('destruction lab has no inline style bypass', !/\bstyle\s*=\s*\{/.test(lab));

check('3.4 route is outside product namespace', routes.includes("shellDestructionPreview: '/foundation/shell-destruction'"));
check('production router exposes the 3.4 proof route', router.includes('ShellDestructionLabPage') && router.includes('ROUTES.shellDestructionPreview'));
check('preview router exposes the 3.4 proof route', previewRouter.includes('ShellDestructionLabPage') && previewRouter.includes('ROUTES.shellDestructionPreview'));
check('preview router keeps GitHub Pages basename', previewRouter.includes('basename: import.meta.env.BASE_URL'));
check('foundation status exposes Phase 3.4 marker', status.includes('Shell Destruction Gate 3.4'));
check('foundation status links Phase 3.4 proof route', status.includes('ROUTES.shellDestructionPreview'));
check('foundation CSS imports shell destruction lab last', foundationCss.trim().endsWith("@import './shell-destruction-lab.css';"));

check('Pages workflow contains SPA fallback', pagesWorkflow.includes('404.html'));
check('Pages workflow builds safe UI preview', /Build safe UI preview/i.test(pagesWorkflow));
check('Pages workflow deploys only from verified main workflow', pagesWorkflow.includes('workflow_run'));

check('application version declares Phase 3.4', version.includes("APP_VERSION = '0.10.0-phase3.4'"));
check('package version declares Phase 3.4', packageJson.version === '0.10.0-phase3.4');
check('3.4 audit script is registered', packageJson.scripts?.['audit:shell-destruction'] === 'node scripts/phase3-4-shell-destruction-audit.mjs');
check('3.4 selftest script is registered', packageJson.scripts?.['audit:shell-destruction:selftest'] === 'node scripts/phase3-4-shell-destruction-selftest.mjs');
check('Phase 3.4 gate extends immutable Phase 3.3 gate', packageJson.scripts?.['verify:phase3.4'] === 'npm run verify:phase3.3 && npm run audit:shell-destruction && npm run audit:shell-destruction:selftest && npm run audit:roadmap');
check('Phase 3.3 verification chain remains unchanged', packageJson.scripts?.['verify:phase3.3'] === 'npm run verify:phase3.2 && npm run audit:interactions && npm run audit:interactions:selftest && npm run audit:roadmap');
check('GitHub quality gate names Phase 3.4 verification', workflow.includes('Full Phase 3.4 verification'));
check('GitHub quality gate runs verify:phase3.4', workflow.includes('npm run verify:phase3.4'));
check('GitHub quality gate still runs roadmap audit separately', workflow.includes('npm run audit:roadmap'));
check('GitHub quality gate still runs real TypeScript', workflow.includes('npm run typecheck'));
check('GitHub quality gate still runs production build', workflow.includes('npm run build'));
check('GitHub quality gate still asserts dist/index.html', workflow.includes('test -f dist/index.html'));

check('roadmap contains exact Phase 3.4 heading', roadmap.includes('## 3.4 — Shell Destruction Gate'));
for (const marker of ['Keyboard/back/rotation/navigation torture.', 'Route refresh/deep-link tests.', 'Session expiry during navigation.', 'Offline shell behavior.', 'Small-screen and long-label stress.']) {
  check(`roadmap preserves 3.4 requirement ${marker}`, roadmap.includes(marker));
}
for (const marker of ['keyboard', 'back', 'rotation', 'deep-link', 'Session expiry', 'Offline', '320px', '200']) {
  check(`Phase 3.4 documentation covers ${marker}`, doc.toLowerCase().includes(marker.toLowerCase()));
}
check('README marks Phase 3.4 as current candidate', /Phase 3\.4 — Shell Destruction Gate/.test(readme));
check('README does not claim Phase 4 started', !/Phase 4[^\n]*🚧|Phase 4[^\n]*CURRENT/i.test(readme));

if (failures.length) {
  console.error(`ENJAZ PHASE 3.4 SHELL DESTRUCTION AUDIT FAIL — ${failures.length}/${checks} checks failed.`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`ENJAZ PHASE 3.4 SHELL DESTRUCTION AUDIT PASS — ${checks}/${checks} keyboard/back/rotation/deep-link/session/offline/narrow/long-label/gate invariants passed.`);
