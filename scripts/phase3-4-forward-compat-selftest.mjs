import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const legacySelftest = resolve(root, 'scripts/phase3-4-shell-destruction-selftest.mjs');
const compatAudit = resolve(root, 'scripts/phase3-4-forward-compat-audit.mjs');

function copyFilter(source) {
  const rel = relative(root, source);
  if (!rel) return true;
  return !rel.split(sep).some((part) => ['.git', 'node_modules', 'dist'].includes(part));
}

async function replaceFile(fixture, path, mutate) {
  const target = resolve(fixture, path);
  const original = await readFile(target, 'utf8');
  await writeFile(target, mutate(original), 'utf8');
}

async function normalizeLegacyFixture(fixture) {
  await replaceFile(fixture, 'src/core/routing/navigationContract.ts', (value) => value.replace(
    "{ id: 'home', label: 'الرئيسية', path: ROUTES.appHome, deliveryPhase: '4', permission: 'authenticated', contentState: 'implemented' }",
    "{ id: 'home', label: 'الرئيسية', path: ROUTES.appHome, deliveryPhase: '4', permission: 'authenticated', contentState: 'reserved' }",
  ));
  await replaceFile(fixture, 'src/core/version/version.ts', (value) => value.replace(/APP_VERSION = '[^']+'/g, "APP_VERSION = '0.10.0-phase3.4'"));
  await replaceFile(fixture, 'package.json', (value) => {
    const packageJson = JSON.parse(value);
    packageJson.version = '0.10.0-phase3.4';
    packageJson.scripts['audit:navigation'] = 'node scripts/phase3-2-navigation-audit.mjs';
    packageJson.scripts['audit:navigation:selftest'] = 'node scripts/phase3-2-navigation-selftest.mjs';
    packageJson.scripts['audit:shell-destruction'] = 'node scripts/phase3-4-shell-destruction-audit.mjs';
    packageJson.scripts['audit:shell-destruction:selftest'] = 'node scripts/phase3-4-shell-destruction-selftest.mjs';
    return `${JSON.stringify(packageJson, null, 2)}\n`;
  });
  await replaceFile(fixture, '.github/workflows/enjaz-quality-gate.yml', (value) => value
    .replace(/Full Phase 4\.1 verification/g, 'Full Phase 3.4 verification')
    .replace(/npm run verify:phase4\.1/g, 'npm run verify:phase3.4'));
  await replaceFile(fixture, 'README.md', (value) => value
    .replace(/Phase 4 — Home, Daily Work & Executive Overview[^\n]*/g, 'Phase 4 — Home, Daily Work & Executive Overview ⏭ NEXT — not started.')
    .replace(/Phase 4\.1 — Home \/ Dashboard[^\n]*/g, 'Phase 4.1 — Home / Dashboard — not started.'));
}

const legacyRoot = await mkdtemp(join(tmpdir(), 'enjaz-shell34-legacy-selftest-'));
try {
  await cp(root, legacyRoot, { recursive: true, filter: copyFilter });
  await normalizeLegacyFixture(legacyRoot);
  const result = spawnSync(process.execPath, [legacySelftest], { cwd: legacyRoot, encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stdout + result.stderr);
    throw new Error('Legacy Phase 3.4 destructive selftest failed after forward normalization');
  }
} finally {
  await rm(legacyRoot, { recursive: true, force: true });
}

const scenarios = [
  {
    name: 'remove 100dvh after Phase 4 starts',
    file: 'src/styles/app-shell.css',
    mutate: (value) => value.replaceAll('100dvh', '100vh'),
  },
  {
    name: 'remove bottom safe area after Phase 4 starts',
    file: 'src/styles/app-shell.css',
    mutate: (value) => value.replaceAll('safe-area-inset-bottom', 'removed-safe-area'),
  },
  {
    name: 'prematurely implement another product domain',
    file: 'src/core/routing/navigationContract.ts',
    mutate: (value) => value.replace("id: 'today', label: 'اليوم', path: ROUTES.appToday, deliveryPhase: '4', permission: 'authenticated', contentState: 'reserved'", "id: 'today', label: 'اليوم', path: ROUTES.appToday, deliveryPhase: '4', permission: 'authenticated', contentState: 'implemented'"),
  },
  {
    name: 'remove shell destruction terminal stylesheet',
    file: 'src/styles/foundation.css',
    mutate: (value) => value.replace("@import './shell-destruction-lab.css';\n", ''),
  },
];

let rejected = 0;
for (const [index, scenario] of scenarios.entries()) {
  const fixture = await mkdtemp(join(tmpdir(), `enjaz-shell34-forward-${index + 1}-`));
  try {
    await cp(root, fixture, { recursive: true, filter: copyFilter });
    const target = resolve(fixture, scenario.file);
    const original = await readFile(target, 'utf8');
    const mutated = scenario.mutate(original);
    if (mutated === original) throw new Error(`Mutation did not change: ${scenario.name}`);
    await writeFile(target, mutated, 'utf8');
    const result = spawnSync(process.execPath, [compatAudit, fixture], { encoding: 'utf8' });
    if (result.status === 0) throw new Error(`Phase 3.4 forward audit accepted: ${scenario.name}`);
    rejected += 1;
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

console.log(`ENJAZ PHASE 3.4 FORWARD-COMPAT SELFTEST PASS — complete legacy destructive suite preserved; ${rejected}/${scenarios.length} Phase 4 shell regressions rejected.`);
