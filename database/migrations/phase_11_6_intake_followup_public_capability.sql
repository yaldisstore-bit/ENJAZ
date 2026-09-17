-- ENJAZ Phase 11.6-B — PostgREST signatures + rate-limited public capability boundary
begin;

create or replace function private.enforce_intake_followup_rate_v1(p_token text,p_event_type text)
returns void language plpgsql volatile security definer set search_path='' as $$
declare v_followup private.intake_followup_requests%rowtype; v_link_id uuid;
begin
  v_followup:=private.require_live_intake_followup_v1(p_token);
  select s.link_id into v_link_id
  from public.intake_submissions s
  where s.workspace_id=v_followup.workspace_id and s.id=v_followup.submission_id;
  if v_link_id is null then raise no_data_found using message='ENJAZ_INTAKE_FOLLOWUP_LINK_MISSING'; end if;
  perform private.enforce_public_intake_rate_v1(v_link_id,p_event_type);
end; $$;
revoke all on function private.enforce_intake_followup_rate_v1(text,text) from public,anon,authenticated,service_role;

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
returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
  perform private.enforce_intake_followup_rate_v1(p_token,'view');
  return private.get_public_intake_followup_v1_impl(p_token);
end; $$;

create function public.save_public_intake_followup_v1(p_token text,p_patch jsonb,p_finalize boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
  perform private.enforce_intake_followup_rate_v1(p_token,case when coalesce(p_finalize,false) then 'submit' else 'save_draft' end);
  return private.save_public_intake_followup_v1_impl(p_token,p_patch,p_finalize);
end; $$;

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

-- No browser role executes private capability implementations directly.
revoke all on function private.get_public_intake_followup_v1_impl(text) from public,anon,authenticated,service_role;
revoke all on function private.save_public_intake_followup_v1_impl(text,jsonb,boolean) from public,anon,authenticated,service_role;

-- Staff commands remain SECURITY INVOKER and authenticated-only.
revoke all on function public.issue_intake_followup_v1(uuid,uuid,integer,text,text,jsonb,text,text,integer,uuid,uuid,uuid,uuid) from public,anon,service_role;
grant execute on function public.issue_intake_followup_v1(uuid,uuid,integer,text,text,jsonb,text,text,integer,uuid,uuid,uuid,uuid) to authenticated;
revoke all on function public.reconcile_portal_intake_followup_v1(uuid,uuid,integer,integer,jsonb) from public,anon,service_role;
grant execute on function public.reconcile_portal_intake_followup_v1(uuid,uuid,integer,integer,jsonb) to authenticated;
revoke all on function public.revoke_intake_followup_v1(uuid,uuid,integer,text) from public,anon,service_role;
grant execute on function public.revoke_intake_followup_v1(uuid,uuid,integer,text) to authenticated;

-- Token capability is intentionally public to anon/authenticated, but requires a valid bearer and is rate-limited.
revoke all on function public.get_public_intake_followup_v1(text) from public,service_role;
grant execute on function public.get_public_intake_followup_v1(text) to anon,authenticated;
revoke all on function public.save_public_intake_followup_v1(text,jsonb,boolean) from public,service_role;
grant execute on function public.save_public_intake_followup_v1(text,jsonb,boolean) to anon,authenticated;

commit;
