-- ENJAZ Phase 7.2 — Payments & Receipts + M16 finance foundation
-- Payments/reversals are authoritative money events. Browser financial writes are
-- accepted only through guarded RPCs with explicit auth.uid + workspace membership,
-- idempotency, immutable receipt snapshots, audit evidence and reconciliation.

begin;

create sequence if not exists private.enjaz_payment_receipt_serial_seq as bigint start with 1 increment by 1 no cycle;
create sequence if not exists private.enjaz_payment_reversal_serial_seq as bigint start with 1 increment by 1 no cycle;
revoke all on sequence private.enjaz_payment_receipt_serial_seq from public;
revoke all on sequence private.enjaz_payment_reversal_serial_seq from public;

-- -----------------------------------------------------------------------------
-- M16 finance anchor. Money never lives here; engagements only link commercial
-- context to authoritative companies/transactions/payments.
-- -----------------------------------------------------------------------------
create table if not exists public.commercial_engagements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 320),
  engagement_type text not null check (engagement_type in ('contract','retainer','service_agreement','other')),
  billing_mode text not null check (billing_mode in ('per_transaction','retainer','fixed','mixed')),
  reference text,
  status text not null default 'active' check (status in ('draft','active','paused','completed','cancelled')),
  start_on date,
  end_on date,
  idempotency_key uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint commercial_engagements_workspace_id_id_key unique (workspace_id, id),
  constraint commercial_engagements_company_fk foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on delete restrict,
  constraint commercial_engagements_date_range check (end_on is null or start_on is null or end_on >= start_on),
  constraint commercial_engagements_idempotency_unique unique (workspace_id, idempotency_key)
);

create table if not exists public.commercial_engagement_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  engagement_id uuid not null,
  transaction_id uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint commercial_engagement_transactions_workspace_id_id_key unique (workspace_id, id),
  constraint commercial_engagement_transactions_engagement_fk foreign key (workspace_id, engagement_id)
    references public.commercial_engagements(workspace_id, id) on delete restrict,
  constraint commercial_engagement_transactions_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict,
  constraint commercial_engagement_transactions_unique unique (workspace_id, engagement_id, transaction_id)
);

create unique index if not exists commercial_engagements_reference_unique_idx
  on public.commercial_engagements(workspace_id, lower(reference))
  where reference is not null and deleted_at is null;
create index if not exists commercial_engagements_company_idx
  on public.commercial_engagements(workspace_id, company_id, status, created_at desc);
create index if not exists commercial_engagement_transactions_tx_idx
  on public.commercial_engagement_transactions(workspace_id, transaction_id, engagement_id);

alter table public.commercial_engagements enable row level security;
alter table public.commercial_engagement_transactions enable row level security;

create policy commercial_engagements_select_workspace
on public.commercial_engagements for select to authenticated
using (
  (select auth.uid()) is not null
  and workspace_id in (
    select wm.workspace_id from public.workspace_memberships wm
    where wm.user_id = (select auth.uid())
  )
);

create policy commercial_engagement_transactions_select_workspace
on public.commercial_engagement_transactions for select to authenticated
using (
  (select auth.uid()) is not null
  and workspace_id in (
    select wm.workspace_id from public.workspace_memberships wm
    where wm.user_id = (select auth.uid())
  )
);

revoke all on table public.commercial_engagements from anon, authenticated;
revoke all on table public.commercial_engagement_transactions from anon, authenticated;
grant select on table public.commercial_engagements to authenticated;
grant select on table public.commercial_engagement_transactions to authenticated;

-- -----------------------------------------------------------------------------
-- Payment / receipt hardening.
-- -----------------------------------------------------------------------------
alter table public.payments
  add column if not exists idempotency_key uuid,
  add column if not exists created_by uuid references auth.users(id) on delete restrict,
  add column if not exists receipt_serial bigint,
  add column if not exists receipt_token uuid,
  add column if not exists receipt_snapshot jsonb,
  add column if not exists receipt_version smallint not null default 1,
  add column if not exists cashbox_id uuid,
  add column if not exists engagement_id uuid;

alter table public.payment_reversals
  add column if not exists idempotency_key uuid,
  add column if not exists reversal_serial bigint,
  add column if not exists reversal_ref text,
  add column if not exists reversal_snapshot jsonb;

alter table public.cashbox_accounts
  add column if not exists finance_idempotency_key uuid,
  add column if not exists finance_created_by uuid references auth.users(id) on delete restrict;

-- Defensive backfill is split into ordered passes so later fields never depend on
-- values assigned in the same UPDATE target list.
update public.payments
set
  idempotency_key = coalesce(idempotency_key, gen_random_uuid()),
  created_by = coalesce(created_by, (select owner_user_id from public.workspaces w where w.id = payments.workspace_id)),
  receipt_serial = coalesce(receipt_serial, nextval('private.enjaz_payment_receipt_serial_seq'::regclass)),
  receipt_token = coalesce(receipt_token, gen_random_uuid());

update public.payments
set receipt_snapshot = coalesce(receipt_snapshot, jsonb_build_object(
  'version', 1,
  'receiptRef', receipt_ref,
  'receiptSerial', receipt_serial,
  'amount', amount::text,
  'method', method,
  'paidAt', paid_at,
  'transactionId', transaction_id,
  'companyId', company_id,
  'legacyBackfill', true
));

update public.payment_reversals
set
  idempotency_key = coalesce(idempotency_key, gen_random_uuid()),
  reversal_serial = coalesce(reversal_serial, nextval('private.enjaz_payment_reversal_serial_seq'::regclass));

update public.payment_reversals
set reversal_ref = coalesce(
  reversal_ref,
  'ENJ-RV-' || to_char(reversed_at at time zone 'Asia/Baghdad', 'YYYY') || '-' || lpad(reversal_serial::text, 8, '0')
);

update public.payment_reversals
set reversal_snapshot = coalesce(reversal_snapshot, jsonb_build_object(
  'version', 1,
  'reversalRef', reversal_ref,
  'reversalSerial', reversal_serial,
  'paymentId', payment_id,
  'reason', reason,
  'reversedAt', reversed_at,
  'legacyBackfill', true
));

alter table public.payments
  alter column idempotency_key set not null,
  alter column created_by set not null,
  alter column receipt_serial set not null,
  alter column receipt_token set not null,
  alter column receipt_snapshot set not null;

alter table public.payment_reversals
  alter column idempotency_key set not null,
  alter column reversal_serial set not null,
  alter column reversal_ref set not null,
  alter column reversal_snapshot set not null;

alter table public.payments
  add constraint payments_idempotency_unique unique (workspace_id, idempotency_key),
  add constraint payments_receipt_serial_unique unique (receipt_serial),
  add constraint payments_receipt_token_unique unique (receipt_token),
  add constraint payments_receipt_snapshot_object check (jsonb_typeof(receipt_snapshot) = 'object'),
  add constraint payments_receipt_version_check check (receipt_version = 1),
  add constraint payments_cashbox_fk foreign key (workspace_id, cashbox_id)
    references public.cashbox_accounts(workspace_id, id) on delete restrict,
  add constraint payments_engagement_fk foreign key (workspace_id, engagement_id)
    references public.commercial_engagements(workspace_id, id) on delete restrict;

alter table public.payment_reversals
  add constraint payment_reversals_idempotency_unique unique (workspace_id, idempotency_key),
  add constraint payment_reversals_serial_unique unique (reversal_serial),
  add constraint payment_reversals_ref_unique unique (workspace_id, reversal_ref),
  add constraint payment_reversals_snapshot_object check (jsonb_typeof(reversal_snapshot) = 'object');

create unique index if not exists cashbox_finance_idempotency_unique_idx
  on public.cashbox_accounts(workspace_id, finance_idempotency_key)
  where finance_idempotency_key is not null;
create index if not exists payments_workspace_paid_idx on public.payments(workspace_id, paid_at desc, id desc);
create index if not exists payments_workspace_company_idx on public.payments(workspace_id, company_id, paid_at desc);
create index if not exists payments_workspace_transaction_idx on public.payments(workspace_id, transaction_id, paid_at desc);
create index if not exists payments_workspace_engagement_idx on public.payments(workspace_id, engagement_id, paid_at desc) where engagement_id is not null;
create index if not exists payment_reversals_workspace_reversed_idx on public.payment_reversals(workspace_id, reversed_at desc);

-- Browser financial mutation is RPC-only. SELECT remains protected by existing RLS.
revoke insert, update, delete on table public.payments from anon, authenticated;
revoke insert, update, delete on table public.payment_reversals from anon, authenticated;
revoke insert, update, delete on table public.cashbox_accounts from anon, authenticated;
grant select on table public.payments to authenticated;
grant select on table public.payment_reversals to authenticated;
grant select on table public.cashbox_accounts to authenticated;

-- -----------------------------------------------------------------------------
-- Guarded command RPCs.
-- -----------------------------------------------------------------------------
create or replace function public.create_finance_cashbox_v1(
  p_workspace_id uuid,
  p_name text,
  p_opening_balance numeric,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_existing public.cashbox_accounts%rowtype;
  v_cashbox public.cashbox_accounts%rowtype;
begin
  if v_actor is null then raise insufficient_privilege using message = 'ENJAZ_AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.workspace_memberships wm where wm.workspace_id = p_workspace_id and wm.user_id = v_actor) then
    raise insufficient_privilege using message = 'ENJAZ_WORKSPACE_FORBIDDEN';
  end if;
  if p_idempotency_key is null or p_name is null or char_length(btrim(p_name)) not between 1 and 180 then
    raise invalid_parameter_value using message = 'ENJAZ_CASHBOX_INVALID';
  end if;
  if p_opening_balance is null or p_opening_balance < 0 or p_opening_balance <> round(p_opening_balance, 2) then
    raise invalid_parameter_value using message = 'ENJAZ_CASHBOX_MONEY_INVALID';
  end if;

  select * into v_existing from public.cashbox_accounts
  where workspace_id = p_workspace_id and finance_idempotency_key = p_idempotency_key limit 1;
  if found then
    if v_existing.name = btrim(p_name) and v_existing.opening_balance = p_opening_balance then
      return jsonb_build_object('cashboxId', v_existing.id, 'name', v_existing.name, 'openingBalance', v_existing.opening_balance::text, 'wasDuplicate', true);
    end if;
    raise unique_violation using message = 'ENJAZ_CASHBOX_IDEMPOTENCY_CONFLICT';
  end if;

  select * into v_existing from public.cashbox_accounts where workspace_id = p_workspace_id and name = btrim(p_name) limit 1;
  if found then
    if v_existing.opening_balance = p_opening_balance then
      return jsonb_build_object('cashboxId', v_existing.id, 'name', v_existing.name, 'openingBalance', v_existing.opening_balance::text, 'wasDuplicate', true);
    end if;
    raise unique_violation using message = 'ENJAZ_CASHBOX_NAME_CONFLICT';
  end if;

  insert into public.cashbox_accounts(workspace_id, name, opening_balance, opened_at, active, finance_idempotency_key, finance_created_by)
  values (p_workspace_id, btrim(p_name), p_opening_balance, now(), true, p_idempotency_key, v_actor)
  returning * into v_cashbox;

  insert into public.audit_events(workspace_id, actor_user_id, action, entity_type, entity_id, summary, details)
  values (p_workspace_id, v_actor, 'finance.cashbox.created', 'cashbox', v_cashbox.id, 'Created finance cashbox',
    jsonb_build_object('name', v_cashbox.name, 'openingBalance', v_cashbox.opening_balance::text, 'idempotencyKey', p_idempotency_key));

  return jsonb_build_object('cashboxId', v_cashbox.id, 'name', v_cashbox.name, 'openingBalance', v_cashbox.opening_balance::text, 'wasDuplicate', false);
end;
$$;

create or replace function public.create_billing_engagement_v1(
  p_workspace_id uuid,
  p_company_id uuid,
  p_transaction_id uuid,
  p_title text,
  p_engagement_type text,
  p_billing_mode text,
  p_reference text,
  p_start_on date,
  p_end_on date,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_tx public.transactions%rowtype;
  v_existing public.commercial_engagements%rowtype;
  v_engagement public.commercial_engagements%rowtype;
begin
  if v_actor is null then raise insufficient_privilege using message = 'ENJAZ_AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.workspace_memberships wm where wm.workspace_id = p_workspace_id and wm.user_id = v_actor) then
    raise insufficient_privilege using message = 'ENJAZ_WORKSPACE_FORBIDDEN';
  end if;
  if p_idempotency_key is null or p_title is null or char_length(btrim(p_title)) not between 1 and 320 then
    raise invalid_parameter_value using message = 'ENJAZ_ENGAGEMENT_INVALID';
  end if;
  if p_engagement_type not in ('contract','retainer','service_agreement','other') then
    raise invalid_parameter_value using message = 'ENJAZ_ENGAGEMENT_TYPE_INVALID';
  end if;
  if p_billing_mode not in ('per_transaction','retainer','fixed','mixed') then
    raise invalid_parameter_value using message = 'ENJAZ_ENGAGEMENT_BILLING_INVALID';
  end if;
  if p_end_on is not null and p_start_on is not null and p_end_on < p_start_on then
    raise invalid_parameter_value using message = 'ENJAZ_ENGAGEMENT_DATE_INVALID';
  end if;

  select * into v_existing from public.commercial_engagements
  where workspace_id = p_workspace_id and idempotency_key = p_idempotency_key limit 1;
  if found then
    if v_existing.company_id = p_company_id and v_existing.title = btrim(p_title) then
      return jsonb_build_object('engagementId', v_existing.id, 'title', v_existing.title, 'reference', v_existing.reference, 'type', v_existing.engagement_type, 'billingMode', v_existing.billing_mode, 'wasDuplicate', true);
    end if;
    raise unique_violation using message = 'ENJAZ_ENGAGEMENT_IDEMPOTENCY_CONFLICT';
  end if;

  select * into v_tx from public.transactions t
  where t.workspace_id = p_workspace_id and t.id = p_transaction_id and t.company_id = p_company_id
  for update;
  if not found or v_tx.deleted_at is not null then
    raise foreign_key_violation using message = 'ENJAZ_ENGAGEMENT_TRANSACTION_INVALID';
  end if;

  insert into public.commercial_engagements(
    workspace_id, company_id, title, engagement_type, billing_mode, reference, status,
    start_on, end_on, idempotency_key, created_by
  ) values (
    p_workspace_id, p_company_id, btrim(p_title), p_engagement_type, p_billing_mode,
    nullif(btrim(coalesce(p_reference,'')), ''), 'active', p_start_on, p_end_on, p_idempotency_key, v_actor
  ) returning * into v_engagement;

  insert into public.commercial_engagement_transactions(workspace_id, engagement_id, transaction_id, created_by)
  values (p_workspace_id, v_engagement.id, p_transaction_id, v_actor);

  insert into public.audit_events(workspace_id, actor_user_id, action, entity_type, entity_id, summary, details)
  values (p_workspace_id, v_actor, 'engagement.created', 'commercial_engagement', v_engagement.id, 'Created commercial engagement',
    jsonb_build_object('companyId', p_company_id, 'transactionId', p_transaction_id, 'type', p_engagement_type, 'billingMode', p_billing_mode, 'reference', v_engagement.reference));

  insert into public.transaction_activity(workspace_id, transaction_id, event_type, summary, source_entity_type, source_entity_id, metadata, actor_user_id)
  values (p_workspace_id, p_transaction_id, 'commercial_engagement_linked', 'تم ربط عقد/Retainer بالمعاملة', 'commercial_engagement', v_engagement.id,
    jsonb_build_object('engagementType', p_engagement_type, 'billingMode', p_billing_mode, 'reference', v_engagement.reference), v_actor);

  return jsonb_build_object('engagementId', v_engagement.id, 'title', v_engagement.title, 'reference', v_engagement.reference, 'type', v_engagement.engagement_type, 'billingMode', v_engagement.billing_mode, 'wasDuplicate', false);
end;
$$;

create or replace function public.finance_payment_reconciliation_v1(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status_without_reversal bigint;
  v_reversal_without_status bigint;
  v_shadow_ledger bigint;
  v_posted_total numeric(18,2);
  v_reversed_total numeric(18,2);
begin
  if v_actor is null then raise insufficient_privilege using message = 'ENJAZ_AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.workspace_memberships wm where wm.workspace_id = p_workspace_id and wm.user_id = v_actor) then
    raise insufficient_privilege using message = 'ENJAZ_WORKSPACE_FORBIDDEN';
  end if;

  select
    count(*) filter (where p.status = 'reversed' and r.id is null),
    count(*) filter (where p.status = 'posted' and r.id is not null),
    coalesce(sum(p.amount) filter (where p.status = 'posted' and r.id is null), 0),
    coalesce(sum(p.amount) filter (where r.id is not null), 0)
  into v_status_without_reversal, v_reversal_without_status, v_posted_total, v_reversed_total
  from public.payments p
  left join public.payment_reversals r on r.workspace_id = p.workspace_id and r.payment_id = p.id
  where p.workspace_id = p_workspace_id;

  select count(*) into v_shadow_ledger
  from public.financial_ledger_entries l
  where l.workspace_id = p_workspace_id
    and (
      lower(coalesce(l.source,'')) in ('payment','payment_reversal','payments')
      or lower(coalesce(l.category,'')) in ('payment','payment_reversal','payments')
    );

  return jsonb_build_object(
    'postedTotal', v_posted_total::text,
    'reversedTotal', v_reversed_total::text,
    'statusWithoutReversal', v_status_without_reversal,
    'reversalWithoutStatus', v_reversal_without_status,
    'shadowLedgerEntries', v_shadow_ledger,
    'integrityWarnings', v_status_without_reversal + v_reversal_without_status + v_shadow_ledger,
    'moneyAuthority', 'payments_plus_non_payment_ledger'
  );
end;
$$;

create or replace function public.finance_payment_context_v1(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise insufficient_privilege using message = 'ENJAZ_AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.workspace_memberships wm where wm.workspace_id = p_workspace_id and wm.user_id = v_actor) then
    raise insufficient_privilege using message = 'ENJAZ_WORKSPACE_FORBIDDEN';
  end if;

  return jsonb_build_object(
    'cashboxes', coalesce((
      select jsonb_agg(row_data order by opened_at asc)
      from (
        select c.opened_at, jsonb_build_object('id', c.id, 'name', c.name, 'openingBalance', c.opening_balance::text, 'active', c.active) as row_data
        from public.cashbox_accounts c where c.workspace_id = p_workspace_id and c.active
      ) x
    ), '[]'::jsonb),
    'engagements', coalesce((
      select jsonb_agg(row_data order by created_at desc)
      from (
        select e.created_at, jsonb_build_object(
          'id', e.id, 'companyId', e.company_id, 'title', e.title, 'reference', e.reference,
          'type', e.engagement_type, 'billingMode', e.billing_mode, 'status', e.status,
          'transactionIds', coalesce((select jsonb_agg(et.transaction_id order by et.created_at) from public.commercial_engagement_transactions et where et.workspace_id = e.workspace_id and et.engagement_id = e.id), '[]'::jsonb)
        ) as row_data
        from public.commercial_engagements e
        where e.workspace_id = p_workspace_id and e.deleted_at is null and e.status <> 'cancelled'
        order by e.created_at desc limit 100
      ) x
    ), '[]'::jsonb),
    'recentReceipts', coalesce((
      select jsonb_agg(row_data order by paid_at desc)
      from (
        select p.paid_at, jsonb_build_object(
          'paymentId', p.id, 'receiptRef', p.receipt_ref, 'receiptSerial', p.receipt_serial,
          'receiptToken', p.receipt_token, 'amount', p.amount::text, 'method', p.method, 'paidAt', p.paid_at,
          'status', p.status, 'transactionId', p.transaction_id, 'companyId', p.company_id,
          'cashboxId', p.cashbox_id, 'engagementId', p.engagement_id, 'note', p.note, 'snapshot', p.receipt_snapshot,
          'reversal', (select jsonb_build_object('reversalId', r.id, 'reversalRef', r.reversal_ref, 'reason', r.reason, 'reversedAt', r.reversed_at, 'snapshot', r.reversal_snapshot) from public.payment_reversals r where r.workspace_id = p.workspace_id and r.payment_id = p.id)
        ) as row_data
        from public.payments p where p.workspace_id = p_workspace_id
        order by p.paid_at desc, p.created_at desc limit 60
      ) x
    ), '[]'::jsonb),
    'reconciliation', public.finance_payment_reconciliation_v1(p_workspace_id)
  );
end;
$$;

create or replace function public.post_payment_v1(
  p_workspace_id uuid,
  p_transaction_id uuid,
  p_amount numeric,
  p_method text,
  p_paid_at timestamptz,
  p_note text,
  p_idempotency_key uuid,
  p_cashbox_id uuid,
  p_engagement_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_tx public.transactions%rowtype;
  v_company public.companies%rowtype;
  v_workspace public.workspaces%rowtype;
  v_cashbox public.cashbox_accounts%rowtype;
  v_engagement public.commercial_engagements%rowtype;
  v_existing public.payments%rowtype;
  v_payment public.payments%rowtype;
  v_serial bigint;
  v_receipt_ref text;
  v_snapshot jsonb;
begin
  if v_actor is null then raise insufficient_privilege using message = 'ENJAZ_AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.workspace_memberships wm where wm.workspace_id = p_workspace_id and wm.user_id = v_actor) then
    raise insufficient_privilege using message = 'ENJAZ_WORKSPACE_FORBIDDEN';
  end if;
  if p_idempotency_key is null then raise invalid_parameter_value using message = 'ENJAZ_PAYMENT_IDEMPOTENCY_REQUIRED'; end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) or p_amount > 9999999999999999.99 then
    raise invalid_parameter_value using message = 'ENJAZ_PAYMENT_AMOUNT_INVALID';
  end if;
  if p_method not in ('cash','transfer','card','other') then raise invalid_parameter_value using message = 'ENJAZ_PAYMENT_METHOD_INVALID'; end if;
  if p_paid_at is null or p_paid_at > now() + interval '5 minutes' then raise invalid_parameter_value using message = 'ENJAZ_PAYMENT_DATE_INVALID'; end if;
  if p_method = 'cash' and p_cashbox_id is null then raise invalid_parameter_value using message = 'ENJAZ_CASHBOX_REQUIRED'; end if;

  select * into v_existing from public.payments p where p.workspace_id = p_workspace_id and p.idempotency_key = p_idempotency_key limit 1;
  if found then
    if v_existing.transaction_id = p_transaction_id and v_existing.amount = p_amount and v_existing.method = p_method
      and v_existing.cashbox_id is not distinct from p_cashbox_id and v_existing.engagement_id is not distinct from p_engagement_id then
      return jsonb_build_object(
        'paymentId', v_existing.id, 'receiptRef', v_existing.receipt_ref, 'receiptSerial', v_existing.receipt_serial,
        'receiptToken', v_existing.receipt_token, 'amount', v_existing.amount::text, 'method', v_existing.method,
        'paidAt', v_existing.paid_at, 'status', v_existing.status, 'transactionId', v_existing.transaction_id,
        'companyId', v_existing.company_id, 'cashboxId', v_existing.cashbox_id, 'engagementId', v_existing.engagement_id,
        'snapshot', v_existing.receipt_snapshot, 'wasDuplicate', true
      );
    end if;
    raise unique_violation using message = 'ENJAZ_PAYMENT_IDEMPOTENCY_CONFLICT';
  end if;

  select * into v_tx from public.transactions t where t.workspace_id = p_workspace_id and t.id = p_transaction_id for update;
  if not found or v_tx.deleted_at is not null or v_tx.archived_at is not null then
    raise foreign_key_violation using message = 'ENJAZ_PAYMENT_TRANSACTION_INVALID';
  end if;

  select * into v_company from public.companies c where c.workspace_id = p_workspace_id and c.id = v_tx.company_id and c.deleted_at is null;
  if not found then raise foreign_key_violation using message = 'ENJAZ_PAYMENT_COMPANY_INVALID'; end if;
  select * into v_workspace from public.workspaces w where w.id = p_workspace_id;
  if not found then raise foreign_key_violation using message = 'ENJAZ_PAYMENT_WORKSPACE_INVALID'; end if;

  if p_cashbox_id is not null then
    select * into v_cashbox from public.cashbox_accounts c where c.workspace_id = p_workspace_id and c.id = p_cashbox_id and c.active;
    if not found then raise foreign_key_violation using message = 'ENJAZ_PAYMENT_CASHBOX_INVALID'; end if;
  end if;

  if p_engagement_id is not null then
    select * into v_engagement from public.commercial_engagements e
    where e.workspace_id = p_workspace_id and e.id = p_engagement_id and e.company_id = v_tx.company_id
      and e.deleted_at is null and e.status not in ('cancelled','completed');
    if not found or not exists (
      select 1 from public.commercial_engagement_transactions et
      where et.workspace_id = p_workspace_id and et.engagement_id = p_engagement_id and et.transaction_id = p_transaction_id
    ) then raise foreign_key_violation using message = 'ENJAZ_PAYMENT_ENGAGEMENT_INVALID'; end if;
  end if;

  v_serial := nextval('private.enjaz_payment_receipt_serial_seq'::regclass);
  v_receipt_ref := 'ENJ-R-' || to_char(p_paid_at at time zone v_workspace.timezone, 'YYYY') || '-' || lpad(v_serial::text, 8, '0');
  v_snapshot := jsonb_build_object(
    'version', 1, 'receiptRef', v_receipt_ref, 'receiptSerial', v_serial,
    'workspaceId', p_workspace_id, 'workspaceName', v_workspace.name, 'currency', v_workspace.currency, 'timezone', v_workspace.timezone,
    'companyId', v_company.id, 'companyName', coalesce(nullif(btrim(v_company.display_name), ''), v_company.legal_name), 'companyLegalName', v_company.legal_name,
    'transactionId', v_tx.id, 'transactionLabel', coalesce(nullif(btrim(v_tx.legacy_id), ''), v_tx.type), 'transactionType', v_tx.type,
    'amount', p_amount::text, 'method', p_method, 'paidAt', p_paid_at,
    'cashboxId', p_cashbox_id, 'cashboxName', case when p_cashbox_id is null then null else v_cashbox.name end,
    'engagementId', p_engagement_id, 'engagementTitle', case when p_engagement_id is null then null else v_engagement.title end,
    'engagementReference', case when p_engagement_id is null then null else v_engagement.reference end,
    'note', nullif(btrim(coalesce(p_note,'')), ''), 'actorUserId', v_actor
  );

  insert into public.payments(
    workspace_id, transaction_id, company_id, amount, method, paid_at, status, receipt_ref, note,
    idempotency_key, created_by, receipt_serial, receipt_token, receipt_snapshot, receipt_version, cashbox_id, engagement_id
  ) values (
    p_workspace_id, p_transaction_id, v_tx.company_id, p_amount, p_method, p_paid_at, 'posted', v_receipt_ref,
    nullif(btrim(coalesce(p_note,'')), ''), p_idempotency_key, v_actor, v_serial, gen_random_uuid(), v_snapshot, 1, p_cashbox_id, p_engagement_id
  ) returning * into v_payment;

  insert into public.audit_events(workspace_id, actor_user_id, action, entity_type, entity_id, summary, details)
  values (p_workspace_id, v_actor, 'payment.posted', 'payment', v_payment.id, 'Posted payment ' || v_payment.receipt_ref,
    jsonb_build_object('receiptRef', v_payment.receipt_ref, 'amount', v_payment.amount::text, 'method', v_payment.method,
      'transactionId', v_payment.transaction_id, 'companyId', v_payment.company_id, 'cashboxId', v_payment.cashbox_id,
      'engagementId', v_payment.engagement_id, 'idempotencyKey', p_idempotency_key));

  insert into public.transaction_activity(workspace_id, transaction_id, event_type, summary, source_entity_type, source_entity_id, metadata, actor_user_id)
  values (p_workspace_id, p_transaction_id, 'payment_posted', 'تم تسجيل دفعة ' || v_payment.receipt_ref, 'payment', v_payment.id,
    jsonb_build_object('receiptRef', v_payment.receipt_ref, 'amount', v_payment.amount::text, 'method', v_payment.method), v_actor);

  return jsonb_build_object(
    'paymentId', v_payment.id, 'receiptRef', v_payment.receipt_ref, 'receiptSerial', v_payment.receipt_serial,
    'receiptToken', v_payment.receipt_token, 'amount', v_payment.amount::text, 'method', v_payment.method,
    'paidAt', v_payment.paid_at, 'status', v_payment.status, 'transactionId', v_payment.transaction_id,
    'companyId', v_payment.company_id, 'cashboxId', v_payment.cashbox_id, 'engagementId', v_payment.engagement_id,
    'snapshot', v_payment.receipt_snapshot, 'wasDuplicate', false
  );
end;
$$;

create or replace function public.reverse_payment_v1(
  p_workspace_id uuid,
  p_payment_id uuid,
  p_reason text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_payment public.payments%rowtype;
  v_existing public.payment_reversals%rowtype;
  v_reversal public.payment_reversals%rowtype;
  v_serial bigint;
  v_ref text;
  v_snapshot jsonb;
begin
  if v_actor is null then raise insufficient_privilege using message = 'ENJAZ_AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.workspace_memberships wm where wm.workspace_id = p_workspace_id and wm.user_id = v_actor) then
    raise insufficient_privilege using message = 'ENJAZ_WORKSPACE_FORBIDDEN';
  end if;
  if p_idempotency_key is null then raise invalid_parameter_value using message = 'ENJAZ_REVERSAL_IDEMPOTENCY_REQUIRED'; end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 600 then
    raise invalid_parameter_value using message = 'ENJAZ_REVERSAL_REASON_INVALID';
  end if;

  select * into v_existing from public.payment_reversals r where r.workspace_id = p_workspace_id and r.idempotency_key = p_idempotency_key limit 1;
  if found then
    if v_existing.payment_id = p_payment_id then
      return jsonb_build_object('reversalId', v_existing.id, 'reversalRef', v_existing.reversal_ref, 'paymentId', v_existing.payment_id,
        'reason', v_existing.reason, 'reversedAt', v_existing.reversed_at, 'snapshot', v_existing.reversal_snapshot, 'wasDuplicate', true);
    end if;
    raise unique_violation using message = 'ENJAZ_REVERSAL_IDEMPOTENCY_CONFLICT';
  end if;

  select * into v_payment from public.payments p where p.workspace_id = p_workspace_id and p.id = p_payment_id for update;
  if not found then raise foreign_key_violation using message = 'ENJAZ_REVERSAL_PAYMENT_INVALID'; end if;

  select * into v_existing from public.payment_reversals r where r.workspace_id = p_workspace_id and r.payment_id = p_payment_id limit 1;
  if found then
    if v_payment.status <> 'reversed' then update public.payments set status = 'reversed' where workspace_id = p_workspace_id and id = p_payment_id; end if;
    return jsonb_build_object('reversalId', v_existing.id, 'reversalRef', v_existing.reversal_ref, 'paymentId', v_existing.payment_id,
      'reason', v_existing.reason, 'reversedAt', v_existing.reversed_at, 'snapshot', v_existing.reversal_snapshot, 'wasDuplicate', true);
  end if;

  if v_payment.status <> 'posted' then raise invalid_parameter_value using message = 'ENJAZ_PAYMENT_NOT_REVERSIBLE'; end if;

  v_serial := nextval('private.enjaz_payment_reversal_serial_seq'::regclass);
  v_ref := 'ENJ-RV-' || to_char(now() at time zone 'Asia/Baghdad', 'YYYY') || '-' || lpad(v_serial::text, 8, '0');
  v_snapshot := jsonb_build_object(
    'version', 1, 'reversalRef', v_ref, 'reversalSerial', v_serial, 'paymentId', v_payment.id,
    'receiptRef', v_payment.receipt_ref, 'amount', v_payment.amount::text, 'method', v_payment.method,
    'reason', btrim(p_reason), 'reversedAt', now(), 'actorUserId', v_actor, 'receiptSnapshot', v_payment.receipt_snapshot
  );

  insert into public.payment_reversals(workspace_id, payment_id, reversed_at, reason, actor_user_id, idempotency_key, reversal_serial, reversal_ref, reversal_snapshot)
  values (p_workspace_id, p_payment_id, now(), btrim(p_reason), v_actor, p_idempotency_key, v_serial, v_ref, v_snapshot)
  returning * into v_reversal;

  update public.payments set status = 'reversed' where workspace_id = p_workspace_id and id = p_payment_id and status = 'posted';
  if not found then raise serialization_failure using message = 'ENJAZ_REVERSAL_STATUS_RACE'; end if;

  insert into public.audit_events(workspace_id, actor_user_id, action, entity_type, entity_id, summary, details)
  values (p_workspace_id, v_actor, 'payment.reversed', 'payment', v_payment.id, 'Reversed payment ' || v_payment.receipt_ref,
    jsonb_build_object('receiptRef', v_payment.receipt_ref, 'reversalRef', v_reversal.reversal_ref, 'amount', v_payment.amount::text,
      'reason', v_reversal.reason, 'idempotencyKey', p_idempotency_key));

  insert into public.transaction_activity(workspace_id, transaction_id, event_type, summary, source_entity_type, source_entity_id, metadata, actor_user_id)
  values (p_workspace_id, v_payment.transaction_id, 'payment_reversed', 'تم عكس الدفعة ' || v_payment.receipt_ref, 'payment_reversal', v_reversal.id,
    jsonb_build_object('receiptRef', v_payment.receipt_ref, 'reversalRef', v_reversal.reversal_ref, 'amount', v_payment.amount::text, 'reason', v_reversal.reason), v_actor);

  return jsonb_build_object('reversalId', v_reversal.id, 'reversalRef', v_reversal.reversal_ref, 'paymentId', v_reversal.payment_id,
    'reason', v_reversal.reason, 'reversedAt', v_reversal.reversed_at, 'snapshot', v_reversal.reversal_snapshot, 'wasDuplicate', false);
end;
$$;

create or replace function public.get_payment_receipt_v1(p_workspace_id uuid, p_payment_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_payment public.payments%rowtype;
begin
  if v_actor is null then raise insufficient_privilege using message = 'ENJAZ_AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.workspace_memberships wm where wm.workspace_id = p_workspace_id and wm.user_id = v_actor) then
    raise insufficient_privilege using message = 'ENJAZ_WORKSPACE_FORBIDDEN';
  end if;
  select * into v_payment from public.payments p where p.workspace_id = p_workspace_id and p.id = p_payment_id;
  if not found then raise foreign_key_violation using message = 'ENJAZ_RECEIPT_NOT_FOUND'; end if;
  return jsonb_build_object(
    'paymentId', v_payment.id, 'receiptRef', v_payment.receipt_ref, 'receiptSerial', v_payment.receipt_serial,
    'receiptToken', v_payment.receipt_token, 'amount', v_payment.amount::text, 'method', v_payment.method,
    'paidAt', v_payment.paid_at, 'status', v_payment.status, 'transactionId', v_payment.transaction_id,
    'companyId', v_payment.company_id, 'cashboxId', v_payment.cashbox_id, 'engagementId', v_payment.engagement_id,
    'note', v_payment.note, 'snapshot', v_payment.receipt_snapshot,
    'reversal', (select jsonb_build_object('reversalId', r.id, 'reversalRef', r.reversal_ref, 'reason', r.reason, 'reversedAt', r.reversed_at, 'snapshot', r.reversal_snapshot) from public.payment_reversals r where r.workspace_id = p_workspace_id and r.payment_id = p_payment_id)
  );
end;
$$;

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
