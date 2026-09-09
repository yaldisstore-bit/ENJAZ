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

type DestinationRow = readonly [
  R2DestinationId,
  string,
  R2DestinationKind,
  string,
  R2Availability,
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

const R2_DESTINATION_ROWS = [
  ['auth.gateway', 'الدخول', 'system_boundary', '/auth', 'live', null],
  ['home', 'الرئيسية', 'primary', '/app', 'live', 0],
  ['transactions', 'المعاملات', 'primary', '/app/transactions', 'live', 1],
  ['create', 'جديد', 'primary_action', '/app/new', 'mixed', 1],
  ['today', 'اليوم', 'primary', '/app/today', 'live', 1],
  ['more', 'المزيد', 'primary', '/app/more', 'live', 1],
  ['search', 'ابحث عن أي شيء', 'global_utility', '/app/search', 'must_rebuild', 1],
  ['account', 'الحساب ومساحة العمل', 'global_utility', '/app/account', 'live_shell', 1],
  ['today.notifications', 'الإشعارات', 'contextual_view', '/app/today?view=notifications', 'presentation_until_phase11', 2],
  ['transactions.detail', 'تفاصيل المعاملة / 360°', 'entity', '/app/transactions/:transactionId', 'live', 2],
  ['transactions.editor', 'محرر المعاملة', 'entity_action', '/app/transactions/editor', 'live', 2, { create: '/app/transactions/new', edit: '/app/transactions/:transactionId/edit' }],
  ['transactions.lifecycle', 'دورة حياة المعاملة', 'entity_action', '/app/transactions/:transactionId/lifecycle', 'live', 3],
  ['companies', 'الشركات', 'launcher_destination', '/app/companies', 'presentation_until_phase6', 2],
  ['people', 'الأشخاص والمحامون', 'launcher_destination', '/app/people', 'presentation_until_phase6', 2],
  ['documents', 'الوثائق والتقارير', 'launcher_destination', '/app/documents', 'presentation_until_phase10', 2],
  ['operations', 'مركز العمليات', 'launcher_destination', '/app/operations', 'presentation_until_phase8', 2],
  ['workflow', 'سير العمل', 'launcher_destination', '/app/workflow', 'presentation_until_phase8', 2],
  ['automation', 'الأتمتة', 'launcher_destination', '/app/automation', 'live', 2],
  ['followups', 'المتابعات والإشعارات', 'launcher_destination', '/app/followups', 'presentation_until_phase11', 2],
  ['finance', 'المالية', 'launcher_destination', '/app/finance', 'presentation_until_phase7', 2],
  ['command', 'مركز القيادة', 'launcher_destination', '/app/command', 'presentation_until_phase8', 2],
  ['risk', 'المخاطر والرؤى', 'launcher_destination', '/app/risk', 'presentation_until_phase9', 2],
  ['copilot', 'مساعد إنجاز', 'launcher_destination', '/app/copilot', 'presentation_until_phase12', 2],
] as const satisfies readonly DestinationRow[];

export const R2_DESTINATIONS: readonly R2Destination[] = R2_DESTINATION_ROWS.map((row) => {
  const [id, label, kind, route, availability, maxActionsFromHome, routeVariants] = row;
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
  ['intelligence', 'الذكاء', ['copilot']],
] as const satisfies readonly LauncherRow[];

export const R2_LAUNCHER_GROUPS: readonly R2LauncherGroup[] = R2_LAUNCHER_ROWS.map(([id, label, destinations]) => ({ id, label, destinations }));

export const R2_SEARCH_ALIASES = {
  خزنة: 'documents',
  دفعة: 'finance',
  أرشفة: 'transactions.lifecycle',
  محامي: 'people',
  قيادة: 'command',
  أتمتة: 'automation',
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
