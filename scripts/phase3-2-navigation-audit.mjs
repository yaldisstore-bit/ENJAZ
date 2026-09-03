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

function phaseAtLeast(value, major, minor) {
  const match = String(value).match(/phase(\d+)\.(\d+)/);
  if (!match) return false;
  const foundMajor = Number(match[1]);
  const foundMinor = Number(match[2]);
  return foundMajor > major || (foundMajor === major && foundMinor >= minor);
}

const contract = await text('src/core/routing/navigationContract.ts');
const routes = await text('src/core/routing/routes.ts');
const shellContract = await text('src/shared/shell/shellContract.ts');
const frame = await text('src/shared/shell/AppShellFrame.tsx');
const shell = await text('src/app/AppShell.tsx');
const router = await text('src/app/router.tsx');
const previewRouter = await text('src/app/previewRouter.tsx');
const boundary = await text('src/features/navigation/pages/NavigationBoundaryPage.tsx');
const previewPage = await text('src/features/navigation/pages/NavigationPreviewAppPage.tsx');
const lab = await text('src/features/navigation/pages/NavigationLabPage.tsx');
const css = await text('src/styles/navigation.css');
const foundationCss = await text('src/styles/foundation.css');
const pagesWorkflow = await text('.github/workflows/enjaz-pages-preview.yml');
const qualityWorkflow = await text('.github/workflows/enjaz-quality-gate.yml');
const version = await text('src/core/version/version.ts');
const packageJson = JSON.parse(await text('package.json'));
const roadmap = await text('docs/ENJAZ_MASTER_ROADMAP.md');
const doc = await text('docs/PHASE_3_2_NAVIGATION_ARCHITECTURE.md');
const statusPage = await text('src/features/foundation/pages/FoundationStatusPage.tsx');

const expectedProductIds = [
  'home', 'today', 'transactions', 'companies', 'people', 'finance', 'workflows', 'automation',
  'operations', 'command', 'risk', 'savedViews', 'intelligence', 'documents', 'reports',
  'notifications', 'followUps', 'copilot',
];
const expectedPrimaryIds = ['home', 'work', 'transactions', 'companies', 'more'];
const expectedAppRouteKeys = [
  'appHome', 'appToday', 'appTransactions', 'appCompanies', 'appMore', 'appPeople', 'appFinance',
  'appWorkflows', 'appAutomation', 'appOperations', 'appCommand', 'appRisk', 'appSavedViews',
  'appIntelligence', 'appDocuments', 'appReports', 'appNotifications', 'appFollowUps', 'appCopilot',
];

const appRouteEntries = [...routes.matchAll(/^\s+(app[A-Z]\w+): '([^']+)',/gm)]
  .map((match) => ({ key: match[1], path: match[2] }));
check('route registry declares exactly nineteen app-level roots including More hub', appRouteEntries.length === 19, `count=${appRouteEntries.length}`);
check('app route registry keys are unique', new Set(appRouteEntries.map((entry) => entry.key)).size === appRouteEntries.length);
check('app route paths are unique', new Set(appRouteEntries.map((entry) => entry.path)).size === appRouteEntries.length);
check('app route keys match frozen Phase 3.2 map', expectedAppRouteKeys.every((key) => appRouteEntries.some((entry) => entry.key === key)));
check('all app routes stay below /app', appRouteEntries.every((entry) => entry.path === '/app' || entry.path.startsWith('/app/')));
check('no app route ends with a slash', appRouteEntries.every((entry) => entry.path === '/app' || !entry.path.endsWith('/')));
check('navigation preview route is canonical', routes.includes("navigationPreview: '/foundation/navigation'"));

const productRecords = [...contract.matchAll(/\{ id: '([^']+)', label: '[^']+', path: ROUTES\.(app\w+), deliveryPhase: '(\d+)', permission: 'authenticated', contentState: 'reserved' \}/g)]
  .map((match) => ({ id: match[1], routeKey: match[2], phase: match[3] }));
check('product navigation declares eighteen domain roots', productRecords.length === 18, `count=${productRecords.length}`);
check('product navigation ids are unique', new Set(productRecords.map((record) => record.id)).size === 18);
check('product navigation route keys are unique', new Set(productRecords.map((record) => record.routeKey)).size === 18);
check('product navigation ids match roadmap domains', expectedProductIds.every((id) => productRecords.some((record) => record.id === id)));
check('product routes exclude shell-only More hub', !productRecords.some((record) => record.routeKey === 'appMore'));
check('all product routes declare authenticated permission', (contract.match(/permission: 'authenticated'/g) ?? []).length >= 18);
check('all product content remains reserved in navigation contract', (contract.match(/contentState: 'reserved'/g) ?? []).length >= 18 && !contract.includes("contentState: 'implemented'"));
check('delivery phases stay inside Phase 4 through 12', productRecords.every((record) => Number(record.phase) >= 4 && Number(record.phase) <= 12));

const secondaryBlock = contract.match(/SECONDARY_NAVIGATION_ROUTE_IDS = Object\.freeze\(\[([\s\S]*?)\]\s+as const/);
const secondaryIds = secondaryBlock ? [...secondaryBlock[1].matchAll(/'([^']+)'/g)].map((match) => match[1]) : [];
check('More hub owns exactly fourteen secondary domain ids', secondaryIds.length === 14, `count=${secondaryIds.length}`);
check('secondary ids are unique', new Set(secondaryIds).size === secondaryIds.length);
check('secondary ids all refer to product routes', secondaryIds.every((id) => expectedProductIds.includes(id)));
check('primary domains are not duplicated inside More', !secondaryIds.some((id) => ['home', 'today', 'transactions', 'companies'].includes(id)));

const primaryRecords = [...contract.matchAll(/\{ id: '(home|work|transactions|companies|more)', label: '[^']+', path: ROUTES\.(app\w+), routeIds:/g)]
  .map((match) => ({ id: match[1], routeKey: match[2] }));
check('primary navigation declares exactly five slots', primaryRecords.length === 5, `count=${primaryRecords.length}`);
check('primary navigation ids are unique', new Set(primaryRecords.map((record) => record.id)).size === 5);
check('primary navigation ids preserve frozen order set', expectedPrimaryIds.every((id) => primaryRecords.some((record) => record.id === id)));
for (const marker of [
  "{ id: 'home', label: 'الرئيسية', path: ROUTES.appHome",
  "{ id: 'work', label: 'اليوم', path: ROUTES.appToday",
  "{ id: 'transactions', label: 'المعاملات', path: ROUTES.appTransactions",
  "{ id: 'companies', label: 'الشركات', path: ROUTES.appCompanies",
  "{ id: 'more', label: 'المزيد', path: ROUTES.appMore",
]) check(`primary navigation binds ${marker}`, contract.includes(marker));

for (const marker of [
  'normalizeNavigationPath',
  'isNavigationPathActive',
  'getProductNavigationRoute',
  'getProductNavigationRouteById',
  'resolvePrimaryNavigation',
  'resolveNavigationAccess',
  'resolveBackDestination',
  "normalizedTarget === ROUTES.appHome",
  "route.path === ROUTES.appHome && normalized !== ROUTES.appHome",
]) check(`navigation contract proves ${marker}`, contract.includes(marker));
check('navigation back contract avoids browser-history escape', !/navigate\s*\(\s*-1\s*\)|history\.back\s*\(/.test(contract + frame));
check('access contract has no invented role vocabulary', !/admin|manager|lawyer|accountant|roleId|permissionId/i.test(contract));

check('shell derives its five destinations from primary navigation', shellContract.includes('PRIMARY_NAVIGATION.map') && shellContract.includes('destination: item.path'));
check('shell has ready-only navigation status', shellContract.includes("ShellNavStatus = 'ready'") && !shellContract.includes("status: 'planned'"));
check('shell contract contains no direct /app product path literals', !/['"]\/app(?:\/|['"])/.test(shellContract));

for (const marker of [
  'currentPath',
  'normalizeNavigationPath(currentPath)',
  'resolvePrimaryNavigation(normalizedPath)',
  'resolveBackDestination(normalizedPath)',
  'getProductNavigationRoute(normalizedPath)',
  "aria-current={isActive ? 'page' : undefined}",
  'data-navigation-active',
  'app-shell__back-link',
  'app-shell__route-stage',
  'key={normalizedPath}',
]) check(`App Shell frame proves ${marker}`, frame.includes(marker));
check('shell no longer disables primary navigation', !frame.includes('سيتم تفعيلها في Phase 3.2') && !/<button[\s\S]*?app-shell__nav-item/.test(frame));
check('shared shell still owns no auth feature import', !frame.includes('/features/auth') && !frame.includes('useAuth'));
check('shared shell embeds no product path literals', !/\/app\/(?:today|transactions|companies|finance|documents|notifications)/.test(frame));
check('shell frame has no inline style bypass', !/\bstyle\s*=\s*\{/.test(frame));
check('later shell additions do not bypass navigation ownership with direct writes', !/\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(/.test(frame));

check('app composition reads React Router location', shell.includes("import { Outlet, useLocation } from 'react-router'") && shell.includes('const location = useLocation()'));
check('app composition passes pathname into shared shell', shell.includes('currentPath={location.pathname}'));
check('app composition retains online/offline listeners', shell.includes("window.addEventListener('online'") && shell.includes("window.addEventListener('offline'"));
check('app composition retains auth-owned sign out', shell.includes('await service.signOut()'));

check('protected router consumes central product route map', router.includes('PRODUCT_NAVIGATION_ROUTES') && router.includes('reservedProductRoutes'));
check('protected router excludes home from generic reserved route mapping', router.includes(".filter((route) => route.id !== 'home')"));
check('protected router mounts More hub explicitly', router.includes('ROUTES.appMore') && router.includes('NavigationBoundaryPage'));
check('all product roots remain below ProtectedRoute + AppShell', router.indexOf('Component: ProtectedRoute') < router.indexOf('...reservedProductRoutes') && router.indexOf('Component: AppShell') < router.indexOf('...reservedProductRoutes'));
check('main router exposes navigation lab', router.includes('NavigationLabPage') && router.includes('ROUTES.navigationPreview'));

check('preview router consumes central product route map', previewRouter.includes('PRODUCT_NAVIGATION_ROUTES') && previewRouter.includes('previewProductRoutes'));
check('preview router mounts auth-free product preview wrapper', previewRouter.includes('NavigationPreviewAppPage') && previewRouter.includes('...previewProductRoutes'));
check('preview router explicitly mounts More hub', previewRouter.includes('ROUTES.appMore') && previewRouter.includes('NavigationPreviewAppPage'));
check('preview router preserves Pages basename', previewRouter.includes('basename: import.meta.env.BASE_URL'));
check('Pages workflow preserves SPA 404 fallback for direct deep links', pagesWorkflow.includes('cp dist/index.html dist/404.html'));
check('Pages workflow builds with configured base path', pagesWorkflow.includes('--base="${{ steps.pages.outputs.base_path }}/"'));

for (const marker of [
  'useLocation()',
  'getProductNavigationRoute(location.pathname)',
  'SECONDARY_NAVIGATION_ROUTE_IDS.map',
  'resolveNavigationAccess(route, { isAuthenticated: true })',
  'هذه بوابة تنقل فقط',
  'ليست بديلاً عن شاشة المجال',
]) check(`navigation boundary proves ${marker}`, boundary.includes(marker));
check('navigation boundary has no direct data/auth service dependency', !/supabase|repository|service\.|useAuth|dataLayer/i.test(boundary));
check('navigation boundary has no inline style bypass', !/\bstyle\s*=\s*\{/.test(boundary));
check('preview wrapper passes its real preview pathname', previewPage.includes('useLocation()') && previewPage.includes('currentPath={location.pathname}'));
check('preview wrapper remains auth-independent', !previewPage.includes('useAuth') && !previewPage.includes('ProtectedRoute'));

for (const marker of [
  'ENJAZ · Phase 3.2',
  'PRODUCT_NAVIGATION_ROUTES.length',
  'PRIMARY_NAVIGATION.map',
  'resolvePrimaryNavigation(ROUTES.appFinance)',
  'resolveBackDestination(ROUTES.appFinance)',
  'Phase 3.3',
]) check(`Navigation Lab proves ${marker}`, lab.includes(marker));
check('Navigation Lab does not claim to be a business screen', lab.includes('من دون بناء شاشات الأعمال'));

check('navigation CSS loads after frozen App Shell CSS', foundationCss.indexOf("@import './navigation.css';") > foundationCss.indexOf("@import './app-shell.css';"));
check('navigation CSS is under 400-line architectural budget', css.split(/\r?\n/).length <= 400, `lines=${css.split(/\r?\n/).length}`);
check('navigation CSS contains no raw color literal', !/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(css));
check('navigation CSS contains no important override', !/!important/i.test(css));
check('navigation CSS contains no numeric z-index', !/z-index\s*:\s*-?\d+/i.test(css));
check('navigation CSS avoids transition all', !/transition\s*:\s*all\b/i.test(css));
check('navigation CSS avoids physical horizontal spacing', !/(?:margin-left|margin-right|padding-left|padding-right)\s*:/i.test(css));
check('navigation CSS contains no raw sub-13px font size', !/font-size\s*:\s*(?:[0-9]|1[0-2](?:\.\d+)?)px\b/i.test(css));
check('navigation back control preserves touch floor', css.includes('.app-shell__back-link') && css.includes('min-block-size: var(--size-touch-min)'));
check('navigation hub preserves large touch rows', css.includes('.navigation-hub__item') && css.includes('min-block-size: var(--size-control-lg)'));
check('navigation route transition uses motion token', css.includes('animation: enjaz-route-enter var(--duration-fast) var(--easing-standard) both'));
check('navigation route transition respects reduced motion', css.includes('@media (prefers-reduced-motion: reduce)') && css.includes('animation: none'));
check('navigation focus remains visibly tokenized', css.includes(':focus-visible') && css.includes('var(--color-focus)'));
check('long route paths wrap instead of clipping', css.includes('overflow-wrap: anywhere'));
check('navigation has narrow-phone adaptation', css.includes('@media (max-width: 30rem)'));

const appVersion = version.match(/APP_VERSION = '([^']+)'/)?.[1] ?? '';
check('application version is Phase 3.2 or later', phaseAtLeast(appVersion, 3, 2), appVersion);
check('package version is Phase 3.2 or later', phaseAtLeast(packageJson.version, 3, 2), packageJson.version);
check('navigation audit script is registered', packageJson.scripts?.['audit:navigation'] === 'node scripts/phase3-2-navigation-audit.mjs');
check('navigation selftest script is registered', packageJson.scripts?.['audit:navigation:selftest'] === 'node scripts/phase3-2-navigation-selftest.mjs');
check('Phase 3.2 gate extends immutable Phase 3.1 gate', packageJson.scripts?.['verify:phase3.2'] === 'npm run verify:phase3.1 && npm run audit:navigation && npm run audit:navigation:selftest && npm run audit:roadmap');
check('Phase 3.1 gate command remains unchanged', packageJson.scripts?.['verify:phase3.1'] === 'npm run verify:phase2.8 && npm run audit:shell && npm run audit:shell:selftest && npm run audit:roadmap');
const workflowGate = qualityWorkflow.match(/npm run (verify:phase\d+\.\d+)/)?.[1] ?? '';
check('GitHub quality gate remains Phase 3.2 or later', phaseAtLeast(workflowGate, 3, 2), workflowGate);
check('foundation status exposes Navigation Architecture 3.2', statusPage.includes('Navigation Architecture 3.2') && statusPage.includes('ROUTES.navigationPreview'));

const phase31 = roadmap.indexOf('## 3.1 — App Shell');
const phase32 = roadmap.indexOf('## 3.2 — Navigation Architecture');
const phase33 = roadmap.indexOf('## 3.3 — Global Interaction Surfaces');
const phase34 = roadmap.indexOf('## 3.4 — Shell Destruction Gate');
check('roadmap retains all Phase 3 headings', [phase31, phase32, phase33, phase34].every((position) => position >= 0));
check('roadmap retains Phase 3.1 → 3.4 order', phase31 < phase32 && phase32 < phase33 && phase33 < phase34);
for (const marker of [
  'Final route map for product domains.',
  'Section transitions and back behavior.',
  'Deep-link-safe routing.',
  'Active navigation state.',
  'Navigation permissions/availability contracts.',
]) check(`roadmap preserves Phase 3.2 scope: ${marker}`, roadmap.includes(marker));
check('roadmap still assigns global search to 3.3', roadmap.indexOf('Global search entry point.') > phase33);
check('roadmap still assigns shell torture to 3.4', roadmap.indexOf('Keyboard/back/rotation/navigation torture.') > phase34);

for (const marker of [
  'Final route map', 'Deep-link', 'active navigation', 'back', 'permissions', 'availability',
  '/foundation/navigation', '/app/transactions', '/app/companies', '/app/finance', '18', '5',
  'reserved', 'Phase 3.3', 'GitHub Pages', '404.html', 'destructive',
]) check(`Phase 3.2 documentation contains ${marker}`, doc.toLowerCase().includes(marker.toLowerCase()));

if (failures.length) {
  console.error(`ENJAZ PHASE 3.2 NAVIGATION AUDIT FAIL — ${failures.length}/${checks} checks failed`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`ENJAZ PHASE 3.2 NAVIGATION AUDIT PASS — ${checks}/${checks} route-map, active-state, deep-link, safe-back, permissions, preview, mobile/RTL and gate invariants satisfied.`);
