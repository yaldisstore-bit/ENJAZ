-- ENJAZ Phase 7.5 — finance destruction hardening
-- A payment can have at most one compensating reversal event. The guarded RPC already
-- serializes reversal commands; this constraint closes the database-level escape hatch
-- for admin/legacy/import paths and prevents reconciliation multiplication.

begin;

do $$
declare
  v_duplicate_groups bigint;
begin
  select count(*) into v_duplicate_groups
  from (
    select workspace_id, payment_id
    from public.payment_reversals
    group by workspace_id, payment_id
    having count(*) > 1
  ) duplicates;

  if v_duplicate_groups > 0 then
    raise exception 'ENJAZ_PHASE75_DUPLICATE_PAYMENT_REVERSALS: % duplicate payment groups require forensic reconciliation before migration', v_duplicate_groups;
  end if;
end;
$$;

create unique index if not exists payment_reversals_workspace_payment_unique_idx
  on public.payment_reversals(workspace_id, payment_id);

commit;
