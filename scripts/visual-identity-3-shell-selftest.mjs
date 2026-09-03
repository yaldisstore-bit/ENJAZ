import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const audit = resolve(root, 'scripts/visual-identity-3-shell-audit.mjs');

function copyFilter(source) {
  const rel = relative(root, source);
  if (!rel) return true;
  return !rel.split(sep).some((part) => ['.git', 'node_modules', 'dist'].includes(part));
}

const scenarios = [
  {
    name: 'remove bottom navigation cradle',
    file: 'src/shared/shell/AppShellFrame.tsx',
    mutate: (value) => value.replace('          <span className="app-shell__navigation-cradle" aria-hidden="true" />\n', ''),
  },
  {
    name: 'detach global tools from the topbar composition',
    file: 'src/shared/shell/AppShellFrame.tsx',
    mutate: (value) => value.replace('            <div className="app-shell__topbar-actions">\n        <GlobalInteractionSurfaces inboxCount={inboxCount} />', '            <GlobalInteractionSurfaces inboxCount={inboxCount} />\n            <div className="app-shell__topbar-actions">'),
  },
  {
    name: 'degrade amber quick create into a generic brand button',
    file: 'src/styles/global-interactions.css',
    mutate: (value) => value.replace('    background: var(--color-warning);\n    color: var(--color-warning-text);\n    box-shadow: var(--shadow-level-3);', '    background: var(--color-brand-soft);\n    color: var(--color-brand-strong);\n    box-shadow: var(--shadow-level-1);'),
  },
  {
    name: 'move mobile quick create away from the dock center',
    file: 'src/styles/global-interactions.css',
    mutate: (value) => value.replace('    inset-inline-start: 50%;', '    inset-inline-start: var(--space-3);'),
  },
  {
    name: 'turn leadership operations back into a plain list-shaped surface',
    file: 'src/shared/interactions/GlobalInteractionSurfaces.tsx',
    mutate: (value) => value.replace('global-command-surface__grid', 'global-surface__list'),
  },
  {
    name: 'remove premium command surface stylesheet',
    file: 'src/styles/foundation.css',
    mutate: (value) => value.replace("@import './global-command-surfaces.css';\n", ''),
  },
  {
    name: 'let bottom dock compete at overlay z-level',
    file: 'src/styles/app-shell.css',
    mutate: (value) => value.replace('  z-index: var(--z-content);\n  min-block-size: calc(var(--size-control-lg) + var(--space-5));', '  z-index: var(--z-overlay);\n  min-block-size: calc(var(--size-control-lg) + var(--space-5));'),
  },
];

let rejected = 0;
for (const [index, scenario] of scenarios.entries()) {
  const fixture = await mkdtemp(join(tmpdir(), `enjaz-identity3-${index + 1}-`));
  try {
    await cp(root, fixture, { recursive: true, filter: copyFilter });
    const target = resolve(fixture, scenario.file);
    const original = await readFile(target, 'utf8');
    const mutated = scenario.mutate(original);
    if (mutated === original) throw new Error(`Mutation did not change fixture: ${scenario.name}`);
    await writeFile(target, mutated, 'utf8');
    const result = spawnSync(process.execPath, [audit, fixture], { encoding: 'utf8' });
    if (result.status === 0) throw new Error(`Visual Identity 3 audit accepted deliberate regression: ${scenario.name}`);
    rejected += 1;
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

console.log(`ENJAZ VISUAL IDENTITY 3 SHELL SELFTEST PASS — ${rejected}/${scenarios.length} deliberate chrome/dock/command regressions rejected.`);
