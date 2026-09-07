-- ENJAZ Phase 8.1 — canonical transaction-attached workflow read surface.
-- Read-only RPC for the visual Transaction 360 workflow panel. No parallel state store.

begin;

create or replace function public.get_transaction_workflow_context_v1(
  p_workspace_id uuid,
  p_transaction_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_instance public.workflow_instances%rowtype;
  v_pending_required integer := 0;
begin
  if v_actor is null then
    raise insufficient_privilege using message = 'ENJAZ_AUTH_REQUIRED';
  end if;
  if not exists (
    select 1 from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id and wm.user_id = v_actor
  ) then
    raise insufficient_privilege using message = 'ENJAZ_WORKSPACE_FORBIDDEN';
  end if;
  if not exists (
    select 1 from public.transactions tx
    where tx.workspace_id = p_workspace_id and tx.id = p_transaction_id and tx.deleted_at is null
  ) then
    raise invalid_parameter_value using message = 'ENJAZ_WORKFLOW_TRANSACTION_UNAVAILABLE';
  end if;

  select wi.* into v_instance
  from public.workflow_instances wi
  where wi.workspace_id = p_workspace_id
    and wi.transaction_id = p_transaction_id
    and wi.government_procedure_id is not null
    and wi.status in ('active','completed')
  order by (wi.status = 'active') desc, coalesce(wi.completed_at, wi.started_at) desc, wi.id desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'authority', 'canonical_workflow_instance',
      'transactionId', p_transaction_id,
      'instance', null
    );
  end if;

  select count(*)::integer into v_pending_required
  from public.workflow_item_states item
  where item.workspace_id = p_workspace_id
    and item.workflow_instance_id = v_instance.id
    and item.stage_position = v_instance.current_stage_position
    and item.required is true
    and item.status = 'pending';

  return jsonb_build_object(
    'authority', 'canonical_workflow_instance',
    'transactionId', p_transaction_id,
    'instance', jsonb_build_object(
      'instanceId', v_instance.id,
      'procedureId', v_instance.government_procedure_id,
      'branchId', v_instance.government_branch_id,
      'currentStagePosition', v_instance.current_stage_position,
      'status', v_instance.status,
      'startedAt', v_instance.started_at,
      'completedAt', v_instance.completed_at,
      'templateSnapshot', v_instance.template_snapshot,
      'pendingRequiredCount', v_pending_required,
      'stageStates', coalesce((
        select jsonb_agg(jsonb_build_object(
          'position', s.stage_position,
          'status', s.status,
          'startedAt', s.started_at,
          'completedAt', s.completed_at,
          'overrideUsed', s.override_used,
          'overrideReason', s.override_reason
        ) order by s.stage_position)
        from public.workflow_stage_states s
        where s.workspace_id = p_workspace_id and s.workflow_instance_id = v_instance.id
      ), '[]'::jsonb),
      'itemStates', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', i.id,
          'templateItemKey', i.template_item_key,
          'stagePosition', i.stage_position,
          'status', i.status,
          'required', i.required,
          'itemType', i.item_type,
          'title', i.title,
          'note', i.note,
          'completedAt', i.completed_at
        ) order by i.stage_position, i.created_at, i.id)
        from public.workflow_item_states i
        where i.workspace_id = p_workspace_id and i.workflow_instance_id = v_instance.id
      ), '[]'::jsonb),
      'allowedTransitions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'key', t.transition_key,
          'label', t.label,
          'kind', t.transition_kind,
          'fromStagePosition', t.from_stage_position,
          'toStagePosition', t.to_stage_position,
          'requiresReason', t.requires_reason
        ) order by t.transition_key)
        from public.workflow_template_transitions t
        where t.workspace_id = p_workspace_id
          and t.workflow_template_id = v_instance.workflow_template_id
          and t.from_stage_position = v_instance.current_stage_position
          and t.active
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke execute on function public.get_transaction_workflow_context_v1(uuid, uuid) from public, anon;
grant execute on function public.get_transaction_workflow_context_v1(uuid, uuid) to authenticated;

commit;
