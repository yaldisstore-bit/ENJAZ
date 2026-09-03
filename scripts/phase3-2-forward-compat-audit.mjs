import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const legacyAudit = resolve(root, 'scripts/phase3-2-navigation-audit.mjs');
const tempRoot = await mkdtemp(join(tmpdir(), 'enjaz-navigation-compat-'));
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

async function normalizeLegacyFixture(fixture) {
  const contractPath = resolve(fixture, 'src/core/routing/navigationContract.ts');
  const packagePath = resolve(fixture, 'package.json');
  const contract = await readFile(contractPath, 'utf8');
  await writeFile(
    contractPath,
    contract.replace(
      "{ id: 'home', label: 'الرئيسية', path: ROUTES.appHome, deliveryPhase: '4', permission: 'authenticated', contentState: 'implemented' }",
      "{ id: 'home', label: 'الرئيسية', path: ROUTES.appHome, deliveryPhase: '4', permission: 'authenticated', contentState: 'reserved' }",
    ),
    'utf8',
  );

  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  packageJson.scripts['audit:navigation'] = 'node scripts/phase3-2-navigation-audit.mjs';
  packageJson.scripts['audit:navigation:selftest'] = 'node scripts/phase3-2-navigation-selftest.mjs';
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
}

const contract = await readFile(resolve(root, 'src/core/routing/navigationContract.ts'), 'utf8');
const homeImplemented = /id: 'home'[\s\S]*?contentState: 'implemented'/.test(contract);
const implementedIds = [...contract.matchAll(/\{ id: '([^']+)'[^\n]+contentState: 'implemented' \}/g)].map((match) => match[1]);
const reservedCount = (contract.match(/contentState: 'reserved'/g) ?? []).length;
check('Phase 4.1 promotes Home in navigation contract', homeImplemented);
check('Home is the only implemented product route during 4.1', implementedIds.length === 1 && implementedIds[0] === 'home');
check('all other seventeen product routes remain reserved', reservedCount === 17);

try {
  await cp(root, tempRoot, { recursive: true, filter: copyFilter });
  await normalizeLegacyFixture(tempRoot);
  const result = spawnSync(process.execPath, [legacyAudit, tempRoot], { encoding: 'utf8' });
  check('legacy Phase 3.2 navigation audit remains fully green after deterministic normalization', result.status === 0);
  if (result.status !== 0) process.stderr.write(result.stdout + result.stderr);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`ENJAZ PHASE 3.2 FORWARD-COMPAT AUDIT FAIL — ${failures.length}/${checks} checks failed.`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`ENJAZ PHASE 3.2 FORWARD-COMPAT AUDIT PASS — ${checks}/${checks} current-state checks plus complete legacy navigation audit preserved.`);
