import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const legacySelftest = resolve(root, 'scripts/phase3-2-navigation-selftest.mjs');
const compatAudit = resolve(root, 'scripts/phase3-2-forward-compat-audit.mjs');
const tempRoot = await mkdtemp(join(tmpdir(), 'enjaz-navigation-compat-selftest-'));

function copyFilter(source) {
  const rel = relative(root, source);
  if (!rel) return true;
  return !rel.split(sep).some((part) => ['.git', 'node_modules', 'dist'].includes(part));
}

async function normalizeLegacyFixture(fixture) {
  const contractPath = resolve(fixture, 'src/core/routing/navigationContract.ts');
  const packagePath = resolve(fixture, 'package.json');
  const contract = await readFile(contractPath, 'utf8');
  await writeFile(contractPath, contract.replace(
    "{ id: 'home', label: 'الرئيسية', path: ROUTES.appHome, deliveryPhase: '4', permission: 'authenticated', contentState: 'implemented' }",
    "{ id: 'home', label: 'الرئيسية', path: ROUTES.appHome, deliveryPhase: '4', permission: 'authenticated', contentState: 'reserved' }",
  ), 'utf8');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  packageJson.scripts['audit:navigation'] = 'node scripts/phase3-2-navigation-audit.mjs';
  packageJson.scripts['audit:navigation:selftest'] = 'node scripts/phase3-2-navigation-selftest.mjs';
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
}

let legacyRejected = false;
try {
  await cp(root, tempRoot, { recursive: true, filter: copyFilter });
  await normalizeLegacyFixture(tempRoot);
  const result = spawnSync(process.execPath, [legacySelftest], { cwd: tempRoot, encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stdout + result.stderr);
    throw new Error('Legacy Phase 3.2 destructive selftest is no longer green');
  }
  legacyRejected = true;
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

const forwardScenarios = [
  {
    name: 'return Home to reserved after Phase 4.1 implementation',
    file: 'src/core/routing/navigationContract.ts',
    mutate: (value) => value.replace("contentState: 'implemented' },\n  { id: 'today'", "contentState: 'reserved' },\n  { id: 'today'"),
  },
  {
    name: 'prematurely implement Today before Phase 4.2',
    file: 'src/core/routing/navigationContract.ts',
    mutate: (value) => value.replace("id: 'today', label: 'اليوم', path: ROUTES.appToday, deliveryPhase: '4', permission: 'authenticated', contentState: 'reserved'", "id: 'today', label: 'اليوم', path: ROUTES.appToday, deliveryPhase: '4', permission: 'authenticated', contentState: 'implemented'"),
  },
  {
    name: 'prematurely implement Finance outside Phase 7',
    file: 'src/core/routing/navigationContract.ts',
    mutate: (value) => value.replace("id: 'finance', label: 'المالية', path: ROUTES.appFinance, deliveryPhase: '7', permission: 'authenticated', contentState: 'reserved'", "id: 'finance', label: 'المالية', path: ROUTES.appFinance, deliveryPhase: '7', permission: 'authenticated', contentState: 'implemented'"),
  },
];

let rejected = 0;
for (const [index, scenario] of forwardScenarios.entries()) {
  const fixture = await mkdtemp(join(tmpdir(), `enjaz-navigation-forward-${index + 1}-`));
  try {
    await cp(root, fixture, { recursive: true, filter: copyFilter });
    const target = resolve(fixture, scenario.file);
    const original = await readFile(target, 'utf8');
    const mutated = scenario.mutate(original);
    if (mutated === original) throw new Error(`Mutation did not change: ${scenario.name}`);
    await writeFile(target, mutated, 'utf8');
    const result = spawnSync(process.execPath, [compatAudit, fixture], { encoding: 'utf8' });
    if (result.status === 0) throw new Error(`Forward compatibility audit accepted: ${scenario.name}`);
    rejected += 1;
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

console.log(`ENJAZ PHASE 3.2 FORWARD-COMPAT SELFTEST PASS — legacy destructive suite preserved=${legacyRejected}; ${rejected}/${forwardScenarios.length} Phase 4 navigation regressions rejected.`);
