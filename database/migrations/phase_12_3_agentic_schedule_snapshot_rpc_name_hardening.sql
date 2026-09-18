-- ENJAZ Phase 12.3 A3-C — M10 snapshot RPC named-argument hardening.
-- No scheduling behavior changes. This only makes the existing public wrapper
-- addressable through PostgREST/Supabase RPC named arguments.
begin;

create or replace function public.get_scheduling_deadline_snapshot_v1(
  p_workspace_id uuid,
  p_as_of timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select private.get_scheduling_deadline_snapshot_v1_impl(p_workspace_id,p_as_of);
$$;

revoke all on function public.get_scheduling_deadline_snapshot_v1(uuid,timestamptz)
  from public,anon,service_role;
grant execute on function public.get_scheduling_deadline_snapshot_v1(uuid,timestamptz)
  to authenticated;

commit;
