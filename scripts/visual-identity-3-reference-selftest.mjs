import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const audit = resolve(root, 'scripts/visual-identity-3-reference-audit.mjs');

function copyFilter(source) {
  const rel = relative(root, source);
  if (!rel) return true;
  return !rel.split(sep).some((part) => ['.git', 'node_modules', 'dist'].includes(part));
}

const scenarios = [
  {
    name: 'flatten the editorial home hero into a plain white surface',
    file: 'src/styles/home-dashboard.css',
    mutate: (value) => value.replace('  background: var(--gradient-brand);\n  color: var(--color-text-on-brand);\n  box-shadow: var(--shadow-level-3);', '  background: var(--color-surface);\n  color: var(--color-text-primary);\n  box-shadow: var(--shadow-level-1);'),
  },
  {
    name: 'turn the mint focus card into another generic white card',
    file: 'src/styles/home-dashboard.css',
    mutate: (value) => value.replace('.home-focus-card--mint { background: var(--color-accent-teal-soft); }', '.home-focus-card--mint { background: var(--color-surface); }'),
  },
  {
    name: 'remove dashboard asymmetry and use equal generic columns',
    file: 'src/styles/home-dashboard.css',
    mutate: (value) => value.replace('grid-template-columns: minmax(0, 1.4fr) minmax(var(--size-grid-card-min), 0.8fr);', 'grid-template-columns: repeat(2, minmax(0, 1fr));'),
  },
  {
    name: 'neutralize the circular amber attention anchor',
    file: 'src/styles/home-dashboard.css',
    mutate: (value) => value.replace('border: var(--space-2) solid var(--color-warning);', 'border: var(--space-2) solid var(--color-border);'),
  },
  {
    name: 'remove amber identity from the primary home CTA',
    file: 'src/styles/home-dashboard.css',
    mutate: (value) => value.replace('  background: var(--color-warning);\n  color: var(--color-warning-text);\n  display: inline-flex;', '  background: var(--color-brand-soft);\n  color: var(--color-brand-strong);\n  display: inline-flex;'),
  },
  {
    name: 'flatten the floating bottom dock depth',
    file: 'src/styles/app-shell.css',
    mutate: (value) => value.replace('  box-shadow: var(--shadow-level-3);\n  isolation: isolate;', '  box-shadow: var(--shadow-level-1);\n  isolation: isolate;'),
  },
  {
    name: 'make the bottom dock edge-to-edge like a generic navigation bar',
    file: 'src/styles/app-shell.css',
    mutate: (value) => value.replace('  inset-inline: var(--space-3);\n  inset-block-end:', '  inset-inline: 0;\n  inset-block-end:'),
  },
  {
    name: 'move the amber quick-create action away from the dock center',
    file: 'src/styles/global-interactions.css',
    mutate: (value) => value.replace('    inset-inline-start: 50%;', '    inset-inline-start: var(--space-3);'),
  },
  {
    name: 'turn the command dashboard into a one-column menu',
    file: 'src/styles/global-command-surfaces.css',
    mutate: (value) => value.replace('grid-template-columns: repeat(2, minmax(0, 1fr));', 'grid-template-columns: minmax(0, 1fr);'),
  },
  {
    name: 'flatten the command hero',
    file: 'src/styles/global-command-surfaces.css',
    mutate: (value) => value.replace('  background: var(--gradient-brand);\n  color: var(--color-text-on-brand);', '  background: var(--color-surface);\n  color: var(--color-text-primary);'),
  },
  {
    name: 'turn the strong command card into another neutral card',
    file: 'src/styles/global-command-surfaces.css',
    mutate: (value) => value.replace('.global-command-card--strong {\n  background: var(--color-warning-soft);\n  color: var(--color-warning-text);\n}', '.global-command-card--strong {\n  background: var(--color-surface);\n  color: var(--color-text-primary);\n}'),
  },
  {
    name: 'restore a wrapping two-row top toolbar',
    file: 'src/styles/app-shell.css',
    mutate: (value) => value.replace('  justify-content: space-between;\n  gap: var(--space-3);', '  justify-content: space-between;\n  flex-wrap: wrap;\n  gap: var(--space-3);'),
  },
  {
    name: 'remove alternating priority tone and create a repetitive list wall',
    file: 'src/styles/home-dashboard.css',
    mutate: (value) => value.replace('.home-dashboard__priority-list .pattern-risk:nth-child(even) { background: var(--color-accent-teal-soft); }', '.home-dashboard__priority-list .pattern-risk:nth-child(even) { background: var(--color-warning-soft); }'),
  },
  {
    name: 'remove the narrow-phone one-column escape hatch',
    file: 'src/styles/home-dashboard.css',
    mutate: (value) => value.replace('@media (max-width: 22rem)', '@media (max-width: 12rem)'),
  },
];

let rejected = 0;
for (const [index, scenario] of scenarios.entries()) {
  const fixture = await mkdtemp(join(tmpdir(), `enjaz-reference-design-${index + 1}-`));
  try {
    await cp(root, fixture, { recursive: true, filter: copyFilter });
    const target = resolve(fixture, scenario.file);
    const original = await readFile(target, 'utf8');
    const mutated = scenario.mutate(original);
    if (mutated === original) throw new Error(`Mutation did not change fixture: ${scenario.name}`);
    await writeFile(target, mutated, 'utf8');
    const result = spawnSync(process.execPath, [audit, fixture], { encoding: 'utf8' });
    if (result.status === 0) throw new Error(`Reference-led design audit accepted deliberate visual downgrade: ${scenario.name}`);
    rejected += 1;
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

console.log(`ENJAZ VISUAL IDENTITY 3 REFERENCE SELFTEST PASS — ${rejected}/${scenarios.length} deliberate cheap-design regressions rejected.`);
