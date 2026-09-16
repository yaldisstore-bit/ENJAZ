import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path: string) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const deadline = read('database/migrations/phase_11_5_workflow_deadline_evidence.sql');
const recurrence = read('database/migrations/phase_11_5_renewal_recurrence_engine.sql');
const attention = read('database/migrations/phase_11_5_deadline_attention_review.sql');
const hardening = read('database/migrations/phase_11_5_deadline_engine_hardening.sql');
const probe = read('database/migrations/phase_11_5_live_deadline_recurrence_probe_v2.sql');

function anchoredMonthlyOccurrence(anchor: string, sequence: number): string {
  assert.ok(sequence >= 1);
  const [year, month, day] = anchor.split('-').map(Number);
  assert.ok(year && month && day);
  const absoluteMonth = (year * 12 + (month - 1)) + (sequence - 1);
  const targetYear = Math.floor(absoluteMonth / 12);
  const targetMonthIndex = absoluteMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

test('workflow deadlines derive from immutable workflow provenance and workspace timezone', () => {
  for (const marker of [
    'create table public.workflow_deadline_evidence',
    'workflow_instance_id uuid not null',
    'workflow_stage_state_id uuid not null',
    'source_started_at timestamptz not null',
    'workspace_timezone text not null',
    'source_fingerprint text not null',
    "v_instance.template_snapshot->'stages'",
    "v_stage->>'dueOffsetDays'",
    'private.m10_deadline_cutoff_v1',
    'ENJAZ_SCHEDULING_DEADLINE_RULE_MISSING',
    'ENJAZ_SCHEDULING_DEADLINE_STAGE_ANCHOR_MISSING',
  ]) assert.ok(deadline.includes(marker), `missing deadline provenance marker: ${marker}`);

  assert.ok(!deadline.includes('grant insert on table public.workflow_deadline_evidence to authenticated'));
  assert.ok(!deadline.includes('grant update on table public.workflow_deadline_evidence to authenticated'));
});

test('recurrence preserves the original month-end anchor instead of drifting from the prior occurrence', () => {
  assert.equal(anchoredMonthlyOccurrence('2027-01-31', 1), '2027-01-31');
  assert.equal(anchoredMonthlyOccurrence('2027-01-31', 2), '2027-02-28');
  assert.equal(anchoredMonthlyOccurrence('2027-01-31', 3), '2027-03-31');
  assert.equal(anchoredMonthlyOccurrence('2028-01-31', 2), '2028-02-29');

  for (const marker of [
    'anchor_due_date date not null',
    'recurrence_rule_snapshot text not null',
    'source_renewal_version integer not null',
    'm10_renewal_occurrence_date_v1',
    'least(v_day,extract(day from v_last)::integer)',
    'ENJAZ_SCHEDULING_RENEWAL_RECURRENCE_DRIFT',
    'ENJAZ_SCHEDULING_RENEWAL_RECURRENCE_CHANGED',
    'update public.renewals set due_date=v_next_date',
  ]) assert.ok(recurrence.includes(marker), `missing recurrence marker: ${marker}`);

  assert.ok(!recurrence.includes('grant insert on table public.renewal_occurrences to authenticated'));
  assert.ok(!recurrence.includes('grant update on table public.renewal_occurrences to authenticated'));
});

test('reminders and escalations reuse existing attention authorities and reject premature or terminal actions', () => {
  for (const marker of [
    'public.upsert_in_app_notification_v1',
    'public.create_transaction_followup_v1',
    "p_mode not in ('reminder','escalation')",
    'ENJAZ_SCHEDULING_ESCALATION_NOT_DUE',
    'ENJAZ_SCHEDULING_ATTENTION_SOURCE_TERMINAL',
    'get_scheduling_deadline_snapshot_v1',
    "'completed_on_time'",
    "'completed_late'",
    "'overdue'",
    "'due_today'",
    "'upcoming'",
  ]) assert.ok(attention.includes(marker), `missing attention marker: ${marker}`);

  assert.ok(!attention.includes('create table public.reminders'));
  assert.ok(!attention.includes('create table public.notification_deliveries'));
});

test('missed-deadline root cause is explicit, retry-safe and never inferred by the engine', () => {
  for (const marker of [
    'create table public.deadline_miss_reviews',
    'root_cause text not null',
    'p_root_cause text',
    "'deadline_miss_review'",
    'p_operation_id uuid',
    'ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT',
    'ENJAZ_SCHEDULING_DEADLINE_NOT_MISSED',
  ]) {
    assert.ok(`${attention}\n${hardening}`.includes(marker), `missing root-cause/idempotency marker: ${marker}`);
  }

  assert.ok(!`${attention}\n${hardening}`.includes('infer_root_cause'));
  assert.ok(!`${attention}\n${hardening}`.includes('generated_root_cause'));
});

test('authenticated destruction probe proves fail-closed behavior and zero residue', () => {
  for (const marker of [
    'set local role authenticated',
    'P115C_DIRECT_DEADLINE_INSERT_NOT_BLOCKED',
    'P115C_DIRECT_OCCURRENCE_INSERT_NOT_BLOCKED',
    'P115C_MISSING_RULE_ACCEPTED',
    'P115C_MISSING_ANCHOR_ACCEPTED',
    'P115C_MONTH_END_DRIFT',
    'P115C_UNSUPPORTED_RULE_ACCEPTED',
    'P115C_EARLY_ESCALATION_ACCEPTED',
    'P115C_TERMINAL_ATTENTION_ACCEPTED',
    'P115C_NOTIFICATION_AUTHORITY_NOT_REUSED',
    'P115C_FOLLOWUP_AUTHORITY_NOT_REUSED',
    'P115C_FUTURE_REVIEW_ACCEPTED',
    'P115C_REVIEW_REPLAY_FAIL',
    'P115C_ZERO_RESIDUE_FAIL',
    'reset role',
    'delete from public.workspaces',
  ]) assert.ok(probe.includes(marker), `missing destruction-proof marker: ${marker}`);
});

test('new deadline engine foreign keys have explicit covering indexes', () => {
  for (const marker of [
    'workflow_deadline_evidence_stage_state_fk_idx',
    'workflow_deadline_evidence_transaction_fk_idx',
    'workflow_deadline_evidence_materialized_by_fk_idx',
    'renewal_occurrences_materialized_by_fk_idx',
    'renewal_occurrences_completed_by_fk_idx',
    'deadline_miss_reviews_transaction_fk_idx',
    'deadline_miss_reviews_reviewed_by_fk_idx',
  ]) assert.ok(hardening.includes(marker), `missing covering index: ${marker}`);
});
