import { readFile, readdir } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const src = resolve(root, 'src');
const styles = resolve(src, 'styles');
const violations = [];
let checks = 0;

function invariant(condition, message) {
  checks += 1;
  if (!condition) violations.push(message);
}

function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(child));
    else files.push(child);
  }
  return files;
}

const motionTokens = await readFile(resolve(styles, 'tokens/motion.css'), 'utf8');
const motionCss = await readFile(resolve(styles, 'motion-interaction.css'), 'utf8');
const motionCode = stripCssComments(motionCss);
const overlay = await readFile(resolve(src, 'design-system/components/Overlay.tsx'), 'utf8');
const presence = await readFile(resolve(src, 'design-system/motion/useMotionPresence.ts'), 'utf8');
const contract = await readFile(resolve(src, 'design-system/motion/motionContract.ts'), 'utf8');
const reveal = await readFile(resolve(src, 'design-system/motion/MotionReveal.tsx'), 'utf8');
const routes = await readFile(resolve(src, 'core/routing/routes.ts'), 'utf8');
const router = await readFile(resolve(src, 'app/router.tsx'), 'utf8');
const lab = await readFile(resolve(src, 'features/foundation/pages/MotionLabPage.tsx'), 'utf8');
const foundation = await readFile(resolve(styles, 'foundation.css'), 'utf8');
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));

const requiredDurations = new Map([
  ['--duration-instant', 90],
  ['--duration-fast', 140],
  ['--duration-standard', 220],
  ['--duration-deliberate', 320],
  ['--duration-slow', 420],
]);
for (const [token, expected] of requiredDurations) {
  const match = motionTokens.match(new RegExp(`${token}\\s*:\\s*(\\d+(?:\\.\\d+)?)ms`));
  invariant(Boolean(match), `motion.css: missing numeric ${token}`);
  if (match) {
    const value = Number(match[1]);
    invariant(value === expected, `motion.css: ${token} drifted from ${expected}ms`);
    invariant(value > 0 && value <= 500, `motion.css: ${token} must stay within 1..500ms`);
  }
}

for (const token of [
  '--duration-reduced-motion', '--easing-standard', '--easing-enter', '--easing-exit', '--easing-emphasized', '--easing-linear',
  '--press-translate-y', '--press-scale', '--hover-translate-y', '--hover-scale', '--motion-distance-sm', '--motion-distance-md',
  '--motion-scale-enter', '--motion-delay-1', '--motion-delay-2', '--motion-delay-3',
]) invariant(motionTokens.includes(`${token}:`), `motion.css: missing ${token}`);

invariant(motionTokens.includes('@media (prefers-reduced-motion: reduce)'), 'motion.css: reduced-motion token override is required');
invariant(motionCode.includes('@media (prefers-reduced-motion: reduce)'), 'motion-interaction.css: reduced-motion behavior is required');
invariant(motionCode.includes('@media (hover: hover) and (pointer: fine)'), 'motion-interaction.css: hover transforms must be pointer-capability scoped');
invariant(!/transition\s*:\s*all\b/i.test(motionCode), 'motion-interaction.css: transition: all is forbidden');
invariant(!/will-change\s*:/i.test(motionCode), 'motion-interaction.css: persistent will-change is forbidden');
invariant(motionCode.includes('.ui-skeleton,\n  .ui-button__spinner'), 'motion-interaction.css: reduced motion must disable skeleton and spinner loops');
invariant(motionCode.includes(".ui-overlay[data-motion-state='exiting']"), 'motion-interaction.css: overlay exit state is missing');
invariant(motionCode.includes(".ui-overlay--sheet[data-motion-state='exiting'] .ui-sheet"), 'motion-interaction.css: sheet exit state is missing');
invariant(motionCode.includes(".ui-motion-reveal[data-motion-preset='fade']"), 'motion-interaction.css: fade reveal preset missing');
invariant(motionCode.includes(".ui-motion-reveal[data-motion-preset='rise']"), 'motion-interaction.css: rise reveal preset missing');
invariant(motionCode.includes(".ui-motion-reveal[data-motion-preset='scale']"), 'motion-interaction.css: scale reveal preset missing');

invariant(contract.includes('instant: 90') && contract.includes('slow: 420'), 'motionContract.ts: typed duration contract drifted');
invariant(contract.includes("['fade', 'rise', 'scale']"), 'motionContract.ts: bounded reveal presets missing');
invariant(contract.includes("window.matchMedia('(prefers-reduced-motion: reduce)')"), 'motionContract.ts: OS reduced-motion preference must be readable');
invariant(presence.includes('prefersReducedMotion() ? 0 : exitDurationMs'), 'useMotionPresence.ts: reduced motion must skip exit wait');
invariant(presence.includes("setState('exiting')"), 'useMotionPresence.ts: exit presence state missing');
invariant(presence.includes('setMounted(false)'), 'useMotionPresence.ts: delayed unmount missing');
invariant(overlay.includes('useMotionPresence(open, exitDuration)'), 'Overlay.tsx: overlays must consume motion presence');
invariant(overlay.includes('data-motion-state={presence.state}'), 'Overlay.tsx: overlay state must reach CSS');
invariant(overlay.includes("mode === 'sheet' ? MOTION_DURATION_MS.deliberate : MOTION_DURATION_MS.standard"), 'Overlay.tsx: dialog and sheet must use bounded exit durations');
invariant(reveal.includes('data-motion-preset={preset}') && reveal.includes('data-motion-delay={delay}'), 'MotionReveal.tsx: reveal must expose bounded data contracts');

invariant(routes.includes("motion: '/foundation/motion'"), 'routes.ts: Phase 2.5 proof route missing');
invariant(router.includes('MotionLabPage') && router.includes('ROUTES.motion'), 'router.tsx: Motion Lab is not routed');
for (const marker of ['استجابة اللمس', 'الدخول المنظم', 'الطبقات المتحركة', 'إتاحة الحركة', 'Reduce Motion']) {
  invariant(lab.includes(marker), `MotionLabPage.tsx: missing proof section ${marker}`);
}
invariant(foundation.includes("@import './motion-interaction.css';") && foundation.includes("@import './motion-lab.css';"), 'foundation.css: motion layers not loaded');
invariant(pkg.scripts?.['verify:phase2.5'] === 'npm run verify:phase2.4 && npm run audit:motion && npm run audit:motion:selftest', 'package.json: verify:phase2.5 must extend Phase 2.4');

const cssFiles = (await walk(styles)).filter((file) => extname(file) === '.css');
for (const file of cssFiles) {
  const rel = relative(root, file).replaceAll('\\', '/');
  const text = await readFile(file, 'utf8');
  const code = stripCssComments(text);
  if (rel !== 'src/styles/tokens/motion.css') {
    invariant(!/\b\d+(?:\.\d+)?ms\b/i.test(code), `${rel}: raw millisecond duration must use motion tokens`);
    invariant(!/cubic-bezier\s*\(/i.test(code), `${rel}: easing curve literal must live in motion.css`);
  }
  invariant(!/transition\s*:\s*all\b/i.test(code), `${rel}: transition: all is forbidden`);
}

const infiniteMatches = [];
for (const file of cssFiles) {
  const text = await readFile(file, 'utf8');
  const code = stripCssComments(text);
  if (/\binfinite\b/i.test(code)) infiniteMatches.push(relative(root, file).replaceAll('\\', '/'));
}
invariant(infiniteMatches.every((file) => ['src/styles/components-core.css', 'src/styles/components-overlays.css'].includes(file)), `motion: unexpected infinite animation in ${infiniteMatches.join(', ')}`);

if (violations.length) {
  console.error('ENJAZ PHASE 2.5 MOTION AUDIT FAIL');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log(`ENJAZ PHASE 2.5 MOTION AUDIT PASS — ${checks}/${checks} motion, interaction, presence and reduced-motion invariants satisfied.`);
