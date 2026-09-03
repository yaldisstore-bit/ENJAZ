import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const audit = resolve(root, 'scripts/phase2-3-typography-audit.mjs');
const probes = [
  { name: 'flip_root_direction', file: 'index.html', mutate: (text) => text.replace('lang="ar" dir="rtl"', 'lang="ar" dir="ltr"') },
  { name: 'shrink_caption_below_floor', file: 'src/styles/tokens/typography.css', mutate: (text) => text.replace('--font-size-caption: 0.8125rem;', '--font-size-caption: 0.75rem;') },
  { name: 'negative_arabic_tracking', file: 'src/styles/tokens/typography.css', mutate: (text) => text.replace('--tracking-arabic: 0em;', '--tracking-arabic: -0.03em;') },
  { name: 'physical_rtl_spacing', file: 'src/styles/typography-lab.css', mutate: (text) => `${text}\n.type-break { margin-right: var(--space-3); }\n` },
  { name: 'physical_text_alignment', file: 'src/styles/typography-lab.css', mutate: (text) => `${text}\n.type-break { text-align: right; }\n` },
  { name: 'remove_bidi_isolation', file: 'src/styles/typography-rtl.css', mutate: (text) => text.replaceAll('unicode-bidi: isolate;', 'unicode-bidi: normal;') },
  { name: 'remove_long_text_safety', file: 'src/styles/typography-rtl.css', mutate: (text) => text.replaceAll('overflow-wrap: anywhere;', 'overflow-wrap: break-word;') },
  { name: 'remove_money_bidi_probe', file: 'src/features/foundation/pages/TypographyLabPage.tsx', mutate: (text) => text.replace("bidiAttributes('money')", "bidiAttributes('natural')") },
  { name: 'remove_typography_route', file: 'src/core/routing/routes.ts', mutate: (text) => text.replace("  typography: '/foundation/typography',\n", '') },
  { name: 'inject_remote_font_dependency', file: 'src/styles/typography-rtl.css', mutate: (text) => `${text}\n@font-face { font-family: External; src: url('https://example.invalid/font.woff2'); }\n` },
  { name: 'disable_user_zoom', file: 'index.html', mutate: (text) => text.replace('viewport-fit=cover', 'viewport-fit=cover, user-scalable=no') },
  { name: 'raw_small_product_text', file: 'src/styles/typography-lab.css', mutate: (text) => `${text}\n.type-break { font-size: 12px; }\n` },
];

let passed = 0;
for (const probe of probes) {
  const base = await mkdtemp(join(tmpdir(), 'enjaz-phase23-'));
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
    console.log(`PASS typography destructive probe ${probe.name}: regression rejected`);
    passed += 1;
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}
console.log(`ENJAZ PHASE 2.3 TYPOGRAPHY SELFTEST PASS — ${passed}/${probes.length} deliberate RTL/type regressions rejected.`);
