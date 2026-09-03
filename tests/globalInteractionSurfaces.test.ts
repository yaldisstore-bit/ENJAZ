import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  CONTROL_TARGETS,
  GLOBAL_INBOX_BADGE_MAX,
  GLOBAL_INTERACTION_ENTRIES,
  GLOBAL_INTERACTION_SURFACE_COUNT,
  GLOBAL_SEARCH_MIN_QUERY_LENGTH,
  GLOBAL_SEARCH_RESULT_LIMIT,
  INBOX_TARGETS,
  QUICK_CREATE_INTENTS,
  formatInboxBadge,
  normalizeGlobalInteractionQuery,
  searchGlobalNavigation,
} from '../src/core/interactions/globalInteractionContract.ts';
import { ROUTES } from '../src/core/routing/routes.ts';

const surfacesSource = fs.readFileSync(new URL('../src/shared/interactions/GlobalInteractionSurfaces.tsx', import.meta.url), 'utf8');
const shellSource = fs.readFileSync(new URL('../src/shared/shell/AppShellFrame.tsx', import.meta.url), 'utf8');
const routerSource = fs.readFileSync(new URL('../src/app/router.tsx', import.meta.url), 'utf8');
const previewRouterSource = fs.readFileSync(new URL('../src/app/previewRouter.tsx', import.meta.url), 'utf8');
const cssSource = fs.readFileSync(new URL('../src/styles/global-interactions.css', import.meta.url), 'utf8');

test('global interaction contract exposes exactly four unique shell-level surfaces', () => {
  assert.equal(GLOBAL_INTERACTION_ENTRIES.length, GLOBAL_INTERACTION_SURFACE_COUNT);
  assert.deepEqual(
    GLOBAL_INTERACTION_ENTRIES.map((entry) => entry.id),
    ['search', 'inbox', 'quickCreate', 'control'],
  );
  assert.equal(new Set(GLOBAL_INTERACTION_ENTRIES.map((entry) => entry.id)).size, GLOBAL_INTERACTION_SURFACE_COUNT);
  assert.deepEqual(
    GLOBAL_INTERACTION_ENTRIES.map((entry) => entry.presentation),
    ['dialog', 'route', 'sheet', 'sheet'],
  );
});

test('quick create is delegated and remains reserved until owning domain phases', () => {
  assert.equal(QUICK_CREATE_INTENTS.length, 3);
  assert.deepEqual(QUICK_CREATE_INTENTS.map((intent) => intent.routeId), ['transactions', 'companies', 'followUps']);
  assert.deepEqual(QUICK_CREATE_INTENTS.map((intent) => intent.deliveryPhase), ['5', '6', '11']);
  assert.ok(QUICK_CREATE_INTENTS.every((intent) => intent.contentState === 'reserved'));
  assert.equal(new Set(QUICK_CREATE_INTENTS.map((intent) => intent.targetPath)).size, QUICK_CREATE_INTENTS.length);
});

test('inbox and control surfaces delegate to canonical navigation destinations', () => {
  assert.deepEqual(INBOX_TARGETS.map((target) => target.routeId), ['notifications', 'followUps']);
  assert.deepEqual(CONTROL_TARGETS.map((target) => target.routeId), ['operations', 'command']);
  assert.equal(INBOX_TARGETS[0]?.targetPath, ROUTES.appNotifications);
  assert.equal(CONTROL_TARGETS[0]?.targetPath, ROUTES.appOperations);
  assert.equal(CONTROL_TARGETS[1]?.targetPath, ROUTES.appCommand);
  assert.ok([...INBOX_TARGETS, ...CONTROL_TARGETS].every((target) => target.contentState === 'reserved'));
});

test('global query normalization is deterministic for whitespace and Arabic text', () => {
  assert.equal(normalizeGlobalInteractionQuery('  المعاملات   اليومية  '), 'المعاملات اليومية');
  assert.equal(normalizeGlobalInteractionQuery(' FINANCE  '), 'finance');
});

test('global search enforces a two-character floor and searches navigation only', () => {
  assert.equal(GLOBAL_SEARCH_MIN_QUERY_LENGTH, 2);
  assert.deepEqual(searchGlobalNavigation('م'), []);
  assert.deepEqual(searchGlobalNavigation('  '), []);
  assert.equal(searchGlobalNavigation('معاملات')[0]?.id, 'transactions');
  assert.equal(searchGlobalNavigation('finance')[0]?.id, 'finance');
});

test('global search result volume is intentionally bounded', () => {
  const results = searchGlobalNavigation('/app');
  assert.equal(GLOBAL_SEARCH_RESULT_LIMIT, 8);
  assert.equal(results.length, GLOBAL_SEARCH_RESULT_LIMIT);
  assert.ok(results.every((route) => route.contentState === 'reserved'));
});

test('inbox badge contains invalid, fractional and storm counts safely', () => {
  assert.equal(GLOBAL_INBOX_BADGE_MAX, 99);
  assert.equal(formatInboxBadge(0), null);
  assert.equal(formatInboxBadge(-5), null);
  assert.equal(formatInboxBadge(Number.NaN), null);
  assert.equal(formatInboxBadge(20.9), '20');
  assert.equal(formatInboxBadge(99), '99');
  assert.equal(formatInboxBadge(100), '99+');
  assert.equal(formatInboxBadge(10_000), '99+');
});

test('global surfaces use accessible dialog semantics and canonical links', () => {
  assert.match(surfacesSource, /aria-haspopup="dialog"/);
  assert.match(surfacesSource, /aria-expanded=/);
  assert.match(surfacesSource, /<Dialog/);
  assert.match(surfacesSource, /<BottomSheet/);
  assert.match(surfacesSource, /aria-live="polite"/);
  assert.match(surfacesSource, /to=\{inboxTarget\.targetPath\}/);
});

test('global surfaces do not bypass domain ownership through data or Supabase access', () => {
  assert.doesNotMatch(surfacesSource, /supabase/i);
  assert.doesNotMatch(surfacesSource, /createDataLayer|DataLayerContext|WorkspaceDataGateway/);
  assert.doesNotMatch(surfacesSource, /insert\(|update\(|delete\(/);
  assert.match(surfacesSource, /content actual|محتوى المجال|نماذج الإنشاء|البحث داخل بيانات المجالات/);
});

test('App Shell owns the global surfaces exactly once', () => {
  assert.match(shellSource, /GlobalInteractionSurfaces/);
  assert.match(shellSource, /<GlobalInteractionSurfaces inboxCount=\{inboxCount\} \/>/);
  assert.equal((shellSource.match(/<GlobalInteractionSurfaces/g) ?? []).length, 1);
});

test('interaction proof route is mounted in both real and preview routers', () => {
  assert.equal(ROUTES.interactionsPreview, '/foundation/interactions');
  assert.match(routerSource, /ROUTES\.interactionsPreview/);
  assert.match(previewRouterSource, /ROUTES\.interactionsPreview/);
  assert.match(routerSource, /GlobalInteractionLabPage/);
  assert.match(previewRouterSource, /GlobalInteractionLabPage/);
});

test('global interaction CSS preserves touch, token and reduced-motion discipline', () => {
  assert.match(cssSource, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(cssSource, /min-block-size:\s*var\(--size-touch-min\)/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(cssSource, /var\(--duration-reduced-motion\)/);
  assert.doesNotMatch(cssSource, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(cssSource, /!important/);
  assert.doesNotMatch(cssSource, /transition:\s*all\b/);
  assert.doesNotMatch(cssSource, /z-index:\s*\d+/);
});
