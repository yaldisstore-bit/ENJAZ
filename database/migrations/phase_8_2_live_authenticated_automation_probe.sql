-- ENJAZ Phase 8.2 — real authenticated Automation Engine destruction probe
-- Uses one real existing workspace member, exercises the public RPC boundary under
-- SET LOCAL ROLE authenticated, proves replay/stale/approval behavior, then cleans up.
begin;

create or replace function private.enjaz_phase82_probe_assert(p_condition boolean, p_message text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'ENJAZ_PHASE82_PROBE_FAILED: %', p_message;
  end if;
end;
$$;

create or replace function private.enjaz_phase82_expect_stale(p_workspace_id uuid, p_rule_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.set_automation_rule_enabled_v1(p_workspace_id, p_rule_id, 0, false);
  return false;
exception
  when serialization_failure then
    return sqlerrm = 'ENJAZ_AUTOMATION_RULE_STALE';
end;
$$;

revoke all on function private.enjaz_phase82_probe_assert(boolean,text) from public, anon;
revoke all on function private.enjaz_phase82_expect_stale(uuid,uuid) from public, anon;
grant execute on function private.enjaz_phase82_probe_assert(boolean,text) to authenticated;
grant execute on function private.enjaz_phase82_expect_stale(uuid,uuid) to authenticated;

select set_config('enjaz.probe_user_id', (
  select wm.user_id::text
  from public.workspace_memberships wm
  join auth.users u on u.id = wm.user_id
  order by wm.created_at, wm.workspace_id
  limit 1
), true);
select private.enjaz_phase82_probe_assert(
  nullif(current_setting('enjaz.probe_user_id', true), '') is not null,
  'no real authenticated workspace member exists'
);

select set_config('enjaz.probe_workspace_id', (
  select wm.workspace_id::text
  from public.workspace_memberships wm
  where wm.user_id = current_setting('enjaz.probe_user_id')::uuid
  order by wm.created_at, wm.workspace_id
  limit 1
), true);

with inserted as (
  insert into public.companies(workspace_id, legal_name, display_name, status)
  values (
    current_setting('enjaz.probe_workspace_id')::uuid,
    '__ENJAZ_PHASE82_PROBE_COMPANY__' || gen_random_uuid()::text,
    'Phase 8.2 Probe Company',
    'active'
  )
  returning id
)
select set_config('enjaz.probe_company_id', (select id::text from inserted), true);

with inserted as (
  insert into public.transactions(workspace_id, company_id, type, department, status, priority, current_fee)
  values (
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_company_id')::uuid,
    '__ENJAZ_PHASE82_PROBE_TRANSACTION__',
    'QA', 'active', 'normal', 100
  )
  returning id
)
select set_config('enjaz.probe_transaction_id', (select id::text from inserted), true);

select set_config('enjaz.probe_followup_rule_key', 'phase82_followup_' || replace(gen_random_uuid()::text, '-', ''), true);
select set_config('enjaz.probe_approval_rule_key', 'phase82_approval_' || replace(gen_random_uuid()::text, '-', ''), true);
select set_config('enjaz.probe_followup_receipt', 'phase82-followup-' || gen_random_uuid()::text, true);
select set_config('enjaz.probe_approval_receipt', 'phase82-approval-' || gen_random_uuid()::text, true);
select set_config('enjaz.probe_decision_key', gen_random_uuid()::text, true);
select set_config('enjaz.probe_fake_workflow_instance', gen_random_uuid()::text, true);

select set_config(
  'request.jwt.claims',
  jsonb_build_object('role','authenticated','sub',current_setting('enjaz.probe_user_id'))::text,
  true
);
select set_config('request.jwt.claim.sub', current_setting('enjaz.probe_user_id'), true);
set local role authenticated;

select private.enjaz_phase82_probe_assert(
  (select auth.uid()) = current_setting('enjaz.probe_user_id')::uuid,
  'auth.uid did not resolve to the real probe user'
);
select private.enjaz_phase82_probe_assert(
  not has_table_privilege('public.automation_rules', 'INSERT')
  and not has_table_privilege('public.automation_rules', 'UPDATE')
  and not has_table_privilege('public.automation_rules', 'DELETE')
  and not has_table_privilege('public.automation_runs', 'INSERT')
  and not has_table_privilege('public.automation_run_actions', 'INSERT')
  and not has_table_privilege('public.automation_approval_requests', 'INSERT'),
  'authenticated direct automation mutation privileges are not fail-closed'
);

with result as (
  select public.upsert_automation_rule_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    null, null,
    current_setting('enjaz.probe_followup_rule_key'),
    'Phase 8.2 Followup Probe',
    'Authenticated real-cloud probe',
    '{"type":"manual"}'::jsonb,
    '[]'::jsonb,
    '[{"type":"create_followup","title":"Phase 8.2 probe followup","dueInDays":"1"}]'::jsonb,
    '{}'::jsonb,
    true
  ) as body
)
select set_config('enjaz.probe_followup_rule_id', body->>'id', true) from result;

select private.enjaz_phase82_probe_assert(
  private.enjaz_phase82_expect_stale(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_followup_rule_id')::uuid
  ),
  'ENJAZ_AUTOMATION_RULE_STALE was not enforced'
);

with result as (
  select public.dispatch_automation_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_followup_rule_id')::uuid,
    'manual',
    jsonb_build_object('transactionId', current_setting('enjaz.probe_transaction_id')),
    current_setting('enjaz.probe_followup_receipt')
  ) as body
)
select
  set_config('enjaz.probe_followup_run_id', body->>'runId', true),
  private.enjaz_phase82_probe_assert(body->>'status' = 'succeeded', 'authenticated followup dispatch failed'),
  private.enjaz_phase82_probe_assert(not (body->>'wasDuplicate')::boolean, 'first dispatch marked duplicate')
from result;

with replay as (
  select public.dispatch_automation_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_followup_rule_id')::uuid,
    'manual',
    jsonb_build_object('transactionId', current_setting('enjaz.probe_transaction_id')),
    current_setting('enjaz.probe_followup_receipt')
  ) as body
)
select private.enjaz_phase82_probe_assert(
  (body->>'wasDuplicate')::boolean
  and body->>'runId' = current_setting('enjaz.probe_followup_run_id'),
  'receipt replay was not idempotent'
) from replay;

select private.enjaz_phase82_probe_assert(
  (select count(*) = 1
   from public.transaction_followups f
   where f.workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
     and f.transaction_id = current_setting('enjaz.probe_transaction_id')::uuid
     and f.title = 'Phase 8.2 probe followup'),
  'replay created duplicate followup side effects'
);

with result as (
  select public.upsert_automation_rule_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    null, null,
    current_setting('enjaz.probe_approval_rule_key'),
    'Phase 8.2 Approval Probe',
    'Authenticated approval-gate probe',
    '{"type":"manual"}'::jsonb,
    '[]'::jsonb,
    '[{"type":"workflow_transition","transitionKey":"advance","instanceIdField":"workflowInstanceId","expectedStageField":"expectedStage","reason":"Phase 8.2 probe approval"}]'::jsonb,
    '{}'::jsonb,
    true
  ) as body
)
select set_config('enjaz.probe_approval_rule_id', body->>'id', true) from result;

with result as (
  select public.dispatch_automation_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_approval_rule_id')::uuid,
    'manual',
    jsonb_build_object(
      'workflowInstanceId', current_setting('enjaz.probe_fake_workflow_instance'),
      'expectedStage', 1
    ),
    current_setting('enjaz.probe_approval_receipt')
  ) as body
)
select
  set_config('enjaz.probe_approval_run_id', body->>'runId', true),
  private.enjaz_phase82_probe_assert(body->>'status' = 'awaiting_approval', 'sensitive workflow action bypassed approval')
from result;

select set_config('enjaz.probe_approval_id', (
  select a.id::text
  from public.automation_approval_requests a
  where a.workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
    and a.automation_run_id = current_setting('enjaz.probe_approval_run_id')::uuid
    and a.status = 'pending'
  limit 1
), true);
select private.enjaz_phase82_probe_assert(
  nullif(current_setting('enjaz.probe_approval_id', true), '') is not null,
  'pending human approval evidence missing'
);

with decision as (
  select public.decide_automation_approval_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_approval_id')::uuid,
    'rejected',
    'Phase 8.2 probe rejection',
    current_setting('enjaz.probe_decision_key')::uuid
  ) as body
)
select private.enjaz_phase82_probe_assert(
  body->>'runStatus' = 'skipped' and not (body->>'wasDuplicate')::boolean,
  'human rejection did not fail closed'
) from decision;

with replay as (
  select public.decide_automation_approval_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_approval_id')::uuid,
    'rejected',
    'Phase 8.2 probe rejection',
    current_setting('enjaz.probe_decision_key')::uuid
  ) as body
)
select private.enjaz_phase82_probe_assert(
  (body->>'wasDuplicate')::boolean and body->>'runStatus' = 'skipped',
  'approval decision replay was not idempotent'
) from replay;

with context as (
  select public.get_automation_engine_context_v1(current_setting('enjaz.probe_workspace_id')::uuid) as body
)
select private.enjaz_phase82_probe_assert(
  body->>'authority' = 'automation_rules_and_runs'
  and body->>'workflowWriteAuthority' = 'existing_workflow_rpc_only_after_human_approval'
  and body->>'financeWriteAuthority' = 'none',
  'automation authority context drifted'
) from context;

reset role;

delete from public.audit_events
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and action like 'automation.%'
  and entity_id in (
    current_setting('enjaz.probe_followup_rule_id')::uuid,
    current_setting('enjaz.probe_approval_rule_id')::uuid,
    current_setting('enjaz.probe_followup_run_id')::uuid,
    current_setting('enjaz.probe_approval_run_id')::uuid,
    current_setting('enjaz.probe_approval_id')::uuid
  );
delete from public.automation_approval_requests
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and id = current_setting('enjaz.probe_approval_id')::uuid;
delete from public.automation_run_actions
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and automation_run_id in (
    current_setting('enjaz.probe_followup_run_id')::uuid,
    current_setting('enjaz.probe_approval_run_id')::uuid
  );
delete from public.automation_runs
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and id in (
    current_setting('enjaz.probe_followup_run_id')::uuid,
    current_setting('enjaz.probe_approval_run_id')::uuid
  );
delete from public.automation_rules
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and id in (
    current_setting('enjaz.probe_followup_rule_id')::uuid,
    current_setting('enjaz.probe_approval_rule_id')::uuid
  );
delete from public.transaction_followups
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and transaction_id = current_setting('enjaz.probe_transaction_id')::uuid
  and title = 'Phase 8.2 probe followup';
delete from public.transactions
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and id = current_setting('enjaz.probe_transaction_id')::uuid;
delete from public.companies
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and id = current_setting('enjaz.probe_company_id')::uuid;

drop function private.enjaz_phase82_expect_stale(uuid,uuid);
drop function private.enjaz_phase82_probe_assert(boolean,text);

commit;
