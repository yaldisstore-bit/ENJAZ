import { ROUTES, type AppRoute } from './routes.ts';

export type ProductRouteId =
  | 'home'
  | 'today'
  | 'transactions'
  | 'companies'
  | 'people'
  | 'finance'
  | 'workflows'
  | 'automation'
  | 'operations'
  | 'command'
  | 'risk'
  | 'savedViews'
  | 'intelligence'
  | 'documents'
  | 'reports'
  | 'notifications'
  | 'followUps'
  | 'copilot';

export type PrimaryNavigationId = 'home' | 'work' | 'transactions' | 'companies' | 'more';
export type NavigationPermission = 'authenticated';
export type NavigationAccessState = 'available' | 'forbidden';
export type NavigationContentState = 'reserved' | 'implemented';
export type DeliveryPhase = '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';

export interface ProductNavigationRoute {
  readonly id: ProductRouteId;
  readonly label: string;
  readonly path: AppRoute;
  readonly deliveryPhase: DeliveryPhase;
  readonly permission: NavigationPermission;
  readonly contentState: NavigationContentState;
}

export interface PrimaryNavigationItem {
  readonly id: PrimaryNavigationId;
  readonly label: string;
  readonly path: AppRoute;
  readonly routeIds: readonly ProductRouteId[];
}

export interface NavigationAccessContext {
  readonly isAuthenticated: boolean;
}

export const PRODUCT_NAVIGATION_ROUTES = Object.freeze([
  { id: 'home', label: 'الرئيسية', path: ROUTES.appHome, deliveryPhase: '4', permission: 'authenticated', contentState: 'reserved' },
  { id: 'today', label: 'اليوم', path: ROUTES.appToday, deliveryPhase: '4', permission: 'authenticated', contentState: 'reserved' },
  { id: 'transactions', label: 'المعاملات', path: ROUTES.appTransactions, deliveryPhase: '5', permission: 'authenticated', contentState: 'reserved' },
  { id: 'companies', label: 'الشركات', path: ROUTES.appCompanies, deliveryPhase: '6', permission: 'authenticated', contentState: 'reserved' },
  { id: 'people', label: 'الأشخاص والمحامون', path: ROUTES.appPeople, deliveryPhase: '6', permission: 'authenticated', contentState: 'reserved' },
  { id: 'finance', label: 'المالية', path: ROUTES.appFinance, deliveryPhase: '7', permission: 'authenticated', contentState: 'reserved' },
  { id: 'workflows', label: 'سير العمل', path: ROUTES.appWorkflows, deliveryPhase: '8', permission: 'authenticated', contentState: 'reserved' },
  { id: 'automation', label: 'الأتمتة', path: ROUTES.appAutomation, deliveryPhase: '8', permission: 'authenticated', contentState: 'reserved' },
  { id: 'operations', label: 'مركز العمليات', path: ROUTES.appOperations, deliveryPhase: '8', permission: 'authenticated', contentState: 'reserved' },
  { id: 'command', label: 'مركز القيادة', path: ROUTES.appCommand, deliveryPhase: '8', permission: 'authenticated', contentState: 'reserved' },
  { id: 'risk', label: 'المخاطر', path: ROUTES.appRisk, deliveryPhase: '9', permission: 'authenticated', contentState: 'reserved' },
  { id: 'savedViews', label: 'العروض المحفوظة', path: ROUTES.appSavedViews, deliveryPhase: '9', permission: 'authenticated', contentState: 'reserved' },
  { id: 'intelligence', label: 'الرؤى', path: ROUTES.appIntelligence, deliveryPhase: '9', permission: 'authenticated', contentState: 'reserved' },
  { id: 'documents', label: 'الوثائق', path: ROUTES.appDocuments, deliveryPhase: '10', permission: 'authenticated', contentState: 'reserved' },
  { id: 'reports', label: 'التقارير', path: ROUTES.appReports, deliveryPhase: '10', permission: 'authenticated', contentState: 'reserved' },
  { id: 'notifications', label: 'الإشعارات', path: ROUTES.appNotifications, deliveryPhase: '11', permission: 'authenticated', contentState: 'reserved' },
  { id: 'followUps', label: 'المتابعات', path: ROUTES.appFollowUps, deliveryPhase: '11', permission: 'authenticated', contentState: 'reserved' },
  { id: 'copilot', label: 'مساعد إنجاز', path: ROUTES.appCopilot, deliveryPhase: '12', permission: 'authenticated', contentState: 'reserved' },
] as const satisfies readonly ProductNavigationRoute[]);

export const SECONDARY_NAVIGATION_ROUTE_IDS = Object.freeze([
  'people',
  'finance',
  'workflows',
  'automation',
  'operations',
  'command',
  'risk',
  'savedViews',
  'intelligence',
  'documents',
  'reports',
  'notifications',
  'followUps',
  'copilot',
] as const satisfies readonly ProductRouteId[]);

export const PRIMARY_NAVIGATION = Object.freeze([
  { id: 'home', label: 'الرئيسية', path: ROUTES.appHome, routeIds: ['home'] },
  { id: 'work', label: 'اليوم', path: ROUTES.appToday, routeIds: ['today'] },
  { id: 'transactions', label: 'المعاملات', path: ROUTES.appTransactions, routeIds: ['transactions'] },
  { id: 'companies', label: 'الشركات', path: ROUTES.appCompanies, routeIds: ['companies'] },
  { id: 'more', label: 'المزيد', path: ROUTES.appMore, routeIds: SECONDARY_NAVIGATION_ROUTE_IDS },
] as const satisfies readonly PrimaryNavigationItem[]);

const PRODUCT_ROUTE_BY_ID = new Map<ProductRouteId, ProductNavigationRoute>(
  PRODUCT_NAVIGATION_ROUTES.map((route) => [route.id, route]),
);

const PRODUCT_ROUTES_BY_PATH_LENGTH = [...PRODUCT_NAVIGATION_ROUTES]
  .sort((left, right) => right.path.length - left.path.length);

export function normalizeNavigationPath(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/, 1)[0] ?? '/';
  const withLeadingSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, '/');
  if (collapsed === '/') return collapsed;
  return collapsed.replace(/\/+$/, '');
}

export function isNavigationPathActive(pathname: string, target: string): boolean {
  const current = normalizeNavigationPath(pathname);
  const normalizedTarget = normalizeNavigationPath(target);
  if (current === normalizedTarget) return true;
  if (normalizedTarget === '/' || normalizedTarget === ROUTES.appHome) return false;
  return current.startsWith(`${normalizedTarget}/`);
}

export function getProductNavigationRoute(pathname: string): ProductNavigationRoute | null {
  const normalized = normalizeNavigationPath(pathname);
  for (const route of PRODUCT_ROUTES_BY_PATH_LENGTH) {
    if (route.path === ROUTES.appHome && normalized !== ROUTES.appHome) continue;
    if (isNavigationPathActive(normalized, route.path)) return route;
  }
  return null;
}

export function getProductNavigationRouteById(id: ProductRouteId): ProductNavigationRoute {
  const route = PRODUCT_ROUTE_BY_ID.get(id);
  if (!route) throw new Error(`Unknown ENJAZ product route: ${id}`);
  return route;
}

export function resolvePrimaryNavigation(pathname: string): PrimaryNavigationId | null {
  const normalized = normalizeNavigationPath(pathname);
  if (isNavigationPathActive(normalized, ROUTES.appMore)) return 'more';
  const route = getProductNavigationRoute(normalized);
  if (!route) return null;
  return PRIMARY_NAVIGATION.find((item) => item.routeIds.some((routeId) => routeId === route.id))?.id ?? 'more';
}

export function resolveNavigationAccess(
  route: ProductNavigationRoute,
  context: NavigationAccessContext,
): NavigationAccessState {
  if (route.permission === 'authenticated' && !context.isAuthenticated) return 'forbidden';
  return 'available';
}

export function resolveBackDestination(pathname: string): AppRoute | null {
  const normalized = normalizeNavigationPath(pathname);
  if (normalized === ROUTES.appHome) return null;
  if (isNavigationPathActive(normalized, ROUTES.appMore)) return ROUTES.appHome;

  const route = getProductNavigationRoute(normalized);
  if (!route) return normalized.startsWith(`${ROUTES.appHome}/`) ? ROUTES.appHome : null;
  if (normalized !== route.path) return route.path;
  return ROUTES.appHome;
}
