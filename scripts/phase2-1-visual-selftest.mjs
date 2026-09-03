import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const audit = resolve(root, 'scripts/phase2-1-visual-audit.mjs');
const probes = [
  { name: 'raw_color_escape', file: 'src/styles/foundation.css', mutate: (text) => `${text}\n.visual-corruption { color: #ff00ff; }\n` },
  { name: 'tiny_caption', file: 'src/styles/tokens/typography.css', mutate: (text) => text.replace('--font-size-caption: 0.8125rem;', '--font-size-caption: 0.625rem;') },
  { name: 'small_touch_target', file: 'src/styles/tokens/geometry.css', mutate: (text) => text.replace('--size-touch-min: 2.75rem;', '--size-touch-min: 2rem;') },
  { name: 'broken_brand_contrast', file: 'src/styles/tokens/primitives.css', mutate: (text) => text.replace('--enjaz-brand-600: #245f6b;', '--enjaz-brand-600: #eef3f9;') },
  { name: 'inline_style_bypass', file: 'src/features/foundation/pages/IdentityLabPage.tsx', mutate: (text) => text.replace('<main className="identity-page"', '<main style={{ color: \'red\' }} className="identity-page"') },
  { name: 'shadow_literal_bypass', file: 'src/styles/foundation.css', mutate: (text) => `${text}\n.visual-shadow-corruption { box-shadow: 0 0 40px var(--color-brand-primary); }\n` },
];

let passed = 0;
for (const probe of probes) {
  const base = await mkdtemp(join(tmpdir(), 'enjaz-phase21-'));
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
    console.log(`PASS visual destructive probe ${probe.name}: corruption rejected`);
    passed += 1;
  } finally { await rm(base, { recursive: true, force: true }); }
}
console.log(`ENJAZ PHASE 2.1 VISUAL SELFTEST PASS — ${passed}/${probes.length} deliberate visual regressions rejected.`);
