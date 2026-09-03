import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ROUTES } from '../src/core/routing/routes.ts';
import { BIDI_TEXT_KINDS, TEXT_ROLE_CLASSES, TYPOGRAPHY_GUARDS, bidiAttributes } from '../src/design-system/typography/typographyContract.ts';

const typographyTokens = await readFile(new URL('../src/styles/tokens/typography.css', import.meta.url), 'utf8');
const rtlCss = await readFile(new URL('../src/styles/typography-rtl.css', import.meta.url), 'utf8');
const labPage = await readFile(new URL('../src/features/foundation/pages/TypographyLabPage.tsx', import.meta.url), 'utf8');
const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('Arabic is the immutable document language and root direction', () => {
  assert.equal(TYPOGRAPHY_GUARDS.rootLanguage, 'ar');
  assert.equal(TYPOGRAPHY_GUARDS.rootDirection, 'rtl');
  assert.match(indexHtml, /<html lang="ar" dir="rtl">/);
  assert.doesNotMatch(indexHtml, /user-scalable=no/);
});

test('type roles are unique semantic classes', () => {
  const roles = Object.values(TEXT_ROLE_CLASSES);
  assert.equal(new Set(roles).size, roles.length);
  assert.ok(roles.length >= 9);
  assert.ok(roles.every((role) => role.startsWith('type-')));
});

test('bidi contract isolates structured LTR data and keeps natural text automatic', () => {
  assert.deepEqual(bidiAttributes('natural'), { dir: 'auto', className: 'text-auto' });
  for (const kind of ['number', 'money', 'date', 'phone', 'email', 'reference'] as const) {
    assert.equal(BIDI_TEXT_KINDS[kind].dir, 'ltr');
  }
  assert.match(bidiAttributes('money').className, /text-numeric/);
  assert.match(bidiAttributes('reference').className, /text-code/);
});

test('Arabic scale keeps caption and body accessibility floors', () => {
  assert.equal(TYPOGRAPHY_GUARDS.minimumCaptionPx, 13);
  assert.equal(TYPOGRAPHY_GUARDS.minimumBodyPx, 16);
  assert.match(typographyTokens, /--font-size-caption:\s*0\.8125rem/);
  assert.match(typographyTokens, /--font-size-body:\s*1rem/);
});

test('Arabic tracking is zero while numeric content uses tabular figures', () => {
  assert.match(typographyTokens, /--tracking-arabic:\s*0em/);
  assert.match(typographyTokens, /--tracking-ui:\s*var\(--tracking-arabic\)/);
  assert.match(rtlCss, /font-variant-numeric:\s*var\(--font-variant-numeric\)/);
});

test('long and mixed-direction content has explicit containment primitives', () => {
  for (const marker of ['unicode-bidi: isolate', 'unicode-bidi: plaintext', 'overflow-wrap: anywhere', 'text-overflow: ellipsis', '-webkit-line-clamp: 2']) {
    assert.ok(rtlCss.includes(marker));
  }
});

test('typography lab proves money, date, phone, reference and long Arabic names', () => {
  assert.equal(ROUTES.typography, '/foundation/typography');
  for (const marker of ["bidiAttributes('money')", "bidiAttributes('date')", "bidiAttributes('phone')", "bidiAttributes('reference')", 'اختبار الاسم الطويل', 'عربي + English']) {
    assert.ok(labPage.includes(marker));
  }
});
