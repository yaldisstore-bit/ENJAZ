import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const state = json('docs/PHASE11_1_STATE.json');

// Preserve the original implementation-stage audit for historical/in-progress branches.
if (state.status !== 'CLOSED') {
  await import('./phase11-1-notifications-followups-audit.mjs');
  process.exit(0);
}

const closure = read('docs/PHASE11_1_CLOSURE.md');
const runtime = read('src/features/notifications/notificationCommands.ts');
const contract = read('src/features/notifications/notificationFollowupContract.ts');
const dailyWork = read('src/features/daily-work/dailyWorkService.ts');
const ui = read('src/ui-r2/notifications/LiveNotificationExperience.tsx');
const migration = read('database/migrations/phase_11_1_notifications_followups.sql');
const followupAuthority = read('database/migrations/phase_11_1_followup_lifecycle_authority.sql');
const failures = [];
const check = (name, condition) => { if (!condition) failures.push(name); };
const has = (source, marker) => source.includes(marker);
const sha40 = (value) => typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);

check('closed_identity', state.phase === '11.1' && state.name === 'Notifications & Follow-ups' && state.status === 'CLOSED' && state.mode === 'CLOSED_CERTIFIED');
check('closure_evidence', state.closureEvidence === 'docs/PHASE11_1_CLOSURE.md' && fs.existsSync(state.closureEvidence) && has(closure, 'Phase 11.1 is formally closed'));
check('exit_and_successor', state.exitGatePassed === true && state.phase11_2Allowed === true && state.nextPhase === '11.2' && state.successorStatus === 'AUTHORIZED_NEXT');
check('certified_lineage', state.pullRequestNumber === 163 && state.pullRequestMerged === true && sha40(state.certifiedBranchHead) && sha40(state.canonicalMergeCommit));
check('certification_complete', state.realCloudVerification === 'PASS' && state.realCloudZeroResidue === true && state.realBrowserVerification === 'PASS' && state.exactMainVerification === 'PASS' && state.pagesPreviewVerification === 'PASS' && state.liveExternalVerification === 'PASS');
check('run_evidence', Number.isSafeInteger(state.phaseGateRunId) && state.phaseGateRunId > 0 && Number.isSafeInteger(state.phaseBrowserFinalRunId) && state.phaseBrowserFinalRunId > 0 && Number.isSafeInteger(state.exactMainQualityRunId) && state.exactMainQualityRunId > 0 && Number.isSafeInteger(state.pagesPreviewRunId) && state.pagesPreviewRunId > 0 && Number.isSafeInteger(state.liveExternalRunId) && state.liveExternalRunId > 0);
check('zero_blockers', state.knownCriticalBlockers === 0 && state.knownHighBlockers === 0 && state.knownFunctionalBlockers === 0);
check('budgets_frozen', state.javascriptBudgetBytes === 670000 && state.totalJavascriptBudgetBytes === 760000 && state.cssBudgetBytes === 180000 && state.budgetIncreaseAllowed === false);
check('authority_map', state.notificationPreferencesAuthority === 'notification_preferences' && state.notificationDeliveryAuthority === 'notification_deliveries' && state.transactionFollowupAuthority === 'transaction_followups' && state.inAppNotificationStateAuthority === 'in_app_notifications');
check('authority_laws', state.notificationDeliveryHistoryMayBecomeInboxState === false && state.shadowNotificationStoreAllowed === false && state.shadowFollowupStoreAllowed === false && state.browserMayInventDeliverySuccess === false && state.crossWorkspaceNotificationAllowed === false && state.sourceProvenanceRequired === true && state.deterministicDedupeIdentityRequired === true);
check('followup_lifecycle_laws', state.followupDirectLifecycleMutationAllowed === false && state.followupTerminalResurrectionAllowed === false && state.runtimeFollowupLifecycleUsesRpc === true && state.runtimeNotificationSourceUpsertExposedToBrowser === false);

for (const marker of [
  'create table public.in_app_notifications',
  'constraint in_app_notifications_source_identity_unique',
  'public.mutate_in_app_notification_state_v1',
  'public.upsert_in_app_notification_v1',
  'ENJAZ_NOTIFICATION_STALE_SOURCE_VERSION',
]) check(`notification_migration:${marker}`, has(migration, marker));
check('no_browser_notification_dml_grants', !has(migration, 'grant insert on table public.in_app_notifications to authenticated') && !has(migration, 'grant update on table public.in_app_notifications to authenticated') && !has(migration, 'grant delete on table public.in_app_notifications to authenticated'));

for (const marker of [
  'public.mutate_transaction_followup_state_v1',
  'ENJAZ_FOLLOWUP_LIFECYCLE_RPC_REQUIRED',
  'ENJAZ_FOLLOWUP_TERMINAL_FINAL',
]) check(`followup_authority:${marker}`, has(followupAuthority, marker));

for (const marker of ['notificationDedupeIdentity', 'validateNotificationCandidate', 'assertNotificationLifecycleAction', 'validateFollowupLifecycle']) check(`contract:${marker}`, has(contract, marker));
for (const marker of ['createNotificationCommandGateway', 'mutate_in_app_notification_state_v1', 'mutate_transaction_followup_state_v1', "client.from('in_app_notifications')"]) check(`runtime:${marker}`, has(runtime, marker));
check('runtime_source_upsert_not_exposed', !has(runtime, 'upsert_in_app_notification_v1'));
check('daily_work_governed_followup', has(dailyWork, 'notificationCommands.mutateFollowup') && !has(dailyWork, 'layer.followups.update'));
check('live_ui_authority', has(ui, 'data-phase11-1-notifications="live"') && has(ui, 'data-notification-authority="in_app_notifications"') && has(ui, 'gateway.mutateNotification'));

if (failures.length) {
  console.error(`ENJAZ PHASE 11.1 CLOSED REGRESSION AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('ENJAZ PHASE 11.1 CLOSED REGRESSION AUDIT PASS — certified authority, lifecycle, runtime/UI boundaries, frozen budgets and successor authorization remain intact.');
