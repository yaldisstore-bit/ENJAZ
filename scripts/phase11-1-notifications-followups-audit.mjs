import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const json = path => JSON.parse(read(path));

const state = json('docs/PHASE11_1_STATE.json');
const predecessor = json('docs/PHASE10_6_STATE.json');
const kickoff = read('docs/PHASE11_1_KICKOFF.md');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const baseline = read('database/baseline/phase1_2_schema.sql');
const contract = read('src/features/notifications/notificationFollowupContract.ts');
const tests = read('tests/notificationFollowupContract.test.ts');

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
check('authority_gap_recorded', state.databaseAuthorityExtensionRequired === true && state.inAppNotificationStateAuthority === 'PHASE11_1_REQUIRED_EXTENSION');
check('foundation_tracking', state.authorityDiscoveryCompleted === true && state.lifecycleContractAdded === true && state.destructionTestsAdded === true);

for (const marker of [
  'create table public.notification_preferences',
  'reminders_enabled boolean not null default false',
  "daily_brief_time time not null default '08:00'",
  "timezone text not null default 'Asia/Baghdad'",
  'create table public.notification_deliveries',
  'dedupe_key text',
  "channel text not null check (channel in ('in_app','push','email'))",
  "status text not null default 'scheduled' check (status in ('scheduled','sent','failed','cancelled'))",
  'constraint notification_deliveries_sent_check',
  'create table public.transaction_followups',
  "status text not null default 'open' check (status in ('open','completed','cancelled'))",
  'completed_at timestamptz',
  'completed_by uuid references auth.users(id) on delete set null',
  'snoozed_until timestamptz',
  'constraint transaction_followups_completion_check',
]) check(`baseline:${marker}`, has(baseline, marker));

for (const marker of [
  'PHASE11_1_AUTHORITY',
  "inAppNotificationAuthority: 'PHASE11_1_REQUIRED_EXTENSION'",
  'notificationDedupeIdentity',
  'validateNotificationCandidate',
  'assertNotificationLifecycleAction',
  'validateFollowupLifecycle',
  'isActionableFollowup',
  'assertSameNotificationIdentity',
  'PHASE11_1_CROSS_WORKSPACE_SOURCE',
  'PHASE11_1_STALE_SOURCE_VERSION',
  'PHASE11_1_EXTERNAL_DELIVERY_PROVIDER_NOT_INTEGRATED',
  'PHASE11_1_NOTIFICATION_CANCELLED_FINAL',
]) check(`contract:${marker}`, has(contract, marker));

for (const marker of [
  'reuses existing notification/follow-up authorities',
  'stable across source revisions',
  'stale source revision cannot replace',
  'cross-workspace source notification fails closed',
  'cannot be scheduled before its authoritative source event',
  'cannot pretend to be integrated before an external provider exists',
  'cancelled state is final',
  'snooze must be future-facing',
  'contradictory lifecycle evidence',
  'only open and awake follow-ups are actionable',
]) check(`tests:${marker}`, has(tests, marker));

check('kickoff_authority_scope', has(kickoff, '`transaction_followups`') && has(kickoff, '`notification_preferences`') && has(kickoff, '`notification_deliveries`') && has(kickoff, 'No shadow notification/follow-up fact store'));
check('roadmap_scope', has(roadmap, '## 11.1 — Notifications & Follow-ups') && has(roadmap, 'Authoritative event-driven notifications') && has(roadmap, 'read/unread') && has(roadmap, 'snooze/cancel'));

if (state.databaseAuthorityExtensionApplied === false) {
  check('pre_migration_mode', state.mode === 'AUTHORITY_DISCOVERY_AND_LIFECYCLE_CONTRACT' && state.realCloudVerification === 'PENDING');
}

if (failures.length) {
  console.error(`ENJAZ PHASE 11.1 NOTIFICATIONS/FOLLOW-UPS AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('ENJAZ PHASE 11.1 NOTIFICATIONS/FOLLOW-UPS AUDIT PASS — existing authority is preserved, the in-app state gap is explicit, lifecycle/dedupe/provenance laws are fail-closed, and Phase 11.2 remains locked.');
