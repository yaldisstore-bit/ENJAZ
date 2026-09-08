-- Phase 8.3 offline hardening: the check-in client operation UUID is also the canonical visit UUID.
-- This lets an offline client queue check-in -> check-out against a stable identity before first sync.
begin;

create or replace function private.start_field_visit_v1_impl(
  p_workspace_id uuid,p_assignment_id uuid,p_expected_assignment_version integer,p_location jsonb,p_client_operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid()); v_assignment public.field_assignments%rowtype; v_visit public.field_visits%rowtype; v_receipt public.field_sync_receipts%rowtype;
  v_location jsonb; v_result jsonb; v_fingerprint text;
begin
  if v_actor is null or not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then raise insufficient_privilege using message='ENJAZ_FIELD_WORKSPACE_FORBIDDEN'; end if;
  if p_client_operation_id is null then raise invalid_parameter_value using message='ENJAZ_FIELD_OPERATION_ID_REQUIRED'; end if;
  v_fingerprint:=md5(jsonb_build_object('assignmentId',p_assignment_id,'expectedVersion',p_expected_assignment_version,'location',p_location)::text);
  select * into v_receipt from public.field_sync_receipts r where r.workspace_id=p_workspace_id and r.client_operation_id=p_client_operation_id;
  if found then
    if v_receipt.payload_fingerprint<>v_fingerprint or v_receipt.operation_type<>'check_in' then raise unique_violation using message='ENJAZ_FIELD_IDEMPOTENCY_CONFLICT'; end if;
    return v_receipt.result||jsonb_build_object('wasDuplicate',true);
  end if;
  select * into v_assignment from public.field_assignments a where a.workspace_id=p_workspace_id and a.id=p_assignment_id for update;
  if not found then raise no_data_found using message='ENJAZ_FIELD_ASSIGNMENT_NOT_FOUND'; end if;
  if v_assignment.version<>p_expected_assignment_version then raise serialization_failure using message='ENJAZ_FIELD_ASSIGNMENT_STALE'; end if;
  if v_assignment.assigned_user_id<>v_actor then raise insufficient_privilege using message='ENJAZ_FIELD_NOT_ASSIGNED_ACTOR'; end if;
  if v_assignment.status<>'queued' then raise invalid_parameter_value using message='ENJAZ_FIELD_ASSIGNMENT_NOT_READY'; end if;
  if exists(select 1 from public.field_visits v where v.workspace_id=p_workspace_id and v.assignment_id=p_assignment_id and v.status='checked_in') then raise unique_violation using message='ENJAZ_FIELD_VISIT_ALREADY_ACTIVE'; end if;
  if exists(select 1 from public.field_visits v where v.id=p_client_operation_id and (v.workspace_id<>p_workspace_id or v.assignment_id<>p_assignment_id)) then raise unique_violation using message='ENJAZ_FIELD_OPERATION_ID_CONFLICT'; end if;
  v_location:=private.validate_field_location_v1(p_workspace_id,p_location);
  insert into public.field_visits(id,workspace_id,assignment_id,transaction_id,assigned_user_id,check_in_location,started_by)
  values(p_client_operation_id,p_workspace_id,v_assignment.id,v_assignment.transaction_id,v_actor,v_location,v_actor) returning * into v_visit;
  update public.field_assignments set status='in_progress',version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=v_assignment.id returning * into v_assignment;
  v_result:=jsonb_build_object('visitId',v_visit.id,'visitStatus',v_visit.status,'visitVersion',v_visit.version,'assignmentId',v_assignment.id,'assignmentStatus',v_assignment.status,'assignmentVersion',v_assignment.version,'checkedInAt',v_visit.check_in_at,'wasDuplicate',false);
  insert into public.field_sync_receipts(workspace_id,client_operation_id,operation_type,target_id,payload_fingerprint,result,created_by)
  values(p_workspace_id,p_client_operation_id,'check_in',v_visit.id,v_fingerprint,v_result,v_actor);
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'field.visit.checked_in','field_visit',v_visit.id,'Field visit checked in',jsonb_build_object('assignmentId',v_assignment.id,'transactionId',v_visit.transaction_id,'locationRecorded',v_location is not null,'offlineStableIdentity',true));
  return v_result;
end;
$$;

revoke all on function private.start_field_visit_v1_impl(uuid,uuid,integer,jsonb,uuid) from public,anon;
grant execute on function private.start_field_visit_v1_impl(uuid,uuid,integer,jsonb,uuid) to authenticated;

commit;
