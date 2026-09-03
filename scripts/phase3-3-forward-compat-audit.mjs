import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const legacyAuditName = 'phase3-3-global-interactions-audit.mjs';
const immutablePhase33Gate = 'npm run verify:phase3.2 && npm run audit:interactions && npm run audit:interactions:selftest && npm run audit:roadmap';
const implementedHomeRecord = "{ id: 'home', label: 'الرئيسية', path: ROUTES.appHome, deliveryPhase: '4', permission: 'authenticated', contentState: 'implemented' }";
const reservedHomeRecord = "{ id: 'home', label: 'الرئيسية', path: ROUTES.appHome, deliveryPhase: '4', permission: 'authenticated', contentState: 'reserved' }";

function phaseTuple(value) {
  const match = String(value).match(/phase(\d+)\.(\d+)/);
  return match ? [Number(match[1]), Number(match[2])] : null;
}

function phaseAtLeast(tuple, floorMajor, floorMinor) {
  if (!tuple) return false;
  return tuple[0] > floorMajor || (tuple[0] === floorMajor && tuple[1] >= floorMinor);
}

function samePhase(a, b) {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}

function copyFilter(source) {
  const rel = relative(root, source);
  if (!rel) return true;
  const parts = rel.split(sep);
  return !parts.some((part) => ['.git', 'node_modules', 'dist'].includes(part));
}

const versionPath = resolve(root, 'src/core/version/version.ts');
const packagePath = resolve(root, 'package.json');
const workflowPath = resolve(root, '.github/workflows/enjaz-quality-gate.yml');
const versionSource = await readFile(versionPath, 'utf8');
const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
const workflow = await readFile(workflowPath, 'utf8');

const appVersion = versionSource.match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1] ?? '';
const appPhase = phaseTuple(appVersion);
const packagePhase = phaseTuple(packageJson.version);
const workflowLabelPhase = phaseTuple(workflow.match(/Full Phase (\d+\.\d+) verification/)?.[1] ? `phase${workflow.match(/Full Phase (\d+\.\d+) verification/)?.[1]}` : '');
const workflowCommandPhase = phaseTuple(workflow.match(/npm run verify:phase(\d+\.\d+)/)?.[1] ? `phase${workflow.match(/npm run verify:phase(\d+\.\d+)/)?.[1]}` : '');

const forwardFailures = [];
if (!phaseAtLeast(appPhase, 3, 3)) forwardFailures.push(`application version must be Phase 3.3 or later; found ${appVersion || 'unparseable'}`);
if (!phaseAtLeast(packagePhase, 3, 3)) forwardFailures.push(`package version must be Phase 3.3 or later; found ${packageJson.version ?? 'missing'}`);
if (!samePhase(appPhase, packagePhase)) forwardFailures.push('application and package phase versions must match');
if (!samePhase(appPhase, workflowLabelPhase)) forwardFailures.push('GitHub Quality Gate label must match the current application phase');
if (!samePhase(appPhase, workflowCommandPhase)) forwardFailures.push('GitHub Quality Gate command must run the current phase verification');
if (packageJson.scripts?.['verify:phase3.3'] !== immutablePhase33Gate) forwardFailures.push('immutable verify:phase3.3 chain changed');
if (!packageJson.scripts?.[`verify:phase${appPhase?.[0]}.${appPhase?.[1]}`]) forwardFailures.push('current phase verification command is not registered');

if (forwardFailures.length) {
  console.error(`ENJAZ PHASE 3.3 FORWARD-COMPAT AUDIT FAIL — ${forwardFailures.length}/7 compatibility checks failed`);
  forwardFailures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const tempRoot = await mkdtemp(join(tmpdir(), 'enjaz-phase3-3-compat-audit-'));
try {
  const fixture = join(tempRoot, 'fixture');
  await cp(root, fixture, { recursive: true, filter: copyFilter });

  const fixtureVersionPath = resolve(fixture, 'src/core/version/version.ts');
  const fixturePackagePath = resolve(fixture, 'package.json');
  const fixtureWorkflowPath = resolve(fixture, '.github/workflows/enjaz-quality-gate.yml');
  const fixtureNavigationPath = resolve(fixture, 'src/core/routing/navigationContract.ts');

  const fixtureVersion = await readFile(fixtureVersionPath, 'utf8');
  await writeFile(
    fixtureVersionPath,
    fixtureVersion.replace(/APP_VERSION\s*=\s*'[^']+'/, "APP_VERSION = '0.10.0-phase3.3'"),
    'utf8',
  );

  const fixturePackage = JSON.parse(await readFile(fixturePackagePath, 'utf8'));
  fixturePackage.version = '0.10.0-phase3.3';
  fixturePackage.scripts['audit:interactions'] = `node scripts/${legacyAuditName}`;
  fixturePackage.scripts['audit:interactions:selftest'] = 'node scripts/phase3-3-global-interactions-selftest.mjs';
  await writeFile(fixturePackagePath, `${JSON.stringify(fixturePackage, null, 2)}\n`, 'utf8');

  const fixtureWorkflow = await readFile(fixtureWorkflowPath, 'utf8');
  await writeFile(
    fixtureWorkflowPath,
    fixtureWorkflow
      .replace(/Full Phase \d+\.\d+ verification/g, 'Full Phase 3.3 verification')
      .replace(/npm run verify:phase\d+\.\d+/g, 'npm run verify:phase3.3'),
    'utf8',
  );

  const fixtureNavigation = await readFile(fixtureNavigationPath, 'utf8');
  const normalizedNavigation = fixtureNavigation.replace(implementedHomeRecord, reservedHomeRecord);
  if (fixtureNavigation.includes(implementedHomeRecord) && normalizedNavigation === fixtureNavigation) {
    console.error('ENJAZ PHASE 3.3 FORWARD-COMPAT AUDIT FAIL — Home delivery-state normalization did not change the legacy fixture.');
    process.exitCode = 1;
  } else {
    await writeFile(fixtureNavigationPath, normalizedNavigation, 'utf8');
  }

  if (!process.exitCode) {
    const legacyAuditPath = resolve(fixture, 'scripts', legacyAuditName);
    const result = spawnSync(process.execPath, [legacyAuditPath, fixture], { encoding: 'utf8' });
    if (result.status !== 0) {
      process.stdout.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
      console.error('ENJAZ PHASE 3.3 FORWARD-COMPAT AUDIT FAIL — legacy 151-invariant audit did not pass after compatibility normalization.');
      process.exitCode = 1;
    } else {
      process.stdout.write(result.stdout ?? '');
      console.log('ENJAZ PHASE 3.3 FORWARD-COMPAT AUDIT PASS — legacy 151/151 invariants preserved plus 7/7 forward-version/workflow/gate checks; delivered Home normalized only inside the legacy fixture.');
    }
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

if (process.exitCode) process.exit(process.exitCode);
