-- ENJAZ Phase 11.6-B — follow-up bridge hardening
-- Tighten private helper grants and align portal revocation with the exact M3 owning-command contract.
begin;

create or replace function private.require_live_intake_followup_v1(p_token text)
returns private.intake_followup_requests language plpgsql volatile security definer set search_path='' as $$
declare v_hash text; v_row private.intake_followup_requests%rowtype; v_submission public.intake_submissions%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_TOKEN_INVALID';
  end if;
  v_hash:=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  select * into v_row from private.intake_followup_requests r
  where r.token_hash=v_hash and r.mode='secure_link'
  for update;
  if not found then raise no_data_found using message='ENJAZ_INTAKE_FOLLOWUP_NOT_FOUND'; end if;
  if v_row.status='revoked' then raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_REVOKED'; end if;
  if v_row.expires_at<=now() then raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_EXPIRED'; end if;
  if v_row.status='responded' then return v_row; end if;
  select * into v_submission from public.intake_submissions s
  where s.workspace_id=v_row.workspace_id and s.id=v_row.submission_id;
  if not found or v_submission.status<>'under_review' then
    raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_SUBMISSION_STATE_CHANGED';
  end if;
  if v_submission.version<>v_row.expected_submission_version then
    raise serialization_failure using message='ENJAZ_INTAKE_FOLLOWUP_SUBMISSION_STALE';
  end if;
  return v_row;
end; $$;

create or replace function private.revoke_intake_followup_v1_impl(p_workspace_id uuid,p_followup_id uuid,p_expected_version integer)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=private.require_crm_member_v1(p_workspace_id);
  v_row private.intake_followup_requests%rowtype;
  v_portal public.client_portal_requests%rowtype;
begin
  select * into v_row from private.intake_followup_requests r
  where r.workspace_id=p_workspace_id and r.id=p_followup_id for update;
  if not found then raise no_data_found using message='ENJAZ_INTAKE_FOLLOWUP_NOT_FOUND'; end if;
  if v_row.version<>p_expected_version then raise serialization_failure using message='ENJAZ_INTAKE_FOLLOWUP_STALE'; end if;
  if v_row.status='revoked' then
    return jsonb_build_object('followupId',v_row.id,'status','revoked','version',v_row.version,'wasDuplicate',true);
  end if;
  if v_row.status<>'open' then raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_NOT_OPEN'; end if;

  if v_row.mode='client_portal' then
    select * into v_portal from public.client_portal_requests q
    where q.workspace_id=p_workspace_id and q.id=v_row.portal_request_id for update;
    if not found then raise no_data_found using message='ENJAZ_INTAKE_FOLLOWUP_PORTAL_REQUEST_NOT_FOUND'; end if;
    if v_portal.revoked_at is null then
      perform private.revoke_client_portal_request_v1_impl(
        p_workspace_id,v_row.portal_request_id,v_portal.version,'intake_followup_revoked'
      );
    end if;
  end if;

  update private.intake_followup_requests
  set status='revoked',revoked_at=now(),version=version+1,updated_at=now()
  where id=v_row.id returning * into v_row;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'intake.followup.revoked','intake_submission',v_row.submission_id,
    'Governed intake follow-up revoked',jsonb_build_object('followupId',v_row.id,'mode',v_row.mode,'portalRequestId',v_row.portal_request_id));

  return jsonb_build_object('followupId',v_row.id,'status',v_row.status,'version',v_row.version,'wasDuplicate',false);
end; $$;

revoke all on function private.intake_followup_token_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function private.validate_intake_followup_patch_v1(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
revoke all on function private.require_live_intake_followup_v1(text) from public,anon,authenticated;
revoke all on function private.issue_intake_followup_v1_impl(uuid,uuid,integer,text,text,jsonb,text,text,integer,uuid,uuid,uuid,uuid) from public,anon;
revoke all on function private.get_public_intake_followup_v1_impl(text) from public;
revoke all on function private.save_public_intake_followup_v1_impl(text,jsonb,boolean) from public;
revoke all on function private.reconcile_portal_intake_followup_v1_impl(uuid,uuid,integer,integer,jsonb) from public,anon;
revoke all on function private.revoke_intake_followup_v1_impl(uuid,uuid,integer) from public,anon;

grant execute on function private.issue_intake_followup_v1_impl(uuid,uuid,integer,text,text,jsonb,text,text,integer,uuid,uuid,uuid,uuid) to authenticated,service_role;
grant execute on function private.reconcile_portal_intake_followup_v1_impl(uuid,uuid,integer,integer,jsonb) to authenticated,service_role;
grant execute on function private.revoke_intake_followup_v1_impl(uuid,uuid,integer) to authenticated,service_role;
grant execute on function private.get_public_intake_followup_v1_impl(text) to anon,authenticated,service_role;
grant execute on function private.save_public_intake_followup_v1_impl(text,jsonb,boolean) to anon,authenticated,service_role;

-- Helpers are callable only by the owning private implementation functions (as their definer), not browser roles.
revoke all on function private.intake_followup_token_v1(uuid,uuid,uuid) from service_role;
revoke all on function private.validate_intake_followup_patch_v1(uuid,uuid,jsonb,jsonb) from service_role;
revoke all on function private.require_live_intake_followup_v1(text) from service_role;

commit;
