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

export const R2_PRIMARY_NAVIGATION = [
  'home',
  'transactions',
  'create',
  'today',
  'more',
] as const satisfies readonly R2DestinationId[];

export const R2_DESTINATIONS = [
  { id: 'auth.gateway', label: 'الدخول', kind: 'system_boundary', route: '/auth', availability: 'live', maxActionsFromHome: null },
  { id: 'home', label: 'الرئيسية', kind: 'primary', route: '/app', availability: 'live', maxActionsFromHome: 0 },
  { id: 'transactions', label: 'المعاملات', kind: 'primary', route: '/app/transactions', availability: 'live', maxActionsFromHome: 1 },
  { id: 'create', label: 'جديد', kind: 'primary_action', route: '/app/new', availability: 'mixed', maxActionsFromHome: 1 },
  { id: 'today', label: 'اليوم', kind: 'primary', route: '/app/today', availability: 'live', maxActionsFromHome: 1 },
  { id: 'more', label: 'المزيد', kind: 'primary', route: '/app/more', availability: 'live', maxActionsFromHome: 1 },
  { id: 'search', label: 'ابحث عن أي شيء', kind: 'global_utility', route: '/app/search', availability: 'must_rebuild', maxActionsFromHome: 1 },
  { id: 'account', label: 'الحساب ومساحة العمل', kind: 'global_utility', route: '/app/account', availability: 'live_shell', maxActionsFromHome: 1 },
  { id: 'today.notifications', label: 'الإشعارات', kind: 'contextual_view', route: '/app/today?view=notifications', availability: 'presentation_until_phase11', maxActionsFromHome: 2 },
  { id: 'transactions.detail', label: 'تفاصيل المعاملة / 360°', kind: 'entity', route: '/app/transactions/:transactionId', availability: 'live', maxActionsFromHome: 2 },
  {
    id: 'transactions.editor',
    label: 'محرر المعاملة',
    kind: 'entity_action',
    route: '/app/transactions/editor',
    routeVariants: {
      create: '/app/transactions/new',
      edit: '/app/transactions/:transactionId/edit',
    },
    availability: 'live',
    maxActionsFromHome: 2,
  },
  { id: 'transactions.lifecycle', label: 'دورة حياة المعاملة', kind: 'entity_action', route: '/app/transactions/:transactionId/lifecycle', availability: 'live', maxActionsFromHome: 3 },
  { id: 'companies', label: 'الشركات', kind: 'launcher_destination', route: '/app/companies', availability: 'presentation_until_phase6', maxActionsFromHome: 2 },
  { id: 'people', label: 'الأشخاص والمحامون', kind: 'launcher_destination', route: '/app/people', availability: 'presentation_until_phase6', maxActionsFromHome: 2 },
  { id: 'documents', label: 'الوثائق والتقارير', kind: 'launcher_destination', route: '/app/documents', availability: 'presentation_until_phase10', maxActionsFromHome: 2 },
  { id: 'operations', label: 'مركز العمليات', kind: 'launcher_destination', route: '/app/operations', availability: 'presentation_until_phase8', maxActionsFromHome: 2 },
  { id: 'workflow', label: 'سير العمل', kind: 'launcher_destination', route: '/app/workflow', availability: 'presentation_until_phase8', maxActionsFromHome: 2 },
  { id: 'automation', label: 'الأتمتة', kind: 'launcher_destination', route: '/app/automation', availability: 'presentation_until_phase8', maxActionsFromHome: 2 },
  { id: 'followups', label: 'المتابعات والإشعارات', kind: 'launcher_destination', route: '/app/followups', availability: 'presentation_until_phase11', maxActionsFromHome: 2 },
  { id: 'finance', label: 'المالية', kind: 'launcher_destination', route: '/app/finance', availability: 'presentation_until_phase7', maxActionsFromHome: 2 },
  { id: 'command', label: 'مركز القيادة', kind: 'launcher_destination', route: '/app/command', availability: 'presentation_until_phase8', maxActionsFromHome: 2 },
  { id: 'risk', label: 'المخاطر والرؤى', kind: 'launcher_destination', route: '/app/risk', availability: 'presentation_until_phase9', maxActionsFromHome: 2 },
  { id: 'copilot', label: 'مساعد إنجاز', kind: 'launcher_destination', route: '/app/copilot', availability: 'presentation_until_phase12', maxActionsFromHome: 2 },
] as const satisfies readonly R2Destination[];

export type R2LauncherGroupId = 'records' | 'operations_group' | 'management' | 'intelligence';

export interface R2LauncherGroup {
  readonly id: R2LauncherGroupId;
  readonly label: string;
  readonly destinations: readonly R2DestinationId[];
}

export const R2_LAUNCHER_GROUPS = [
  { id: 'records', label: 'السجلات', destinations: ['companies', 'people', 'documents'] },
  { id: 'operations_group', label: 'التشغيل', destinations: ['operations', 'workflow', 'automation', 'followups'] },
  { id: 'management', label: 'الإدارة', destinations: ['finance', 'command', 'risk'] },
  { id: 'intelligence', label: 'الذكاء', destinations: ['copilot'] },
] as const satisfies readonly R2LauncherGroup[];

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

export function getR2Destination(id: R2DestinationId): (typeof R2_DESTINATIONS)[number] {
  const destination = R2_DESTINATIONS.find((item) => item.id === id);
  if (!destination) {
    throw new Error(`Unknown R2 destination: ${id}`);
  }
  return destination;
}
