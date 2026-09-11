begin;

-- Phase 9.3 hardening: do not trust a session-set custom GUC as the capital-write authority.
-- The governance command runs as the owner of the private SECURITY DEFINER function/table;
-- ordinary Data API/authenticated writes do not. Compare against the authoritative table owner.
create or replace function private.guard_governed_company_capital_v1()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_table_owner name;
begin
  select pg_catalog.pg_get_userbyid(c.relowner)
    into v_table_owner
  from pg_catalog.pg_class c
  where c.oid='public.companies'::regclass;

  if new.capital is distinct from old.capital
     and current_user<>v_table_owner then
    raise insufficient_privilege using message='ENJAZ_CAPITAL_REQUIRES_GOVERNANCE_COMMAND';
  end if;
  return new;
end;
$$;

revoke execute on function private.guard_governed_company_capital_v1() from public,anon,authenticated;
comment on function private.guard_governed_company_capital_v1() is
  'Phase 9.3: changed company capital is accepted only from table-owner/SECURITY-DEFINER governance execution; browser/session flags are not trusted.';

commit;
