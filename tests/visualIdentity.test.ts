import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const tokens = await Promise.all(['semantic','typography','geometry','elevation','motion','components'].map((name) => readFile(new URL(`../src/styles/tokens/${name}.css`, import.meta.url), 'utf8'))).then((parts) => parts.join('\n'));
const styles = await readFile(new URL('../src/styles/foundation.css', import.meta.url), 'utf8');
const identityStyles = await readFile(new URL('../src/styles/identity.css', import.meta.url), 'utf8');
const identity = await readFile(new URL('../src/features/foundation/pages/IdentityLabPage.tsx', import.meta.url), 'utf8');

test('visual identity has one canonical token source', () => {
  assert.match(tokens, /--color-brand-primary:/);
  assert.match(tokens, /--gradient-brand:/);
  assert.doesNotMatch(styles, /#[0-9a-f]{3,8}\b/i);
});

test('Arabic-first typography and RTL foundation remain explicit', () => {
  assert.match(tokens, /--font-family-ui:[^;]*Arabic/i);
  assert.match(identityStyles, /identity-type-display/);
});

test('identity proof page covers palette, type, depth, status and principles', () => {
  for (const marker of ['لوحة الهوية', 'الكتابة العربية', 'العمق', 'الحالات الدلالية', 'دستور الهوية']) {
    assert.ok(identity.includes(marker));
  }
});

test('visual identity preserves 44px touch floor and 13px caption floor', () => {
  assert.match(tokens, /--size-touch-min:\s*2\.75rem/);
  assert.match(tokens, /--font-size-caption:\s*0\.8125rem/);
});
