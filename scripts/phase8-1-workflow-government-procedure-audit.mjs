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
const kickoff = read('docs/PHASE8_1_KICKOFF.md');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const baseline = read('database/baseline/phase1_2_schema.sql');
const migrationPath = 'database/migrations/phase_8_1_workflow_government_procedure_os.sql';
const commandPath = 'src/features/workflow/governmentProcedureCommands.ts';
const testPath = 'tests/workflowGovernmentProcedure.test.ts';
const migration = exists(migrationPath) ? read(migrationPath) : '';
const commands = exists(commandPath) ? read(commandPath) : '';
const tests = exists(testPath) ? read(testPath) : '';
const packageJson = JSON.parse(read('package.json'));

check('phase_identity', state.phase === '8.1' && state.name === 'Workflow Engine & Government Procedure OS — M1');
check('phase_in_progress_fail_closed', state.status === 'IN_PROGRESS' && state.exitGatePassed === false && state.phase8_2Allowed === false && state.nextPhase === null);
check('exact_phase7_closure_base', state.baseCommit === '7e42e69623db7af32797448f00ae3b58735ad794');
check('phase7_5_closed', prior.phase === '7.5' && prior.status === 'CLOSED' && prior.exitGatePassed === true && prior.phase8Allowed === true && prior.nextPhase === '8.1');
check('m1_not_falsely_closed', state.m1AnchorStatus === 'IN_PROGRESS' && state.m1OverallSystemClosed === false);
check('phase8_2_locked_doc', has(kickoff, 'Phase 8.2 remains locked') && has(kickoff, 'Phase 8.2 is not authorized'));
check('roadmap_81_authority', has(roadmap, '## 8.1 — Workflow Engine & Government Procedure OS — M1'));

for (const table of ['workflow_templates','workflow_template_stages','workflow_template_items','workflow_instances','workflow_stage_states','workflow_item_states']) {
  check(`baseline_${table}`, has(baseline, `create table public.${table}`));
  check(`state_authority_${table}`, state.authoritativeWorkflowTables?.includes(table));
}
check('single_active_workflow_index_preserved', has(baseline, 'workflow_one_active_per_transaction_idx'));
check('transaction_attached_existing_runtime', has(baseline, 'transaction_id uuid not null') && has(baseline, 'workflow_instances_transaction_fk'));

check('migration_exists', Boolean(migration));
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

check('tests_exist', Boolean(tests));
for (const marker of [
  'exact reference fee without finance authority',
  'shadow_finance_store',
  'idempotency once',
  'stale-state protection',
  'before any RPC can mutate workflow state',
  'DATA_OUTCOME_UNKNOWN',
  'instead of rounding a government fee silently',
]) check(`tests_${marker}`, has(tests, marker));

const scripts = packageJson.scripts ?? {};
check('package_test_81', typeof scripts['test:phase8-1'] === 'string' && has(scripts['test:phase8-1'], 'workflowGovernmentProcedure.test.ts'));
check('package_audit_81', scripts['audit:phase8-1:workflow-government-procedure'] === 'node scripts/phase8-1-workflow-government-procedure-audit.mjs');
check('functional_contains_81', typeof scripts['test:functional'] === 'string' && has(scripts['test:functional'], 'workflowGovernmentProcedure.test.ts'));
check('extreme_contains_81', typeof scripts['verify:extreme'] === 'string' && has(scripts['verify:extreme'], 'audit:phase8-1:workflow-government-procedure') && has(scripts['verify:extreme'], 'test:phase8-1'));

if (failures.length) {
  console.error(`ENJAZ PHASE 8.1 WORKFLOW/GOVERNMENT PROCEDURE AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`ENJAZ PHASE 8.1 WORKFLOW/GOVERNMENT PROCEDURE AUDIT PASS (${checks} checks) — IN_PROGRESS; M1 not falsely closed; Phase 8.2 locked.`);
