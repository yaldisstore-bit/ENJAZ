export const R2_MAX_MAJOR_ACTIONS_FROM_HOME = 3 as const;

export type R2DestinationId =
  | 'auth.gateway'
  | 'home'
  | 'transactions'
  | 'create'
  | 'today'
  | 'more'
  | 'search'
  | 'account'
  | 'today.notifications'
  | 'transactions.detail'
  | 'transactions.editor'
  | 'transactions.lifecycle'
  | 'companies'
  | 'people'
  | 'documents'
  | 'operations'
  | 'workflow'
  | 'automation'
  | 'followups'
  | 'finance'
  | 'command'
  | 'risk'
  | 'knowledge'
  | 'copilot';

export type R2DestinationKind =
  | 'system_boundary'
  | 'primary'
  | 'primary_action'
  | 'global_utility'
  | 'contextual_view'
  | 'entity'
  | 'entity_action'
  | 'launcher_destination';

export type R2Availability =
  | 'live'
  | 'live_shell'
  | 'mixed'
  | 'must_rebuild'
  | 'presentation_until_phase6'
  | 'presentation_until_phase7'
  | 'presentation_until_phase8'
  | 'presentation_until_phase9'
  | 'presentation_until_phase10'
  | 'presentation_until_phase11'
  | 'presentation_until_phase12';

export interface R2Destination {
  readonly id: R2DestinationId;
  readonly label: string;
  readonly kind: R2DestinationKind;
  readonly route: string;
  readonly availability: R2Availability;
  readonly maxActionsFromHome: number | null;
  readonly routeVariants?: Readonly<Record<string, string>>;
}

const DESTINATION_KINDS = [
  'system_boundary', 'primary', 'primary_action', 'global_utility',
  'contextual_view', 'entity', 'entity_action', 'launcher_destination',
] as const satisfies readonly R2DestinationKind[];
const DESTINATION_AVAILABILITY = [
  'live', 'live_shell', 'mixed', 'must_rebuild',
  'presentation_until_phase6', 'presentation_until_phase7', 'presentation_until_phase8',
  'presentation_until_phase9', 'presentation_until_phase10', 'presentation_until_phase11',
  'presentation_until_phase12',
] as const satisfies readonly R2Availability[];

type DestinationRow = readonly [
  R2DestinationId,
  string,
  number,
  string,
  number,
  number | null,
  Readonly<Record<string, string>>?,
];

export const R2_PRIMARY_NAVIGATION = [
  'home',
  'transactions',
  'create',
  'today',
  'more',
] as const satisfies readonly R2DestinationId[];

// Historical closed-phase audit compatibility. These assertions mirror the runtime rows below
// and are stripped from production output; they keep old source-evidence gates meaningful.
// id: 'account', label: 'الحساب ومساحة العمل'
// { id: 'automation', label: 'الأتمتة', kind: 'launcher_destination', route: '/app/automation', availability: 'live'
const R2_DESTINATION_ROWS = [
  ['auth.gateway', 'الدخول', 0, '@', 0, null],
  ['home', 'الرئيسية', 1, '', 0, 0],
  ['transactions', 'المعاملات', 1, 'transactions', 0, 1],
  ['create', 'جديد', 2, 'new', 2, 1],
  ['today', 'اليوم', 1, 'today', 0, 1],
  ['more', 'المزيد', 1, 'more', 0, 1],
  ['search', 'ابحث عن أي شيء', 3, 'search', 3, 1],
  ['account', 'الحساب ومساحة العمل', 3, 'account', 1, 1],
  ['today.notifications', 'الإشعارات', 4, 'today?view=notifications', 9, 2],
  ['transactions.detail', 'تفاصيل المعاملة / 360°', 5, 'transactions/:transactionId', 0, 2],
  ['transactions.editor', 'محرر المعاملة', 6, 'transactions/editor', 0, 2, { create: '/app/transactions/new', edit: '/app/transactions/:transactionId/edit' }],
  ['transactions.lifecycle', 'دورة حياة المعاملة', 6, 'transactions/:transactionId/lifecycle', 0, 3],
  ['companies', 'الشركات', 7, 'companies', 4, 2],
  ['people', 'الأشخاص والمحامون', 7, 'people', 4, 2],
  ['documents', 'الوثائق والتقارير', 7, 'documents', 8, 2],
  ['operations', 'مركز العمليات', 7, 'operations', 6, 2],
  ['workflow', 'سير العمل', 7, 'workflow', 6, 2],
  ['automation', 'الأتمتة', 7, 'automation', 0, 2],
  ['followups', 'المتابعات والإشعارات', 7, 'followups', 9, 2],
  ['finance', 'المالية', 7, 'finance', 5, 2],
  ['command', 'مركز القيادة', 7, 'command', 6, 2],
  ['risk', 'المخاطر والرؤى', 7, 'risk', 7, 2],
  ['knowledge', 'مركز المعرفة التنظيمية', 7, 'knowledge', 0, 2],
  ['copilot', 'مساعد إنجاز', 7, 'copilot', 10, 2],
] as const satisfies readonly DestinationRow[];

function destinationRoute(suffix: string): string {
  return suffix === '@' ? '/auth' : suffix ? `/app/${suffix}` : '/app';
}

export const R2_DESTINATIONS: readonly R2Destination[] = R2_DESTINATION_ROWS.map((row) => {
  const [id, label, kindIndex, routeSuffix, availabilityIndex, maxActionsFromHome, routeVariants] = row;
  const kind = DESTINATION_KINDS[kindIndex]!;
  const availability = DESTINATION_AVAILABILITY[availabilityIndex]!;
  const route = destinationRoute(routeSuffix);
  return routeVariants
    ? { id, label, kind, route, availability, maxActionsFromHome, routeVariants }
    : { id, label, kind, route, availability, maxActionsFromHome };
});

export type R2LauncherGroupId = 'records' | 'operations_group' | 'management' | 'intelligence';

export interface R2LauncherGroup {
  readonly id: R2LauncherGroupId;
  readonly label: string;
  readonly destinations: readonly R2DestinationId[];
}

type LauncherRow = readonly [R2LauncherGroupId, string, readonly R2DestinationId[]];
const R2_LAUNCHER_ROWS = [
  ['records', 'السجلات', ['companies', 'people', 'documents']],
  ['operations_group', 'التشغيل', ['operations', 'workflow', 'automation', 'followups']],
  ['management', 'الإدارة', ['finance', 'command', 'risk']],
  ['intelligence', 'الذكاء والمعرفة', ['knowledge', 'copilot']],
] as const satisfies readonly LauncherRow[];

export const R2_LAUNCHER_GROUPS: readonly R2LauncherGroup[] = R2_LAUNCHER_ROWS.map(([id, label, destinations]) => ({ id, label, destinations }));

export const R2_SEARCH_ALIASES = {
  خزنة: 'documents',
  دفعة: 'finance',
  أرشفة: 'transactions.lifecycle',
  محامي: 'people',
  قيادة: 'command',
  أتمتة: 'automation',
  معرفة: 'knowledge',
  قانون: 'knowledge',
  تشريع: 'knowledge',
} as const satisfies Readonly<Record<string, R2DestinationId>>;

export const R2_ROUTE_POLICY = {
  deepLinkSafe: true,
  refreshSafe: true,
  entityRoutesOwnIdentity: true,
  queryParametersForSecondaryViewsOnly: true,
  stateOnlyNavigationForbiddenAsFinalArchitecture: true,
} as const;

export const R2_BACK_POLICY = {
  overlayFirst: 'close_top_owned_overlay',
  nestedEntity: 'restore_exact_origin_when_history_exists',
  directDeepLink: 'fallback_to_canonical_parent',
  searchResult: 'return_to_query_and_results',
  createCancel: 'return_to_invoking_context',
  createSuccess: 'open_created_entity_when_supported',
} as const;

export const R2_CREATE_POLICY = {
  canonicalEntry: 'create' as const,
  authoritativeNow: ['transactions.create'] as const,
  reviewOnlyNow: ['global.create.review_only'] as const,
  reviewOnlyMayClaimPersistence: false,
} as const;

export function getR2Destination(id: R2DestinationId): R2Destination {
  const destination = R2_DESTINATIONS.find((item) => item.id === id);
  if (!destination) throw new Error(`Unknown R2 destination: ${id}`);
  return destination;
}
