import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const audit = resolve(root, 'scripts/phase2-5-motion-audit.mjs');
const probes = [
  {
    name: 'raw_slow_transition',
    file: 'src/styles/motion-interaction.css',
    mutate: (text) => text.replace('var(--motion-control-duration)', '900ms'),
  },
  {
    name: 'transition_all_escape',
    file: 'src/styles/motion-interaction.css',
    mutate: (text) => text.replace('transition:\n    transform', 'transition: all var(--motion-control-duration) var(--motion-easing-standard);\n  /* broken */\n  transition:\n    transform'),
  },
  {
    name: 'remove_reduced_motion_behavior',
    file: 'src/styles/motion-interaction.css',
    mutate: (text) => text.replace('@media (prefers-reduced-motion: reduce)', '@media (prefers-contrast: more)'),
  },
  {
    name: 'unscoped_hover_motion',
    file: 'src/styles/motion-interaction.css',
    mutate: (text) => text.replace('@media (hover: hover) and (pointer: fine)', '@media (prefers-color-scheme: light)'),
  },
  {
    name: 'unexpected_infinite_animation',
    file: 'src/styles/motion-lab.css',
    mutate: (text) => `${text}\n.motion-lab { animation: fake-loop var(--motion-feedback-duration) linear infinite; }\n`,
  },
  {
    name: 'remove_overlay_exit_state',
    file: 'src/styles/motion-interaction.css',
    mutate: (text) => text.replace(".ui-overlay[data-motion-state='exiting']", ".ui-overlay[data-motion-state='closed']"),
  },
  {
    name: 'remove_sheet_exit_state',
    file: 'src/styles/motion-interaction.css',
    mutate: (text) => text.replace(".ui-overlay--sheet[data-motion-state='exiting'] .ui-sheet", ".ui-overlay--sheet[data-motion-state='closed'] .ui-sheet"),
  },
  {
    name: 'remove_reduced_presence_exit',
    file: 'src/design-system/motion/useMotionPresence.ts',
    mutate: (text) => text.replace('prefersReducedMotion() ? 0 : exitDurationMs', 'exitDurationMs'),
  },
  {
    name: 'remove_delayed_unmount',
    file: 'src/design-system/motion/useMotionPresence.ts',
    mutate: (text) => text.replace('setMounted(false)', 'setMounted(true)'),
  },
  {
    name: 'invent_bounce_preset',
    file: 'src/design-system/motion/motionContract.ts',
    mutate: (text) => text.replace("['fade', 'rise', 'scale']", "['fade', 'rise', 'bounce']"),
  },
  {
    name: 'break_duration_budget',
    file: 'src/styles/tokens/motion.css',
    mutate: (text) => text.replace('--duration-slow: 420ms;', '--duration-slow: 800ms;'),
  },
  {
    name: 'raw_easing_escape',
    file: 'src/styles/motion-lab.css',
    mutate: (text) => `${text}\n.motion-lab__grid { transition: opacity var(--duration-fast) cubic-bezier(0.1, 0.2, 0.3, 1); }\n`,
  },
  {
    name: 'remove_motion_route',
    file: 'src/core/routing/routes.ts',
    mutate: (text) => text.replace("  motion: '/foundation/motion',\n", ''),
  },
  {
    name: 'remove_reduced_motion_proof',
    file: 'src/features/foundation/pages/MotionLabPage.tsx',
    mutate: (text) => text.replaceAll('Reduce Motion', 'Motion Preference'),
  },
  {
    name: 'remove_motion_css_import',
    file: 'src/styles/foundation.css',
    mutate: (text) => text.replace("@import './motion-interaction.css';\n", ''),
  },
];

let passed = 0;
for (const probe of probes) {
  const base = await mkdtemp(join(tmpdir(), 'enjaz-phase25-'));
  const copy = join(base, 'project');
  try {
    await cp(root, copy, { recursive: true, filter: (source) => !source.includes('/node_modules') && !source.endsWith('.zip') && !source.includes('/dist') });
    const target = join(copy, probe.file);
    const before = await readFile(target, 'utf8');
    const after = probe.mutate(before);
    if (after === before) throw new Error(`probe ${probe.name} made no mutation`);
    await writeFile(target, after);
    const result = spawnSync(process.execPath, [audit, copy], { encoding: 'utf8' });
    if (result.status === 0) throw new Error(`probe ${probe.name} was not rejected`);
    console.log(`PASS motion destructive probe ${probe.name}: regression rejected`);
    passed += 1;
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}

console.log(`ENJAZ PHASE 2.5 MOTION SELFTEST PASS — ${passed}/${probes.length} deliberate motion/interaction regressions rejected.`);
