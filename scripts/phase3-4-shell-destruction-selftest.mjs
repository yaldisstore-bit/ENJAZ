import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const auditPath = resolve(root, 'scripts/phase3-4-shell-destruction-audit.mjs');
const tokenAuditPath = resolve(root, 'scripts/phase2-2-token-audit.mjs');
const tempRoot = await mkdtemp(join(tmpdir(), 'enjaz-shell-destruction-selftest-'));

const scenarios = [
  { name: 'remove keyboard scenario', file: 'src/core/shell/shellDestructionContract.ts', mutate: (value) => value.replace("  'keyboard',\n", '') },
  { name: 'duplicate back scenario as keyboard', file: 'src/core/shell/shellDestructionContract.ts', mutate: (value) => value.replace("  'back',", "  'keyboard',") },
  { name: 'widen minimum phone fixture', file: 'src/core/shell/shellDestructionContract.ts', mutate: (value) => value.replace('narrowWidthPx: 320', 'narrowWidthPx: 360') },
  { name: 'weaken keyboard occlusion threshold', file: 'src/core/shell/shellDestructionContract.ts', mutate: (value) => value.replace('keyboardOcclusionPx: 120', 'keyboardOcclusionPx: 20') },
  { name: 'shrink long-label torture', file: 'src/core/shell/shellDestructionContract.ts', mutate: (value) => value.replace('longLabelCharacters: 200', 'longLabelCharacters: 20') },
  { name: 'remove finite viewport guard', file: 'src/core/shell/shellDestructionContract.ts', mutate: (value) => value.replace('  if (!Number.isFinite(layoutViewportHeight) || !Number.isFinite(visualViewportHeight)) return false;\n', '') },
  { name: 'stop redirecting expired anonymous session', file: 'src/core/shell/shellDestructionContract.ts', mutate: (value) => value.replace("return status === 'anonymous';", "return status === 'authenticated';") },
  { name: 'misroute deep link fixture', file: 'src/core/shell/shellDestructionContract.ts', mutate: (value) => value.replace("deepLink: '/app/transactions'", "deepLink: '/app/unknown'") },
  { name: 'remove live auth state subscription', file: 'src/features/auth/state/AuthContext.tsx', mutate: (value) => value.replace('service.onAuthStateChange', 'service.removedAuthSubscription') },
  { name: 'make protected route fail open on anonymous', file: 'src/features/auth/pages/AuthRouteGuards.tsx', mutate: (value) => value.replace("if (status === 'anonymous') return <Navigate to={ROUTES.login} replace />;", "if (status === 'anonymous') return <Outlet />;") },
  { name: 'remove offline event listener', file: 'src/app/AppShell.tsx', mutate: (value) => value.replace("    window.addEventListener('offline', handleOffline);\n", '') },
  { name: 'remove offline listener cleanup', file: 'src/app/AppShell.tsx', mutate: (value) => value.replace("      window.removeEventListener('offline', handleOffline);\n", '') },
  { name: 'remove central back resolution', file: 'src/shared/shell/AppShellFrame.tsx', mutate: (value) => value.replace('resolveBackDestination(normalizedPath)', 'null') },
  { name: 'remove offline shell plumbing', file: 'src/shared/shell/AppShellFrame.tsx', mutate: (value) => value.replace("      {networkState === 'offline' ? (", "      {false ? (").replace('data-network-state={networkState}', 'data-network-state="offline-removed"') },
  { name: 'remove focusable main target', file: 'src/shared/shell/AppShellFrame.tsx', mutate: (value) => value.replace(' id="main-content" tabIndex={-1}', ' id="main-content"') },
  { name: 'remove route stage transition key', file: 'src/shared/shell/AppShellFrame.tsx', mutate: (value) => value.replace(' key={normalizedPath}', '') },
  { name: 'remove resizes-content mobile viewport contract', file: 'src/core/mobile/mobileContract.ts', mutate: (value) => value.replace(', interactive-widget=resizes-content', '') },
  { name: 'remove app shell dynamic viewport', file: 'src/styles/app-shell.css', mutate: (value) => value.replace('  min-block-size: 100dvh;\n', '') },
  { name: 'remove bottom safe area', file: 'src/styles/app-shell.css', mutate: (value) => value.replace('  padding-block-end: env(safe-area-inset-bottom, 0);\n', '') },
  { name: 'inject raw shell destruction color', file: 'src/styles/shell-destruction-lab.css', mutate: (value) => `${value}\n.shell-destruction-regression { color: #ff0000; }\n` },
  { name: 'inject important shell destruction override', file: 'src/styles/shell-destruction-lab.css', mutate: (value) => `${value}\n.shell-destruction-regression { display: block !important; }\n` },
  { name: 'inject numeric shell destruction z-index', file: 'src/styles/shell-destruction-lab.css', mutate: (value) => `${value}\n.shell-destruction-regression { z-index: 9999; }\n` },
  { name: 'inject transition all escape', file: 'src/styles/shell-destruction-lab.css', mutate: (value) => `${value}\n.shell-destruction-regression { transition: all 1s; }\n` },
  { name: 'inject unknown design token', file: 'src/styles/shell-destruction-lab.css', auditPath: tokenAuditPath, mutate: (value) => value.replace('background: var(--color-surface-raised);', 'background: var(--color-shell-destruction-fake);') },
  { name: 'remove 320px lab fixture proof', file: 'src/features/foundation/pages/ShellDestructionLabPage.tsx', mutate: (value) => value.replace('320px / Offline / Long-label fixture', 'Wide fixture') },
  { name: 'remove production destruction route', file: 'src/app/router.tsx', mutate: (value) => value.replace('  { path: ROUTES.shellDestructionPreview, Component: ShellDestructionLabPage },\n', '') },
  { name: 'remove preview destruction route', file: 'src/app/previewRouter.tsx', mutate: (value) => value.replace('  { path: ROUTES.shellDestructionPreview, Component: ShellDestructionLabPage },\n', '') },
  { name: 'remove destruction stylesheet import', file: 'src/styles/foundation.css', mutate: (value) => value.replace("@import './shell-destruction-lab.css';\n", '') },
  { name: 'remove Pages SPA fallback', file: '.github/workflows/enjaz-pages-preview.yml', mutate: (value) => value.replace(/404\.html/g, 'missing-fallback.html') },
  { name: 'downgrade application version from 3.4', file: 'src/core/version/version.ts', mutate: (value) => value.replace('0.10.0-phase3.4', '0.10.0-phase3.3') },
  { name: 'downgrade package version from 3.4', file: 'package.json', mutate: (value) => value.replace('"version": "0.10.0-phase3.4"', '"version": "0.10.0-phase3.3"') },
  { name: 'downgrade Phase 3.4 verification chain', file: 'package.json', mutate: (value) => value.replace('npm run verify:phase3.3 && npm run audit:shell-destruction && npm run audit:shell-destruction:selftest && npm run audit:roadmap', 'npm run verify:phase3.3') },
  { name: 'mutate immutable Phase 3.3 verification chain', file: 'package.json', mutate: (value) => value.replace('npm run verify:phase3.2 && npm run audit:interactions && npm run audit:interactions:selftest && npm run audit:roadmap', 'npm run verify:phase3.2') },
  { name: 'downgrade GitHub quality workflow to 3.3', file: '.github/workflows/enjaz-quality-gate.yml', mutate: (value) => value.replace('Full Phase 3.4 verification', 'Full Phase 3.3 verification').replace('npm run verify:phase3.4', 'npm run verify:phase3.3') },
  { name: 'remove shell destruction documentation marker', file: 'docs/PHASE_3_4_SHELL_DESTRUCTION_GATE.md', mutate: (value) => value.replaceAll('Phase 3.4', 'Shell QA') },
  { name: 'break roadmap Phase 3.4 heading', file: 'docs/ENJAZ_MASTER_ROADMAP.md', mutate: (value) => value.replace('## 3.4 — Shell Destruction Gate', '## 3.5 — Shell Destruction Gate') },
  { name: 'remove README Phase 3.4 marker', file: 'README.md', mutate: (value) => value.replaceAll('Phase 3.4 — Shell Destruction Gate', 'Shell Destruction Work') },
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
    const scenarioAuditPath = scenario.auditPath ?? auditPath;
    const result = spawnSync(process.execPath, [scenarioAuditPath, fixture], { encoding: 'utf8' });
    if (result.status === 0) {
      console.error(`SELFTEST FAIL — Phase 3.4 audit accepted deliberate regression: ${scenario.name}`);
      process.exitCode = 1;
      break;
    }
    rejected += 1;
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`ENJAZ PHASE 3.4 SHELL DESTRUCTION SELFTEST PASS — ${rejected}/${scenarios.length} deliberate keyboard/back/rotation/deep-link/session/offline/mobile/token/gate regressions rejected.`);
