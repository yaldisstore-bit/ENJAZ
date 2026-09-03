import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const legacyAudit = resolve(root, 'scripts/phase3-4-shell-destruction-audit.mjs');
const tempRoot = await mkdtemp(join(tmpdir(), 'enjaz-shell34-compat-'));
const failures = [];
let checks = 0;

function check(name, condition) {
  checks += 1;
  if (!condition) failures.push(name);
}

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

const contract = await readFile(resolve(root, 'src/core/shell/shellDestructionContract.ts'), 'utf8');
const navigation = await readFile(resolve(root, 'src/core/routing/navigationContract.ts'), 'utf8');
const foundationCss = await readFile(resolve(root, 'src/styles/foundation.css'), 'utf8');
const appShellCss = await readFile(resolve(root, 'src/styles/app-shell.css'), 'utf8');
const implementedIds = [...navigation.matchAll(/\{ id: '([^']+)'[^\n]+contentState: 'implemented' \}/g)].map((match) => match[1]);

for (const marker of ['keyboard', 'back', 'rotation', 'deepLink', 'sessionExpiry', 'offline', 'narrowScreen', 'longLabels']) {
  check(`Phase 3.4 destruction scenario remains ${marker}`, contract.includes(`'${marker}'`));
}
check('Phase 4 keeps Home as the only implemented product route at 4.1', implementedIds.length === 1 && implementedIds[0] === 'home');
check('shell destruction stylesheet remains terminal after product styles', foundationCss.trim().endsWith("@import './shell-destruction-lab.css';"));
check('App Shell still preserves 100dvh', appShellCss.includes('100dvh'));
check('App Shell still preserves bottom safe area', appShellCss.includes('safe-area-inset-bottom'));

try {
  await cp(root, tempRoot, { recursive: true, filter: copyFilter });
  await normalizeLegacyFixture(tempRoot);
  const result = spawnSync(process.execPath, [legacyAudit, tempRoot], { encoding: 'utf8' });
  check('complete legacy Phase 3.4 audit remains green after forward normalization', result.status === 0);
  if (result.status !== 0) process.stderr.write(result.stdout + result.stderr);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`ENJAZ PHASE 3.4 FORWARD-COMPAT AUDIT FAIL — ${failures.length}/${checks} checks failed.`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`ENJAZ PHASE 3.4 FORWARD-COMPAT AUDIT PASS — ${checks}/${checks} current shell invariants plus complete legacy 3.4 audit preserved.`);
