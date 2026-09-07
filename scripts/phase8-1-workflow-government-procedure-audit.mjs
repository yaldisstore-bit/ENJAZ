import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
let checks = 0;
const check = (name, condition) => { checks += 1; if (!condition) failures.push(name); };
const has = (text, marker) => text.includes(marker);

const state = JSON.parse(read('docs/PHASE8_1_STATE.json'));
const prior = JSON.parse(read('docs/PHASE7_5_STATE.json'));
const major = JSON.parse(read('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json'));
const kickoff = read('docs/PHASE8_1_KICKOFF.md');
const closure = read('docs/PHASE8_1_CLOSURE.md');
const postMerge = read('docs/PHASE8_1_POSTMERGE_RECERTIFICATION.md');
const realCloud = read('docs/PHASE8_1_REAL_CLOUD_EVIDENCE.md');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const baseline = read('database/baseline/phase1_2_schema.sql');
const migrationPath = 'database/migrations/phase_8_1_workflow_government_procedure_os.sql';
const contextMigrationPath = 'database/migrations/phase_8_1_transaction_workflow_context.sql';
const commandPath = 'src/features/workflow/governmentProcedureCommands.ts';
const runtimePath = 'src/features/workflow/governmentProcedureRuntime.ts';
const hookPath = 'src/features/workflow/useGovernmentProcedureWorkflow.ts';
const providerPath = 'src/features/workflow/GovernmentProcedureCommandContext.tsx';
const panelPath = 'src/ui-r2/workflow/GovernmentProcedurePanel.tsx';
const cssPath = 'src/ui-r2/workflow/workflow.css';
const productionRootPath = 'src/ui-r2/runtime/UiR2ProductionRoot.tsx';
const coreWorkPath = 'src/ui-r2/core-work/CoreWorkConnected.tsx';
const previewPath = 'src/ui-r2/workflow/phase81-preview-main.tsx';
const previewHtmlPath = 'phase8-1-preview.html';
const previewConfigPath = 'vite.phase8-1-preview.config.ts';
const browserSpecPath = 'tests-external/phase8-1-workflow-government-procedure.spec.cjs';
const testPath = 'tests/workflowGovernmentProcedure.test.ts';
const runtimeTestPath = 'tests/workflowGovernmentProcedureRuntime.test.ts';
const coreMigration = exists(migrationPath) ? read(migrationPath) : '';
const contextMigration = exists(contextMigrationPath) ? read(contextMigrationPath) : '';
const migration = `${coreMigration}\n${contextMigration}`;
const commands = exists(commandPath) ? read(commandPath) : '';
const runtime = exists(runtimePath) ? read(runtimePath) : '';
const hook = exists(hookPath) ? read(hookPath) : '';
const provider = exists(providerPath) ? read(providerPath) : '';
const panel = exists(panelPath) ? read(panelPath) : '';
const css = exists(cssPath) ? read(cssPath) : '';
const productionRoot = exists(productionRootPath) ? read(productionRootPath) : '';
const coreWork = exists(coreWorkPath) ? read(coreWorkPath) : '';
const preview = exists(previewPath) ? read(previewPath) : '';
const browserSpec = exists(browserSpecPath) ? read(browserSpecPath) : '';
const tests = exists(testPath) ? read(testPath) : '';
const runtimeTests = exists(runtimeTestPath) ? read(runtimeTestPath) : '';
const packageJson = JSON.parse(read('package.json'));

check('phase_identity', state.phase === '8.1' && state.name === 'Workflow Engine & Government Procedure OS — M1');
check('phase_closed_zero_escape', state.status === 'CLOSED' && state.exitGatePassed === true && state.unresolvedDefectCount === 0 && state.criticalDefectCount === 0 && state.highDefectCount === 0 && state.functionalBlockerCount === 0);
check('phase82_authorized_only_after_closure', state.phase8_2Allowed === true && state.nextPhase === '8.2');
check('exact_phase7_closure_base', state.baseCommit === '7e42e69623db7af32797448f00ae3b58735ad794');
check('certified_implementation_head', state.implementationHead === 'fe19308c8707dc346a3254b92292c048c8c1bc4a' && state.pullRequest === 107);
check('canonical_merge_sha', state.mergeCommit === '95f988ac305d9003ee19a5f0f474c499f51d288b');
check('phase7_5_closed', prior.phase === '7.5' && prior.status === 'CLOSED' && prior.exitGatePassed === true && prior.phase8Allowed === true && prior.nextPhase === '8.1');
check('m1_anchor_complete_but_overall_open', state.m1AnchorStatus === 'CLOSURE_CANDIDATE' && state.m1OverallSystemClosed === false && state.m1RemainingClosureAuthority === 'Phase 8.7 individual Zero-Escape destruction evidence');
const m1 = major.systems?.find((system) => system.id === 'M1');
check('major_registry_m1_fail_closed_candidate', m1?.name === 'Government Procedure Operating System' && m1?.status === 'CLOSURE_CANDIDATE' && m1?.closureEvidence === 'docs/PHASE8_1_CLOSURE.md');
check('other_major_systems_not_silently_closed', major.systems?.filter((system) => system.id !== 'M1').every((system) => system.status !== 'CLOSED'));
check('kickoff_historical_lock_preserved', has(kickoff, 'Phase 8.2 remains locked') && has(kickoff, 'Phase 8.2 is not authorized'));
check('roadmap_81_authority', has(roadmap, '## 8.1 — Workflow Engine & Government Procedure OS — M1'));
check('roadmap_82_authority', has(roadmap, '**Next: Phase 8.2 — Automation Engine**'));

check('preclosure_exact_head_green', state.preClosure?.workflowCount === 30 && state.preClosure?.successCount === 30 && state.preClosure?.failureCount === 0 && state.preClosure?.inProgressCount === 0 && state.preClosure?.queuedCount === 0 && state.preClosure?.cancelledCount === 0 && state.preClosure?.realChromium === 'PASS' && state.preClosure?.dedicatedGateRunId === 34117435926 && state.preClosure?.realBrowserRunId === 34117435896);
check('real_cloud_complete', state.realCloudVerification?.status === 'COMPLETE' && state.realCloudVerification?.catalog === 'PASS' && state.realCloudVerification?.prerequisites === 'PASS' && state.realCloudVerification?.branchRequirements === 'PASS' && state.realCloudVerification?.idempotency === 'PASS' && state.realCloudVerification?.requiredItems === 'PASS' && state.realCloudVerification?.staleState === 'PASS' && state.realCloudVerification?.complete === 'PASS' && state.realCloudVerification?.reopen === 'PASS' && state.realCloudVerification?.prerequisiteSuccess === 'PASS');
check('postmerge_exact_sha_green', state.postMergeRecertification?.status === 'COMPLETE' && state.postMergeRecertification?.mainCommit === '95f988ac305d9003ee19a5f0f474c499f51d288b' && state.postMergeRecertification?.workflowCount === 15 && state.postMergeRecertification?.successCount === 15 && state.postMergeRecertification?.failureCount === 0 && state.postMergeRecertification?.inProgressCount === 0 && state.postMergeRecertification?.queuedCount === 0 && state.postMergeRecertification?.cancelledCount === 0);
check('postmerge_critical_runs', state.postMergeRecertification?.phaseGateRunId === 34117766941 && state.postMergeRecertification?.pagesPreviewRunId === 34117816460 && state.postMergeRecertification?.pagesDeploymentRunId === 34117766836 && state.postMergeRecertification?.realBrowserRunId === 34117766978 && state.postMergeRecertification?.liveExternalRunId === 34117875655);
check('postmerge_deployed_live_success', state.postMergeRecertification?.pagesPreview === 'SUCCESS' && state.postMergeRecertification?.pagesBuild === 'SUCCESS' && state.postMergeRecertification?.pagesDeploy === 'SUCCESS' && state.postMergeRecertification?.realBrowser === 'SUCCESS' && state.postMergeRecertification?.liveExternal === 'SUCCESS' && state.postMergeRecertification?.publishedApplicationAttack === 'SUCCESS');
check('closure_evidence_pointers', state.closureEvidence === 'docs/PHASE8_1_CLOSURE.md' && state.postMergeEvidence === 'docs/PHASE8_1_POSTMERGE_RECERTIFICATION.md' && state.realCloudVerification?.evidence === 'docs/PHASE8_1_REAL_CLOUD_EVIDENCE.md');
for (const marker of ['Status: CLOSED', 'fe19308c8707dc346a3254b92292c048c8c1bc4a', '95f988ac305d9003ee19a5f0f474c499f51d288b', '30/30 SUCCESS', '15/15 exact-SHA workflow runs SUCCESS', '34117766941', '34117816460', '34117766836', '34117766978', '34117875655', 'Attack the actual published application', 'M1 overall system closure: **OPEN', 'Phase 8.2 — Automation Engine']) check(`closure_${marker}`, has(closure, marker));
for (const marker of ['Status: COMPLETE', '95f988ac305d9003ee19a5f0f474c499f51d288b', '15/15 workflow runs SUCCESS', '34117766941', '34117816460', '34117766836', '34117766978', '34117875655', 'Attack the actual published application', 'CLOSURE_CANDIDATE']) check(`postmerge_${marker}`, has(postMerge, marker));
for (const marker of ['authenticated Real Cloud Supabase probe', 'catalog', 'prerequisite', 'idempotent', 'required-item', 'stale-state', 'completion', 'reopen']) check(`realcloud_${marker}`, has(realCloud, marker));

for (const table of ['workflow_templates','workflow_template_stages','workflow_template_items','workflow_instances','workflow_stage_states','workflow_item_states']) {
  check(`baseline_${table}`, has(baseline, `create table public.${table}`));
  check(`state_authority_${table}`, state.authoritativeWorkflowTables?.includes(table));
}
check('single_active_workflow_index_preserved', has(baseline, 'workflow_one_active_per_transaction_idx'));
check('transaction_attached_existing_runtime', has(baseline, 'transaction_id uuid not null') && has(baseline, 'workflow_instances_transaction_fk'));

check('core_migration_exists', Boolean(coreMigration));
check('context_migration_exists', Boolean(contextMigration));
for (const marker of [
  'create table public.government_entities',
  'create table public.government_entity_branches',
  'create table public.government_procedures',
  'create table public.government_procedure_branches',
  'create table public.government_procedure_prerequisites',
  'create table public.workflow_template_transitions',
  'create table public.workflow_transition_events',
  'official_fee numeric,',
  'workflow_template_stages_government_branch_fk',
  'workflow_instances_government_procedure_fk',
  'workflow_instances_operation_key_unique_idx',
  'workflow_item_states_stage_idx',
  'ENJAZ_PROCEDURE_PREREQUISITE_CYCLE',
  'ENJAZ_PROCEDURE_PREREQUISITE_INCOMPLETE',
  'ENJAZ_PROCEDURE_BRANCH_ENTITY_MISMATCH',
  'ENJAZ_PROCEDURE_BRANCH_REQUIRED',
  'ENJAZ_WORKFLOW_REOPEN_ACTIVE_CONFLICT',
  'trunc(official_fee, 2)',
  'revoke insert, update, delete on table public.workflow_instances from anon, authenticated',
  'revoke insert, update, delete on table public.workflow_stage_states from anon, authenticated',
  'reference_fees_only_no_finance_write',
  'start_government_procedure_v1',
  'transition_workflow_v1',
  'get_transaction_workflow_context_v1',
  'ENJAZ_WORKFLOW_STALE_STAGE',
  'ENJAZ_WORKFLOW_REQUIRED_ITEMS_PENDING',
  'ENJAZ_WORKFLOW_ACTIVE_INSTANCE_EXISTS',
  'workflow_transition_events_idempotency_unique',
  "'workflow.procedure.started'",
  "'workflow.transition.'||v_transition.transition_kind",
]) check(`migration_${marker}`, has(migration, marker));

check('no_transaction_state_write', !/update\s+public\.transactions\s+set/i.test(migration));
check('no_finance_write', !/insert\s+into\s+public\.(payments|financial_ledger_entries|cashbox_accounts)/i.test(migration));
check('no_browser_delete_grant', !/grant\s+[^;]*delete[^;]*to\s+authenticated/i.test(migration));
check('rpc_public_execute_revoked', has(migration, 'revoke execute on function public.start_government_procedure_v1') && has(migration, 'from public, anon'));
check('rpc_authenticated_only', has(migration, 'grant execute on function public.start_government_procedure_v1') && has(migration, 'to authenticated'));
check('context_rpc_public_execute_revoked', has(contextMigration, 'revoke execute on function public.get_transaction_workflow_context_v1') && has(contextMigration, 'from public, anon'));
check('context_rpc_authenticated_only', has(contextMigration, 'grant execute on function public.get_transaction_workflow_context_v1') && has(contextMigration, 'to authenticated'));

check('commands_exist', Boolean(commands));
for (const marker of [
  "authority: 'workflow_plus_government_catalog'",
  "moneyAuthority: 'reference_fees_only_no_finance_write'",
  'DATA_OUTCOME_UNKNOWN',
  'p_expected_stage_position',
  'p_idempotency_key',
  'get_government_procedure_catalog_v1',
  'start_government_procedure_v1',
  'transition_workflow_v1',
]) check(`commands_${marker}`, has(commands, marker));
check('commands_no_direct_table_mutation', !has(commands, ".from('workflow_instances')") && !has(commands, ".from('workflow_stage_states')"));

check('runtime_gateway_exists', Boolean(runtime));
for (const marker of [
  "authority: 'canonical_workflow_instance'",
  'loadTransactionContext',
  'get_transaction_workflow_context_v1',
  'pendingRequiredCount',
  'allowedTransitions',
  'createGovernmentProcedureRuntimeGateway',
]) check(`runtime_${marker}`, has(runtime, marker));
check('runtime_context_fail_closed', has(runtime, 'normalizeThrownDataFailure') && has(runtime, 'Workflow context transaction drifted'));

check('workflow_hook_exists', Boolean(hook));
for (const marker of ['crypto.randomUUID()', 'DATA_OUTCOME_UNKNOWN', 'completeRequirement', 'workflowItemStates.update', 'refreshAfterMutation', 'expectedStagePosition']) check(`hook_${marker}`, has(hook, marker));
check('provider_exists', Boolean(provider) && has(provider, 'GovernmentProcedureCommandProvider') && has(provider, 'useGovernmentProcedureCommandGateway'));

check('production_runtime_wired', has(productionRoot, 'createGovernmentProcedureRuntimeGateway') && has(productionRoot, 'GovernmentProcedureCommandProvider') && has(productionRoot, "../workflow/workflow.css"));
check('transaction_360_wired', has(coreWork, "'workflow' | 'finance'") && has(coreWork, 'ConnectedGovernmentProcedurePanel') && has(coreWork, "['workflow','الإجراء الحكومي']"));

check('workflow_panel_exists', Boolean(panel));
for (const marker of [
  'data-p81-authority="canonical_workflow_instance"',
  'reference_fees_only_no_finance_write',
  'pendingRequiredCount',
  'تم الإنجاز',
  'بدء الإجراء وربط Snapshot',
  'الإجراء الحكومي',
  'SLA',
]) check(`panel_${marker}`, has(panel, marker));
check('panel_blocks_required_transition', has(panel, "blockedByItems = instance.pendingRequiredCount > 0") && has(panel, 'disabled={busy || blockedByItems'));

check('workflow_css_exists', Boolean(css));
check('workflow_css_token_only_colors', !/#[0-9a-f]{3,8}\b/i.test(css) && !/rgba?\s*\(/i.test(css) && !/hsla?\s*\(/i.test(css) && !/color-mix\s*\(/i.test(css));
check('workflow_css_mobile_760', has(css, '@media(max-width:760px)'));
check('workflow_css_mobile_380', has(css, '@media(max-width:380px)'));

check('preview_exists', Boolean(preview) && exists(previewHtmlPath) && exists(previewConfigPath));
check('preview_same_component', has(preview, 'GovernmentProcedurePanelView') && has(preview, 'reference_fees_only_no_finance_write'));
check('browser_spec_exists', Boolean(browserSpec));
for (const width of ['1280', '430', '390', '360', '320']) check(`browser_width_${width}`, has(browserSpec, width));
for (const marker of ['required items block transition', 'complete, and reopen', 'empty transaction can start', 'reference_fees_only_no_finance_write', 'assertNoHorizontalEscape']) check(`browser_${marker}`, has(browserSpec, marker));

check('command_tests_exist', Boolean(tests));
for (const marker of [
  'exact reference fee without finance authority',
  'shadow_finance_store',
  'idempotency once',
  'stale-state protection',
  'before any RPC can mutate workflow state',
  'DATA_OUTCOME_UNKNOWN',
  'instead of rounding a government fee silently',
]) check(`tests_${marker}`, has(tests, marker));
check('runtime_tests_exist', Boolean(runtimeTests));
for (const marker of ['canonical transaction workflow context', 'context authority drift', 'transaction drift', 'explicit empty canonical context']) check(`runtime_tests_${marker}`, has(runtimeTests, marker));

const scripts = packageJson.scripts ?? {};
check('package_test_81', typeof scripts['test:phase8-1'] === 'string' && has(scripts['test:phase8-1'], 'workflowGovernmentProcedure.test.ts'));
check('package_audit_81', scripts['audit:phase8-1:workflow-government-procedure'] === 'node scripts/phase8-1-workflow-government-procedure-audit.mjs');
check('functional_contains_81', typeof scripts['test:functional'] === 'string' && has(scripts['test:functional'], 'workflowGovernmentProcedure.test.ts'));
check('extreme_contains_81', typeof scripts['verify:extreme'] === 'string' && has(scripts['verify:extreme'], 'audit:phase8-1:workflow-government-procedure') && has(scripts['verify:extreme'], 'test:phase8-1'));

if (failures.length) {
  console.error(`ENJAZ PHASE 8.1 WORKFLOW/GOVERNMENT PROCEDURE AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`ENJAZ PHASE 8.1 WORKFLOW/GOVERNMENT PROCEDURE AUDIT PASS (${checks} checks) — backend + Transaction 360 UI + Real Chromium contract preserved; Phase 8.1 CLOSED + POST-MERGE RECERTIFIED; M1 remains fail-closed CLOSURE_CANDIDATE; Phase 8.2 authorized.`);
