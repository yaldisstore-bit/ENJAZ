import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
let checks = 0;
const check = (name, condition) => { checks += 1; if (!condition) failures.push(name); };
const has = (text, value) => text.includes(value);

const state = JSON.parse(read('docs/PHASE7_5_STATE.json'));
const prior = JSON.parse(read('docs/PHASE7_4_STATE.json'));
const kickoff = read('docs/PHASE7_5_KICKOFF.md');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const packageJson = JSON.parse(read('package.json'));
const commands = read('src/features/finance/financeCommands.ts');
const model = read('src/features/finance/financeModel.ts');
const service = read('src/features/finance/financeService.ts');
const phase72Migration = read('database/migrations/phase_7_2_payments_receipts_m16.sql');
const hardeningPath = 'database/migrations/phase_7_5_payment_reversal_uniqueness.sql';
const cloudProbePath = 'database/probes/phase_7_5_live_finance_destruction_probe.sql';
const testPath = 'tests/financeDestructionGate.test.ts';
const browserPath = 'tests-external/phase7-5-finance-destruction.spec.cjs';
const workflowPath = '.github/workflows/phase7-5-finance-destruction.yml';
const hardening = exists(hardeningPath) ? read(hardeningPath) : '';
const cloudProbe = exists(cloudProbePath) ? read(cloudProbePath) : '';
const tests = exists(testPath) ? read(testPath) : '';
const browser = exists(browserPath) ? read(browserPath) : '';
const workflow = exists(workflowPath) ? read(workflowPath) : '';

check('phase_identity', state.phase === '7.5' && state.name === 'Finance Destruction & Reconciliation Gate');
check('phase_active_fail_closed', state.status === 'ACTIVE' && state.exitGatePassed === false && state.phase8Allowed === false && state.nextPhase === null);
check('base_is_exact_74_closure', state.baseCommit === '75128eabda1c4a8d1b3b53504596a3d227d69874');
check('budget_preserved', state.productionJavaScriptBudget === 670000);
check('phase74_authorizes_75', prior.phase === '7.4' && prior.status === 'CLOSED' && prior.exitGatePassed === true && prior.phase7_5Allowed === true && prior.nextPhase === '7.5');
check('phase8_still_locked', has(kickoff, 'Phase 8 remains **LOCKED**') && has(roadmap, 'Phase 8 remains locked'));

for (const item of ['hugeValues','subCentUnsafeInputs','reversals','repeatedSubmit','networkUncertainty','staleState','partialHistory','sourceCapacityPressure','authoritativeReconciliation','realCloudFinanceCriticalPath','realBrowserFinanceCriticalPath','deployedLiveFinanceCriticalPath']) {
  check(`scope_${item}`, state.scope?.includes(item));
}

check('roadmap_75_present', has(roadmap, '## 7.5 — Finance Destruction & Reconciliation Gate'));
for (const marker of ['Huge values', 'sub-cent/unsafe inputs', 'network uncertainty', 'stale state', 'partial history', 'source-capacity pressure', 'no lost/duplicated money event', 'Real Cloud + Real Browser + deployed-live']) check(`roadmap_${marker}`, has(roadmap, marker));

check('command_exact_decimal', has(commands, 'const DECIMAL_PATTERN') && has(commands, 'financeCentsToDecimal'));
check('command_unknown_outcome', has(commands, 'DATA_OUTCOME_UNKNOWN') && has(commands, 'Finance write outcome could not be confirmed'));
check('command_idempotency_forwarded', has(commands, 'p_idempotency_key: requireUuid(input.idempotencyKey'));
check('server_payment_idempotency', has(phase72Migration, 'ENJAZ_PAYMENT_IDEMPOTENCY_CONFLICT'));
check('server_reversal_idempotency', has(phase72Migration, 'ENJAZ_REVERSAL_IDEMPOTENCY_CONFLICT'));
check('server_reconciliation_authority', has(phase72Migration, 'finance_payment_reconciliation_v1') && has(phase72Migration, 'shadowLedgerEntries'));
check('snapshot_partial_history_warning', has(model, 'statusReversed !== hasReversal') && has(model, 'paymentIntegrityWarnings += 1'));
check('source_capacity_fail_closed', has(service, 'FINANCE_SOURCE_LIMIT = 10_000') && has(service, 'FinanceSourceCapacityError'));
check('source_stall_fail_closed', has(service, 'FinanceSourcePageStalledError'));

check('hardening_exists', Boolean(hardening));
check('hardening_forensic_preflight', has(hardening, 'having count(*) > 1') && has(hardening, 'forensic reconciliation'));
check('one_reversal_per_payment_db_invariant', has(hardening, 'unique index') && has(hardening, 'payment_reversals(workspace_id, payment_id)'));

check('cloud_probe_exists', Boolean(cloudProbe));
for (const marker of ['set local role authenticated', '9999999999999999.99', 'wasDuplicate', 'ENJAZ_PHASE75_EXPECTED_IDEMPOTENCY_CONFLICT_MISSING', 'reverse_payment_v1', 'finance_payment_reconciliation_v1', 'ENJAZ_PHASE75_DUPLICATE_REVERSAL_WAS_ACCEPTED', 'probe payment cleanup failed']) check(`cloud_probe_${marker}`, has(cloudProbe, marker));

check('destruction_tests_exist', Boolean(tests));
for (const marker of ['huge values remain exact', 'sub-cent and unsafe money shapes', 'network uncertainty recovers', 'partial reversal history', 'source-capacity pressure', 'stalled source pagination']) check(`test_${marker}`, has(tests, marker));

check('browser_exists', Boolean(browser));
for (const marker of ['sub-cent input fails closed', 'numeric(18,2) overflow fails closed', 'cannot be repeated from stale UI state', 'idempotency recovery guidance', '1280', '430', '390', '360', '320', 'assertNoHorizontalOverflow']) check(`browser_${marker}`, has(browser, marker));

const scripts = packageJson.scripts ?? {};
check('package_test_75', typeof scripts['test:phase7-5'] === 'string' && has(scripts['test:phase7-5'], 'financeDestructionGate.test.ts') && has(scripts['test:phase7-5'], 'financeCommands.test.ts'));
check('package_audit_75', scripts['audit:phase7-5:finance-destruction'] === 'node scripts/phase7-5-finance-destruction-audit.mjs');
check('functional_is_cumulative', typeof scripts['test:functional'] === 'string' && has(scripts['test:functional'], 'financeCommands.test.ts') && has(scripts['test:functional'], 'financeDestructionGate.test.ts'));
check('extreme_is_cumulative', typeof scripts['verify:extreme'] === 'string' && has(scripts['verify:extreme'], 'audit:phase7-5:finance-destruction') && has(scripts['verify:extreme'], 'test:phase7-5'));

check('workflow_exists', Boolean(workflow));
for (const marker of ['phase7-4-financial-reports-audit.mjs', 'financeDestructionGate.test.ts', 'phase_7_5_payment_reversal_uniqueness.sql', 'phase_7_5_live_finance_destruction_probe.sql', 'db:audit', 'audit:roadmap', 'typecheck', 'build -- --base=/', 'audit:dist:budget', 'phase7-2-preview', 'phase7-5-finance-destruction.spec.cjs', 'Real Chromium Phase 7.5 destruction']) check(`workflow_${marker}`, has(workflow, marker));

if (failures.length) {
  console.error('ENJAZ PHASE 7.5 FINANCE DESTRUCTION AUDIT FAIL\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log(`ENJAZ PHASE 7.5 FINANCE DESTRUCTION AUDIT PASS (${checks} checks) — ACTIVE; Phase 8 locked.`);
