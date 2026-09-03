import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const auditPath = resolve(root, 'scripts/phase2-7-pattern-audit.mjs');
const tempRoot = await mkdtemp(join(tmpdir(), 'enjaz-pattern-selftest-'));

const scenarios = [
  { name: 'remove transaction family contract', file: 'src/design-system/patterns/patternContract.ts', mutate: (content) => content.replace("  'transaction',\n", '') },
  { name: 'raw color escape', file: 'src/styles/patterns-entities.css', mutate: (content) => `${content}\n.pattern-regression { color: #ff0000; }\n` },
  { name: 'important override escape', file: 'src/styles/patterns-operations.css', mutate: (content) => `${content}\n.pattern-regression { display: block !important; }\n` },
  { name: 'physical RTL spacing regression', file: 'src/styles/patterns-discovery.css', mutate: (content) => `${content}\n.pattern-regression { margin-left: var(--space-4); }\n` },
  { name: 'remove reduced motion contract', file: 'src/styles/patterns-responsive.css', mutate: (content) => content.replace('@media (prefers-reduced-motion: reduce)', '@media (min-width: 999rem)') },
  { name: 'remove narrow-phone contract', file: 'src/styles/patterns-responsive.css', mutate: (content) => content.replace('@media (max-width: 22.5rem)', '@media (max-width: 1rem)') },
  { name: 'inline style escape', file: 'src/design-system/patterns/EntityPatterns.tsx', mutate: (content) => content.replace('<Card tone={state ===', '<Card style={{ color: \'red\' }} tone={state ===') },
  { name: 'remove Pattern Lab route', file: 'src/core/routing/routes.ts', mutate: (content) => content.replace("  patterns: '/foundation/patterns',\n", '') },
  { name: 'remove conflict proof state', file: 'src/features/foundation/pages/PatternLabPage.tsx', mutate: (content) => content.replace('tone="conflict"', 'tone="empty"') },
  { name: 'remove compact proof', file: 'src/features/foundation/pages/PatternLabPage.tsx', mutate: (content) => content.replaceAll('density="compact"', 'density="comfortable"') },
  { name: 'downgrade Phase 2.7 gate', file: 'package.json', mutate: (content) => content.replace('npm run verify:phase2.6 && npm run audit:patterns && npm run audit:patterns:selftest && npm run audit:roadmap', 'npm run verify:phase2.6') },
  { name: 'remove patterns CSS import', file: 'src/styles/foundation.css', mutate: (content) => content.replace("@import './patterns.css';\n", '') },
  { name: 'remove entity pattern stylesheet', file: 'src/styles/patterns.css', mutate: (content) => content.replace("@import './patterns-entities.css';\n", '') },
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
    if (mutated === original) { console.error(`SELFTEST SETUP FAIL — mutation did not change ${scenario.name}`); process.exitCode = 1; break; }
    await writeFile(target, mutated, 'utf8');
    const result = spawnSync(process.execPath, [auditPath, fixture], { encoding: 'utf8' });
    if (result.status === 0) { console.error(`SELFTEST FAIL — pattern audit accepted deliberate regression: ${scenario.name}`); process.exitCode = 1; break; }
    rejected += 1;
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
if (process.exitCode) process.exit(process.exitCode);
console.log(`ENJAZ PHASE 2.7 PATTERN SELFTEST PASS — ${rejected}/${scenarios.length} deliberate pattern/RTL/mobile/gate regressions rejected.`);
