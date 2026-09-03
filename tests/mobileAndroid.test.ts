import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  MOBILE_BREAKPOINT_PX,
  MOBILE_POINTER_QUERY,
  MOBILE_TOUCH_TARGET_PX,
  MOBILE_VIEWPORT_META,
  supportsDynamicViewport,
  usesCoarsePointer,
} from '../src/core/mobile/mobileContract.ts';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile runtime contract remains bounded and deterministic', () => {
  assert.equal(MOBILE_TOUCH_TARGET_PX, 44);
  assert.equal(MOBILE_BREAKPOINT_PX, 768);
  assert.equal(MOBILE_POINTER_QUERY, '(pointer: coarse)');
  assert.equal(MOBILE_VIEWPORT_META.includes('viewport-fit=cover'), true);
  assert.equal(MOBILE_VIEWPORT_META.includes('interactive-widget=resizes-content'), true);

  const coarse = { matchMedia: (query: string) => ({ matches: query === MOBILE_POINTER_QUERY }) };
  assert.equal(usesCoarsePointer(coarse), true);
  assert.equal(usesCoarsePointer({ matchMedia: () => ({ matches: false }) }), false);
  assert.equal(supportsDynamicViewport({ CSS: { supports: (property, value) => property === 'height' && value === '100dvh' } }), true);
  assert.equal(supportsDynamicViewport({ CSS: { supports: () => false } }), false);
});

test('document viewport preserves accessibility and Android keyboard resizing', async () => {
  const html = await read('index.html');
  assert.equal(html.includes(`content="${MOBILE_VIEWPORT_META}"`), true);
  assert.equal(/user-scalable\s*=\s*no/i.test(html), false);
  assert.equal(/maximum-scale\s*=\s*1/i.test(html), false);
});

test('mobile hardening protects safe areas, touch and dynamic viewport', async () => {
  const css = await read('src/styles/mobile-hardening.css');
  for (const marker of [
    'safe-area-inset-top',
    'safe-area-inset-bottom',
    'safe-area-inset-left',
    'safe-area-inset-right',
    '@supports (height: 100dvh)',
    'min-block-size: 100dvh',
    'min-block-size: 100vh',
    'touch-action: manipulation',
    '@media (pointer: coarse)',
    'scroll-margin-block',
    'overflow-x: clip',
  ]) assert.equal(css.includes(marker), true, `missing ${marker}`);
});

test('mobile proof route is wired into both authenticated and preview routers', async () => {
  const [routes, router, previewRouter, lab] = await Promise.all([
    read('src/core/routing/routes.ts'),
    read('src/app/router.tsx'),
    read('src/app/previewRouter.tsx'),
    read('src/features/foundation/pages/MobileLabPage.tsx'),
  ]);
  assert.equal(routes.includes("mobile: '/foundation/mobile'"), true);
  assert.equal(router.includes('MobileLabPage') && router.includes('ROUTES.mobile'), true);
  assert.equal(previewRouter.includes('MobileLabPage') && previewRouter.includes('ROUTES.mobile'), true);
  for (const marker of ['Viewport & Safe Area', 'لوحة المفاتيح', 'Bottom Sheet', 'Touch / Pointer']) {
    assert.equal(lab.includes(marker), true, `lab missing ${marker}`);
  }
});

test('mobile CSS is loaded after the established motion layer', async () => {
  const foundation = await read('src/styles/foundation.css');
  const motionIndex = foundation.indexOf("@import './motion-lab.css';");
  const hardeningIndex = foundation.indexOf("@import './mobile-hardening.css';");
  const labIndex = foundation.indexOf("@import './mobile-lab.css';");
  assert.equal(motionIndex >= 0, true);
  assert.equal(hardeningIndex > motionIndex, true);
  assert.equal(labIndex > hardeningIndex, true);
});
