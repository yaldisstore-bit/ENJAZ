import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatIqd } from '../src/design-system/patterns/patternContract.ts';
import {
  MIXED_DIRECTION_STRESS_TEXT,
  VISUAL_DESTRUCTION_CONTRACT,
  createDenseTimeline,
  createLongCompanyName,
  createNotificationStorm,
} from '../src/core/quality/visualDestructionContract.ts';

test('visual destruction contract locks the agreed torture thresholds', () => {
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.longCompanyMinimumCharacters, 200);
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.notificationStormCount, 20);
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.denseTimelineCount, 24);
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.narrowViewportPx, 320);
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.keyboardViewportPx, 360);
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.minimumTouchTargetPx, 44);
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.phase3ForbiddenUntilGreen, true);
});

test('200-character company fixture really exceeds the destructive floor', () => {
  const company = createLongCompanyName();
  assert.ok(company.length >= 200);
  assert.equal(createLongCompanyName(), company);
  assert.match(company, /محدودة المسؤولية/);
});

test('notification storm creates exactly twenty unique stress records', () => {
  const notifications = createNotificationStorm();
  assert.equal(notifications.length, 20);
  assert.equal(new Set(notifications.map((item) => item.id)).size, 20);
  assert.ok(notifications.some((item) => item.urgent));
  assert.ok(notifications.every((item) => item.title.length > 25));
});

test('dense timeline creates twenty-four mixed-tone long events', () => {
  const timeline = createDenseTimeline();
  assert.equal(timeline.length, 24);
  assert.equal(new Set(timeline.map((item) => item.id)).size, 24);
  assert.ok(timeline.some((item) => item.tone === 'danger'));
  assert.ok(timeline.every((item) => item.description.includes('REF-2026-998877')));
});

test('huge IQD value stays safe and never falls into scientific notation', () => {
  const value = VISUAL_DESTRUCTION_CONTRACT.hugeMoneyValue;
  assert.equal(Number.isSafeInteger(value), true);
  const formatted = formatIqd(value);
  assert.doesNotMatch(formatted, /e[+-]/i);
  assert.match(formatted, /IQD$/);
  assert.match(formatted, /,/);
});

test('mixed-direction stress fixture carries Arabic, Latin, phone, reference and money', () => {
  assert.match(MIXED_DIRECTION_STRESS_TEXT, /شركة/);
  assert.match(MIXED_DIRECTION_STRESS_TEXT, /ENJAZ/);
  assert.match(MIXED_DIRECTION_STRESS_TEXT, /REF-2026/);
  assert.match(MIXED_DIRECTION_STRESS_TEXT, /\+964/);
  assert.match(MIXED_DIRECTION_STRESS_TEXT, /IQD/);
});

test('quality contract forbids visual escape hatches before Phase 3', () => {
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.tokenOnlyVisuals, true);
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.rawColorsForbidden, true);
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.importantOverridesForbidden, true);
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.arbitraryZIndexForbidden, true);
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.tinyProductTextForbidden, true);
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.zoomMustRemainEnabled, true);
  assert.equal(VISUAL_DESTRUCTION_CONTRACT.reducedMotionMustRemainSupported, true);
});
