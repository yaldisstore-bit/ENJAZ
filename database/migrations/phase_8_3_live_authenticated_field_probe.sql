-- ENJAZ Phase 8.3 — authenticated Real Cloud Operations + Field destruction probe
-- Uses one real workspace member, exercises the public RPC boundary under authenticated,
-- proves RLS/idempotency/stale/offline-identity/location/finance isolation, then removes all probe data.
begin;

create or replace function private.enjaz_phase83_probe_assert(p_condition boolean, p_message text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'ENJAZ_PHASE83_PROBE_FAILED: %', p_message;
  end if;
end;
$$;

create or replace function private.enjaz_phase83_expect_assignment_stale(
  p_workspace_id uuid,
  p_assignment_id uuid,
  p_transaction_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.upsert_field_assignment_v1(
    p_workspace_id,
    p_assignment_id,
    0,
    p_transaction_id,
    p_user_id,
    current_date,
    'Phase 8.3 Probe Destination',
    'QA',
    'high'
  );
  return false;
exception
  when serialization_failure then
    return sqlerrm = 'ENJAZ_FIELD_ASSIGNMENT_STALE';
end;
$$;

create or replace function private.enjaz_phase83_expect_checkin_drift(
  p_workspace_id uuid,
  p_assignment_id uuid,
  p_operation_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.start_field_visit_v1(
    p_workspace_id,
    p_assignment_id,
    1,
    jsonb_build_object('lat',33.3153,'lng',44.3661,'accuracyMeters',25),
    p_operation_id
  );
  return false;
exception
  when unique_violation then
    return sqlerrm = 'ENJAZ_FIELD_IDEMPOTENCY_CONFLICT';
end;
$$;

revoke all on function private.enjaz_phase83_probe_assert(boolean,text) from public,anon;
revoke all on function private.enjaz_phase83_expect_assignment_stale(uuid,uuid,uuid,uuid) from public,anon;
revoke all on function private.enjaz_phase83_expect_checkin_drift(uuid,uuid,uuid) from public,anon;
grant execute on function private.enjaz_phase83_probe_assert(boolean,text) to authenticated;
grant execute on function private.enjaz_phase83_expect_assignment_stale(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function private.enjaz_phase83_expect_checkin_drift(uuid,uuid,uuid) to authenticated;

select set_config('enjaz.probe_started_at', clock_timestamp()::text, true);
select set_config('enjaz.probe_user_id', (
  select wm.user_id::text
  from public.workspace_memberships wm
  join auth.users u on u.id=wm.user_id
  order by wm.created_at,wm.workspace_id
  limit 1
), true);
select private.enjaz_phase83_probe_assert(
  nullif(current_setting('enjaz.probe_user_id',true),'') is not null,
  'no real authenticated workspace member exists'
);
select set_config('enjaz.probe_workspace_id', (
  select wm.workspace_id::text
  from public.workspace_memberships wm
  where wm.user_id=current_setting('enjaz.probe_user_id')::uuid
  order by wm.created_at,wm.workspace_id
  limit 1
), true);
select private.enjaz_phase83_probe_assert(
  exists(select 1 from public.workspace_settings ws where ws.workspace_id=current_setting('enjaz.probe_workspace_id')::uuid),
  'probe workspace has no canonical workspace_settings row'
);
select set_config('enjaz.probe_prior_policy',(
  select ws.field_operations_policy::text from public.workspace_settings ws
  where ws.workspace_id=current_setting('enjaz.probe_workspace_id')::uuid
),true);
select set_config('enjaz.probe_prior_settings_updated_at',(
  select ws.updated_at::text from public.workspace_settings ws
  where ws.workspace_id=current_setting('enjaz.probe_workspace_id')::uuid
),true);

with inserted as (
  insert into public.companies(workspace_id,legal_name,display_name,status)
  values(
    current_setting('enjaz.probe_workspace_id')::uuid,
    '__ENJAZ_PHASE83_PROBE_COMPANY__'||gen_random_uuid()::text,
    'Phase 8.3 Probe Company',
    'active'
  ) returning id
)
select set_config('enjaz.probe_company_id',(select id::text from inserted),true);

with inserted as (
  insert into public.transactions(workspace_id,company_id,type,department,status,priority,current_fee)
  values(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_company_id')::uuid,
    '__ENJAZ_PHASE83_PROBE_TRANSACTION__',
    'QA','active','normal',100
  ) returning id
)
select set_config('enjaz.probe_transaction_id',(select id::text from inserted),true);

select set_config('enjaz.probe_checkin_operation_id',gen_random_uuid()::text,true);
select set_config('enjaz.probe_evidence_operation_id',gen_random_uuid()::text,true);
select set_config('enjaz.probe_checkout_operation_id',gen_random_uuid()::text,true);
select set_config('enjaz.probe_handoff_operation_id',gen_random_uuid()::text,true);

select set_config(
  'request.jwt.claims',
  jsonb_build_object('role','authenticated','sub',current_setting('enjaz.probe_user_id'))::text,
  true
);
select set_config('request.jwt.claim.sub',current_setting('enjaz.probe_user_id'),true);
set local role authenticated;

select private.enjaz_phase83_probe_assert(
  (select auth.uid())=current_setting('enjaz.probe_user_id')::uuid,
  'auth.uid did not resolve to the real probe user'
);
select private.enjaz_phase83_probe_assert(
  not has_table_privilege('public.field_assignments','INSERT')
  and not has_table_privilege('public.field_assignments','UPDATE')
  and not has_table_privilege('public.field_assignments','DELETE')
  and not has_table_privilege('public.field_visits','INSERT')
  and not has_table_privilege('public.field_visits','UPDATE')
  and not has_table_privilege('public.field_visits','DELETE')
  and not has_table_privilege('public.field_visit_evidence','INSERT')
  and not has_table_privilege('public.field_visit_evidence','UPDATE')
  and not has_table_privilege('public.field_visit_evidence','DELETE')
  and not has_table_privilege('public.field_sync_receipts','INSERT')
  and not has_table_privilege('public.field_sync_receipts','UPDATE')
  and not has_table_privilege('public.field_sync_receipts','DELETE'),
  'authenticated direct field mutation privileges are not fail-closed'
);

with context as (
  select public.get_field_operations_context_v1(current_setting('enjaz.probe_workspace_id')::uuid) body
)
select private.enjaz_phase83_probe_assert(
  body->>'authority'='field_assignments_visits_evidence_receipts'
  and body->>'transactionWriteAuthority'='none'
  and body->>'workflowWriteAuthority'='existing_workflow_rpc_only'
  and body->>'automationWriteAuthority'='existing_automation_rpc_only'
  and body->>'financeWriteAuthority'='none',
  'field authority context drifted'
) from context;

with policy as (
  select public.set_field_location_policy_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    'optional'
  ) body
)
select private.enjaz_phase83_probe_assert(
  body->>'locationEvidence'='optional',
  'authenticated location policy RPC failed'
) from policy;

with context as (
  select public.get_field_operations_context_v1(current_setting('enjaz.probe_workspace_id')::uuid) body
)
select private.enjaz_phase83_probe_assert(
  body->>'locationPolicy'='optional',
  'location policy did not round-trip through canonical context'
) from context;

with created as (
  select public.upsert_field_assignment_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    null,null,
    current_setting('enjaz.probe_transaction_id')::uuid,
    current_setting('enjaz.probe_user_id')::uuid,
    current_date,
    'Phase 8.3 Probe Destination',
    'QA',
    'high'
  ) body
)
select
  set_config('enjaz.probe_assignment_id',body->>'id',true),
  set_config('enjaz.probe_assignment_version',body->>'version',true),
  private.enjaz_phase83_probe_assert(body->>'status'='queued','assignment was not created queued'),
  private.enjaz_phase83_probe_assert((body->>'version')::integer=1,'new assignment version was not 1')
from created;

select private.enjaz_phase83_probe_assert(
  private.enjaz_phase83_expect_assignment_stale(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_assignment_id')::uuid,
    current_setting('enjaz.probe_transaction_id')::uuid,
    current_setting('enjaz.probe_user_id')::uuid
  ),
  'ENJAZ_FIELD_ASSIGNMENT_STALE was not enforced'
);

with checkin as (
  select public.start_field_visit_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_assignment_id')::uuid,
    1,
    jsonb_build_object('lat',33.3152,'lng',44.3661,'accuracyMeters',25),
    current_setting('enjaz.probe_checkin_operation_id')::uuid
  ) body
)
select
  set_config('enjaz.probe_visit_id',body->>'visitId',true),
  set_config('enjaz.probe_visit_version',body->>'visitVersion',true),
  set_config('enjaz.probe_assignment_version',body->>'assignmentVersion',true),
  private.enjaz_phase83_probe_assert(not (body->>'wasDuplicate')::boolean,'first check-in marked duplicate'),
  private.enjaz_phase83_probe_assert(body->>'visitId'=current_setting('enjaz.probe_checkin_operation_id'),'offline operation UUID did not become canonical visit UUID'),
  private.enjaz_phase83_probe_assert((body->>'visitVersion')::integer=1,'check-in visit version drifted'),
  private.enjaz_phase83_probe_assert((body->>'assignmentVersion')::integer=2,'check-in assignment version drifted')
from checkin;

with replay as (
  select public.start_field_visit_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_assignment_id')::uuid,
    1,
    jsonb_build_object('lat',33.3152,'lng',44.3661,'accuracyMeters',25),
    current_setting('enjaz.probe_checkin_operation_id')::uuid
  ) body
)
select private.enjaz_phase83_probe_assert(
  (body->>'wasDuplicate')::boolean
  and body->>'visitId'=current_setting('enjaz.probe_visit_id'),
  'check-in replay was not idempotent'
) from replay;

select private.enjaz_phase83_probe_assert(
  private.enjaz_phase83_expect_checkin_drift(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_assignment_id')::uuid,
    current_setting('enjaz.probe_checkin_operation_id')::uuid
  ),
  'check-in payload drift did not fail closed'
);
select private.enjaz_phase83_probe_assert(
  (select count(*)=1 from public.field_visits v
   where v.workspace_id=current_setting('enjaz.probe_workspace_id')::uuid
     and v.id=current_setting('enjaz.probe_visit_id')::uuid),
  'check-in replay created duplicate visits'
);

with evidence as (
  select public.add_field_visit_evidence_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_visit_id')::uuid,
    1,
    'other',null,
    'Phase 8.3 authenticated field evidence',
    current_setting('enjaz.probe_evidence_operation_id')::uuid
  ) body
)
select
  set_config('enjaz.probe_evidence_id',body->>'evidenceId',true),
  set_config('enjaz.probe_visit_version',body->>'visitVersion',true),
  private.enjaz_phase83_probe_assert(not (body->>'wasDuplicate')::boolean,'first evidence mutation marked duplicate'),
  private.enjaz_phase83_probe_assert((body->>'visitVersion')::integer=2,'evidence did not advance visit version')
from evidence;

with replay as (
  select public.add_field_visit_evidence_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_visit_id')::uuid,
    1,
    'other',null,
    'Phase 8.3 authenticated field evidence',
    current_setting('enjaz.probe_evidence_operation_id')::uuid
  ) body
)
select private.enjaz_phase83_probe_assert(
  (body->>'wasDuplicate')::boolean
  and body->>'evidenceId'=current_setting('enjaz.probe_evidence_id'),
  'evidence replay was not idempotent'
) from replay;
select private.enjaz_phase83_probe_assert(
  (select count(*)=1 from public.field_visit_evidence e
   where e.workspace_id=current_setting('enjaz.probe_workspace_id')::uuid
     and e.visit_id=current_setting('enjaz.probe_visit_id')::uuid),
  'evidence replay created duplicate evidence'
);
select private.enjaz_phase83_probe_assert(
  (select count(*)=0 from public.payments p
   where p.workspace_id=current_setting('enjaz.probe_workspace_id')::uuid
     and p.transaction_id=current_setting('enjaz.probe_transaction_id')::uuid),
  'probe transaction unexpectedly had finance rows before checkout'
);

with checkout as (
  select public.finish_field_visit_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_visit_id')::uuid,
    2,
    'completed',null,
    'Phase 8.3 authenticated visit completed',
    'QA Counter',
    'PHASE83-REF',
    12500.00,
    jsonb_build_object('lat',33.3152,'lng',44.3661,'accuracyMeters',20),
    current_setting('enjaz.probe_checkout_operation_id')::uuid
  ) body
)
select
  set_config('enjaz.probe_visit_version',body->>'visitVersion',true),
  set_config('enjaz.probe_assignment_version',body->>'assignmentVersion',true),
  private.enjaz_phase83_probe_assert(not (body->>'wasDuplicate')::boolean,'first checkout marked duplicate'),
  private.enjaz_phase83_probe_assert((body->>'officialFeeEvidenceOnly')::boolean,'official fee was not explicitly evidence-only'),
  private.enjaz_phase83_probe_assert(body->>'visitStatus'='completed','visit did not complete'),
  private.enjaz_phase83_probe_assert(body->>'assignmentStatus'='visit_complete','assignment did not enter visit_complete')
from checkout;
select private.enjaz_phase83_probe_assert(
  (select count(*)=0 from public.payments p
   where p.workspace_id=current_setting('enjaz.probe_workspace_id')::uuid
     and p.transaction_id=current_setting('enjaz.probe_transaction_id')::uuid),
  'field official fee evidence created a finance payment'
);

with replay as (
  select public.finish_field_visit_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_visit_id')::uuid,
    2,
    'completed',null,
    'Phase 8.3 authenticated visit completed',
    'QA Counter',
    'PHASE83-REF',
    12500.00,
    jsonb_build_object('lat',33.3152,'lng',44.3661,'accuracyMeters',20),
    current_setting('enjaz.probe_checkout_operation_id')::uuid
  ) body
)
select private.enjaz_phase83_probe_assert(
  (body->>'wasDuplicate')::boolean
  and body->>'visitId'=current_setting('enjaz.probe_visit_id'),
  'checkout replay was not idempotent'
) from replay;

with handoff as (
  select public.handoff_field_assignment_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_assignment_id')::uuid,
    current_setting('enjaz.probe_assignment_version')::integer,
    'Phase 8.3 authenticated handoff complete',
    current_setting('enjaz.probe_handoff_operation_id')::uuid
  ) body
)
select
  set_config('enjaz.probe_assignment_version',body->>'version',true),
  private.enjaz_phase83_probe_assert(not (body->>'wasDuplicate')::boolean,'first handoff marked duplicate'),
  private.enjaz_phase83_probe_assert(body->>'status'='handoff_complete','handoff did not complete'),
  private.enjaz_phase83_probe_assert(body->>'handoffDirection'='field_to_office','handoff direction drifted')
from handoff;

with replay as (
  select public.handoff_field_assignment_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_assignment_id')::uuid,
    (current_setting('enjaz.probe_assignment_version')::integer-1),
    'Phase 8.3 authenticated handoff complete',
    current_setting('enjaz.probe_handoff_operation_id')::uuid
  ) body
)
select private.enjaz_phase83_probe_assert(
  (body->>'wasDuplicate')::boolean
  and body->>'status'='handoff_complete',
  'handoff replay was not idempotent'
) from replay;

with context as (
  select public.get_field_operations_context_v1(current_setting('enjaz.probe_workspace_id')::uuid) body
)
select private.enjaz_phase83_probe_assert(
  body->>'authority'='field_assignments_visits_evidence_receipts'
  and body->>'financeWriteAuthority'='none'
  and exists(
    select 1 from jsonb_array_elements(body->'assignments') a
    where a->>'id'=current_setting('enjaz.probe_assignment_id')
      and a->>'status'='handoff_complete'
  )
  and exists(
    select 1 from jsonb_array_elements(body->'visits') v
    where v->>'id'=current_setting('enjaz.probe_visit_id')
      and v->>'status'='completed'
      and (v->>'evidenceCount')::integer=1
      and (v->>'checkInLocationRecorded')::boolean
      and (v->>'checkOutLocationRecorded')::boolean
  ),
  'final canonical field context did not reflect completed probe state'
) from context;

reset role;

-- Remove only artifacts tied to the unique probe identities, then restore the pre-probe workspace policy exactly.
delete from public.audit_events
where workspace_id=current_setting('enjaz.probe_workspace_id')::uuid
  and actor_user_id=current_setting('enjaz.probe_user_id')::uuid
  and created_at>=current_setting('enjaz.probe_started_at')::timestamptz
  and (
    entity_id in (
      current_setting('enjaz.probe_assignment_id')::uuid,
      current_setting('enjaz.probe_visit_id')::uuid,
      current_setting('enjaz.probe_evidence_id')::uuid
    )
    or (action='field.location_policy.changed' and entity_id=current_setting('enjaz.probe_workspace_id')::uuid)
  );
delete from public.field_sync_receipts
where workspace_id=current_setting('enjaz.probe_workspace_id')::uuid
  and client_operation_id in (
    current_setting('enjaz.probe_checkin_operation_id')::uuid,
    current_setting('enjaz.probe_evidence_operation_id')::uuid,
    current_setting('enjaz.probe_checkout_operation_id')::uuid,
    current_setting('enjaz.probe_handoff_operation_id')::uuid
  );
delete from public.field_visit_evidence
where workspace_id=current_setting('enjaz.probe_workspace_id')::uuid
  and id=current_setting('enjaz.probe_evidence_id')::uuid;
delete from public.field_visits
where workspace_id=current_setting('enjaz.probe_workspace_id')::uuid
  and id=current_setting('enjaz.probe_visit_id')::uuid;
delete from public.field_assignments
where workspace_id=current_setting('enjaz.probe_workspace_id')::uuid
  and id=current_setting('enjaz.probe_assignment_id')::uuid;
delete from public.transactions
where workspace_id=current_setting('enjaz.probe_workspace_id')::uuid
  and id=current_setting('enjaz.probe_transaction_id')::uuid;
delete from public.companies
where workspace_id=current_setting('enjaz.probe_workspace_id')::uuid
  and id=current_setting('enjaz.probe_company_id')::uuid;
update public.workspace_settings
set field_operations_policy=current_setting('enjaz.probe_prior_policy')::jsonb,
    updated_at=current_setting('enjaz.probe_prior_settings_updated_at')::timestamptz
where workspace_id=current_setting('enjaz.probe_workspace_id')::uuid;

select private.enjaz_phase83_probe_assert(
  not exists(select 1 from public.companies c where c.id=current_setting('enjaz.probe_company_id')::uuid)
  and not exists(select 1 from public.transactions t where t.id=current_setting('enjaz.probe_transaction_id')::uuid)
  and not exists(select 1 from public.field_assignments a where a.id=current_setting('enjaz.probe_assignment_id')::uuid)
  and not exists(select 1 from public.field_visits v where v.id=current_setting('enjaz.probe_visit_id')::uuid)
  and not exists(select 1 from public.field_visit_evidence e where e.id=current_setting('enjaz.probe_evidence_id')::uuid)
  and not exists(select 1 from public.field_sync_receipts r where r.client_operation_id in (
    current_setting('enjaz.probe_checkin_operation_id')::uuid,
    current_setting('enjaz.probe_evidence_operation_id')::uuid,
    current_setting('enjaz.probe_checkout_operation_id')::uuid,
    current_setting('enjaz.probe_handoff_operation_id')::uuid
  )),
  'probe cleanup left canonical data residue'
);
select private.enjaz_phase83_probe_assert(
  (select ws.field_operations_policy=current_setting('enjaz.probe_prior_policy')::jsonb
   from public.workspace_settings ws
   where ws.workspace_id=current_setting('enjaz.probe_workspace_id')::uuid),
  'workspace field location policy was not restored'
);

drop function private.enjaz_phase83_expect_checkin_drift(uuid,uuid,uuid);
drop function private.enjaz_phase83_expect_assignment_stale(uuid,uuid,uuid,uuid);
drop function private.enjaz_phase83_probe_assert(boolean,text);

commit;
