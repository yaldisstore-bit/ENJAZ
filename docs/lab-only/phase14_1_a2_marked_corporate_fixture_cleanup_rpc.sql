-- LAB ONLY: install solely on nqhgaukutkyvfumbtbtg.
-- SECURITY DEFINER is private and service_role-only; public RPC is invoker.
-- This is a disposable test-fixture repair, NEVER an application write API.
DO $enjaz_lab_setup$
BEGIN
  IF (SELECT count(*) FROM auth.users) <> 0 OR
     (SELECT count(*) FROM public.workspaces) <> 0 OR
     (SELECT count(*) FROM storage.objects) <> 0 THEN
    RAISE EXCEPTION 'ENJAZ_LAB_CLEANUP_BOOTSTRAP_NOT_EMPTY';
  END IF;
END
$enjaz_lab_setup$;

create or replace function private.phase14_1_a2_lab_remove_corporate_children_impl(
  p_workspace_id uuid,p_owner_user_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $enjaz_body$
declare
  v_owner_count integer; v_table text;
begin
  if p_workspace_id is null or p_owner_user_id is null then
    raise insufficient_privilege using message='ENJAZ_LAB_CLEANUP_TARGET_DENIED';
  end if;
  if (select count(*) from auth.users) not between 1 and 4 or
     exists (select 1 from auth.users u where
       u.raw_user_meta_data->>'enjaz_test_marker' is distinct from 'phase14_1_a2_j04_field_real_cloud'
       or u.raw_user_meta_data->>'label' is null
       or u.raw_user_meta_data->>'label' not in ('owner','outsider','portal-client','member')
       or u.email is null
       or u.email not like 'enjaz-a2-j03-%@example.com') then
    raise insufficient_privilege using message='ENJAZ_LAB_CLEANUP_UNMARKED_AUTH_DENIED';
  end if;
  select count(*) into v_owner_count from public.workspaces w
    join auth.users u on u.id=w.owner_user_id
    where w.id=p_workspace_id and w.owner_user_id=p_owner_user_id
      and u.raw_user_meta_data->>'enjaz_test_marker'='phase14_1_a2_j04_field_real_cloud'
      and u.raw_user_meta_data->>'label'='owner';
  if v_owner_count<>1 or
     (select count(*) from public.companies)<>1 or
     (select count(*) from public.companies where workspace_id=p_workspace_id)<>1 then
    raise insufficient_privilege using message='ENJAZ_LAB_CLEANUP_WORKSPACE_DENIED';
  end if;
  -- Fixed whitelist: no caller-supplied identifiers or dynamic target.
  foreach v_table in array array[
    'corporate_capital_events','corporate_resolutions',
    'corporate_authority_grants','corporate_beneficial_owners',
    'corporate_ownership_stakes','corporate_governance_events',
    'corporate_registry_states','corporate_ownership_states'
  ] loop
    execute format('delete from public.%I where workspace_id=$1',v_table)
      using p_workspace_id;
  end loop;
  return jsonb_build_object('cleaned',true);
end
$enjaz_body$;

revoke all on function private.phase14_1_a2_lab_remove_corporate_children_impl(uuid,uuid)
 from public,anon,authenticated;
grant execute on function private.phase14_1_a2_lab_remove_corporate_children_impl(uuid,uuid)
 to service_role;

create or replace function public.phase14_1_a2_lab_remove_corporate_children_v1(
  p_workspace_id uuid,p_owner_user_id uuid
) returns jsonb language sql security invoker set search_path='' as $enjaz_wrap$
  select private.phase14_1_a2_lab_remove_corporate_children_impl(
    p_workspace_id,p_owner_user_id);
$enjaz_wrap$;
revoke all on function public.phase14_1_a2_lab_remove_corporate_children_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.phase14_1_a2_lab_remove_corporate_children_v1(uuid,uuid)
 to service_role;
