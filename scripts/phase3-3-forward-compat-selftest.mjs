import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const forwardAuditPath = resolve(root, 'scripts/phase3-3-forward-compat-audit.mjs');
const tempRoot = await mkdtemp(join(tmpdir(), 'enjaz-phase3-3-forward-selftest-'));

function copyFilter(source) {
  const rel = relative(root, source);
  if (!rel) return true;
  const parts = rel.split(sep);
  return !parts.some((part) => ['.git', 'node_modules', 'dist'].includes(part));
}

async function normalizeLegacyFixture(fixture) {
  const versionPath = resolve(fixture, 'src/core/version/version.ts');
  const packagePath = resolve(fixture, 'package.json');
  const workflowPath = resolve(fixture, '.github/workflows/enjaz-quality-gate.yml');

  const version = await readFile(versionPath, 'utf8');
  await writeFile(versionPath, version.replace(/APP_VERSION\s*=\s*'[^']+'/, "APP_VERSION = '0.10.0-phase3.3'"), 'utf8');

  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  packageJson.version = '0.10.0-phase3.3';
  packageJson.scripts['audit:interactions'] = 'node scripts/phase3-3-global-interactions-audit.mjs';
  packageJson.scripts['audit:interactions:selftest'] = 'node scripts/phase3-3-global-interactions-selftest.mjs';
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  const workflow = await readFile(workflowPath, 'utf8');
  await writeFile(
    workflowPath,
    workflow
      .replace(/Full Phase \d+\.\d+ verification/g, 'Full Phase 3.3 verification')
      .replace(/npm run verify:phase\d+\.\d+/g, 'npm run verify:phase3.3'),
    'utf8',
  );
}

let legacyRejected = false;
let forwardRejected = 0;
try {
  const legacyFixture = join(tempRoot, 'legacy');
  await cp(root, legacyFixture, { recursive: true, filter: copyFilter });
  await normalizeLegacyFixture(legacyFixture);
  const legacySelftestPath = resolve(legacyFixture, 'scripts/phase3-3-global-interactions-selftest.mjs');
  const legacyResult = spawnSync(process.execPath, [legacySelftestPath], { cwd: legacyFixture, encoding: 'utf8' });
  if (legacyResult.status !== 0) {
    process.stdout.write(legacyResult.stdout ?? '');
    process.stderr.write(legacyResult.stderr ?? '');
    console.error('SELFTEST FAIL — legacy Phase 3.3 destructive suite no longer passes under normalized 3.3 fixture.');
    process.exitCode = 1;
  } else {
    process.stdout.write(legacyResult.stdout ?? '');
    legacyRejected = true;
  }

  const scenarios = [
    {
      name: 'downgrade current app version below Phase 3.3',
      file: 'src/core/version/version.ts',
      mutate: (value) => value.replace(/APP_VERSION\s*=\s*'[^']+'/, "APP_VERSION = '0.9.0-phase3.2'"),
    },
    {
      name: 'downgrade current package version below Phase 3.3',
      file: 'package.json',
      mutate: (value) => value.replace(/"version"\s*:\s*"[^"]+"/, '"version": "0.9.0-phase3.2"'),
    },
    {
      name: 'downgrade current GitHub Quality Gate below Phase 3.3',
      file: '.github/workflows/enjaz-quality-gate.yml',
      mutate: (value) => value
        .replace(/Full Phase \d+\.\d+ verification/g, 'Full Phase 3.2 verification')
        .replace(/npm run verify:phase\d+\.\d+/g, 'npm run verify:phase3.2'),
    },
    {
      name: 'detach current workflow phase from application phase',
      file: '.github/workflows/enjaz-quality-gate.yml',
      mutate: (value) => value.replace(/npm run verify:phase\d+\.\d+/g, 'npm run verify:phase3.3'),
    },
    {
      name: 'mutate immutable Phase 3.3 verification chain',
      file: 'package.json',
      mutate: (value) => value.replace(
        'npm run verify:phase3.2 && npm run audit:interactions && npm run audit:interactions:selftest && npm run audit:roadmap',
        'npm run verify:phase3.2',
      ),
    },
  ];

  if (!process.exitCode) {
    for (const [index, scenario] of scenarios.entries()) {
      const fixture = join(tempRoot, `forward-${index + 1}`);
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
      const result = spawnSync(process.execPath, [forwardAuditPath, fixture], { encoding: 'utf8' });
      if (result.status === 0) {
        console.error(`SELFTEST FAIL — forward-compatible 3.3 audit accepted deliberate regression: ${scenario.name}`);
        process.exitCode = 1;
        break;
      }
      forwardRejected += 1;
    }
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`ENJAZ PHASE 3.3 FORWARD-COMPAT SELFTEST PASS — legacy destructive suite=${legacyRejected ? 'PASS' : 'FAIL'}; ${forwardRejected}/5 forward downgrade/workflow/gate regressions rejected.`);
