import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const json = path => JSON.parse(read(path));

const state = json('docs/PHASE11_1_STATE.json');
const predecessor = json('docs/PHASE10_6_STATE.json');
const kickoff = read('docs/PHASE11_1_KICKOFF.md');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const baseline = read('database/baseline/phase1_2_schema.sql');
const migration = read('database/migrations/phase_11_1_notifications_followups.sql');
const performanceHardening = read('database/migrations/phase_11_1_notification_performance_hardening.sql');
const followupAuthority = read('database/migrations/phase_11_1_followup_lifecycle_authority.sql');
const followupProbe = read('database/migrations/phase_11_1_live_authenticated_followup_probe.sql');
const contract = read('src/features/notifications/notificationFollowupContract.ts');
const runtime = read('src/features/notifications/notificationCommands.ts');
const dailyWork = read('src/features/daily-work/dailyWorkService.ts');
const ui = read('src/ui-r2/notifications/LiveNotificationExperience.tsx');
const portal = read('src/ui-r2/notifications/LiveNotificationsProductionPortal.tsx');
const browserHarness = read('src/ui-r2/phase11-1-notifications-browser-main.tsx');
const browserSpec = read('tests-external/phase11-1-notifications-live.spec.cjs');
const browserWorkflow = read('.github/workflows/phase11-1-notifications-browser.yml');
const cumulativeBrowser = read('tests-external/r2-production-bridge.spec.cjs');
const tests = read('tests/notificationFollowupContract.test.ts');
const runtimeTests = read('tests/notificationCommands.test.ts');
const dailyWorkTests = read('tests/dailyWorkService.test.ts');

const failures = [];
const check = (name, condition) => { if (!condition) failures.push(name); };
const has = (source, needle) => source.includes(needle);

check('phase_identity', state.phase === '11.1' && state.name === 'Notifications & Follow-ups' && state.status === 'IN_PROGRESS');
check('exact_base', state.baseCommit === '9c3fc01c40d6ddfccd2a423720c5a19fa19efa49');
check('predecessor_closed', state.predecessorPhase === '10.6' && state.predecessorStatus === 'CLOSED' && predecessor.status === 'CLOSED' && predecessor.exitGatePassed === true && predecessor.phase11_1Allowed === true);
check('predecessor_evidence', state.predecessorClosureEvidence === 'docs/PHASE10_6_CLOSURE.md' && fs.existsSync(state.predecessorClosureEvidence));
check('successor_locked', state.phase11_2Allowed === false && state.nextPhase === '11.2' && state.successorStatus === 'LOCKED');
check('budgets_frozen', state.javascriptBudgetBytes === 670000 && state.totalJavascriptBudgetBytes === 760000 && state.cssBudgetBytes === 180000 && state.budgetIncreaseAllowed === false);

check('existing_authority_map',
  state.notificationPreferencesAuthority === 'notification_preferences' &&
  state.notificationDeliveryAuthority === 'notification_deliveries' &&
  state.transactionFollowupAuthority === 'transaction_followups' &&
  state.calendarSourceAuthority === 'calendar_events' &&
  state.renewalSourceAuthority === 'renewals');
check('no_shadow_authority', state.shadowNotificationStoreAllowed === false && state.shadowFollowupStoreAllowed === false);
check('provenance_and_dedupe_law', state.sourceProvenanceRequired === true && state.deterministicDedupeIdentityRequired === true && state.crossWorkspaceNotificationAllowed === false);
check('delivery_truth_law', state.browserMayInventDeliverySuccess === false && state.notificationDeliveryHistoryMayBecomeInboxState === false && state.externalDeliveryProviderIntegrated === false);
check('quiet_snooze_law', state.quietHoursMayEraseSourceFact === false && state.snoozeMayCompleteFollowup === false);
check('authority_gap_recorded', state.databaseAuthorityExtensionRequired === true && state.inAppNotificationStateAuthority === 'in_app_notifications');
check('foundation_tracking', state.authorityDiscoveryCompleted === true && state.lifecycleContractAdded === true && state.destructionTestsAdded === true && state.phaseGateAdded === true);
check('runtime_tracking', state.runtimeGatewayAdded === true && state.runtimeTestsAdded === true && state.runtimeFollowupLifecycleUsesRpc === true && state.runtimeNotificationSourceUpsertExposedToBrowser === false);
check('followup_tracking', state.followupLifecycleAuthorityMigration === 'phase_11_1_followup_lifecycle_authority' && state.followupLifecycleProbeMigration === 'phase_11_1_live_authenticated_followup_probe' && state.followupDirectLifecycleMutationAllowed === false && state.followupTerminalResurrectionAllowed === false);
check('ui_tracking', state.uiIntegrationAdded === true && state.realBrowserVerification === 'PENDING');

for (const marker of [
  'create table public.notification_preferences',
  'create table public.notification_deliveries',
  'create table public.transaction_followups',
  'constraint transaction_followups_completion_check',
]) check(`baseline:${marker}`, has(baseline, marker));

for (const marker of [
  'create table public.in_app_notifications',
  'constraint in_app_notifications_source_identity_unique',
  'transaction_followups_completion_actor_check',
  'transaction_followups_terminal_snooze_check',
  'alter table public.in_app_notifications enable row level security',
  'grant select on table public.in_app_notifications to authenticated',
  'create policy in_app_notifications_select_self',
  'private.enforce_in_app_notification_lifecycle_v1',
  'ENJAZ_NOTIFICATION_STALE_SOURCE_VERSION',
  'public.mutate_in_app_notification_state_v1',
  'public.upsert_in_app_notification_v1',
]) check(`migration:${marker}`, has(migration, marker));

check('notification_user_fk_index', has(performanceHardening, 'create index in_app_notifications_user_fk_idx') && has(performanceHardening, 'on public.in_app_notifications(user_id)'));
check('browser_has_no_notification_source_write',
  !has(migration, 'grant insert on table public.in_app_notifications to authenticated') &&
  !has(migration, 'grant update on table public.in_app_notifications to authenticated') &&
  !has(migration, 'grant delete on table public.in_app_notifications to authenticated'));
check('delivery_history_not_repurposed', !has(migration, 'alter table public.notification_deliveries add column read_at') && !has(migration, 'alter table public.notification_deliveries add column snoozed_until'));

for (const marker of [
  'private.enforce_transaction_followup_lifecycle_v1',
  'ENJAZ_FOLLOWUP_LIFECYCLE_RPC_REQUIRED',
  'ENJAZ_FOLLOWUP_TERMINAL_FINAL',
  'public.mutate_transaction_followup_state_v1',
  'ENJAZ_FOLLOWUP_WORKSPACE_FORBIDDEN',
  "set_config('enjaz.followup_lifecycle_rpc', '1', true)",
  "grant execute on function public.mutate_transaction_followup_state_v1",
]) check(`followupAuthority:${marker}`, has(followupAuthority, marker));

for (const marker of [
  'enjaz_phase111f_expect_direct_lifecycle_block',
  'enjaz_phase111f_expect_cross_workspace_denied',
  'ordinary follow-up edit was incorrectly blocked',
  'direct lifecycle update leaked through guard',
  'governed snooze failed',
  'governed wake failed',
  'governed completion evidence failed',
  'follow-up probe residue',
]) check(`followupProbe:${marker}`, has(followupProbe, marker));

for (const marker of [
  'PHASE11_1_AUTHORITY',
  "inAppNotificationAuthority: 'in_app_notifications'",
  'notificationDedupeIdentity',
  'validateNotificationCandidate',
  'assertNotificationLifecycleAction',
  'validateFollowupLifecycle',
  'isActionableFollowup',
  'assertSameNotificationIdentity',
]) check(`contract:${marker}`, has(contract, marker));

for (const marker of [
  'createNotificationCommandGateway',
  'mutate_in_app_notification_state_v1',
  'mutate_transaction_followup_state_v1',
  "client.from('in_app_notifications')",
  'mutateNotification',
  'mutateFollowup',
]) check(`runtime:${marker}`, has(runtime, marker));
check('runtime_never_exposes_source_upsert', !has(runtime, 'upsert_in_app_notification_v1'));
check('daily_work_uses_governed_followup_rpc', has(dailyWork, 'notificationCommands.mutateFollowup') && !has(dailyWork, 'layer.followups.update'));
check('runtime_tests_present', has(runtimeTests, 'follow-up lifecycle mutation is routed only through governed RPC') && has(runtimeTests, 'invalid or stale snooze is rejected before any RPC write'));
check('daily_work_tests_present', has(dailyWorkTests, 'governed RPC gateway') && has(dailyWorkTests, 'governed follow-up RPC'));

for (const marker of [
  'data-phase11-1-notifications="live"',
  'data-notification-authority="in_app_notifications"',
  'gateway.mutateNotification',
  "'mark_read'",
  "'mark_unread'",
  "'snooze'",
  "'cancel'",
  'NOTIFICATION_STYLES',
]) check(`ui:${marker}`, has(ui, marker));
check('notification_css_budget_preserved', !has(ui, "import './notifications.css'") && !fs.existsSync('src/ui-r2/notifications/notifications.css'));
check('portal_destination', has(portal, "useLiveRecordsPortal('today.notifications'") && has(portal, '<LiveNotificationExperience />'));
check('browser_harness_governed_mutations', has(browserHarness, '__ENJAZ_PHASE111_BROWSER__') && has(browserHarness, 'NotificationCommandProvider') && has(browserHarness, 'applyMutation'));
for (const marker of [
  'notification center renders authoritative state and governed actions',
  "55555555-5555-4555-8555-555555555555:mark_read",
  "66666666-6666-4666-8666-666666666666:snooze",
  "55555555-5555-4555-8555-555555555555:cancel",
  'notification center is RTL and overflow-safe',
  'for (const width of [390, 360, 320])',
]) check(`browserSpec:${marker}`, has(browserSpec, marker));
check('browser_workflow_wired', has(browserWorkflow, 'phase11-1-notifications-live.spec.cjs') && has(browserWorkflow, 'audit:dist:budget') && has(browserWorkflow, 'playwright install --with-deps chromium'));
check('cumulative_browser_promoted', has(cumulativeBrowser, 'data-phase11-1-notifications="live"') && has(cumulativeBrowser, 'لا توجد إشعارات مستحقة الآن') && !has(cumulativeBrowser, "not.toContainText(/غير مقروء|unread|تم إرسال الإشعار/)"));

for (const marker of [
  'reuses existing notification/follow-up authorities',
  'stable across source revisions',
  'stale source revision cannot replace',
  'cross-workspace source notification fails closed',
  'cancelled state is final',
  'only open and awake follow-ups are actionable',
]) check(`tests:${marker}`, has(tests, marker));

check('kickoff_authority_scope', has(kickoff, '`transaction_followups`') && has(kickoff, '`notification_preferences`') && has(kickoff, '`notification_deliveries`') && has(kickoff, 'No shadow notification/follow-up fact store'));
check('roadmap_scope', has(roadmap, '## 11.1 — Notifications & Follow-ups') && has(roadmap, 'Authoritative event-driven notifications') && has(roadmap, 'read/unread') && has(roadmap, 'snooze/cancel'));

check('notification_real_cloud_recorded', state.databaseAuthorityExtensionApplied === true && state.realCloudVerification === 'PASS' && state.realCloudProbePassed === true && state.realCloudZeroResidue === true);
check('notification_migration_evidence_recorded', state.databaseAuthorityMigration === 'phase_11_1_notifications_followups' && state.realCloudProbeMigration === 'phase_11_1_live_authenticated_notification_probe' && state.databasePerformanceHardeningMigration === 'phase_11_1_notification_performance_hardening');
check('advisor_review_recorded', state.authenticatedSecurityDefinerAdvisorReviewed === true && state.mutateRpcAdvisorDisposition === 'INTENTIONAL_PER_USER_GOVERNED_API');
check('performance_hardening_recorded', state.performanceAdvisorNotificationFkResolved === true);

if (state.followupLifecycleAuthorityApplied === true) {
  check('followup_real_cloud_recorded', state.followupLifecycleRealCloudVerification === 'PASS');
}

if (failures.length) {
  console.error(`ENJAZ PHASE 11.1 NOTIFICATIONS/FOLLOW-UPS AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('ENJAZ PHASE 11.1 NOTIFICATIONS/FOLLOW-UPS AUDIT PASS — DB/RLS/RPC authority, runtime command boundaries, live notification UI, frozen-budget integration, cumulative production routing and real-browser certification harness are all guarded while Phase 11.2 remains locked.');
