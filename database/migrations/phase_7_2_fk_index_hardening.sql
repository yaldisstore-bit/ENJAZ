-- ENJAZ Phase 7.2 — FK/index hardening from Supabase performance advisor
begin;

create index if not exists cashbox_finance_created_by_idx
  on public.cashbox_accounts(finance_created_by)
  where finance_created_by is not null;

create index if not exists commercial_engagements_created_by_idx
  on public.commercial_engagements(created_by);

create index if not exists commercial_engagement_transactions_created_by_idx
  on public.commercial_engagement_transactions(created_by);

create index if not exists payments_workspace_cashbox_idx
  on public.payments(workspace_id, cashbox_id)
  where cashbox_id is not null;

create index if not exists payments_created_by_idx
  on public.payments(created_by);

commit;
