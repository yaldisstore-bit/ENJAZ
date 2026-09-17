-- ENJAZ Phase 11.6-B — PostgREST RPC signatures + public secure-link capability boundary
-- The base migration creates the owning implementations and fail-closed façades.
-- This migration recreates public façades with explicit parameter names required by PostgREST.
begin;

drop function public.issue_intake_followup_v1(uuid,uuid,integer,text,text,jsonb,text,text,integer,uuid,uuid,uuid,uuid);
drop function public.get_public_intake_followup_v1(text);
drop function public.save_public_intake_followup_v1(text,jsonb,boolean);
drop function public.reconcile_portal_intake_followup_v1(uuid,uuid,integer,integer,jsonb);
drop function public.revoke_intake_followup_v1(uuid,uuid,integer,text);

create function public.issue_intake_followup_v1(
  p_workspace_id uuid,
  p_submission_id uuid,
  p_expected_submission_version integer,
  p_mode text,
  p_request_kind text,
  p_requested_fields jsonb,
  p_title text,
  p_instructions text,
  p_expires_in_hours integer,
  p_idempotency_key uuid,
  p_portal_principal_id uuid default null,
  p_portal_transaction_id uuid default null,
  p_portal_request_id uuid default null
) returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.issue_intake_followup_v1_impl(
    p_workspace_id,p_submission_id,p_expected_submission_version,p_mode,p_request_kind,p_requested_fields,
    p_title,p_instructions,p_expires_in_hours,p_idempotency_key,p_portal_principal_id,p_portal_transaction_id,p_portal_request_id
  );
$$;

create function public.get_public_intake_followup_v1(p_token text)
returns jsonb language sql volatile security definer set search_path='' as $$
  select private.get_public_intake_followup_v1_impl(p_token);
$$;

create function public.save_public_intake_followup_v1(p_token text,p_patch jsonb,p_finalize boolean)
returns jsonb language sql volatile security definer set search_path='' as $$
  select private.save_public_intake_followup_v1_impl(p_token,p_patch,p_finalize);
$$;

create function public.reconcile_portal_intake_followup_v1(
  p_workspace_id uuid,
  p_followup_id uuid,
  p_expected_followup_version integer,
  p_expected_submission_version integer,
  p_answer_patch jsonb
) returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.reconcile_portal_intake_followup_v1_impl(
    p_workspace_id,p_followup_id,p_expected_followup_version,p_expected_submission_version,p_answer_patch
  );
$$;

create function public.revoke_intake_followup_v1(
  p_workspace_id uuid,p_followup_id uuid,p_expected_version integer,p_reason text
) returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.revoke_intake_followup_v1_impl(p_workspace_id,p_followup_id,p_expected_version,p_reason);
$$;

-- Anonymous capability is exposed only by the two token-bound public definer façades.
revoke all on function private.get_public_intake_followup_v1_impl(text) from public,anon,authenticated,service_role;
revoke all on function private.save_public_intake_followup_v1_impl(text,jsonb,boolean) from public,anon,authenticated,service_role;

-- Staff/browser commands remain SECURITY INVOKER and authenticated-only.
revoke all on function public.issue_intake_followup_v1(uuid,uuid,integer,text,text,jsonb,text,text,integer,uuid,uuid,uuid,uuid) from public,anon,service_role;
grant execute on function public.issue_intake_followup_v1(uuid,uuid,integer,text,text,jsonb,text,text,integer,uuid,uuid,uuid,uuid) to authenticated;
revoke all on function public.reconcile_portal_intake_followup_v1(uuid,uuid,integer,integer,jsonb) from public,anon,service_role;
grant execute on function public.reconcile_portal_intake_followup_v1(uuid,uuid,integer,integer,jsonb) to authenticated;
revoke all on function public.revoke_intake_followup_v1(uuid,uuid,integer,text) from public,anon,service_role;
grant execute on function public.revoke_intake_followup_v1(uuid,uuid,integer,text) to authenticated;

revoke all on function public.get_public_intake_followup_v1(text) from public,service_role;
grant execute on function public.get_public_intake_followup_v1(text) to anon,authenticated;
revoke all on function public.save_public_intake_followup_v1(text,jsonb,boolean) from public,service_role;
grant execute on function public.save_public_intake_followup_v1(text,jsonb,boolean) to anon,authenticated;

commit;
