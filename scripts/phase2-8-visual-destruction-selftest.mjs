import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const auditPath = resolve(root, 'scripts/phase2-8-visual-destruction-audit.mjs');
const tempRoot = await mkdtemp(join(tmpdir(), 'enjaz-destruction-selftest-'));

const scenarios = [
  { name: 'lower long-company floor', file: 'src/core/quality/visualDestructionContract.ts', mutate: (value) => value.replace('longCompanyMinimumCharacters: 200', 'longCompanyMinimumCharacters: 120') },
  { name: 'lower notification storm', file: 'src/core/quality/visualDestructionContract.ts', mutate: (value) => value.replace('notificationStormCount: 20', 'notificationStormCount: 10') },
  { name: 'remove narrow viewport proof', file: 'src/features/foundation/pages/VisualDestructionLabPage.tsx', mutate: (value) => value.replace('data-viewport="320"', 'data-viewport="wide"') },
  { name: 'remove keyboard-open proof', file: 'src/features/foundation/pages/VisualDestructionLabPage.tsx', mutate: (value) => value.replace('data-keyboard="open"', 'data-keyboard="closed"') },
  { name: 'remove offline state', file: 'src/features/foundation/pages/VisualDestructionLabPage.tsx', mutate: (value) => value.replace('tone="offline"', 'tone="empty"') },
  { name: 'raw color escape', file: 'src/styles/visual-destruction-lab.css', mutate: (value) => `${value}\n.destruction-regression { color: #ff0000; }\n` },
  { name: 'important override escape', file: 'src/styles/visual-destruction-lab.css', mutate: (value) => `${value}\n.destruction-regression { display: block !important; }\n` },
  { name: 'numeric z-index escape', file: 'src/styles/visual-destruction-lab.css', mutate: (value) => `${value}\n.destruction-regression { z-index: 999; }\n` },
  { name: 'tiny font escape', file: 'src/styles/visual-destruction-lab.css', mutate: (value) => `${value}\n.destruction-regression { font-size: 10px; }\n` },
  { name: 'transition-all escape', file: 'src/styles/visual-destruction-lab.css', mutate: (value) => `${value}\n.destruction-regression { transition: all 1s; }\n` },
  { name: 'inline style escape', file: 'src/features/foundation/pages/VisualDestructionLabPage.tsx', mutate: (value) => value.replace('<main className="destruction-lab-page"', '<main style={{ color: \'red\' }} className="destruction-lab-page"') },
  { name: 'remove reduced-motion contract', file: 'src/styles/visual-destruction-lab.css', mutate: (value) => value.replace('@media (prefers-reduced-motion: reduce)', '@media (min-width: 999rem)') },
  { name: 'disable user zoom', file: 'index.html', mutate: (value) => value.replace('interactive-widget=resizes-content', 'interactive-widget=resizes-content, maximum-scale=1') },
  { name: 'remove destruction route', file: 'src/core/routing/routes.ts', mutate: (value) => value.replace("  destruction: '/foundation/destruction',\n", '') },
  { name: 'downgrade Phase 2.8 gate', file: 'package.json', mutate: (value) => value.replace('npm run verify:phase2.7 && npm run audit:destruction && npm run audit:destruction:selftest && npm run audit:roadmap', 'npm run verify:phase2.7') },
  { name: 'remove Phase 3 lock', file: 'src/core/quality/visualDestructionContract.ts', mutate: (value) => value.replace('phase3ForbiddenUntilGreen: true', 'phase3ForbiddenUntilGreen: false') },
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
      console.error(`SELFTEST FAIL — destruction audit accepted deliberate regression: ${scenario.name}`);
      process.exitCode = 1;
      break;
    }
    rejected += 1;
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`ENJAZ PHASE 2.8 VISUAL DESTRUCTION SELFTEST PASS — ${rejected}/${scenarios.length} deliberate visual/mobile/RTL/accessibility/gate regressions rejected.`);
