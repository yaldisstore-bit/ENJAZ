import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const auditPath = resolve(root, 'scripts/phase2-6-mobile-audit.mjs');
const tempRoot = await mkdtemp(join(tmpdir(), 'enjaz-mobile-selftest-'));

const scenarios = [
  {
    name: 'viewport safe-area regression',
    file: 'index.html',
    mutate: (content) => content.replace('viewport-fit=cover, interactive-widget=resizes-content', 'user-scalable=no'),
  },
  {
    name: 'dynamic viewport regression',
    file: 'src/styles/mobile-hardening.css',
    mutate: (content) => content.replaceAll('100dvh', '100vh'),
  },
  {
    name: 'touch-action regression',
    file: 'src/styles/mobile-hardening.css',
    mutate: (content) => content.replace('touch-action: manipulation;', 'touch-action: none;'),
  },
  {
    name: 'bottom safe-area regression',
    file: 'src/styles/mobile-hardening.css',
    mutate: (content) => content.replaceAll('safe-area-inset-bottom', 'safe-area-inset-top'),
  },
  {
    name: 'mobile route regression',
    file: 'src/core/routing/routes.ts',
    mutate: (content) => content.replace("  mobile: '/foundation/mobile',\n", ''),
  },
  {
    name: 'quality gate downgrade',
    file: 'package.json',
    mutate: (content) => content.replace('npm run verify:phase2.5 && npm run audit:mobile && npm run audit:mobile:selftest', 'npm run verify:phase2.5'),
  },
  {
    name: 'touch target regression',
    file: 'src/core/mobile/mobileContract.ts',
    mutate: (content) => content.replace('MOBILE_TOUCH_TARGET_PX = 44', 'MOBILE_TOUCH_TARGET_PX = 40'),
  },
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
      console.error(`SELFTEST FAIL — audit accepted deliberate regression: ${scenario.name}`);
      process.exitCode = 1;
      break;
    }
    rejected += 1;
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`ENJAZ PHASE 2.6 MOBILE SELFTEST PASS — ${rejected}/${scenarios.length} deliberate mobile regressions rejected.`);
