-- ENJAZ Phase 7.2 — RPC security hardening
-- Public RPC endpoints are SECURITY INVOKER wrappers only. Privileged command bodies
-- live in the unexposed private schema and retain explicit auth.uid + membership guards.

begin;

-- Rename the already-applied guarded implementations into private implementations by
-- recreating their bodies from the public definitions, then replace public endpoints
-- with invoker wrappers. pg_get_functiondef is used only inside this migration to
-- preserve the exact verified command body while changing its schema boundary.

do $$
declare
  r record;
  v_def text;
  v_private_name text;
begin
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_finance_cashbox_v1',
        'create_billing_engagement_v1',
        'finance_payment_reconciliation_v1',
        'finance_payment_context_v1',
        'post_payment_v1',
        'reverse_payment_v1',
        'get_payment_receipt_v1'
      )
  loop
    v_private_name := r.proname || '_impl';
    v_def := pg_get_functiondef(r.oid);
    v_def := replace(v_def, 'CREATE OR REPLACE FUNCTION public.' || r.proname, 'CREATE OR REPLACE FUNCTION private.' || v_private_name);
    execute v_def;
  end loop;
end $$;

-- Public wrappers deliberately do not carry SECURITY DEFINER.
create or replace function public.create_finance_cashbox_v1(p_workspace_id uuid,p_name text,p_opening_balance numeric,p_idempotency_key uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.create_finance_cashbox_v1_impl(p_workspace_id,p_name,p_opening_balance,p_idempotency_key); $$;

create or replace function public.create_billing_engagement_v1(p_workspace_id uuid,p_company_id uuid,p_transaction_id uuid,p_title text,p_engagement_type text,p_billing_mode text,p_reference text,p_start_on date,p_end_on date,p_idempotency_key uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.create_billing_engagement_v1_impl(p_workspace_id,p_company_id,p_transaction_id,p_title,p_engagement_type,p_billing_mode,p_reference,p_start_on,p_end_on,p_idempotency_key); $$;

create or replace function public.finance_payment_reconciliation_v1(p_workspace_id uuid)
returns jsonb language sql security invoker stable set search_path = ''
as $$ select private.finance_payment_reconciliation_v1_impl(p_workspace_id); $$;

create or replace function public.finance_payment_context_v1(p_workspace_id uuid)
returns jsonb language sql security invoker stable set search_path = ''
as $$ select private.finance_payment_context_v1_impl(p_workspace_id); $$;

create or replace function public.post_payment_v1(p_workspace_id uuid,p_transaction_id uuid,p_amount numeric,p_method text,p_paid_at timestamptz,p_note text,p_idempotency_key uuid,p_cashbox_id uuid,p_engagement_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.post_payment_v1_impl(p_workspace_id,p_transaction_id,p_amount,p_method,p_paid_at,p_note,p_idempotency_key,p_cashbox_id,p_engagement_id); $$;

create or replace function public.reverse_payment_v1(p_workspace_id uuid,p_payment_id uuid,p_reason text,p_idempotency_key uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.reverse_payment_v1_impl(p_workspace_id,p_payment_id,p_reason,p_idempotency_key); $$;

create or replace function public.get_payment_receipt_v1(p_workspace_id uuid,p_payment_id uuid)
returns jsonb language sql security invoker stable set search_path = ''
as $$ select private.get_payment_receipt_v1_impl(p_workspace_id,p_payment_id); $$;

-- Private schema stays absent from the Data API. Authenticated receives only schema
-- usage + execute on these seven exact implementation functions so public invoker
-- wrappers can call them. No table privileges are granted through this migration.
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public, anon;
grant execute on function private.create_finance_cashbox_v1_impl(uuid,text,numeric,uuid) to authenticated;
grant execute on function private.create_billing_engagement_v1_impl(uuid,uuid,uuid,text,text,text,text,date,date,uuid) to authenticated;
grant execute on function private.finance_payment_reconciliation_v1_impl(uuid) to authenticated;
grant execute on function private.finance_payment_context_v1_impl(uuid) to authenticated;
grant execute on function private.post_payment_v1_impl(uuid,uuid,numeric,text,timestamptz,text,uuid,uuid,uuid) to authenticated;
grant execute on function private.reverse_payment_v1_impl(uuid,uuid,text,uuid) to authenticated;
grant execute on function private.get_payment_receipt_v1_impl(uuid,uuid) to authenticated;

revoke all on function public.create_finance_cashbox_v1(uuid,text,numeric,uuid) from public, anon;
revoke all on function public.create_billing_engagement_v1(uuid,uuid,uuid,text,text,text,text,date,date,uuid) from public, anon;
revoke all on function public.finance_payment_reconciliation_v1(uuid) from public, anon;
revoke all on function public.finance_payment_context_v1(uuid) from public, anon;
revoke all on function public.post_payment_v1(uuid,uuid,numeric,text,timestamptz,text,uuid,uuid,uuid) from public, anon;
revoke all on function public.reverse_payment_v1(uuid,uuid,text,uuid) from public, anon;
revoke all on function public.get_payment_receipt_v1(uuid,uuid) from public, anon;
grant execute on function public.create_finance_cashbox_v1(uuid,text,numeric,uuid) to authenticated;
grant execute on function public.create_billing_engagement_v1(uuid,uuid,uuid,text,text,text,text,date,date,uuid) to authenticated;
grant execute on function public.finance_payment_reconciliation_v1(uuid) to authenticated;
grant execute on function public.finance_payment_context_v1(uuid) to authenticated;
grant execute on function public.post_payment_v1(uuid,uuid,numeric,text,timestamptz,text,uuid,uuid,uuid) to authenticated;
grant execute on function public.reverse_payment_v1(uuid,uuid,text,uuid) to authenticated;
grant execute on function public.get_payment_receipt_v1(uuid,uuid) to authenticated;

commit;
