import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  PATTERN_DENSITIES,
  PATTERN_FAMILIES,
  PATTERN_GUARDS,
  RISK_LEVELS,
  SYSTEM_STATE_TONES,
  clampPercent,
  formatIqd,
} from '../src/design-system/patterns/patternContract.ts';

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('premium pattern family contract is complete and unique', () => {
  assert.equal(PATTERN_FAMILIES.length, 14);
  assert.equal(new Set(PATTERN_FAMILIES).size, PATTERN_FAMILIES.length);
  for (const family of ['transaction', 'company', 'contact', 'finance', 'risk', 'timeline', 'followUp', 'workflow', 'automation', 'command', 'search', 'actionMenu', 'systemState', 'skeleton']) {
    assert.ok(PATTERN_FAMILIES.includes(family as (typeof PATTERN_FAMILIES)[number]));
  }
});

test('pattern guard contract preserves mobile, RTL and token-only rules', () => {
  assert.equal(PATTERN_GUARDS.minimumTouchTargetPx, 44);
  assert.equal(PATTERN_GUARDS.mobileFirst, true);
  assert.equal(PATTERN_GUARDS.rtlFirst, true);
  assert.equal(PATTERN_GUARDS.tokenOnlyVisuals, true);
  assert.equal(PATTERN_GUARDS.completeScreensForbidden, true);
  assert.equal(PATTERN_GUARDS.inlineStyleEscapeForbidden, true);
});

test('pattern density remains intentionally bounded', () => {
  assert.deepEqual([...PATTERN_DENSITIES], ['comfortable', 'compact']);
});

test('risk and system state vocabularies cover destructive product states', () => {
  assert.deepEqual([...RISK_LEVELS], ['low', 'medium', 'high', 'critical']);
  for (const tone of ['empty', 'loading', 'success', 'warning', 'error', 'conflict', 'offline', 'recovery']) {
    assert.ok(SYSTEM_STATE_TONES.includes(tone as (typeof SYSTEM_STATE_TONES)[number]));
  }
});

test('pattern numeric guards clamp progress safely', () => {
  assert.equal(clampPercent(-12), 0);
  assert.equal(clampPercent(57.7), 58);
  assert.equal(clampPercent(190), 100);
  assert.equal(clampPercent(Number.NaN), 0);
});

test('IQD formatter contains huge values without scientific notation', () => {
  assert.equal(formatIqd(1250000000), '1,250,000,000 IQD');
  assert.equal(formatIqd(Number.POSITIVE_INFINITY), '0 IQD');
});

test('pattern index exposes every composite family implementation', () => {
  const index = read('src/design-system/patterns/index.ts');
  for (const file of ['EntityPatterns.tsx', 'OperationsPatterns.tsx', 'DiscoveryPatterns.tsx', 'patternContract.ts']) {
    assert.ok(index.includes(file));
  }
});

test('pattern CSS is token-only and contains compact mobile contracts', () => {
  const css = `${read('src/styles/patterns.css')}\n${read('src/styles/pattern-lab.css')}`;
  assert.equal(/#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/i.test(css), false);
  assert.ok(css.includes('@media (max-width: 48rem)'));
  assert.ok(css.includes('@media (max-width: 22.5rem)'));
  assert.ok(css.includes('min-block-size: var(--size-touch-min)'));
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
});

test('Pattern Lab proves every required domain and recovery state', () => {
  const lab = read('src/features/foundation/pages/PatternLabPage.tsx');
  for (const marker of [
    'TransactionPattern', 'CompanyPattern', 'ContactPattern', 'FinanceSummaryPattern', 'RiskSignalPattern',
    'TimelinePattern', 'FollowUpPattern', 'WorkflowPattern', 'AutomationPattern', 'CommandModulePattern',
    'SearchResultPattern', 'ActionMenuPattern', 'PatternSkeleton',
    'tone="empty"', 'tone="loading"', 'tone="success"', 'tone="warning"', 'tone="error"',
    'tone="conflict"', 'tone="offline"', 'tone="recovery"', 'density="compact"',
  ]) {
    assert.ok(lab.includes(marker), `missing Pattern Lab marker: ${marker}`);
  }
});
