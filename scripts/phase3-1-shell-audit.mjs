import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const failures = [];
let checks = 0;

async function text(path) { return readFile(resolve(root, path), 'utf8'); }
async function optionalText(path) {
  try { return await text(path); }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}
function check(name, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}
function phaseTuple(value) {
  const match = String(value).match(/phase(\d+)\.(\d+)/);
  return match ? [Number(match[1]), Number(match[2])] : null;
}
function phaseAtLeast(tuple, major, minor) {
  return Boolean(tuple && (tuple[0] > major || (tuple[0] === major && tuple[1] >= minor)));
}
function samePhase(a, b) {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}

const contract = await text('src/shared/shell/shellContract.ts');
const frame = await text('src/shared/shell/AppShellFrame.tsx');
const shell = await text('src/app/AppShell.tsx');
const preview = await text('src/features/foundation/pages/ShellPreviewPage.tsx');
const legacyLanding = await optionalText('src/features/auth/pages/AuthHomePage.tsx');
const realHome = await optionalText('src/features/home/pages/HomeDashboardPage.tsx');
const landing = legacyLanding ?? realHome ?? '';
const css = await text('src/styles/app-shell.css');
const foundationCss = await text('src/styles/foundation.css');
const routes = await text('src/core/routing/routes.ts');
const router = await text('src/app/router.tsx');
const previewRouter = await text('src/app/previewRouter.tsx');
const version = await text('src/core/version/version.ts');
const packageJson = JSON.parse(await text('package.json'));
const workflow = await text('.github/workflows/enjaz-quality-gate.yml');
const roadmap = await text('docs/ENJAZ_MASTER_ROADMAP.md');
const doc = await text('docs/PHASE_3_1_APP_SHELL.md');
const statusPage = await text('src/features/foundation/pages/FoundationStatusPage.tsx');

const appVersion = version.match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1] ?? '';
const appPhase = phaseTuple(appVersion);
const packagePhase = phaseTuple(packageJson.version);
const workflowLabelMatch = workflow.match(/Full Phase (\d+\.\d+) verification/);
const workflowCommandMatch = workflow.match(/npm run verify:phase(\d+\.\d+)/);
const workflowLabelPhase = phaseTuple(workflowLabelMatch ? `phase${workflowLabelMatch[1]}` : '');
const workflowCommandPhase = phaseTuple(workflowCommandMatch ? `phase${workflowCommandMatch[1]}` : '');
const navigationArchitectureActive = phaseAtLeast(appPhase, 3, 2) && phaseAtLeast(packagePhase, 3, 2);

for (const marker of [
  'SHELL_TOUCH_TARGET_PX = 44',
  'SHELL_MOBILE_NAV_SLOTS = 5',
  'resolveShellNetworkState',
  'getShellUserInitial',
]) check(`shell contract contains ${marker}`, contract.includes(marker));

if (navigationArchitectureActive) {
  check('Phase 3.2 shell consumes canonical primary navigation', contract.includes('PRIMARY_NAVIGATION'));
  check('Phase 3.2 shell exposes ready-only navigation status', contract.includes("ShellNavStatus = 'ready'"));
  check('Phase 3.2 shell binds destinations from canonical item paths', contract.includes('destination: item.path'));
  check('Phase 3.2 shell no longer carries planned/null slots', !contract.includes("status: 'planned'") && !contract.includes('destination: null'));
} else {
  const navRecords = contract.match(/\{ id: '[^']+', label: '[^']+', status: '(?:ready|planned)', destination: (?:'\/app'|null) \}/g) ?? [];
  check('Phase 3.1 shell exposes exactly five literal nav slot records', navRecords.length === 5, `records=${navRecords.length}`);
  check('Phase 3.1 has one active destination', navRecords.filter((record) => record.includes("destination: '/app'")).length === 1);
  check('Phase 3.1 keeps four slots unbound', navRecords.filter((record) => record.includes('destination: null')).length === 4);
}

for (const marker of [
  'app-shell__skip-link',
  'app-shell__topbar',
  'app-shell__navigation',
  'app-shell__main',
  'app-shell__page-container',
  'role="status"',
  'role="alert"',
]) check(`shared App Shell frame proves ${marker}`, frame.includes(marker));

if (navigationArchitectureActive) {
  for (const marker of [
    'resolvePrimaryNavigation',
    'resolveBackDestination',
    'currentPath',
    "aria-current={isActive ? 'page' : undefined}",
    'app-shell__route-stage',
  ]) check(`Phase 3.2 preserves Shell while adding ${marker}`, frame.includes(marker));
  check('Phase 3.2 removes stale disabled-navigation copy', !frame.includes('سيتم تفعيلها في Phase 3.2'));
  check('Phase 3.2 app composition passes the current pathname', shell.includes('useLocation()') && shell.includes('currentPath={location.pathname}'));
} else {
  check('Phase 3.1 exposes one aria-current proof', frame.includes('aria-current="page"'));
  check('Phase 3.1 keeps future navigation disabled', frame.includes('سيتم تفعيلها في Phase 3.2'));
}

for (const marker of [
  "window.addEventListener('online'",
  "window.addEventListener('offline'",
  'await service.signOut()',
  '<Outlet />',
  'AppShellFrame',
]) check(`app composition proves ${marker}`, shell.includes(marker));

check('shared frame does not import auth feature', !frame.includes('/features/auth') && !frame.includes('useAuth'));
check('shared frame owns no persistence or auth service call', !frame.includes('service.signOut') && !frame.includes('supabase'));
check('app composition is the only shell layer importing auth context', shell.includes("../features/auth/state/AuthContext.tsx"));
check('shell frame has no inline style escape', !/\bstyle\s*=\s*\{/.test(frame));
check('shell frame avoids embedded product route literals', !/\/app\/(?:transactions|companies|finance|workflows|documents)/.test(frame));
check('preview is auth-independent and uses shared AppShellFrame', preview.includes("../../../shared/shell/AppShellFrame.tsx") && !preview.includes('useAuth'));
check('preview states that it is not a business screen', preview.includes('هذه ليست شاشة أعمال'));
check('a valid post-shell landing exists after placeholder retirement', landing.length > 0);
check('temporary Phase 1.3 auth wording is absent from current landing', !landing.includes('Phase 1.3') && !landing.includes('هذه شاشة مؤقتة حتى تبدأ مرحلة الواجهة الفعلية'));
check('landing does not duplicate sign-out behavior', !landing.includes('service.signOut') && !landing.includes('تسجيل الخروج'));
check('legacy AuthHomePage may retire only after real Home exists', legacyLanding !== null || realHome !== null);

check('shell CSS is under the architectural 400-line budget', css.split(/\r?\n/).length <= 400, `lines=${css.split(/\r?\n/).length}`);
check('shell CSS has no raw color literals', !/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(css));
check('shell CSS has no important override', !/!important/i.test(css));
check('shell CSS has no numeric z-index', !/z-index\s*:\s*-?\d+/i.test(css));
check('shell CSS avoids transition all', !/transition\s*:\s*all\b/i.test(css));
check('shell CSS avoids physical left/right spacing', !/(?:margin-left|margin-right|padding-left|padding-right)\s*:/i.test(css));
check('shell CSS preserves 100vh fallback', css.includes('min-block-size: 100vh'));
check('shell CSS enhances with dynamic viewport', css.includes('min-block-size: 100dvh'));
check('top bar consumes top safe area', css.includes('safe-area-inset-top'));
check('mobile navigation consumes bottom safe area', css.includes('safe-area-inset-bottom'));
check('mobile navigation is anchored to the viewport', css.includes('.app-shell__navigation {') && css.includes('position: fixed'));
check('desktop shell converts navigation into structural rail', css.includes('@media (min-width: 64rem)') && css.includes('grid-template-columns: var(--size-visual-xl) minmax(0, 1fr)'));
check('shell keeps focus-visible styling', css.includes(':focus-visible') && css.includes('var(--color-focus)'));
check('shell respects reduced motion', css.includes('@media (prefers-reduced-motion: reduce)'));
check('shell styling consumes frozen gradient and shadow tokens', css.includes('var(--gradient-canvas)') && css.includes('var(--shadow-level-2)'));

check('shell preview route is canonical', routes.includes("shellPreview: '/foundation/shell'"));
check('main router mounts ShellPreviewPage', router.includes('ShellPreviewPage') && router.includes('ROUTES.shellPreview'));
check('preview router mounts ShellPreviewPage', previewRouter.includes('ShellPreviewPage') && previewRouter.includes('ROUTES.shellPreview'));
check('protected application route remains nested inside AppShell', router.includes('Component: ProtectedRoute') && router.includes('Component: AppShell') && router.includes('ROUTES.appHome'));
check('router imports AppShell from app composition boundary', router.includes("import { AppShell } from './AppShell'"));
check('App Shell stylesheet loads after frozen Phase 2 destruction layer', foundationCss.indexOf("@import './app-shell.css';") > foundationCss.indexOf("@import './visual-destruction-lab.css';"));
check('foundation status exposes Phase 3.1 proof', statusPage.includes('App Shell 3.1') && statusPage.includes('ROUTES.shellPreview'));
check('application version is Phase 3.1 or later', phaseAtLeast(appPhase, 3, 1), `version=${appVersion || 'unparseable'}`);
check('package version is Phase 3.1 or later', phaseAtLeast(packagePhase, 3, 1), `version=${packageJson.version ?? 'missing'}`);
check('application and package phase versions match', samePhase(appPhase, packagePhase));
check('GitHub Quality Gate label matches current phase', samePhase(appPhase, workflowLabelPhase));
check('GitHub Quality Gate command matches current phase', samePhase(appPhase, workflowCommandPhase));
check('Phase 3.1 gate extends immutable Phase 2.8 gate', packageJson.scripts?.['verify:phase3.1'] === 'npm run verify:phase2.8 && npm run audit:shell && npm run audit:shell:selftest && npm run audit:roadmap');
check('shell audit script is registered', packageJson.scripts?.['audit:shell'] === 'node scripts/phase3-1-shell-audit.mjs');
check('shell selftest script is registered', packageJson.scripts?.['audit:shell:selftest'] === 'node scripts/phase3-1-shell-selftest.mjs');
check('Phase 2.8 gate command remains unchanged', packageJson.scripts?.['verify:phase2.8'] === 'npm run verify:phase2.7 && npm run audit:destruction && npm run audit:destruction:selftest && npm run audit:roadmap');
check('roadmap keeps Phase 3 ordering', roadmap.indexOf('## 3.1 — App Shell') < roadmap.indexOf('## 3.2 — Navigation Architecture'));
check('roadmap still forbids Phase 4 before Phase 3 exit', roadmap.indexOf('**Phase 3 exit:**') < roadmap.indexOf('# Phase 4 — Home'));

for (const marker of [
  'Top Bar', 'Bottom Navigation', 'Page Container', 'Safe Area', 'offline', 'error', 'loading',
  'responsive', '/foundation/shell', 'Phase 3.2', '44px', 'GitHub Actions',
]) check(`Phase 3.1 documentation contains ${marker}`, doc.toLowerCase().includes(marker.toLowerCase()));

if (failures.length) {
  console.error(`ENJAZ PHASE 3.1 APP SHELL AUDIT FAIL — ${failures.length}/${checks} checks failed`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`ENJAZ PHASE 3.1 APP SHELL AUDIT PASS — ${checks}/${checks} frozen shell, composition, auth, mobile, RTL, token and forward-compatibility invariants satisfied.`);
