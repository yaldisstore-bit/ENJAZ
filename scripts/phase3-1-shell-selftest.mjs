import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const auditPath = resolve(root, 'scripts/phase3-1-shell-audit.mjs');
const tempRoot = await mkdtemp(join(tmpdir(), 'enjaz-shell-selftest-'));

const scenarios = [
  { name: 'shrink touch floor', file: 'src/shared/shell/shellContract.ts', mutate: (value) => value.replace('SHELL_TOUCH_TARGET_PX = 44', 'SHELL_TOUCH_TARGET_PX = 40') },
  { name: 'shrink nav slot contract', file: 'src/shared/shell/shellContract.ts', mutate: (value) => value.replace('SHELL_MOBILE_NAV_SLOTS = 5', 'SHELL_MOBILE_NAV_SLOTS = 4') },
  { name: 'downgrade ready navigation status', file: 'src/shared/shell/shellContract.ts', mutate: (value) => value.replace("ShellNavStatus = 'ready'", "ShellNavStatus = 'planned'") },
  { name: 'remove skip link', file: 'src/shared/shell/AppShellFrame.tsx', mutate: (value) => value.replace('app-shell__skip-link', 'removed-shell-skip-anchor') },
  { name: 'remove offline listener', file: 'src/app/AppShell.tsx', mutate: (value) => value.replace("window.addEventListener('offline', handleOffline);", '') },
  { name: 'remove auth sign-out', file: 'src/app/AppShell.tsx', mutate: (value) => value.replace('await service.signOut();', 'await Promise.resolve();') },
  { name: 'raw color escape', file: 'src/styles/app-shell.css', mutate: (value) => `${value}\n.app-shell-regression { color: #ff0000; }\n` },
  { name: 'numeric z-index escape', file: 'src/styles/app-shell.css', mutate: (value) => `${value}\n.app-shell-regression { z-index: 999; }\n` },
  { name: 'remove bottom safe area', file: 'src/styles/app-shell.css', mutate: (value) => value.replaceAll('safe-area-inset-bottom', 'removed-safe-area-bottom') },
  { name: 'remove reduced motion', file: 'src/styles/app-shell.css', mutate: (value) => value.replace('@media (prefers-reduced-motion: reduce)', '@media (min-width: 999rem)') },
  { name: 'embed product route inside shared shell', file: 'src/shared/shell/AppShellFrame.tsx', mutate: (value) => `${value}\nconst embeddedRouteRegression = '/app/transactions';\n` },
  { name: 'cross feature auth leak into shared frame', file: 'src/shared/shell/AppShellFrame.tsx', mutate: (value) => `${value}\n// forbidden boundary probe: ../features/auth/useAuth\n` },
  { name: 'remove shell preview route', file: 'src/core/routing/routes.ts', mutate: (value) => value.replace("  shellPreview: '/foundation/shell',\n", '') },
  { name: 'detach protected app shell', file: 'src/app/router.tsx', mutate: (value) => value.replace('Component: AppShell,', 'Component: AuthHomePage,') },
  { name: 'downgrade Phase 3.1 gate', file: 'package.json', mutate: (value) => value.replace('npm run verify:phase2.8 && npm run audit:shell && npm run audit:shell:selftest && npm run audit:roadmap', 'npm run verify:phase2.8') },
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
      console.error(`SELFTEST FAIL — shell audit accepted deliberate regression: ${scenario.name}`);
      process.exitCode = 1;
      break;
    }
    rejected += 1;
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`ENJAZ PHASE 3.1 APP SHELL SELFTEST PASS — ${rejected}/${scenarios.length} deliberate shell/mobile/route/boundary/gate regressions rejected.`);
