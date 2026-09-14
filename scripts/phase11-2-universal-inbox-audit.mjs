import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) errors.push(message); };

const state = JSON.parse(read('docs/PHASE11_2_STATE.json'));
const predecessor = JSON.parse(read('docs/PHASE11_1_STATE.json'));
const kickoff = read('docs/PHASE11_2_KICKOFF.md');
const model = read('src/features/daily-work/dailyWorkModel.ts');
const contract = read('src/features/daily-work/universalInboxContract.ts');
const service = read('src/features/daily-work/universalInboxService.ts');
const hook = read('src/features/daily-work/useDailyWork.ts');
const ui = read('src/ui-r2/core-work/CoreWorkConnected.tsx');
const tests = read('tests/universalInboxContract.test.ts');
const serviceTests = read('tests/universalInboxService.test.ts');
const browserHarness = read('src/ui-r2/phase11-2-universal-inbox-browser-main.tsx');
const browserSpec = read('tests-external/phase11-2-universal-inbox-live.spec.cjs');
const browserWorkflow = read('.github/workflows/phase11-2-universal-inbox-browser.yml');
const migrationsDir = path.join(root, 'database', 'migrations');
const migrationText = fs.existsSync(migrationsDir)
  ? fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).map((name) => fs.readFileSync(path.join(migrationsDir, name), 'utf8')).join('\n')
  : '';

assert(state.phase === '11.2' && state.status === 'IN_PROGRESS', 'Phase 11.2 must remain IN_PROGRESS during implementation');
assert(state.baseCommit === '6c15d3db7c6c45ea9ee3db2f4e0fe6f1c78e33a7', 'Phase 11.2 base commit drifted');
assert(predecessor.phase === '11.1' && predecessor.status === 'CLOSED' && predecessor.exitGatePassed === true, 'Phase 11.1 predecessor is not formally closed');
assert(state.predecessorClosureEvidence === 'docs/PHASE11_1_CLOSURE.md', 'Phase 11.1 closure evidence is not linked');
assert(state.dailyWorkFoundationPhase === '4.2', 'Phase 4.2 Daily Work foundation must be preserved');
assert(state.universalInboxPersistenceAllowed === false && state.shadowInboxStoreAllowed === false, 'shadow Universal Inbox persistence must remain forbidden');
assert(state.notificationMayFabricateBusinessAction === false, 'notifications may not fabricate business actions');
assert(state.notificationProvenanceMergeRequired === true && state.deterministicDedupeRequired === true, 'provenance merge/dedupe contract is missing');
assert(state.sourceOwnedMutationRequired === true, 'source-owned mutations must remain authoritative');
assert(state.crossWorkspaceCompositionAllowed === false, 'cross-workspace composition must remain forbidden');
assert(state.notificationLifecycleMayMutateBusinessFact === false, 'notification lifecycle must not mutate business facts');
assert(state.phase11_3Allowed === false && state.successorStatus === 'LOCKED', 'Phase 11.3 must remain locked');
assert(state.javascriptBudgetBytes === 670000 && state.totalJavascriptBudgetBytes === 760000 && state.cssBudgetBytes === 180000 && state.budgetIncreaseAllowed === false, 'frozen budgets changed');
assert(state.authorityContractAdded === true && state.destructionTestsAdded === true && state.serviceTestsAdded === true && state.phaseGateAdded === true, 'Phase 11.2 foundation/service tracking is incomplete');
assert(state.runtimeIntegrationAdded === true && state.runtimeIntegrationPath === 'src/features/daily-work/universalInboxService.ts', 'runtime integration is not recorded');
assert(state.uiIntegrationAdded === true && state.uiIntegrationPath === 'src/ui-r2/core-work/CoreWorkConnected.tsx' && state.canonicalDestination === 'today', 'canonical Today UI integration is not recorded');
assert(state.browserHarnessAdded === true && state.browserGateAdded === true && state.browserSpecPath === 'tests-external/phase11-2-universal-inbox-live.spec.cjs', 'Phase 11.2 browser certification tracking is incomplete');
assert(state.databaseAuthorityExtensionRequired === false && state.databaseAuthorityExtensionApplied === false, 'Phase 11.2 must not invent new persistence without an explicit authority need');

for (const sourceKind of ['followup', 'blocker', 'calendar', 'renewal', 'workflow']) {
  assert(model.includes(`'${sourceKind}'`), `Phase 4.2 Daily Work source disappeared: ${sourceKind}`);
}
assert(kickoff.includes('No `universal_inbox` shadow table/store') || kickoff.includes('No `universal_inbox`'), 'kickoff must forbid a shadow inbox store');
assert(contract.includes('composeUniversalInbox'), 'Universal Inbox composition contract is missing');
assert(contract.includes('transaction_followup') && contract.includes('calendar_event') && contract.includes('renewal'), 'notification provenance mapping is incomplete');
assert(contract.includes('row.workspaceId !== workspaceId'), 'cross-workspace notification guard is missing');
assert(contract.includes('row.cancelledAt') && contract.includes('row.snoozedUntil'), 'notification lifecycle filtering is incomplete');
assert(contract.includes('workItems.map'), 'composition must remain source-work driven rather than notification driven');
assert(!contract.includes("from('universal_inbox')") && !contract.includes('from("universal_inbox")'), 'contract must not read a shadow inbox table');

assert(service.includes('loadDailyWork(factory, userId, now)'), 'Universal Inbox runtime must reuse Daily Work rather than reimplement source loading');
assert(service.includes('notificationCommands.list({ workspaceId: daily.workspaceId, limit: 100 })'), 'Universal Inbox runtime must read governed Phase 11.1 attention state');
assert(service.includes('composeUniversalInboxSnapshot'), 'Universal Inbox runtime composition is missing');
assert(!service.includes("from('universal_inbox')") && !service.includes('createClient('), 'Universal Inbox runtime bypasses source authorities');
assert(hook.includes('loadUniversalInbox(factory, notificationCommands, userId)'), 'Today hook does not load the canonical Universal Inbox runtime');
assert(hook.includes('completeDailyWorkItem(factory, notificationCommands') && hook.includes('snoozeDailyWorkFollowup(factory, notificationCommands'), 'source-owned Daily Work actions were bypassed');

assert(ui.includes('data-phase11-2-universal-inbox={followupsOnly ? undefined : \'live\'}'), 'canonical Today Phase 11.2 live marker is missing');
assert(ui.includes('data-universal-inbox-attention={item.attention ? \'true\' : \'false\'}'), 'attention merge reality marker is missing');
assert(ui.includes('data-universal-inbox-unread={item.attention?.unread ? \'true\' : \'false\'}'), 'unread attention marker is missing');
assert(ui.includes('Phase 11.2 · Universal Inbox · متصل'), 'Phase 11.2 canonical Today identity is missing');
assert(ui.includes('r2-chip r2-chip--accent'), 'attention UI must reuse the locked R2 design system');
assert(!ui.includes('مركز الإشعارات العام لا يُدّعى قبل مرحلته'), 'stale pre-Phase-11 notification copy leaked into Today');

assert(tests.includes('cannot fabricate actionable work') && tests.includes('foreign-workspace') && tests.includes('newest source revision'), 'destruction test coverage is incomplete');
assert(serviceTests.includes('without duplicating work') && serviceTests.includes('preserves actionable work when no matching notification exists'), 'service integration test coverage is incomplete');
assert(browserHarness.includes('ConnectedCoreWorkRouter') && browserHarness.includes("destinationId: 'today'") && browserHarness.includes('NotificationCommandProvider'), 'browser harness does not exercise production Today integration');
assert(browserSpec.includes('without duplication') && browserSpec.includes('overflow-safe through 320px') && browserSpec.includes("[data-universal-inbox-attention=\"true\"]"), 'browser certificate coverage is incomplete');
assert(browserWorkflow.includes('phase11-2-universal-inbox-live.spec.cjs') && browserWorkflow.includes('audit:dist:budget') && browserWorkflow.includes('playwright install --with-deps chromium'), 'browser workflow is not wired to the governed certificate');
assert(!/create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?universal_inbox\b/i.test(migrationText), 'database contains forbidden universal_inbox shadow table');

if (errors.length) {
  console.error('ENJAZ PHASE 11.2 UNIVERSAL INBOX AUDIT FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('ENJAZ PHASE 11.2 UNIVERSAL INBOX AUDIT PASS — source-owned work + certified notification attention composition, production Today integration, service coverage, deterministic dedupe, dedicated 320px browser certificate and no shadow inbox persistence.');
}
