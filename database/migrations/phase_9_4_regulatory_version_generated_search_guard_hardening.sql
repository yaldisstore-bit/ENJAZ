-- Phase 9.4 / M8 — immutable-version guard hardening.
-- `search_document` is GENERATED ALWAYS. In a BEFORE UPDATE trigger PostgreSQL may expose
-- a transient NEW value that differs from OLD before the generated expression is recomputed.
-- Exclude only that derived column plus the two explicitly permitted history-closing fields.
-- Every present or future non-derived business column remains fail-closed by the JSON comparison.

create or replace function private.guard_regulatory_version_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if tg_op='DELETE' then
    raise check_violation using message='ENJAZ_REGULATORY_VERSION_DELETE_FORBIDDEN';
  end if;

  if old.effective_to is null
     and new.effective_to is not null
     and new.effective_to>old.effective_from
     and old.ended_by_operation_id is null
     and new.ended_by_operation_id is not null
     and (to_jsonb(new)-'effective_to'-'ended_by_operation_id'-'search_document')
         =(to_jsonb(old)-'effective_to'-'ended_by_operation_id'-'search_document') then
    return new;
  end if;

  raise check_violation using message='ENJAZ_REGULATORY_VERSION_IMMUTABLE';
end;
$$;

revoke all on function private.guard_regulatory_version_mutation_v1() from public,anon,authenticated;
