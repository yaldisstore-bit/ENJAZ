-- LAB ONLY: apply solely to isolated disposable project nqhgaukutkyvfumbtbtg.
-- Never apply this lab-specific hotfix to production; retain existing
-- authenticated/owner checks, operation replay and public RPC permissions.
-- PT409 is a deterministic HTTP conflict, unlike retryable SQLSTATE 40001.
DO $lab_guard$
BEGIN
  -- A previously failed, independently inventoried J10 run may leave exactly
  -- one marked owner and its one workspace. This is a schema-only patch:
  -- it does NOT delete or modify any user or business row.
  IF (SELECT count(*) FROM storage.objects) <> 0 OR NOT (
     ((SELECT count(*) FROM auth.users) = 0 AND
      (SELECT count(*) FROM public.workspaces) = 0)
     OR
     ((SELECT count(*) FROM auth.users) = 1 AND
      (SELECT count(*) FROM auth.users WHERE
        raw_user_meta_data->>'enjaz_test_marker'='phase14_1_a2_j04_field_real_cloud'
        AND raw_user_meta_data->>'label'='owner'
        AND email ~ '^enjaz-a2-j03-owner-[0-9a-f-]+@example[.]com
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='private' AND p.proname='record_company_resolution_v1_impl'
      AND pg_get_functiondef(p.oid) LIKE '%ENJAZ_RESOLUTION_STALE%'
  ) THEN
    RAISE EXCEPTION 'ENJAZ_A2_RESOLUTION_FUNCTION_DRIFT';
  END IF;
END
$lab_guard$;

create or replace function private.record_company_resolution_v1_impl(
  p_workspace_id uuid,p_company_id uuid,p_expected_version integer,p_operation_id uuid,p_resolution_number text,p_title text,p_resolution_type text,p_effective_on date,p_notes text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_state public.corporate_registry_states%rowtype; v_existing public.corporate_governance_events%rowtype; v_request jsonb; v_new_version int; v_id uuid;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);
  if p_company_id is null or p_operation_id is null or p_expected_version is null or p_expected_version<0 or p_effective_on is null or p_title is null or char_length(btrim(p_title)) not between 1 and 400 or p_resolution_type not in ('appointment','removal','ownership','capital','authorization','general','other') or (p_resolution_number is not null and char_length(btrim(p_resolution_number)) not between 1 and 120) or (p_notes is not null and char_length(p_notes)>4000) then raise invalid_parameter_value using message='ENJAZ_RESOLUTION_INPUT_INVALID'; end if;
  if not exists(select 1 from public.companies c where c.workspace_id=p_workspace_id and c.id=p_company_id and c.deleted_at is null) then raise no_data_found using message='ENJAZ_GOVERNANCE_COMPANY_NOT_FOUND'; end if;
  v_request:=jsonb_build_object('number',case when p_resolution_number is null then null else btrim(p_resolution_number) end,'title',btrim(p_title),'type',p_resolution_type,'effectiveOn',p_effective_on,'notes',p_notes);
  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text),hashtext(p_company_id::text));
  select * into v_existing from public.corporate_governance_events where workspace_id=p_workspace_id and company_id=p_company_id and operation_id=p_operation_id limit 1;
  if found then if v_existing.event_type='resolution.record' and v_existing.request_payload=v_request then return jsonb_build_object('companyId',p_company_id,'version',v_existing.governance_version,'resolutionId',v_existing.details->>'resolutionId','replayed',true); end if; raise unique_violation using message='ENJAZ_GOVERNANCE_OPERATION_REUSED'; end if;
  insert into public.corporate_registry_states(workspace_id,company_id) values(p_workspace_id,p_company_id) on conflict do nothing;
  select * into v_state from public.corporate_registry_states where workspace_id=p_workspace_id and company_id=p_company_id for update;
  if p_expected_version<>v_state.resolution_version then raise sqlstate 'PT409' using message='ENJAZ_RESOLUTION_STALE'; end if;
  insert into public.corporate_resolutions(workspace_id,company_id,resolution_number,title,resolution_type,effective_on,notes,actor_user_id,operation_id) values(p_workspace_id,p_company_id,case when p_resolution_number is null then null else btrim(p_resolution_number) end,btrim(p_title),p_resolution_type,p_effective_on,p_notes,v_actor,p_operation_id) returning id into v_id;
  v_new_version:=v_state.resolution_version+1;
  update public.corporate_registry_states set resolution_version=v_new_version,last_resolution_effective_on=greatest(coalesce(last_resolution_effective_on,p_effective_on),p_effective_on),updated_at=now() where workspace_id=p_workspace_id and company_id=p_company_id;
  insert into public.corporate_governance_events(workspace_id,company_id,event_type,effective_on,governance_version,actor_user_id,operation_id,request_payload,details) values(p_workspace_id,p_company_id,'resolution.record',p_effective_on,v_new_version,v_actor,p_operation_id,v_request,jsonb_build_object('resolutionId',v_id));
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'corporate_resolution.recorded','company',p_company_id,'Corporate resolution recorded',jsonb_build_object('resolutionId',v_id,'version',v_new_version,'operationId',p_operation_id));
  return jsonb_build_object('companyId',p_company_id,'version',v_new_version,'resolutionId',v_id,'replayed',false);
end; $$;
) = 1 AND
      (SELECT count(*) FROM public.workspaces) = 1 AND
      (SELECT count(*) FROM public.workspaces w JOIN auth.users u
        ON u.id=w.owner_user_id WHERE
        u.raw_user_meta_data->>'enjaz_test_marker'='phase14_1_a2_j04_field_real_cloud'
        AND u.raw_user_meta_data->>'label'='owner') = 1)
  ) THEN
    RAISE EXCEPTION 'ENJAZ_A2_LAB_UNEXPECTED_IDENTITIES';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='private' AND p.proname='record_company_resolution_v1_impl'
      AND pg_get_functiondef(p.oid) LIKE '%ENJAZ_RESOLUTION_STALE%'
  ) THEN
    RAISE EXCEPTION 'ENJAZ_A2_RESOLUTION_FUNCTION_DRIFT';
  END IF;
END
$lab_guard$;

create or replace function private.record_company_resolution_v1_impl(
  p_workspace_id uuid,p_company_id uuid,p_expected_version integer,p_operation_id uuid,p_resolution_number text,p_title text,p_resolution_type text,p_effective_on date,p_notes text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_state public.corporate_registry_states%rowtype; v_existing public.corporate_governance_events%rowtype; v_request jsonb; v_new_version int; v_id uuid;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);
  if p_company_id is null or p_operation_id is null or p_expected_version is null or p_expected_version<0 or p_effective_on is null or p_title is null or char_length(btrim(p_title)) not between 1 and 400 or p_resolution_type not in ('appointment','removal','ownership','capital','authorization','general','other') or (p_resolution_number is not null and char_length(btrim(p_resolution_number)) not between 1 and 120) or (p_notes is not null and char_length(p_notes)>4000) then raise invalid_parameter_value using message='ENJAZ_RESOLUTION_INPUT_INVALID'; end if;
  if not exists(select 1 from public.companies c where c.workspace_id=p_workspace_id and c.id=p_company_id and c.deleted_at is null) then raise no_data_found using message='ENJAZ_GOVERNANCE_COMPANY_NOT_FOUND'; end if;
  v_request:=jsonb_build_object('number',case when p_resolution_number is null then null else btrim(p_resolution_number) end,'title',btrim(p_title),'type',p_resolution_type,'effectiveOn',p_effective_on,'notes',p_notes);
  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text),hashtext(p_company_id::text));
  select * into v_existing from public.corporate_governance_events where workspace_id=p_workspace_id and company_id=p_company_id and operation_id=p_operation_id limit 1;
  if found then if v_existing.event_type='resolution.record' and v_existing.request_payload=v_request then return jsonb_build_object('companyId',p_company_id,'version',v_existing.governance_version,'resolutionId',v_existing.details->>'resolutionId','replayed',true); end if; raise unique_violation using message='ENJAZ_GOVERNANCE_OPERATION_REUSED'; end if;
  insert into public.corporate_registry_states(workspace_id,company_id) values(p_workspace_id,p_company_id) on conflict do nothing;
  select * into v_state from public.corporate_registry_states where workspace_id=p_workspace_id and company_id=p_company_id for update;
  if p_expected_version<>v_state.resolution_version then raise sqlstate 'PT409' using message='ENJAZ_RESOLUTION_STALE'; end if;
  insert into public.corporate_resolutions(workspace_id,company_id,resolution_number,title,resolution_type,effective_on,notes,actor_user_id,operation_id) values(p_workspace_id,p_company_id,case when p_resolution_number is null then null else btrim(p_resolution_number) end,btrim(p_title),p_resolution_type,p_effective_on,p_notes,v_actor,p_operation_id) returning id into v_id;
  v_new_version:=v_state.resolution_version+1;
  update public.corporate_registry_states set resolution_version=v_new_version,last_resolution_effective_on=greatest(coalesce(last_resolution_effective_on,p_effective_on),p_effective_on),updated_at=now() where workspace_id=p_workspace_id and company_id=p_company_id;
  insert into public.corporate_governance_events(workspace_id,company_id,event_type,effective_on,governance_version,actor_user_id,operation_id,request_payload,details) values(p_workspace_id,p_company_id,'resolution.record',p_effective_on,v_new_version,v_actor,p_operation_id,v_request,jsonb_build_object('resolutionId',v_id));
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'corporate_resolution.recorded','company',p_company_id,'Corporate resolution recorded',jsonb_build_object('resolutionId',v_id,'version',v_new_version,'operationId',p_operation_id));
  return jsonb_build_object('companyId',p_company_id,'version',v_new_version,'resolutionId',v_id,'replayed',false);
end; $$;
