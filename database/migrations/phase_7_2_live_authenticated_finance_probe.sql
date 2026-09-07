-- ENJAZ Phase 7.2 — real authenticated finance destruction probe
-- Runs inside one transaction against the actual Supabase schema. It derives a real
-- existing user/workspace, switches to the authenticated Postgres role with that JWT
-- subject, exercises the public RPC boundary, then removes every probe row before commit.

begin;

create or replace function private.enjaz_phase72_probe_assert(p_condition boolean, p_message text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'ENJAZ_PHASE72_PROBE_FAILED: %', p_message;
  end if;
end;
$$;
revoke all on function private.enjaz_phase72_probe_assert(boolean,text) from public, anon;
grant execute on function private.enjaz_phase72_probe_assert(boolean,text) to authenticated;

-- Derive a real authenticated identity and its oldest workspace; no generated user or
-- workspace id is hard-coded into this probe.
select set_config('enjaz.probe_user_id', (
  select wm.user_id::text
  from public.workspace_memberships wm
  join auth.users u on u.id = wm.user_id
  order by wm.created_at asc, wm.workspace_id asc
  limit 1
), true);
select private.enjaz_phase72_probe_assert(nullif(current_setting('enjaz.probe_user_id', true), '') is not null, 'no authenticated workspace member exists');

select set_config('enjaz.probe_workspace_id', (
  select wm.workspace_id::text
  from public.workspace_memberships wm
  where wm.user_id = current_setting('enjaz.probe_user_id')::uuid
  order by wm.created_at asc, wm.workspace_id asc
  limit 1
), true);
select private.enjaz_phase72_probe_assert(nullif(current_setting('enjaz.probe_workspace_id', true), '') is not null, 'workspace resolution failed');

-- Seed only the minimum authoritative business context as postgres; finance writes below
-- must happen as authenticated through the exact public RPCs used by the browser.
with inserted as (
  insert into public.companies(workspace_id, legal_name, display_name, status)
  values (current_setting('enjaz.probe_workspace_id')::uuid, '__ENJAZ_PHASE72_PROBE_COMPANY__', 'Phase 7.2 Probe Company', 'active')
  returning id
)
select set_config('enjaz.probe_company_id', (select id::text from inserted), true);

with inserted as (
  insert into public.transactions(workspace_id, company_id, type, department, status, priority, current_fee)
  values (
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_company_id')::uuid,
    '__ENJAZ_PHASE72_PROBE_TRANSACTION__',
    'QA', 'active', 'normal', 20000.00
  )
  returning id
)
select set_config('enjaz.probe_transaction_id', (select id::text from inserted), true);

select set_config('enjaz.probe_cashbox_key', gen_random_uuid()::text, true);
select set_config('enjaz.probe_engagement_key', gen_random_uuid()::text, true);
select set_config('enjaz.probe_payment_key', gen_random_uuid()::text, true);
select set_config('enjaz.probe_reversal_key', gen_random_uuid()::text, true);

-- Simulate the Data API identity exactly as documented by Supabase RLS testing guidance.
select set_config(
  'request.jwt.claims',
  jsonb_build_object('role','authenticated','sub',current_setting('enjaz.probe_user_id'))::text,
  true
);
select set_config('request.jwt.claim.sub', current_setting('enjaz.probe_user_id'), true);
set local role authenticated;

select private.enjaz_phase72_probe_assert((select auth.uid()) = current_setting('enjaz.probe_user_id')::uuid, 'auth.uid did not resolve to the real probe user');

-- Cashbox command + duplicate replay.
with result as (
  select public.create_finance_cashbox_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    '__ENJAZ_PHASE72_PROBE_CASHBOX__',
    1000.00,
    current_setting('enjaz.probe_cashbox_key')::uuid
  ) as body
)
select set_config('enjaz.probe_cashbox_id', body->>'cashboxId', true) from result;
select private.enjaz_phase72_probe_assert(
  (public.create_finance_cashbox_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    '__ENJAZ_PHASE72_PROBE_CASHBOX__',
    1000.00,
    current_setting('enjaz.probe_cashbox_key')::uuid
  )->>'wasDuplicate')::boolean,
  'cashbox idempotency replay did not resolve as duplicate'
);

-- M16 commercial engagement + duplicate replay.
with result as (
  select public.create_billing_engagement_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_company_id')::uuid,
    current_setting('enjaz.probe_transaction_id')::uuid,
    '__ENJAZ_PHASE72_PROBE_RETAINER__',
    'retainer', 'retainer', '__ENJAZ_PHASE72_PROBE_REF__',
    current_date, current_date + 30,
    current_setting('enjaz.probe_engagement_key')::uuid
  ) as body
)
select set_config('enjaz.probe_engagement_id', body->>'engagementId', true) from result;
select private.enjaz_phase72_probe_assert(
  (public.create_billing_engagement_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_company_id')::uuid,
    current_setting('enjaz.probe_transaction_id')::uuid,
    '__ENJAZ_PHASE72_PROBE_RETAINER__',
    'retainer', 'retainer', '__ENJAZ_PHASE72_PROBE_REF__',
    current_date, current_date + 30,
    current_setting('enjaz.probe_engagement_key')::uuid
  )->>'wasDuplicate')::boolean,
  'M16 engagement idempotency replay did not resolve as duplicate'
);

-- Real payment + receipt, then repeat the exact semantic request using the same key.
with result as (
  select public.post_payment_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_transaction_id')::uuid,
    12345.67,
    'cash', now(), 'Phase 7.2 authenticated probe',
    current_setting('enjaz.probe_payment_key')::uuid,
    current_setting('enjaz.probe_cashbox_id')::uuid,
    current_setting('enjaz.probe_engagement_id')::uuid
  ) as body
)
select
  set_config('enjaz.probe_payment_id', body->>'paymentId', true),
  set_config('enjaz.probe_receipt_ref', body->>'receiptRef', true)
from result;

select private.enjaz_phase72_probe_assert(
  (public.post_payment_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_transaction_id')::uuid,
    12345.67,
    'cash', now(), 'Phase 7.2 authenticated probe',
    current_setting('enjaz.probe_payment_key')::uuid,
    current_setting('enjaz.probe_cashbox_id')::uuid,
    current_setting('enjaz.probe_engagement_id')::uuid
  )->>'wasDuplicate')::boolean,
  'payment idempotency replay created or attempted a second payment'
);

select private.enjaz_phase72_probe_assert(
  (public.get_payment_receipt_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_payment_id')::uuid
  )->>'status') = 'posted',
  'receipt did not round-trip as posted'
);
select private.enjaz_phase72_probe_assert(
  (public.get_payment_receipt_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_payment_id')::uuid
  )->>'amount') = '12345.67',
  'receipt amount drifted from exact payment value'
);
select private.enjaz_phase72_probe_assert(
  (public.get_payment_receipt_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_payment_id')::uuid
  )->'snapshot'->>'companyLegalName') = '__ENJAZ_PHASE72_PROBE_COMPANY__',
  'immutable receipt snapshot lost company provenance'
);

-- Compensating reversal + idempotent replay; the receipt must remain addressable.
with result as (
  select public.reverse_payment_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_payment_id')::uuid,
    'Phase 7.2 authenticated reversal probe',
    current_setting('enjaz.probe_reversal_key')::uuid
  ) as body
)
select
  set_config('enjaz.probe_reversal_id', body->>'reversalId', true),
  set_config('enjaz.probe_reversal_ref', body->>'reversalRef', true)
from result;

select private.enjaz_phase72_probe_assert(
  (public.reverse_payment_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_payment_id')::uuid,
    'Phase 7.2 authenticated reversal probe',
    current_setting('enjaz.probe_reversal_key')::uuid
  )->>'wasDuplicate')::boolean,
  'reversal idempotency replay created or attempted a second reversal'
);
select private.enjaz_phase72_probe_assert(
  (public.get_payment_receipt_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_payment_id')::uuid
  )->>'status') = 'reversed',
  'receipt did not survive reversal as an addressable reversed receipt'
);
select private.enjaz_phase72_probe_assert(
  (public.get_payment_receipt_v1(
    current_setting('enjaz.probe_workspace_id')::uuid,
    current_setting('enjaz.probe_payment_id')::uuid
  )->'reversal'->>'reversalRef') = current_setting('enjaz.probe_reversal_ref'),
  'receipt reversal evidence does not match the reversal event'
);

-- Reconciliation is the final money-integrity authority for Phase 7.2.
select private.enjaz_phase72_probe_assert(
  (public.finance_payment_reconciliation_v1(current_setting('enjaz.probe_workspace_id')::uuid)->>'integrityWarnings')::integer = 0,
  'finance reconciliation reports integrity warnings after authenticated round-trip'
);
select private.enjaz_phase72_probe_assert(
  (public.finance_payment_reconciliation_v1(current_setting('enjaz.probe_workspace_id')::uuid)->>'shadowLedgerEntries')::integer = 0,
  'payment was duplicated into the general ledger'
);

reset role;

-- Remove every probe trace in dependency order while retaining the test result in the
-- migration history. The production workspace returns to its pre-probe business state.
delete from public.transaction_activity
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and transaction_id = current_setting('enjaz.probe_transaction_id')::uuid;

delete from public.audit_events
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and entity_id in (
    current_setting('enjaz.probe_payment_id')::uuid,
    current_setting('enjaz.probe_cashbox_id')::uuid,
    current_setting('enjaz.probe_engagement_id')::uuid
  );

delete from public.payment_reversals
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and id = current_setting('enjaz.probe_reversal_id')::uuid;
delete from public.payments
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and id = current_setting('enjaz.probe_payment_id')::uuid;
delete from public.commercial_engagement_transactions
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and engagement_id = current_setting('enjaz.probe_engagement_id')::uuid;
delete from public.commercial_engagements
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and id = current_setting('enjaz.probe_engagement_id')::uuid;
delete from public.cashbox_accounts
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and id = current_setting('enjaz.probe_cashbox_id')::uuid;
delete from public.transactions
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and id = current_setting('enjaz.probe_transaction_id')::uuid;
delete from public.companies
where workspace_id = current_setting('enjaz.probe_workspace_id')::uuid
  and id = current_setting('enjaz.probe_company_id')::uuid;

select private.enjaz_phase72_probe_assert(
  not exists (select 1 from public.companies where legal_name = '__ENJAZ_PHASE72_PROBE_COMPANY__'),
  'probe company cleanup failed'
);
select private.enjaz_phase72_probe_assert(
  not exists (select 1 from public.payments where id = current_setting('enjaz.probe_payment_id')::uuid),
  'probe payment cleanup failed'
);

drop function private.enjaz_phase72_probe_assert(boolean,text);

commit;
