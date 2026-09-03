import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getProductNavigationRoute,
  getProductNavigationRouteById,
  isNavigationPathActive,
  normalizeNavigationPath,
  PRIMARY_NAVIGATION,
  PRODUCT_NAVIGATION_ROUTES,
  resolveBackDestination,
  resolveNavigationAccess,
  resolvePrimaryNavigation,
  SECONDARY_NAVIGATION_ROUTE_IDS,
} from '../src/core/routing/navigationContract.ts';
import { ROUTES } from '../src/core/routing/routes.ts';
import { SHELL_NAV_SLOTS } from '../src/shared/shell/shellContract.ts';

test('product route map is canonical, unique and reserved for later business phases', () => {
  assert.equal(PRODUCT_NAVIGATION_ROUTES.length, 18);
  assert.equal(new Set(PRODUCT_NAVIGATION_ROUTES.map((route) => route.id)).size, 18);
  assert.equal(new Set(PRODUCT_NAVIGATION_ROUTES.map((route) => route.path)).size, 18);
  assert.ok(PRODUCT_NAVIGATION_ROUTES.every((route) => route.path === '/app' || route.path.startsWith('/app/')));
  assert.ok(PRODUCT_NAVIGATION_ROUTES.every((route) => route.permission === 'authenticated'));
  assert.ok(PRODUCT_NAVIGATION_ROUTES.every((route) => route.contentState === 'reserved'));
});

test('primary navigation keeps exactly five frozen shell slots and real destinations', () => {
  assert.equal(PRIMARY_NAVIGATION.length, 5);
  assert.deepEqual(PRIMARY_NAVIGATION.map((item) => item.id), ['home', 'work', 'transactions', 'companies', 'more']);
  assert.deepEqual(PRIMARY_NAVIGATION.map((item) => item.path), [
    ROUTES.appHome,
    ROUTES.appToday,
    ROUTES.appTransactions,
    ROUTES.appCompanies,
    ROUTES.appMore,
  ]);
  assert.equal(SHELL_NAV_SLOTS.length, 5);
  assert.ok(SHELL_NAV_SLOTS.every((slot) => slot.status === 'ready'));
  assert.deepEqual(SHELL_NAV_SLOTS.map((slot) => slot.destination), PRIMARY_NAVIGATION.map((item) => item.path));
});

test('secondary product domains are complete and owned by More', () => {
  assert.equal(SECONDARY_NAVIGATION_ROUTE_IDS.length, 14);
  assert.equal(new Set(SECONDARY_NAVIGATION_ROUTE_IDS).size, 14);
  for (const id of SECONDARY_NAVIGATION_ROUTE_IDS) {
    assert.equal(resolvePrimaryNavigation(getProductNavigationRouteById(id).path), 'more');
  }
});

test('navigation paths normalize without corrupting route boundaries', () => {
  assert.equal(normalizeNavigationPath('app//transactions///?tab=open#x'), '/app/transactions');
  assert.equal(normalizeNavigationPath('/app/companies/'), '/app/companies');
  assert.equal(normalizeNavigationPath('/'), '/');
  assert.equal(isNavigationPathActive('/app/transactions/123', ROUTES.appTransactions), true);
  assert.equal(isNavigationPathActive('/app/transactions-old', ROUTES.appTransactions), false);
  assert.equal(isNavigationPathActive('/app/finance', ROUTES.appHome), false);
});

test('product route resolution supports nested deep links but rejects unknown app paths', () => {
  assert.equal(getProductNavigationRoute('/app/transactions/abc')?.id, 'transactions');
  assert.equal(getProductNavigationRoute('/app/companies/xyz?tab=files')?.id, 'companies');
  assert.equal(getProductNavigationRoute('/app/finance')?.id, 'finance');
  assert.equal(getProductNavigationRoute('/app/unknown'), null);
  assert.equal(getProductNavigationRoute('/outside'), null);
});

test('active shell navigation is deterministic for primary and secondary domains', () => {
  assert.equal(resolvePrimaryNavigation(ROUTES.appHome), 'home');
  assert.equal(resolvePrimaryNavigation('/app/today/late'), 'work');
  assert.equal(resolvePrimaryNavigation('/app/transactions/123'), 'transactions');
  assert.equal(resolvePrimaryNavigation('/app/companies/123'), 'companies');
  assert.equal(resolvePrimaryNavigation(ROUTES.appMore), 'more');
  assert.equal(resolvePrimaryNavigation('/app/documents/123'), 'more');
  assert.equal(resolvePrimaryNavigation('/app/unknown'), null);
});

test('navigation access never hides authentication requirements in UI-only logic', () => {
  const finance = getProductNavigationRouteById('finance');
  assert.equal(resolveNavigationAccess(finance, { isAuthenticated: true }), 'available');
  assert.equal(resolveNavigationAccess(finance, { isAuthenticated: false }), 'forbidden');
});

test('safe back is deterministic even when a page was opened as a direct deep link', () => {
  assert.equal(resolveBackDestination(ROUTES.appHome), null);
  assert.equal(resolveBackDestination(ROUTES.appTransactions), ROUTES.appHome);
  assert.equal(resolveBackDestination('/app/transactions/record-1'), ROUTES.appTransactions);
  assert.equal(resolveBackDestination(ROUTES.appFinance), ROUTES.appHome);
  assert.equal(resolveBackDestination(ROUTES.appMore), ROUTES.appHome);
  assert.equal(resolveBackDestination('/app/unknown'), ROUTES.appHome);
  assert.equal(resolveBackDestination('/outside'), null);
});

test('shell frame computes active and back state from currentPath instead of hardcoding page state', () => {
  const source = readFileSync('src/shared/shell/AppShellFrame.tsx', 'utf8');
  assert.match(source, /resolvePrimaryNavigation\(normalizedPath\)/);
  assert.match(source, /resolveBackDestination\(normalizedPath\)/);
  assert.match(source, /aria-current=\{isActive \? 'page' : undefined\}/);
  assert.doesNotMatch(source, /سيتم تفعيلها في Phase 3\.2/);
  assert.doesNotMatch(source, /<button[\s\S]*?disabled/);
});

test('real and preview routers consume the central product route contract', () => {
  const router = readFileSync('src/app/router.tsx', 'utf8');
  const previewRouter = readFileSync('src/app/previewRouter.tsx', 'utf8');
  assert.match(router, /PRODUCT_NAVIGATION_ROUTES/);
  assert.match(router, /NavigationBoundaryPage/);
  assert.match(router, /ROUTES\.navigationPreview/);
  assert.match(previewRouter, /PRODUCT_NAVIGATION_ROUTES/);
  assert.match(previewRouter, /NavigationPreviewAppPage/);
  assert.match(previewRouter, /ROUTES\.navigationPreview/);
});

test('offline React Router shim covers location-aware navigation and interactive Link props', () => {
  const shim = readFileSync('types/offline-react.d.ts', 'utf8');
  assert.match(shim, /export function useLocation\(\): Location/);
  assert.match(shim, /pathname: string/);
  assert.match(shim, /role\?: string/);
  assert.match(shim, /onClick\?: \(\) => void/);
  assert.match(shim, /'aria-label'\?: string/);
  assert.match(shim, /'aria-current'\?: 'page'/);
  assert.match(shim, /ChangeEvent<T = Element> \{ currentTarget: T; target: T \}/);
});
