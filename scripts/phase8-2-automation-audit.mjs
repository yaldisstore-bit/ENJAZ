import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const baseline = read('database/baseline/phase1_2_schema.sql');
const migration = read('database/migrations/phase_8_2_automation_engine.sql');
const hardening = read('database/migrations/phase_8_2_rpc_security_hardening.sql');
const cloudProbe = read('database/migrations/phase_8_2_live_authenticated_automation_probe.sql');
const fkHardening = read('database/migrations/phase_8_2_fk_index_hardening.sql');
const commands = read('src/features/automation/automationCommands.ts');
const commandContext = read('src/features/automation/AutomationCommandContext.tsx');
const liveUi = read('src/ui-r2/automation/LiveAutomationExperience.tsx');
const productionRoot = read('src/ui-r2/runtime/UiR2ProductionRoot.tsx');
const operationalRoot = read('src/ui-r2/operational-intelligence/OperationalIntelligenceExperience.tsx');
const navigation = read('src/ui-r2/architecture/navigation-contract.ts');
const chromium = read('tests-external/phase8-2-automation.spec.cjs');
const workflow = read('.github/workflows/phase8-2-automation-engine.yml');
const tests = read('tests/automationEngine.test.ts');
const state = JSON.parse(read('docs/PHASE8_2_STATE.json'));
const kickoff = read('docs/PHASE8_2_KICKOFF.md');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const phase81 = JSON.parse(read('docs/PHASE8_1_STATE.json'));
const errors = [];

const requireMarker = (source, marker, label) => { if (!source.includes(marker)) errors.push(`${label} missing marker: ${marker}`); };
const forbidMarker = (source, marker, label) => { if (source.includes(marker)) errors.push(`${label} forbidden marker: ${marker}`); };

for (const marker of [
  'create table public.automation_rules',
  'create table public.automation_runs',
  'conditions jsonb',
  'actions jsonb',
  'receipt_key text',
  'automation_runs_receipt_unique_idx',
  'alter table public.automation_rules enable row level security',
  'alter table public.automation_runs enable row level security',
]) requireMarker(baseline, marker, 'canonical baseline');

for (const marker of [
  'alter table public.automation_rules',
  'alter table public.automation_runs',
  'create table public.automation_run_actions',
  'create table public.automation_approval_requests',
  'ENJAZ_AUTOMATION_IDEMPOTENCY_CONFLICT',
  'ENJAZ_AUTOMATION_RULE_STALE',
  "status in ('started','awaiting_approval','succeeded','skipped','failed')",
  'private.validate_automation_rule_v1',
  'public.upsert_automation_rule_v1',
  'public.set_automation_rule_enabled_v1',
  'public.dispatch_automation_v1',
  'public.decide_automation_approval_v1',
  'public.get_automation_engine_context_v1',
  'automation.rule.activated',
  'automation.rule.deactivated',
  'automation.run.dispatched',
  'automation.approval.',
  'existing_workflow_rpc_only_after_human_approval',
  "'financeWriteAuthority','none'",
  'public.transition_workflow_v1',
  'revoke insert, update, delete on table public.automation_rules from authenticated',
]) requireMarker(migration, marker, 'migration');

for (const forbidden of ['security definer', 'public.payments', 'public.financial_ledger_entries', 'public.payment_reversals']) forbidMarker(migration.toLowerCase(), forbidden, 'migration');

for (const marker of [
  'SECURITY DEFINER',
  "v_private_name := r.proname || '_impl'",
  'private.upsert_automation_rule_v1_impl',
  'private.set_automation_rule_enabled_v1_impl',
  'private.dispatch_automation_v1_impl',
  'private.decide_automation_approval_v1_impl',
  'grant usage on schema private to authenticated',
  'revoke insert, update, delete on table public.automation_rules from authenticated',
  'revoke insert, update, delete on table public.automation_runs from authenticated',
  'revoke insert, update, delete on table public.automation_run_actions from authenticated',
  'revoke insert, update, delete on table public.automation_approval_requests from authenticated',
]) requireMarker(hardening, marker, 'RPC hardening');

for (const name of ['upsert_automation_rule_v1','set_automation_rule_enabled_v1','dispatch_automation_v1','decide_automation_approval_v1']) {
  const start = hardening.indexOf(`create or replace function public.${name}`);
  const end = start >= 0 ? hardening.indexOf('$$;', start) : -1;
  const wrapper = start >= 0 && end >= 0 ? hardening.slice(start, end + 3).toLowerCase() : '';
  if (!wrapper) errors.push(`RPC hardening missing public wrapper: ${name}`);
  else {
    requireMarker(wrapper, 'security invoker', `${name} public wrapper`);
    requireMarker(wrapper, "set search_path = ''", `${name} public wrapper`);
    forbidMarker(wrapper, 'security definer', `${name} public wrapper`);
  }
}

for (const marker of [
  'set local role authenticated;',
  'has_table_privilege',
  'ENJAZ_AUTOMATION_RULE_STALE',
  "body->>'wasDuplicate'",
  "body->>'status' = 'awaiting_approval'",
  "'rejected'",
  'get_automation_engine_context_v1',
  'reset role;',
  'delete from public.automation_approval_requests',
  'drop function private.enjaz_phase82_probe_assert(boolean,text);',
]) requireMarker(cloudProbe, marker, 'real-cloud probe');

for (const marker of [
  'automation_rules_created_by_idx',
  'automation_rules_updated_by_idx',
  'automation_runs_requested_by_idx',
  'automation_approval_requests_run_idx',
  'automation_approval_requests_rule_idx',
  'automation_approval_requests_requested_by_idx',
  'automation_approval_requests_decided_by_idx',
]) requireMarker(fkHardening, marker, 'FK hardening');

for (const forbidden of ['service_role', 'public.payments', 'public.financial_ledger_entries', 'public.payment_reversals']) forbidMarker(cloudProbe.toLowerCase(), forbidden, 'real-cloud probe');

for (const marker of [
  "authority: 'automation_rules_and_runs'",
  "workflowWriteAuthority: 'existing_workflow_rpc_only_after_human_approval'",
  "financeWriteAuthority: 'none'",
  "'DATA_OUTCOME_UNKNOWN'",
  'upsert_automation_rule_v1',
  'set_automation_rule_enabled_v1',
  'dispatch_automation_v1',
  'decide_automation_approval_v1',
  'get_automation_engine_context_v1',
]) requireMarker(commands, marker, 'automation gateway');

for (const marker of ['AutomationCommandProvider', 'useAutomationCommandGateway']) requireMarker(commandContext, marker, 'automation command context');

for (const marker of [
  'data-automation-stage="8.2"',
  'data-automation-authority="automation_rules_and_runs"',
  'data-finance-write-authority="none"',
  'resolveWorkspaceId',
  'setRuleEnabled',
  "gateway.dispatch(resolvedWorkspaceId, rule.id, 'manual'",
  'decideApproval',
  "rule.triggerConfig.type !== 'manual'",
  'await reload(workspaceId)',
  'لا يوجد تشغيل يدوي مزيف',
]) requireMarker(liveUi, marker, 'live automation UI');

for (const marker of [
  'AutomationCommandProvider',
  'createAutomationCommandGateway(client)',
  'automationCommands: AutomationCommandGateway',
  "import '../automation/automation.css'",
]) requireMarker(productionRoot, marker, 'production root');

for (const marker of [
  "import { LiveAutomationExperience }",
  "if (id === 'automation') return <Automation />",
  'return <LiveAutomationExperience />',
]) requireMarker(operationalRoot, marker, 'R2 automation destination');

requireMarker(navigation, "{ id: 'automation', label: 'الأتمتة', kind: 'launcher_destination', route: '/app/automation', availability: 'live'", 'navigation');

for (const marker of [
  'data-automation-stage="8.2"',
  'data-automation-authority="automation_rules_and_runs"',
  'data-finance-write-authority="none"',
  '1280, 430, 390, 360, 320',
  'activation mutation reloads canonical rule state',
  'manual dispatch accepts explicit payload',
  'human rejection clears pending approval',
]) requireMarker(chromium, marker, 'Real Chromium spec');

for (const marker of [
  'Build isolated Phase 8.2 automation preview',
  'npx playwright install --with-deps chromium',
  'Real Chromium Phase 8.2 acceptance',
  'tests-external/phase8-2-automation.spec.cjs',
  'PHASE82_BASE_URL',
]) requireMarker(workflow, marker, 'Phase 8.2 workflow');

for (const marker of ['receipt key for replay-safe execution','pending human approval evidence','explicit decision idempotency key','outcome-unknown']) requireMarker(tests, marker, 'tests');

if (state.phase !== '8.2' || state.status !== 'IN_PROGRESS' || state.baseCommit !== '65e2c29bc5b656b5c56daa84a893aeff65c5d662') errors.push('Phase 8.2 state identity/base drifted');
if (state.phase8_3Allowed !== false || state.nextPhase !== '8.3' || state.successorStatus !== 'LOCKED') errors.push('Phase 8.3 must remain locked while 8.2 is in progress');
if (state.pullRequest !== 109) errors.push('Phase 8.2 PR evidence must remain bound to PR #109');
if (state.realCloudVerification?.status !== 'PASS' || state.realCloudVerification?.projectRef !== 'juzxriirhkuzviwnhkbd') errors.push('Phase 8.2 authenticated Real Cloud evidence is required before merge');
if (state.realChromium?.status !== 'PENDING' || state.postMergeRecertification?.status !== 'PENDING') errors.push('Chromium/post-merge evidence must remain pending until exact-head/merge verification');
if (phase81.status !== 'CLOSED' || phase81.phase8_2Allowed !== true || phase81.nextPhase !== '8.2') errors.push('Phase 8.1 closure must authorize Phase 8.2');
requireMarker(kickoff, 'Phase 8.3 — Operations Center + Field Operations — M5 remains LOCKED', 'kickoff');
requireMarker(roadmap, '## 8.2 — Automation Engine', 'roadmap');
requireMarker(roadmap, '- Human-readable trigger/condition/action rules.', 'roadmap');
requireMarker(roadmap, '- Idempotency, replay protection, activation/deactivation and explicit failure state.', 'roadmap');
requireMarker(roadmap, '- Human approval gates for sensitive actions.', 'roadmap');

if (errors.length) {
  console.error(`ENJAZ PHASE 8.2 AUTOMATION AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ PHASE 8.2 AUTOMATION AUDIT PASS — canonical rules/runs + live R2 destination preserved; private-definer/public-invoker mutation boundary enforced; authenticated Real Cloud PASS; dedicated Real Chromium contract present; finance authority=none; Phase 8.3 LOCKED.');
}
