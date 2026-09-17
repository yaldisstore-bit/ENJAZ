-- ENJAZ Phase 11.6-B — advisor hardening for public follow-up capability
-- Keep public RPC façades SECURITY INVOKER while the narrowly-scoped private
-- capability functions own privileged lookup/write authority and rate limiting.
begin;

create index if not exists intake_followup_requests_portal_principal_fk_idx
  on private.intake_followup_requests(workspace_id,portal_principal_id)
  where portal_principal_id is not null;

create index if not exists intake_followup_requests_requested_by_fk_idx
  on private.intake_followup_requests(requested_by);

create or replace function private.get_public_intake_followup_capability_v1(p_token text)
returns jsonb
language plpgsql volatile security definer set search_path='' as $$
begin
  perform private.enforce_intake_followup_rate_v1(p_token,'view');
  return private.get_public_intake_followup_v1_impl(p_token);
end; $$;

create or replace function private.save_public_intake_followup_capability_v1(
  p_token text,p_patch jsonb,p_finalize boolean
) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
begin
  perform private.enforce_intake_followup_rate_v1(
    p_token,case when coalesce(p_finalize,false) then 'submit' else 'save_draft' end
  );
  return private.save_public_intake_followup_v1_impl(p_token,p_patch,p_finalize);
end; $$;

revoke all on function private.get_public_intake_followup_capability_v1(text)
  from public,anon,authenticated,service_role;
revoke all on function private.save_public_intake_followup_capability_v1(text,jsonb,boolean)
  from public,anon,authenticated,service_role;

-- The private schema itself is not exposed by the Data API. Anonymous usage is
-- granted only so the public SECURITY INVOKER façades can resolve the two
-- capability functions; EXECUTE remains explicitly limited to those functions.
grant usage on schema private to anon;
grant execute on function private.get_public_intake_followup_capability_v1(text) to anon,authenticated;
grant execute on function private.save_public_intake_followup_capability_v1(text,jsonb,boolean) to anon,authenticated;

create or replace function public.get_public_intake_followup_v1(p_token text)
returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.get_public_intake_followup_capability_v1(p_token);
$$;

create or replace function public.save_public_intake_followup_v1(
  p_token text,p_patch jsonb,p_finalize boolean
) returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.save_public_intake_followup_capability_v1(p_token,p_patch,p_finalize);
$$;

revoke all on function public.get_public_intake_followup_v1(text) from public,service_role;
grant execute on function public.get_public_intake_followup_v1(text) to anon,authenticated;
revoke all on function public.save_public_intake_followup_v1(text,jsonb,boolean) from public,service_role;
grant execute on function public.save_public_intake_followup_v1(text,jsonb,boolean) to anon,authenticated;

-- Base privileged implementations remain unreachable to browser roles.
revoke all on function private.get_public_intake_followup_v1_impl(text)
  from public,anon,authenticated,service_role;
revoke all on function private.save_public_intake_followup_v1_impl(text,jsonb,boolean)
  from public,anon,authenticated,service_role;
revoke all on function private.enforce_intake_followup_rate_v1(text,text)
  from public,anon,authenticated,service_role;

commit;
