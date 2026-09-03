import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { DESIGN_TOKEN_COUNT, DESIGN_TOKEN_GROUPS, cssVar } from '../src/design-system/tokens/tokenContract.ts';
import { ROUTES } from '../src/core/routing/routes.ts';

const tokenIndex = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const components = await readFile(new URL('../src/styles/tokens/components.css', import.meta.url), 'utf8');
const primitives = await readFile(new URL('../src/styles/tokens/primitives.css', import.meta.url), 'utf8');
const tokenPage = await readFile(new URL('../src/features/foundation/pages/TokenLabPage.tsx', import.meta.url), 'utf8');

test('design tokens have explicit ordered tiers', () => {
  for (const layer of ['primitives', 'semantic', 'typography', 'geometry', 'elevation', 'motion', 'components']) {
    assert.match(tokenIndex, new RegExp(`tokens/${layer}\\.css`));
  }
});

test('public typed token contract is substantial and excludes primitives', () => {
  assert.ok(DESIGN_TOKEN_COUNT >= 140);
  const all = Object.values(DESIGN_TOKEN_GROUPS).flat();
  assert.ok(all.every((token) => !token.startsWith('--enjaz-')));
  assert.equal(cssVar('--color-canvas'), 'var(--color-canvas)');
});

test('component contract aliases identity tokens instead of hardcoding raw values', () => {
  for (const token of ['--field-height', '--button-radius', '--card-shadow', '--badge-radius', '--sheet-shadow', '--navigation-touch-target']) {
    assert.match(components, new RegExp(`${token}:\\s*var\\(`));
  }
});

test('raw colors are isolated to primitive layer', () => {
  assert.match(primitives, /#[0-9a-f]{6}/i);
  assert.doesNotMatch(components, /#[0-9a-f]{3,8}\b/i);
});

test('token lab is a routed proof surface', () => {
  assert.equal(ROUTES.tokens, '/foundation/tokens');
  for (const marker of ['الطبقات', 'سلم المسافات', 'عقود التحكم', 'قواعد عدم الانحراف']) assert.ok(tokenPage.includes(marker));
});
