import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const audit = resolve(root, 'scripts/phase2-2-token-audit.mjs');
const probes = [
  { name: 'primitive_leak', file: 'src/styles/identity.css', mutate: (text) => `${text}\n.token-break { color: var(--enjaz-brand-600); }\n` },
  { name: 'unknown_token', file: 'src/styles/auth.css', mutate: (text) => `${text}\n.token-break { gap: var(--space-999); }\n` },
  { name: 'duplicate_definition', file: 'src/styles/tokens/semantic.css', mutate: (text) => text.replace(':root {', ':root {\n  --color-canvas: var(--enjaz-canvas-50);') },
  { name: 'component_literal', file: 'src/styles/tokens/components.css', mutate: (text) => text.replace('--card-radius: var(--radius-xl);', '--card-radius: 17px;') },
  { name: 'contract_drift', file: 'src/design-system/tokens/tokenContract.ts', mutate: (text) => text.replace("    '--color-canvas',\n", '') },
  { name: 'raw_spacing_escape', file: 'src/styles/auth.css', mutate: (text) => `${text}\n.token-break { padding: 17px; }\n` },
  { name: 'raw_motion_escape', file: 'src/styles/auth.css', mutate: (text) => `${text}\n.token-break { transition-duration: 777ms; }\n` },
  { name: 'raw_color_in_semantic', file: 'src/styles/tokens/semantic.css', mutate: (text) => text.replace('--color-canvas: var(--enjaz-canvas-100);', '--color-canvas: #ffffff;') },
];

let passed = 0;
for (const probe of probes) {
  const base = await mkdtemp(join(tmpdir(), 'enjaz-phase22-'));
  const copy = join(base, 'project');
  try {
    await cp(root, copy, { recursive: true, filter: (source) => !source.includes('/node_modules') && !source.endsWith('.zip') });
    const target = join(copy, probe.file);
    const before = await readFile(target, 'utf8');
    const after = probe.mutate(before);
    if (after === before) throw new Error(`probe ${probe.name} made no mutation`);
    await writeFile(target, after);
    const result = spawnSync(process.execPath, [audit, copy], { encoding: 'utf8' });
    if (result.status === 0) throw new Error(`probe ${probe.name} was not rejected`);
    console.log(`PASS token destructive probe ${probe.name}: drift rejected`);
    passed += 1;
  } finally { await rm(base, { recursive: true, force: true }); }
}
console.log(`ENJAZ PHASE 2.2 TOKEN SELFTEST PASS — ${passed}/${probes.length} deliberate token regressions rejected.`);
