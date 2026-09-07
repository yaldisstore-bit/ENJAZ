-- ENJAZ Phase 7.5 — Real Cloud finance destruction/reconciliation probe
-- Transaction-isolated probe over a real authenticated workspace. It exercises the same
-- public RPC boundary used by the browser, then removes every probe row before commit.

begin;

create or replace function private.enjaz_phase75_assert(p_condition boolean, p_message text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'ENJAZ_PHASE75_PROBE_FAILED: %', p_message;
  end if;
end;
$$;
revoke all on function private.enjaz_phase75_assert(boolean,text) from public, anon;
grant execute on function private.enjaz_phase75_assert(boolean,text) to authenticated;

create or replace function private.enjaz_phase75_expect_payment_conflict(
  p_workspace uuid, p_transaction uuid, p_key uuid
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  begin
    perform public.post_payment_v1(p_workspace, p_transaction, 9999999999999999.98, 'transfer', now(), 'changed replay payload', p_key, null, null);
    raise exception 'ENJAZ_PHASE75_EXPECTED_IDEMPOTENCY_CONFLICT_MISSING';
  exception when unique_violation then null;
  end;
end;
$$;
revoke all on function private.enjaz_phase75_expect_payment_conflict(uuid,uuid,uuid) from public, anon;
grant execute on function private.enjaz_phase75_expect_payment_conflict(uuid,uuid,uuid) to authenticated;

select set_config('enjaz.p75_user', (
  select wm.user_id::text from public.workspace_memberships wm
  join auth.users u on u.id = wm.user_id
  order by wm.created_at, wm.workspace_id limit 1
), true);
select private.enjaz_phase75_assert(nullif(current_setting('enjaz.p75_user', true), '') is not null, 'no authenticated member exists');

select set_config('enjaz.p75_workspace', (
  select wm.workspace_id::text from public.workspace_memberships wm
  where wm.user_id = current_setting('enjaz.p75_user')::uuid
  order by wm.created_at, wm.workspace_id limit 1
), true);

with inserted as (
  insert into public.companies(workspace_id, legal_name, display_name, status)
  values (current_setting('enjaz.p75_workspace')::uuid, '__ENJAZ_PHASE75_PROBE_COMPANY__', 'Phase 7.5 Probe', 'active') returning id
)
select set_config('enjaz.p75_company', (select id::text from inserted), true);

with inserted as (
  insert into public.transactions(workspace_id, company_id, type, department, status, priority, current_fee)
  values (current_setting('enjaz.p75_workspace')::uuid, current_setting('enjaz.p75_company')::uuid, '__ENJAZ_PHASE75_PROBE_TRANSACTION__', 'QA', 'active', 'normal', 1.00) returning id
)
select set_config('enjaz.p75_transaction', (select id::text from inserted), true);

select set_config('enjaz.p75_payment_key', gen_random_uuid()::text, true);
select set_config('enjaz.p75_reversal_key', gen_random_uuid()::text, true);
select set_config('request.jwt.claims', jsonb_build_object('role','authenticated','sub',current_setting('enjaz.p75_user'))::text, true);
select set_config('request.jwt.claim.sub', current_setting('enjaz.p75_user'), true);
set local role authenticated;

select private.enjaz_phase75_assert((select auth.uid()) = current_setting('enjaz.p75_user')::uuid, 'real authenticated identity failed');

-- Huge numeric(18,2) boundary: exact, durable and idempotent.
with result as (
  select public.post_payment_v1(
    current_setting('enjaz.p75_workspace')::uuid,
    current_setting('enjaz.p75_transaction')::uuid,
    9999999999999999.99,
    'transfer', now(), 'Phase 7.5 huge-value probe',
    current_setting('enjaz.p75_payment_key')::uuid, null, null
  ) body
)
select set_config('enjaz.p75_payment', body->>'paymentId', true) from result;

select private.enjaz_phase75_assert(
  (public.get_payment_receipt_v1(current_setting('enjaz.p75_workspace')::uuid, current_setting('enjaz.p75_payment')::uuid)->>'amount') = '9999999999999999.99',
  'huge exact amount drifted'
);
select private.enjaz_phase75_assert(
  (public.post_payment_v1(
    current_setting('enjaz.p75_workspace')::uuid,
    current_setting('enjaz.p75_transaction')::uuid,
    9999999999999999.99,
    'transfer', now(), 'Phase 7.5 huge-value probe',
    current_setting('enjaz.p75_payment_key')::uuid, null, null
  )->>'wasDuplicate')::boolean,
  'repeated submit did not replay the same payment'
);
select private.enjaz_phase75_expect_payment_conflict(
  current_setting('enjaz.p75_workspace')::uuid,
  current_setting('enjaz.p75_transaction')::uuid,
  current_setting('enjaz.p75_payment_key')::uuid
);

with result as (
  select public.reverse_payment_v1(
    current_setting('enjaz.p75_workspace')::uuid,
    current_setting('enjaz.p75_payment')::uuid,
    'Phase 7.5 compensating reversal',
    current_setting('enjaz.p75_reversal_key')::uuid
  ) body
)
select set_config('enjaz.p75_reversal', body->>'reversalId', true) from result;

select private.enjaz_phase75_assert(
  (public.reverse_payment_v1(
    current_setting('enjaz.p75_workspace')::uuid,
    current_setting('enjaz.p75_payment')::uuid,
    'Phase 7.5 compensating reversal',
    current_setting('enjaz.p75_reversal_key')::uuid
  )->>'wasDuplicate')::boolean,
  'repeated reversal did not replay the same event'
);
select private.enjaz_phase75_assert(
  (public.finance_payment_reconciliation_v1(current_setting('enjaz.p75_workspace')::uuid)->>'integrityWarnings')::integer = 0,
  'authoritative reconciliation found lost/duplicated money events'
);

reset role;

-- Database-level escape hatch: even privileged/direct history cannot create a second
-- reversal for the same payment after the Phase 7.5 hardening index exists.
do $$
declare v_serial bigint;
begin
  v_serial := nextval('private.enjaz_payment_reversal_serial_seq'::regclass);
  begin
    insert into public.payment_reversals(
      workspace_id, payment_id, reversed_at, reason, actor_user_id,
      idempotency_key, reversal_serial, reversal_ref, reversal_snapshot
    ) values (
      current_setting('enjaz.p75_workspace')::uuid,
      current_setting('enjaz.p75_payment')::uuid,
      now(), 'forbidden duplicate reversal probe', current_setting('enjaz.p75_user')::uuid,
      gen_random_uuid(), v_serial, 'ENJ-P75-DUP-' || v_serial::text, '{}'::jsonb
    );
    raise exception 'ENJAZ_PHASE75_DUPLICATE_REVERSAL_WAS_ACCEPTED';
  exception when unique_violation then null;
  end;
end;
$$;

-- Cleanup in dependency order.
delete from public.transaction_activity where workspace_id = current_setting('enjaz.p75_workspace')::uuid and transaction_id = current_setting('enjaz.p75_transaction')::uuid;
delete from public.audit_events where workspace_id = current_setting('enjaz.p75_workspace')::uuid and entity_id in (current_setting('enjaz.p75_payment')::uuid);
delete from public.payment_reversals where workspace_id = current_setting('enjaz.p75_workspace')::uuid and payment_id = current_setting('enjaz.p75_payment')::uuid;
delete from public.payments where workspace_id = current_setting('enjaz.p75_workspace')::uuid and id = current_setting('enjaz.p75_payment')::uuid;
delete from public.transactions where workspace_id = current_setting('enjaz.p75_workspace')::uuid and id = current_setting('enjaz.p75_transaction')::uuid;
delete from public.companies where workspace_id = current_setting('enjaz.p75_workspace')::uuid and id = current_setting('enjaz.p75_company')::uuid;

select private.enjaz_phase75_assert(not exists (
  select 1 from public.payments where id = current_setting('enjaz.p75_payment')::uuid
), 'probe payment cleanup failed');

drop function private.enjaz_phase75_expect_payment_conflict(uuid,uuid,uuid);
drop function private.enjaz_phase75_assert(boolean,text);

commit;
