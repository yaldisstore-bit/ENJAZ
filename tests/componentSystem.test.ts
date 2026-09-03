import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  BADGE_TONES,
  BUTTON_VARIANTS,
  CARD_TONES,
  COMPONENT_GUARDS,
  CONTROL_SIZES,
  ICON_BUTTON_TONES,
  clampProgress,
} from '../src/design-system/components/componentContract.ts';
import { classNames } from '../src/design-system/components/classNames.ts';

const root = resolve(process.cwd());

async function source(path: string) {
  return readFile(resolve(root, path), 'utf8');
}

test('component variants are bounded explicit contracts', () => {
  assert.deepEqual(BUTTON_VARIANTS, ['primary', 'secondary', 'danger', 'ghost']);
  assert.deepEqual(CONTROL_SIZES, ['default', 'large']);
  assert.deepEqual(ICON_BUTTON_TONES, ['neutral', 'brand', 'danger']);
  assert.deepEqual(CARD_TONES, ['surface', 'muted', 'raised', 'prominent']);
  assert.equal(BADGE_TONES.length, 6);
});

test('component guard keeps the 44px touch floor', () => {
  assert.equal(COMPONENT_GUARDS.minimumTouchTargetPx, 44);
  assert.equal(COMPONENT_GUARDS.iconButtonRequiresAccessibleLabel, true);
  assert.equal(COMPONENT_GUARDS.buttonDefaultType, 'button');
});

test('progress values are clamped before reaching native progress', () => {
  assert.equal(clampProgress(-20), 0);
  assert.equal(clampProgress(42), 42);
  assert.equal(clampProgress(140), 100);
  assert.equal(clampProgress(Number.NaN), 0);
});

test('classNames excludes falsey optional classes without mutation', () => {
  assert.equal(classNames('ui-button', false, undefined, 'ui-button--primary', null), 'ui-button ui-button--primary');
});

test('icon button source requires an accessible label', async () => {
  const text = await source('src/design-system/components/Button.tsx');
  assert.match(text, /label: string;/);
  assert.match(text, /aria-label=\{label\}/);
});

test('fields wire label, hint and error semantics', async () => {
  const text = await source('src/design-system/components/Field.tsx');
  assert.match(text, /htmlFor=\{id\}/);
  assert.match(text, /aria-describedby=\{descriptionIds\(id, hint, error\)\}/);
  assert.match(text, /role="alert"/);
});

test('tabs include roving tab index and keyboard keys', async () => {
  const text = await source('src/design-system/components/Tabs.tsx');
  assert.match(text, /role="tablist"/);
  assert.match(text, /tabIndex=\{selected \? 0 : -1\}/);
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) assert.ok(text.includes(key));
});

test('overlays expose dialog semantics and Escape dismissal', async () => {
  const text = await source('src/design-system/components/Overlay.tsx');
  assert.match(text, /aria-modal="true"/);
  assert.match(text, /event\.key === 'Escape'/);
});

test('component lab is a routed proof surface', async () => {
  const routes = await source('src/core/routing/routes.ts');
  const lab = await source('src/features/foundation/pages/ComponentLabPage.tsx');
  assert.match(routes, /\/foundation\/components/);
  assert.match(lab, /Core Components 2\.4/);
  assert.match(lab, /BottomSheet/);
});

test('component CSS consumes tokens instead of raw colors', async () => {
  const files = await Promise.all([
    source('src/styles/components-core.css'),
    source('src/styles/components-fields.css'),
    source('src/styles/components-overlays.css'),
  ]);
  const combined = files.join('\n');
  assert.doesNotMatch(combined, /#[0-9a-f]{3,8}\b/i);
  assert.match(combined, /var\(--control-focus-shadow\)/);
});
