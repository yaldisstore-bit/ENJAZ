export type EnjazInformationKind =
  | 'decision'
  | 'metric'
  | 'money'
  | 'work-item'
  | 'timeline-event'
  | 'relationship'
  | 'workflow-step'
  | 'document'
  | 'trend'
  | 'activity'
  | 'form'
  | 'state';

export type EnjazPresentationPattern =
  | 'focal-zone'
  | 'metric-cluster'
  | 'ledger'
  | 'dense-row'
  | 'timeline'
  | 'relationship-cluster'
  | 'step-progression'
  | 'document-browser'
  | 'trend-panel'
  | 'activity-stream'
  | 'focused-form'
  | 'editorial-state';

export type EnjazDensity = 'focal' | 'balanced' | 'dense';
export type EnjazSurfaceRole = 'gold' | 'charcoal' | 'paper' | 'warm' | 'domain';

export type InformationCompositionRule = Readonly<{
  kind: EnjazInformationKind;
  pattern: EnjazPresentationPattern;
  density: EnjazDensity;
  surface: EnjazSurfaceRole;
  purpose: string;
  must: readonly string[];
  never: readonly string[];
}>;

export const informationCompositionRules: readonly InformationCompositionRule[] = [
  {
    kind: 'decision', pattern: 'focal-zone', density: 'focal', surface: 'gold',
    purpose: 'Make the single highest-value decision or action unmistakable.',
    must: ['one dominant headline', 'one clear primary action', 'supporting context remains subordinate'],
    never: ['three equal hero cards', 'decorative metric wall', 'multiple competing primary actions'],
  },
  {
    kind: 'metric', pattern: 'metric-cluster', density: 'balanced', surface: 'warm',
    purpose: 'Show comparative values without turning every number into a large card.',
    must: ['unequal emphasis', 'labels stay readable', 'trend/context accompanies important values'],
    never: ['identical KPI tiles across the full screen', 'tiny labels for artificial elegance'],
  },
  {
    kind: 'money', pattern: 'ledger', density: 'dense', surface: 'domain',
    purpose: 'Treat money as a sequence of traceable movements, not isolated decorative totals.',
    must: ['amount hierarchy', 'counterparty/context', 'date/state', 'summary and movements are visually distinct'],
    never: ['one card per payment', 'ambiguous positive/negative movement', 'unscoped totals'],
  },
  {
    kind: 'work-item', pattern: 'dense-row', density: 'dense', surface: 'paper',
    purpose: 'Let users scan many actionable records quickly.',
    must: ['title', 'context', 'owner or next action when relevant', 'state chip'],
    never: ['oversized card per row', 'hidden status', 'more decoration than information'],
  },
  {
    kind: 'timeline-event', pattern: 'timeline', density: 'dense', surface: 'warm',
    purpose: 'Express ordered work and time relationships spatially.',
    must: ['clear time/order axis', 'current/next emphasis', 'state visible without opening detail'],
    never: ['unordered stack pretending to be a timeline', 'equal emphasis for past and next action'],
  },
  {
    kind: 'relationship', pattern: 'relationship-cluster', density: 'balanced', surface: 'paper',
    purpose: 'Show entity context and relationship strength without duplicating profile cards.',
    must: ['primary entity anchor', 'relationship labels', 'recent activity/context'],
    never: ['flat contact list when relationship matters', 'avatar gallery without meaning'],
  },
  {
    kind: 'workflow-step', pattern: 'step-progression', density: 'balanced', surface: 'paper',
    purpose: 'Show what is completed, current and next in one glance.',
    must: ['ordered steps', 'current step dominance', 'completion signal'],
    never: ['generic checklist with no progression', 'same styling for done/current/next'],
  },
  {
    kind: 'document', pattern: 'document-browser', density: 'dense', surface: 'paper',
    purpose: 'Combine category discovery, document scan and metadata without a file-card wall.',
    must: ['category context', 'document identity', 'metadata', 'dominant document action'],
    never: ['large equal cards for every document', 'metadata hidden behind unnecessary taps'],
  },
  {
    kind: 'trend', pattern: 'trend-panel', density: 'balanced', surface: 'domain',
    purpose: 'Explain change over time and its operational meaning.',
    must: ['time range', 'visual trend', 'interpretable headline', 'supporting comparison'],
    never: ['chart with no conclusion', 'sparkline as decoration only'],
  },
  {
    kind: 'activity', pattern: 'activity-stream', density: 'dense', surface: 'warm',
    purpose: 'Expose recent changes as a readable operational narrative.',
    must: ['actor/source', 'action', 'time', 'related entity'],
    never: ['notification-card wall', 'timestamp detached from action'],
  },
  {
    kind: 'form', pattern: 'focused-form', density: 'balanced', surface: 'paper',
    purpose: 'Keep data entry calm, sequential and action-oriented.',
    must: ['logical grouping', 'one primary CTA', 'inline validation near the field'],
    never: ['multiple primary buttons', 'visual decoration competing with fields', 'all fields boxed as standalone cards'],
  },
  {
    kind: 'state', pattern: 'editorial-state', density: 'focal', surface: 'warm',
    purpose: 'Explain empty, success, error or permission states without looking unfinished.',
    must: ['human-readable reason', 'clear next action when available', 'state tone'],
    never: ['blank whitespace', 'generic error code as primary copy', 'decorative illustration without guidance'],
  },
] as const;

export type EnjazScreenFamily =
  | 'home'
  | 'daily-work'
  | 'transaction-list'
  | 'transaction-360'
  | 'companies-people'
  | 'finance'
  | 'analytics'
  | 'workflow'
  | 'operations'
  | 'command'
  | 'documents'
  | 'notifications';

export type ScreenCompositionRule = Readonly<{
  id: EnjazScreenFamily;
  label: string;
  referenceFamily: string;
  accent: 'global' | 'finance' | 'analytics' | 'operations' | 'documents';
  focalPattern: EnjazPresentationPattern;
  supportingPatterns: readonly EnjazPresentationPattern[];
  hierarchy: readonly string[];
  forbidden: readonly string[];
}>;

export const screenCompositionMap: readonly ScreenCompositionRule[] = [
  {
    id: 'home', label: 'الرئيسية', referenceFamily: 'warm yellow + charcoal premium dashboard', accent: 'global',
    focalPattern: 'focal-zone', supportingPatterns: ['metric-cluster', 'dense-row', 'trend-panel'],
    hierarchy: ['decision / priority now', 'signals and asymmetric metrics', 'compact active work'],
    forbidden: ['equal KPI grid', 'stacked generic white cards'],
  },
  {
    id: 'daily-work', label: 'اليوم', referenceFamily: 'timeline/date-strip/task planning', accent: 'global',
    focalPattern: 'timeline', supportingPatterns: ['dense-row', 'focused-form'],
    hierarchy: ['next task', 'time/order', 'remaining work and quick follow-up'],
    forbidden: ['ordinary task-card stack', 'same emphasis for past and next'],
  },
  {
    id: 'transaction-list', label: 'المعاملات', referenceFamily: 'task/project list + create form', accent: 'global',
    focalPattern: 'dense-row', supportingPatterns: ['metric-cluster', 'focused-form'],
    hierarchy: ['search/filter context', 'scan-friendly records', 'single create/edit action'],
    forbidden: ['one oversized card per transaction', 'filters scattered across unrelated boxes'],
  },
  {
    id: 'transaction-360', label: 'تفاصيل المعاملة', referenceFamily: 'progression/detail composition', accent: 'global',
    focalPattern: 'step-progression', supportingPatterns: ['activity-stream', 'relationship-cluster', 'metric-cluster'],
    hierarchy: ['summary/status', 'progress and next action', 'people/activity/related facts'],
    forbidden: ['modal full of unrelated fields', 'flat key/value card wall'],
  },
  {
    id: 'companies-people', label: 'الشركات والأشخاص', referenceFamily: 'profile/progress + search composition', accent: 'global',
    focalPattern: 'relationship-cluster', supportingPatterns: ['activity-stream', 'dense-row'],
    hierarchy: ['search/discovery', 'profile anchor', 'relationships and recent activity'],
    forbidden: ['avatar grid', 'duplicate profile cards'],
  },
  {
    id: 'finance', label: 'المالية', referenceFamily: 'blue/cobalt finance dashboard', accent: 'finance',
    focalPattern: 'ledger', supportingPatterns: ['trend-panel', 'metric-cluster', 'dense-row'],
    hierarchy: ['balance/collection headline', 'trend', 'recent movements and receivables'],
    forbidden: ['gold-only finance screen', 'one large card per movement'],
  },
  {
    id: 'analytics', label: 'التحليلات', referenceFamily: 'gold + violet + deep navy analytics', accent: 'analytics',
    focalPattern: 'trend-panel', supportingPatterns: ['metric-cluster', 'dense-row'],
    hierarchy: ['interpretive headline', 'trend/comparison', 'supporting KPI and blockers'],
    forbidden: ['dashboard of equal counters', 'charts with no operational conclusion'],
  },
  {
    id: 'workflow', label: 'سير العمل', referenceFamily: 'staged verification / appointment', accent: 'global',
    focalPattern: 'step-progression', supportingPatterns: ['dense-row', 'focused-form'],
    hierarchy: ['completion/current stage', 'ordered steps', 'contextual action/help'],
    forbidden: ['generic checkbox list', 'hidden current stage'],
  },
  {
    id: 'operations', label: 'العمليات', referenceFamily: 'project/schedule/control', accent: 'operations',
    focalPattern: 'dense-row', supportingPatterns: ['timeline', 'metric-cluster'],
    hierarchy: ['current workload', 'schedule and ownership', 'blockers/progress'],
    forbidden: ['ordinary stacked dashboard cards', 'huge decorative metrics'],
  },
  {
    id: 'command', label: 'القيادة', referenceFamily: 'dark high-contrast control composition', accent: 'global',
    focalPattern: 'focal-zone', supportingPatterns: ['metric-cluster', 'trend-panel', 'dense-row'],
    hierarchy: ['executive decision zone', 'cross-domain status', 'exceptions needing intervention'],
    forbidden: ['ordinary light list', 'same composition as Home'],
  },
  {
    id: 'documents', label: 'الوثائق', referenceFamily: 'category/detail/content composition', accent: 'documents',
    focalPattern: 'document-browser', supportingPatterns: ['dense-row', 'editorial-state'],
    hierarchy: ['category/search', 'document scan', 'metadata and dominant action'],
    forbidden: ['file-card wall', 'categoryless long list'],
  },
  {
    id: 'notifications', label: 'الإشعارات والمتابعات', referenceFamily: 'timeline + compact task list', accent: 'global',
    focalPattern: 'timeline', supportingPatterns: ['dense-row', 'activity-stream'],
    hierarchy: ['unread/action-needed', 'date/time groups', 'low-priority history'],
    forbidden: ['oversized notification cards', 'unread state hidden in text only'],
  },
] as const;

export function compositionFor(kind: EnjazInformationKind) {
  return informationCompositionRules.find((rule) => rule.kind === kind);
}

export function screenCompositionFor(id: EnjazScreenFamily) {
  return screenCompositionMap.find((rule) => rule.id === id);
}
