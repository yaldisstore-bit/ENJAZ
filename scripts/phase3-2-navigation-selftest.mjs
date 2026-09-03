import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const auditPath = resolve(root, 'scripts/phase3-2-navigation-audit.mjs');
const tempRoot = await mkdtemp(join(tmpdir(), 'enjaz-navigation-selftest-'));

const scenarios = [
  { name: 'remove canonical finance route', file: 'src/core/routing/routes.ts', mutate: (value) => value.replace("  appFinance: '/app/finance',\n", '') },
  { name: 'duplicate canonical route path', file: 'src/core/routing/routes.ts', mutate: (value) => value.replace("appFinance: '/app/finance'", "appFinance: '/app/companies'") },
  { name: 'remove finance product record', file: 'src/core/routing/navigationContract.ts', mutate: (value) => value.replace("  { id: 'finance', label: 'المالية', path: ROUTES.appFinance, deliveryPhase: '7', permission: 'authenticated', contentState: 'reserved' },\n", '') },
  { name: 'remove authenticated permission declaration', file: 'src/core/routing/navigationContract.ts', mutate: (value) => value.replace("permission: 'authenticated', contentState: 'reserved'", "permission: 'anonymous', contentState: 'reserved'") },
  { name: 'prematurely mark business content implemented', file: 'src/core/routing/navigationContract.ts', mutate: (value) => value.replace("contentState: 'reserved'", "contentState: 'implemented'") },
  { name: 'remove finance from More ownership', file: 'src/core/routing/navigationContract.ts', mutate: (value) => value.replace("  'finance',\n  'workflows',", "  'workflows',") },
  { name: 'break app-home active boundary', file: 'src/core/routing/navigationContract.ts', mutate: (value) => value.replace('normalizedTarget === ROUTES.appHome', "normalizedTarget === '/broken-home'") },
  { name: 'remove home prefix exclusion', file: 'src/core/routing/navigationContract.ts', mutate: (value) => value.replace('route.path === ROUTES.appHome && normalized !== ROUTES.appHome', 'false') },
  { name: 'misroute More primary slot', file: 'src/core/routing/navigationContract.ts', mutate: (value) => value.replace("{ id: 'more', label: 'المزيد', path: ROUTES.appMore", "{ id: 'more', label: 'المزيد', path: ROUTES.appFinance") },
  { name: 'downgrade shell navigation readiness', file: 'src/shared/shell/shellContract.ts', mutate: (value) => value.replace("ShellNavStatus = 'ready'", "ShellNavStatus = 'planned'") },
  { name: 'hardcode active navigation', file: 'src/shared/shell/AppShellFrame.tsx', mutate: (value) => value.replace('resolvePrimaryNavigation(normalizedPath)', "'home'") },
  { name: 'remove safe back resolution', file: 'src/shared/shell/AppShellFrame.tsx', mutate: (value) => value.replace('resolveBackDestination(normalizedPath)', 'null') },
  { name: 'hardcode aria current', file: 'src/shared/shell/AppShellFrame.tsx', mutate: (value) => value.replace("aria-current={isActive ? 'page' : undefined}", 'aria-current="page"') },
  { name: 'restore disabled navigation control', file: 'src/shared/shell/AppShellFrame.tsx', mutate: (value) => `${value}\n<button className="app-shell__nav-item" disabled>regression</button>\n` },
  { name: 'detach current pathname from shell', file: 'src/app/AppShell.tsx', mutate: (value) => value.replace('currentPath={location.pathname}', 'currentPath="/app"') },
  { name: 'remove protected product route spread', file: 'src/app/router.tsx', mutate: (value) => value.replace('          ...reservedProductRoutes,\n', '') },
  { name: 'remove preview product route spread', file: 'src/app/previewRouter.tsx', mutate: (value) => value.replace('  ...previewProductRoutes,\n', '') },
  { name: 'remove Pages SPA fallback', file: '.github/workflows/enjaz-pages-preview.yml', mutate: (value) => value.replace('run: cp dist/index.html dist/404.html', 'run: echo fallback-removed') },
  { name: 'raw navigation color escape', file: 'src/styles/navigation.css', mutate: (value) => `${value}\n.navigation-regression { color: #ff0000; }\n` },
  { name: 'important navigation override', file: 'src/styles/navigation.css', mutate: (value) => `${value}\n.navigation-regression { display: block !important; }\n` },
  { name: 'tiny navigation text', file: 'src/styles/navigation.css', mutate: (value) => `${value}\n.navigation-regression { font-size: 10px; }\n` },
  { name: 'remove navigation reduced motion', file: 'src/styles/navigation.css', mutate: (value) => value.replace('@media (prefers-reduced-motion: reduce)', '@media (min-width: 999rem)') },
  { name: 'remove navigation stylesheet import', file: 'src/styles/foundation.css', mutate: (value) => value.replace("@import './navigation.css';\n", '') },
  { name: 'downgrade application version', file: 'src/core/version/version.ts', mutate: (value) => value.replace("0.10.0-phase3.2", "0.10.0-phase3.1") },
  { name: 'downgrade Phase 3.2 gate', file: 'package.json', mutate: (value) => value.replace('npm run verify:phase3.1 && npm run audit:navigation && npm run audit:navigation:selftest && npm run audit:roadmap', 'npm run verify:phase3.1') },
  { name: 'downgrade GitHub Phase 3.2 verification', file: '.github/workflows/enjaz-quality-gate.yml', mutate: (value) => value.replace('Full Phase 3.2 verification', 'Full Phase 3.1 verification') },
  { name: 'remove navigation status proof', file: 'src/features/foundation/pages/FoundationStatusPage.tsx', mutate: (value) => value.replace('Navigation Architecture 3.2', 'Navigation Architecture removed') },
  { name: 'unmark Phase 3.2 roadmap completion', file: 'docs/ENJAZ_MASTER_ROADMAP.md', mutate: (value) => value.replace('## 3.2 — Navigation Architecture ✅', '## 3.2 — Navigation Architecture') },
  { name: 'remove deep-link documentation proof', file: 'docs/PHASE_3_2_NAVIGATION_ARCHITECTURE.md', mutate: (value) => value.replaceAll('Deep-link', 'Direct-route') },
];

function copyFilter(source) {
  const rel = relative(root, source);
  if (!rel) return true;
  const parts = rel.split(sep);
  return !parts.some((part) => ['.git', 'node_modules', 'dist'].includes(part));
}

let rejected = 0;
try {
  for (const [index, scenario] of scenarios.entries()) {
    const fixture = join(tempRoot, `case-${index + 1}`);
    await cp(root, fixture, { recursive: true, filter: copyFilter });
    const target = resolve(fixture, scenario.file);
    const original = await readFile(target, 'utf8');
    const mutated = scenario.mutate(original);
    if (mutated === original) {
      console.error(`SELFTEST SETUP FAIL — mutation did not change ${scenario.name}`);
      process.exitCode = 1;
      break;
    }
    await writeFile(target, mutated, 'utf8');
    const result = spawnSync(process.execPath, [auditPath, fixture], { encoding: 'utf8' });
    if (result.status === 0) {
      console.error(`SELFTEST FAIL — navigation audit accepted deliberate regression: ${scenario.name}`);
      process.exitCode = 1;
      break;
    }
    rejected += 1;
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`ENJAZ PHASE 3.2 NAVIGATION SELFTEST PASS — ${rejected}/${scenarios.length} deliberate route/deep-link/back/permission/mobile/gate regressions rejected.`);
