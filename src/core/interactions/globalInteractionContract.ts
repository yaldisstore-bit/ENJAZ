import {
  PRODUCT_NAVIGATION_ROUTES,
  getProductNavigationRouteById,
  type DeliveryPhase,
  type ProductNavigationRoute,
  type ProductRouteId,
} from '../routing/navigationContract.ts';
import type { AppRoute } from '../routing/routes.ts';

export type GlobalInteractionSurfaceId = 'search' | 'inbox' | 'quickCreate' | 'control';
export type GlobalInteractionGlyph = 'search' | 'inbox' | 'plus' | 'command';
export type GlobalInteractionPresentation = 'dialog' | 'route' | 'sheet';

export interface GlobalInteractionEntry {
  readonly id: GlobalInteractionSurfaceId;
  readonly label: string;
  readonly shortLabel: string;
  readonly glyph: GlobalInteractionGlyph;
  readonly presentation: GlobalInteractionPresentation;
  readonly description: string;
}

export interface DelegatedInteractionTarget {
  readonly routeId: ProductRouteId;
  readonly label: string;
  readonly targetPath: AppRoute;
  readonly deliveryPhase: DeliveryPhase;
  readonly contentState: 'reserved';
}

export interface QuickCreateIntent extends DelegatedInteractionTarget {
  readonly id: 'newTransaction' | 'newCompany' | 'newFollowUp';
  readonly actionLabel: string;
}

export const GLOBAL_INTERACTION_ENTRIES = Object.freeze([
  {
    id: 'search',
    label: 'البحث الشامل',
    shortLabel: 'بحث',
    glyph: 'search',
    presentation: 'dialog',
    description: 'ابحث في أقسام إنجاز من نقطة واحدة دون نسخ منطق أي مجال.',
  },
  {
    id: 'inbox',
    label: 'صندوق الوارد',
    shortLabel: 'الوارد',
    glyph: 'inbox',
    presentation: 'route',
    description: 'نقطة دخول موحدة للإشعارات ثم صندوق العمل عند اكتمال مجاله.',
  },
  {
    id: 'quickCreate',
    label: 'إنشاء سريع',
    shortLabel: 'إنشاء',
    glyph: 'plus',
    presentation: 'sheet',
    description: 'نوايا إنشاء عالمية تفوّض التنفيذ إلى المجال المالك بدل تكرار النماذج.',
  },
  {
    id: 'control',
    label: 'القيادة والعمليات',
    shortLabel: 'القيادة',
    glyph: 'command',
    presentation: 'sheet',
    description: 'مدخل موحد لمركز العمليات ومركز القيادة دون منطق أعمال داخل الهيكل.',
  },
] as const satisfies readonly GlobalInteractionEntry[]);

export const GLOBAL_INTERACTION_SURFACE_COUNT = 4;
export const GLOBAL_SEARCH_MIN_QUERY_LENGTH = 2;
export const GLOBAL_SEARCH_RESULT_LIMIT = 8;
export const GLOBAL_INBOX_BADGE_MAX = 99;

export const QUICK_CREATE_INTENTS = Object.freeze([
  {
    id: 'newTransaction',
    actionLabel: 'معاملة جديدة',
    routeId: 'transactions',
    label: 'المعاملات',
    targetPath: getProductNavigationRouteById('transactions').path,
    deliveryPhase: getProductNavigationRouteById('transactions').deliveryPhase,
    contentState: 'reserved',
  },
  {
    id: 'newCompany',
    actionLabel: 'شركة جديدة',
    routeId: 'companies',
    label: 'الشركات',
    targetPath: getProductNavigationRouteById('companies').path,
    deliveryPhase: getProductNavigationRouteById('companies').deliveryPhase,
    contentState: 'reserved',
  },
  {
    id: 'newFollowUp',
    actionLabel: 'متابعة جديدة',
    routeId: 'followUps',
    label: 'المتابعات',
    targetPath: getProductNavigationRouteById('followUps').path,
    deliveryPhase: getProductNavigationRouteById('followUps').deliveryPhase,
    contentState: 'reserved',
  },
] as const satisfies readonly QuickCreateIntent[]);

export const INBOX_TARGETS = Object.freeze([
  toDelegatedTarget('notifications'),
  toDelegatedTarget('followUps'),
] as const);

export const CONTROL_TARGETS = Object.freeze([
  toDelegatedTarget('operations'),
  toDelegatedTarget('command'),
] as const);

function toDelegatedTarget(routeId: ProductRouteId): DelegatedInteractionTarget {
  const route = getProductNavigationRouteById(routeId);
  return {
    routeId,
    label: route.label,
    targetPath: route.path,
    deliveryPhase: route.deliveryPhase,
    contentState: 'reserved',
  };
}

export function normalizeGlobalInteractionQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ar');
}

export function searchGlobalNavigation(query: string): readonly ProductNavigationRoute[] {
  const normalized = normalizeGlobalInteractionQuery(query);
  if ([...normalized].length < GLOBAL_SEARCH_MIN_QUERY_LENGTH) return [];

  return PRODUCT_NAVIGATION_ROUTES
    .filter((route) => {
      const haystack = `${route.label} ${route.path}`.toLocaleLowerCase('ar');
      return haystack.includes(normalized);
    })
    .slice(0, GLOBAL_SEARCH_RESULT_LIMIT);
}

export function formatInboxBadge(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  const normalized = Math.floor(count);
  if (normalized > GLOBAL_INBOX_BADGE_MAX) return `${GLOBAL_INBOX_BADGE_MAX}+`;
  return String(normalized);
}
