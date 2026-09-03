import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { MOTION_DELAYS, MOTION_DURATION_MS, MOTION_PRESETS, prefersReducedMotion } from '../src/design-system/motion/motionContract.ts';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const stripCssComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '');

test('motion durations are ordered, bounded and intentionally short', () => {
  assert.deepEqual(MOTION_DURATION_MS, {
    instant: 90,
    fast: 140,
    standard: 220,
    deliberate: 320,
    slow: 420,
  });
  const values = Object.values(MOTION_DURATION_MS);
  assert.equal(values.every((value) => value > 0 && value <= 500), true);
  assert.deepEqual([...values].sort((a, b) => a - b), values);
});

test('motion reveal presets and delays are bounded contracts', () => {
  assert.deepEqual(MOTION_PRESETS, ['fade', 'rise', 'scale']);
  assert.deepEqual(MOTION_DELAYS, ['none', '1', '2', '3']);
});

test('reduced motion detection is safe without a browser window', () => {
  assert.equal(prefersReducedMotion(), false);
});

test('motion CSS forbids transition-all and scopes hover capability', async () => {
  const css = await read('src/styles/motion-interaction.css');
  const code = stripCssComments(css);
  assert.equal(/transition\s*:\s*all\b/i.test(code), false);
  assert.match(code, /@media \(hover: hover\) and \(pointer: fine\)/);
});

test('reduced motion disables non-essential loops and transitions', async () => {
  const css = stripCssComments(await read('src/styles/motion-interaction.css'));
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.ui-skeleton,[\s\S]*\.ui-button__spinner[\s\S]*animation: none/);
  assert.match(css, /\.ui-button,[\s\S]*\.ui-field__control[\s\S]*transition: none/);
});

test('overlay uses presence state instead of abrupt conditional removal', async () => {
  const overlay = await read('src/design-system/components/Overlay.tsx');
  assert.match(overlay, /useMotionPresence\(open, exitDuration\)/);
  assert.match(overlay, /data-motion-state=\{presence\.state\}/);
  assert.doesNotMatch(overlay, /if \(!open\) return null/);
});

test('presence waits for exit unless the user requests reduced motion', async () => {
  const presence = await read('src/design-system/motion/useMotionPresence.ts');
  assert.match(presence, /setState\('exiting'\)/);
  assert.match(presence, /prefersReducedMotion\(\) \? 0 : exitDurationMs/);
  assert.match(presence, /setMounted\(false\)/);
});

test('Motion Lab is a routed proof surface', async () => {
  const routes = await read('src/core/routing/routes.ts');
  const router = await read('src/app/router.tsx');
  const page = await read('src/features/foundation/pages/MotionLabPage.tsx');
  assert.match(routes, /motion: '\/foundation\/motion'/);
  assert.match(router, /MotionLabPage/);
  assert.match(page, /استجابة اللمس/);
  assert.match(page, /الطبقات المتحركة/);
  assert.match(page, /Reduce Motion/);
});
