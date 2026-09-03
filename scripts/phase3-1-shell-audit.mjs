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

const contract = await text('src/shared/shell/shellContract.ts');
const frame = await text('src/shared/shell/AppShellFrame.tsx');
const shell = await text('src/app/AppShell.tsx');
const preview = await text('src/features/foundation/pages/ShellPreviewPage.tsx');
const landing = await text('src/features/auth/pages/AuthHomePage.tsx');
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

for (const marker of [
  'SHELL_TOUCH_TARGET_PX = 44',
  'SHELL_MOBILE_NAV_SLOTS = 5',
  "status: 'ready', destination: '/app'",
  "status: 'planned', destination: null",
  'resolveShellNetworkState',
  'getShellUserInitial',
]) check(`shell contract contains ${marker}`, contract.includes(marker));

check('shell contract exposes exactly five nav slot records', (contract.match(/id: '/g) ?? []).length === 5);
check('only one shell navigation destination is active in 3.1', (contract.match(/destination: '\/app'/g) ?? []).length === 1);
check('four future nav slots stay unbound until 3.2', (contract.match(/destination: null/g) ?? []).length === 4);

for (const marker of [
  'app-shell__skip-link',
  'app-shell__topbar',
  'app-shell__navigation',
  'app-shell__main',
  'app-shell__page-container',
  'role="status"',
  'role="alert"',
  'aria-current="page"',
  'سيتم تفعيلها في Phase 3.2',
]) check(`shared App Shell frame proves ${marker}`, frame.includes(marker));

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
check('shell frame avoids premature product route literals', !/\/app\/(?:transactions|companies|finance|workflows)/.test(frame));
check('preview is auth-independent and uses shared AppShellFrame', preview.includes("../../../shared/shell/AppShellFrame.tsx") && !preview.includes('useAuth'));
check('preview states that it is not a business screen', preview.includes('هذه ليست شاشة أعمال'));
check('temporary Phase 1.3 auth wording is removed', !landing.includes('Phase 1.3') && !landing.includes('هذه شاشة مؤقتة حتى تبدأ مرحلة الواجهة الفعلية'));
check('landing does not duplicate sign-out behavior', !landing.includes('service.signOut') && !landing.includes('تسجيل الخروج'));

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
check('protected application route is nested inside AppShell', router.includes('Component: ProtectedRoute') && router.includes('Component: AppShell') && router.includes('ROUTES.appHome'));
check('router imports AppShell from app composition boundary', router.includes("import { AppShell } from './AppShell'"));
check('App Shell stylesheet loads after frozen Phase 2 destruction layer', foundationCss.indexOf("@import './app-shell.css';") > foundationCss.indexOf("@import './visual-destruction-lab.css';"));
check('foundation status exposes Phase 3.1 proof', statusPage.includes('App Shell 3.1') && statusPage.includes('ROUTES.shellPreview'));
check('application version declares Phase 3.1', version.includes("APP_VERSION = '0.10.0-phase3.1'"));
check('package version declares Phase 3.1', packageJson.version === '0.10.0-phase3.1');
check('Phase 3.1 gate extends immutable Phase 2.8 gate', packageJson.scripts?.['verify:phase3.1'] === 'npm run verify:phase2.8 && npm run audit:shell && npm run audit:shell:selftest && npm run audit:roadmap');
check('shell audit script is registered', packageJson.scripts?.['audit:shell'] === 'node scripts/phase3-1-shell-audit.mjs');
check('shell selftest script is registered', packageJson.scripts?.['audit:shell:selftest'] === 'node scripts/phase3-1-shell-selftest.mjs');
check('Phase 2.8 gate command remains unchanged', packageJson.scripts?.['verify:phase2.8'] === 'npm run verify:phase2.7 && npm run audit:destruction && npm run audit:destruction:selftest && npm run audit:roadmap');
check('GitHub quality gate covers Phase 3.1', workflow.includes('Full Phase 3.1 verification') && workflow.includes('npm run verify:phase3.1'));
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

console.log(`ENJAZ PHASE 3.1 APP SHELL AUDIT PASS — ${checks}/${checks} shell structure, composition, auth, mobile, RTL, token and gate invariants satisfied.`);
