import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('database/migrations/phase_8_2_automation_engine.sql');
const commands = read('src/features/automation/automationCommands.ts');
const tests = read('tests/automationEngine.test.ts');
const state = JSON.parse(read('docs/PHASE8_2_STATE.json'));
const kickoff = read('docs/PHASE8_2_KICKOFF.md');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const phase81 = JSON.parse(read('docs/PHASE8_1_STATE.json'));
const errors = [];

const requireMarker = (source, marker, label) => { if (!source.includes(marker)) errors.push(`${label} missing marker: ${marker}`); };
const forbidMarker = (source, marker, label) => { if (source.includes(marker)) errors.push(`${label} forbidden marker: ${marker}`); };

for (const marker of [
  'alter table public.automation_rules',
  'alter table public.automation_runs',
  'create table public.automation_run_actions',
  'create table public.automation_approval_requests',
  'automation_runs_receipt_unique_idx',
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

for (const marker of ['receipt key for replay-safe execution','pending human approval evidence','explicit decision idempotency key','outcome-unknown']) requireMarker(tests, marker, 'tests');

if (state.phase !== '8.2' || state.status !== 'IN_PROGRESS' || state.baseCommit !== '65e2c29bc5b656b5c56daa84a893aeff65c5d662') errors.push('Phase 8.2 state identity/base drifted');
if (state.phase8_3Allowed !== false || state.nextPhase !== '8.3' || state.successorStatus !== 'LOCKED') errors.push('Phase 8.3 must remain locked while 8.2 is in progress');
if (state.realCloudVerification?.status !== 'PENDING' || state.realChromium?.status !== 'PENDING' || state.postMergeRecertification?.status !== 'PENDING') errors.push('Phase 8.2 cannot claim closure evidence at kickoff');
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
  console.log('ENJAZ PHASE 8.2 AUTOMATION AUDIT PASS — canonical rules/runs preserved; replay/stale/failure/approval boundaries enforced; finance authority=none; Phase 8.3 LOCKED.');
}
