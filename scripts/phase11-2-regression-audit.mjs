import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const state = json('docs/PHASE11_2_STATE.json');

// Preserve the implementation-stage audit until formal closure lands.
if (state.status !== 'CLOSED') {
  await import('./phase11-2-universal-inbox-audit.mjs');
  process.exit(0);
}

const closure = read('docs/PHASE11_2_CLOSURE.md');
const registry = json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const contract = read('src/features/daily-work/universalInboxContract.ts');
const service = read('src/features/daily-work/universalInboxService.ts');
const hook = read('src/features/daily-work/useDailyWork.ts');
const ui = read('src/ui-r2/core-work/CoreWorkConnected.tsx');
const contractTests = read('tests/universalInboxContract.test.ts');
const serviceTests = read('tests/universalInboxService.test.ts');
const browserSpec = read('tests-external/phase11-2-universal-inbox-live.spec.cjs');
const failures = [];
const check = (name, condition) => { if (!condition) failures.push(name); };
const has = (source, marker) => source.includes(marker);
const sha40 = (value) => typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
const positiveRun = (value) => Number.isSafeInteger(value) && value > 0;

check('closed_identity', state.phase === '11.2' && state.name === 'Universal Inbox Integration' && state.status === 'CLOSED' && state.mode === 'CLOSED_CERTIFIED');
check('closure_evidence', state.closureEvidence === 'docs/PHASE11_2_CLOSURE.md' && fs.existsSync(state.closureEvidence) && has(closure, 'Phase 11.2 is formally closed'));
check('exit_and_successor', state.exitGatePassed === true && state.phase11_3Allowed === true && state.nextPhase === '11.3' && state.successorStatus === 'AUTHORIZED_NEXT');
check('certified_lineage', state.pullRequestNumber === 164 && state.pullRequestMerged === true && sha40(state.certifiedBranchHead) && sha40(state.canonicalMergeCommit));
check('final_branch_certification', state.phaseGateVerification === 'PASS' && state.phaseGateVerifiedCommit === state.certifiedBranchHead && state.realBrowserVerification === 'PASS' && state.realBrowserVerifiedCommit === state.certifiedBranchHead);
check('final_browser_evidence', positiveRun(state.phaseGateRunId) && positiveRun(state.realBrowserRunId) && positiveRun(state.realBrowserArtifactId) && /^sha256:[0-9a-f]{64}$/i.test(state.realBrowserArtifactDigest) && state.realBrowserMinimumWidthPx === 320 && JSON.stringify(state.realBrowserVerifiedWidths) === JSON.stringify([1280,430,390,360,320]));
check('postmerge_certification', state.exactMainVerification === 'PASS' && state.pagesPreviewVerification === 'PASS' && state.liveExternalVerification === 'PASS');
check('postmerge_runs', positiveRun(state.exactMainQualityRunId) && positiveRun(state.exactMainBrowserRunId) && positiveRun(state.exactMainUiGovernanceRunId) && positiveRun(state.exactMainConstitutionRunId) && positiveRun(state.exactMainZeroEscapeRunId) && positiveRun(state.pagesPreviewRunId) && positiveRun(state.pagesBuildDeploymentRunId) && positiveRun(state.liveExternalRunId));
check('zero_blockers', state.knownCriticalBlockers === 0 && state.knownHighBlockers === 0 && state.knownFunctionalBlockers === 0);
check('budgets_frozen', state.javascriptBudgetBytes === 670000 && state.totalJavascriptBudgetBytes === 760000 && state.cssBudgetBytes === 180000 && state.budgetIncreaseAllowed === false);
check('no_shadow_authority', state.universalInboxPersistenceAllowed === false && state.shadowInboxStoreAllowed === false && state.shadowBusinessRecordAllowed === false && state.notificationMayFabricateBusinessAction === false && state.notificationLifecycleMayMutateBusinessFact === false);
check('composition_laws', state.notificationProvenanceMergeRequired === true && state.sourceOwnedMutationRequired === true && state.crossWorkspaceCompositionAllowed === false && state.completedArchivedDeletedSourceMayReappearFromNotification === false && state.stableDerivedIdentityRequired === true && state.deterministicDedupeRequired === true);
check('authority_map', state.attentionStateAuthority === 'in_app_notifications' && state.deliveryHistoryAuthority === 'notification_deliveries' && state.deliveryHistoryMayBecomeInboxState === false);

for (const marker of ['composeUniversalInbox', 'row.workspaceId !== workspaceId', 'workItems.map']) check(`contract:${marker}`, has(contract, marker));
check('no_shadow_runtime', !has(contract, "from('universal_inbox')") && !has(service, "from('universal_inbox')") && !has(service, 'createClient('));
for (const marker of ['loadDailyWork(factory, userId, now)', 'notificationCommands.list({ workspaceId: daily.workspaceId, limit: 100 })', 'composeUniversalInboxSnapshot']) check(`service:${marker}`, has(service, marker));
check('hook_live_composition', has(hook, 'loadUniversalInbox(factory, notificationCommands, userId)'));
check('source_owned_mutations', has(hook, 'completeDailyWorkItem(factory, notificationCommands') && has(hook, 'snoozeDailyWorkFollowup(factory, notificationCommands'));
check('ui_live_identity', has(ui, "data-phase11-2-universal-inbox={followupsOnly ? undefined : 'live'}") && has(ui, "data-universal-inbox-attention={item.attention ? 'true' : 'false'}") && has(ui, "data-universal-inbox-unread={item.attention?.unread ? 'true' : 'false'}"));
check('destruction_tests', has(contractTests, 'cannot fabricate actionable work') && has(contractTests, 'foreign-workspace') && has(contractTests, 'newest source revision') && has(serviceTests, 'without duplicating work'));
check('browser_guard', has(browserSpec, 'without duplication') && has(browserSpec, 'overflow-safe through 320px'));

const m3 = registry.systems.find((system) => system.id === 'M3');
check('successor_m3_not_preopened', m3?.name === 'Client Portal' && m3?.status === 'PLANNED' && m3?.closureEvidence === null);

if (failures.length) {
  console.error(`ENJAZ PHASE 11.2 CLOSED REGRESSION AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('ENJAZ PHASE 11.2 CLOSED REGRESSION AUDIT PASS — Universal Inbox authority composition, final-head/browser evidence, exact-main certification, frozen budgets and 11.3 authorization remain intact while M3 stays PLANNED until kickoff.');
