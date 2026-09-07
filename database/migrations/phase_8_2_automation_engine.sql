-- ENJAZ Phase 8.2 — Automation Engine
-- Extends the canonical automation_rules / automation_runs baseline.
-- No shadow workflow state, no direct finance write path, sensitive workflow actions require explicit human approval.
begin;

alter table public.automation_rules
  add column rule_key text,
  add column description text,
  add column version integer not null default 1,
  add column created_by uuid references auth.users(id) on delete set null,
  add column updated_by uuid references auth.users(id) on delete set null;

update public.automation_rules
set rule_key = 'legacy_' || replace(id::text, '-', '')
where rule_key is null;

alter table public.automation_rules
  alter column rule_key set not null,
  add constraint automation_rules_rule_key_shape check (rule_key ~ '^[a-z][a-z0-9_]{2,79}$'),
  add constraint automation_rules_description_shape check (description is null or char_length(btrim(description)) between 1 and 1200),
  add constraint automation_rules_version_positive check (version > 0),
  add constraint automation_rules_workspace_rule_key_unique unique (workspace_id, rule_key);

alter table public.automation_runs
  drop constraint if exists automation_runs_status_check;

alter table public.automation_runs
  add column event_key text,
  add column event_fingerprint text,
  add column trigger_payload jsonb not null default '{}'::jsonb,
  add column requested_by uuid references auth.users(id) on delete set null,
  add constraint automation_runs_status_check check (status in ('started','awaiting_approval','succeeded','skipped','failed')),
  add constraint automation_runs_event_key_shape check (event_key is null or event_key ~ '^[a-z][a-z0-9_.-]{1,119}$'),
  add constraint automation_runs_fingerprint_shape check (event_fingerprint is null or event_fingerprint ~ '^[0-9a-f]{32}$'),
  add constraint automation_runs_payload_object check (jsonb_typeof(trigger_payload) = 'object'),
  add constraint automation_runs_finish_consistency check (
    (status in ('started','awaiting_approval') and finished_at is null)
    or (status in ('succeeded','skipped','failed') and finished_at is not null)
  );

create table public.automation_run_actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  automation_run_id uuid not null,
  action_index integer not null check (action_index >= 0),
  action_type text not null check (action_type in ('create_followup','workflow_transition')),
  status text not null default 'pending' check (status in ('pending','awaiting_approval','succeeded','skipped','failed')),
  action_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(action_snapshot) = 'object'),
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  executed_at timestamptz,
  constraint automation_run_actions_workspace_id_id_key unique (workspace_id, id),
  constraint automation_run_actions_run_fk foreign key (workspace_id, automation_run_id)
    references public.automation_runs(workspace_id, id) on delete cascade,
  constraint automation_run_actions_position_unique unique (workspace_id, automation_run_id, action_index),
  constraint automation_run_actions_execution_consistency check (
    (status in ('pending','awaiting_approval') and executed_at is null)
    or (status in ('succeeded','skipped','failed') and executed_at is not null)
  )
);

create table public.automation_approval_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  automation_run_id uuid not null,
  automation_run_action_id uuid not null,
  rule_id uuid not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users(id) on delete restrict,
  decided_at timestamptz,
  decision_note text,
  decision_key uuid,
  action_snapshot jsonb not null check (jsonb_typeof(action_snapshot) = 'object'),
  constraint automation_approval_requests_workspace_id_id_key unique (workspace_id, id),
  constraint automation_approval_requests_run_fk foreign key (workspace_id, automation_run_id)
    references public.automation_runs(workspace_id, id) on delete cascade,
  constraint automation_approval_requests_action_fk foreign key (workspace_id, automation_run_action_id)
    references public.automation_run_actions(workspace_id, id) on delete cascade,
  constraint automation_approval_requests_rule_fk foreign key (workspace_id, rule_id)
    references public.automation_rules(workspace_id, id) on delete cascade,
  constraint automation_approval_requests_action_unique unique (workspace_id, automation_run_action_id),
  constraint automation_approval_requests_decision_key_unique unique (workspace_id, decision_key),
  constraint automation_approval_requests_decision_note_shape check (decision_note is null or char_length(btrim(decision_note)) between 3 and 600),
  constraint automation_approval_requests_decision_consistency check (
    (status = 'pending' and decided_by is null and decided_at is null and decision_key is null)
    or (status in ('approved','rejected') and decided_by is not null and decided_at is not null and decision_key is not null)
  )
);

create index automation_run_actions_run_idx on public.automation_run_actions(workspace_id, automation_run_id, action_index);
create index automation_approval_pending_idx on public.automation_approval_requests(workspace_id, status, requested_at) where status = 'pending';

create or replace function private.validate_automation_rule_v1(
  p_trigger_config jsonb,
  p_conditions jsonb,
  p_actions jsonb,
  p_throttle_policy jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_trigger_type text;
  v_item jsonb;
  v_operator text;
  v_action_type text;
begin
  if jsonb_typeof(p_trigger_config) <> 'object' then
    raise invalid_parameter_value using message='ENJAZ_AUTOMATION_TRIGGER_INVALID';
  end if;
  v_trigger_type := p_trigger_config->>'type';
  if v_trigger_type not in ('manual','domain_event') then
    raise invalid_parameter_value using message='ENJAZ_AUTOMATION_TRIGGER_TYPE_UNSUPPORTED';
  end if;
  if v_trigger_type = 'domain_event' and coalesce(p_trigger_config->>'event','') !~ '^[a-z][a-z0-9_.-]{1,119}$' then
    raise invalid_parameter_value using message='ENJAZ_AUTOMATION_TRIGGER_EVENT_INVALID';
  end if;

  if jsonb_typeof(p_conditions) <> 'array' or jsonb_array_length(p_conditions) > 20 then
    raise invalid_parameter_value using message='ENJAZ_AUTOMATION_CONDITIONS_INVALID';
  end if;
  for v_item in select value from jsonb_array_elements(p_conditions)
  loop
    if jsonb_typeof(v_item) <> 'object' or coalesce(v_item->>'field','') !~ '^[a-zA-Z][a-zA-Z0-9_.]{0,119}$' then
      raise invalid_parameter_value using message='ENJAZ_AUTOMATION_CONDITION_FIELD_INVALID';
    end if;
    v_operator := v_item->>'operator';
    if v_operator not in ('eq','neq','in','exists') then
      raise invalid_parameter_value using message='ENJAZ_AUTOMATION_CONDITION_OPERATOR_UNSUPPORTED';
    end if;
    if v_operator = 'in' and jsonb_typeof(v_item->'value') <> 'array' then
      raise invalid_parameter_value using message='ENJAZ_AUTOMATION_CONDITION_VALUE_INVALID';
    end if;
  end loop;

  if jsonb_typeof(p_actions) <> 'array' or jsonb_array_length(p_actions) < 1 or jsonb_array_length(p_actions) > 20 then
    raise invalid_parameter_value using message='ENJAZ_AUTOMATION_ACTIONS_INVALID';
  end if;
  for v_item in select value from jsonb_array_elements(p_actions)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise invalid_parameter_value using message='ENJAZ_AUTOMATION_ACTION_INVALID';
    end if;
    v_action_type := v_item->>'type';
    if v_action_type = 'create_followup' then
      if char_length(btrim(coalesce(v_item->>'title',''))) not between 1 and 320 then
        raise invalid_parameter_value using message='ENJAZ_AUTOMATION_FOLLOWUP_TITLE_INVALID';
      end if;
      if coalesce(v_item->>'dueInDays','') !~ '^\d{1,4}$' or (v_item->>'dueInDays')::integer > 3650 then
        raise invalid_parameter_value using message='ENJAZ_AUTOMATION_FOLLOWUP_DUE_INVALID';
      end if;
    elsif v_action_type = 'workflow_transition' then
      if coalesce(v_item->>'transitionKey','') !~ '^[a-z][a-z0-9_]{1,79}$' then
        raise invalid_parameter_value using message='ENJAZ_AUTOMATION_WORKFLOW_TRANSITION_INVALID';
      end if;
      if coalesce(v_item->>'instanceIdField','') !~ '^[a-zA-Z][a-zA-Z0-9_.]{0,119}$'
         or coalesce(v_item->>'expectedStageField','') !~ '^[a-zA-Z][a-zA-Z0-9_.]{0,119}$' then
        raise invalid_parameter_value using message='ENJAZ_AUTOMATION_WORKFLOW_FIELD_INVALID';
      end if;
      if v_item ? 'reason' and char_length(btrim(coalesce(v_item->>'reason',''))) not between 3 and 600 then
        raise invalid_parameter_value using message='ENJAZ_AUTOMATION_WORKFLOW_REASON_INVALID';
      end if;
    else
      raise invalid_parameter_value using message='ENJAZ_AUTOMATION_ACTION_TYPE_UNSUPPORTED';
    end if;
  end loop;

  if jsonb_typeof(p_throttle_policy) <> 'object' then
    raise invalid_parameter_value using message='ENJAZ_AUTOMATION_THROTTLE_INVALID';
  end if;
  if p_throttle_policy ? 'minimumSeconds' and (
    coalesce(p_throttle_policy->>'minimumSeconds','') !~ '^\d{1,7}$'
    or (p_throttle_policy->>'minimumSeconds')::integer > 2592000
  ) then
    raise invalid_parameter_value using message='ENJAZ_AUTOMATION_THROTTLE_INVALID';
  end if;
end;
$$;
revoke all on function private.validate_automation_rule_v1(jsonb,jsonb,jsonb,jsonb) from public;

create or replace function private.automation_json_path_text(p_payload jsonb, p_path text)
returns text
language sql
immutable
set search_path = ''
as $$
  select p_payload #>> string_to_array(p_path, '.');
$$;
revoke all on function private.automation_json_path_text(jsonb,text) from public;

create or replace function private.automation_conditions_match_v1(p_conditions jsonb, p_payload jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_condition jsonb;
  v_actual text;
  v_operator text;
begin
  for v_condition in select value from jsonb_array_elements(p_conditions)
  loop
    v_actual := private.automation_json_path_text(p_payload, v_condition->>'field');
    v_operator := v_condition->>'operator';
    if v_operator = 'exists' then
      if ((v_condition->'value')::text = 'false' and v_actual is not null)
         or (coalesce((v_condition->'value')::text, 'true') <> 'false' and v_actual is null) then
        return false;
      end if;
    elsif v_operator = 'eq' then
      if v_actual is distinct from trim(both '"' from (v_condition->'value')::text) then return false; end if;
    elsif v_operator = 'neq' then
      if v_actual is not distinct from trim(both '"' from (v_condition->'value')::text) then return false; end if;
    elsif v_operator = 'in' then
      if not exists (
        select 1 from jsonb_array_elements_text(v_condition->'value') allowed(value)
        where allowed.value = v_actual
      ) then return false; end if;
    else
      return false;
    end if;
  end loop;
  return true;
end;
$$;
revoke all on function private.automation_conditions_match_v1(jsonb,jsonb) from public;

create or replace function public.upsert_automation_rule_v1(
  p_workspace_id uuid,
  p_rule_id uuid,
  p_expected_version integer,
  p_rule_key text,
  p_name text,
  p_description text,
  p_trigger_config jsonb,
  p_conditions jsonb,
  p_actions jsonb,
  p_throttle_policy jsonb,
  p_enabled boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_rule public.automation_rules%rowtype;
  v_created boolean := false;
begin
  if v_actor is null or not exists (
    select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor
  ) then raise insufficient_privilege using message='ENJAZ_AUTOMATION_WORKSPACE_FORBIDDEN'; end if;
  if p_rule_key !~ '^[a-z][a-z0-9_]{2,79}$' then raise invalid_parameter_value using message='ENJAZ_AUTOMATION_RULE_KEY_INVALID'; end if;
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 240 then raise invalid_parameter_value using message='ENJAZ_AUTOMATION_RULE_NAME_INVALID'; end if;
  if p_description is not null and char_length(btrim(p_description)) not between 1 and 1200 then raise invalid_parameter_value using message='ENJAZ_AUTOMATION_RULE_DESCRIPTION_INVALID'; end if;
  perform private.validate_automation_rule_v1(p_trigger_config,p_conditions,p_actions,p_throttle_policy);

  if p_rule_id is null then
    if p_expected_version is not null then raise invalid_parameter_value using message='ENJAZ_AUTOMATION_CREATE_VERSION_INVALID'; end if;
    insert into public.automation_rules(workspace_id,rule_key,name,description,enabled,trigger_config,conditions,actions,throttle_policy,created_by,updated_by)
    values(p_workspace_id,p_rule_key,btrim(p_name),nullif(btrim(coalesce(p_description,'')),''),coalesce(p_enabled,false),p_trigger_config,p_conditions,p_actions,p_throttle_policy,v_actor,v_actor)
    returning * into v_rule;
    v_created := true;
  else
    select * into v_rule from public.automation_rules r where r.workspace_id=p_workspace_id and r.id=p_rule_id for update;
    if not found then raise no_data_found using message='ENJAZ_AUTOMATION_RULE_NOT_FOUND'; end if;
    if p_expected_version is null or v_rule.version <> p_expected_version then raise serialization_failure using message='ENJAZ_AUTOMATION_RULE_STALE'; end if;
    update public.automation_rules r
    set rule_key=p_rule_key,name=btrim(p_name),description=nullif(btrim(coalesce(p_description,'')),''),enabled=coalesce(p_enabled,false),
        trigger_config=p_trigger_config,conditions=p_conditions,actions=p_actions,throttle_policy=p_throttle_policy,
        version=r.version+1,updated_by=v_actor
    where r.workspace_id=p_workspace_id and r.id=p_rule_id
    returning * into v_rule;
  end if;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,case when v_created then 'automation.rule.created' else 'automation.rule.updated' end,
    'automation_rule',v_rule.id,case when v_created then 'Automation rule created' else 'Automation rule updated' end,
    jsonb_build_object('ruleKey',v_rule.rule_key,'version',v_rule.version,'enabled',v_rule.enabled));

  return jsonb_build_object('id',v_rule.id,'ruleKey',v_rule.rule_key,'name',v_rule.name,'description',v_rule.description,'enabled',v_rule.enabled,
    'version',v_rule.version,'triggerConfig',v_rule.trigger_config,'conditions',v_rule.conditions,'actions',v_rule.actions,'throttlePolicy',v_rule.throttle_policy);
end;
$$;

create or replace function public.set_automation_rule_enabled_v1(
  p_workspace_id uuid,
  p_rule_id uuid,
  p_expected_version integer,
  p_enabled boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_rule public.automation_rules%rowtype;
begin
  if v_actor is null or not exists (
    select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor
  ) then raise insufficient_privilege using message='ENJAZ_AUTOMATION_WORKSPACE_FORBIDDEN'; end if;
  select * into v_rule from public.automation_rules r where r.workspace_id=p_workspace_id and r.id=p_rule_id for update;
  if not found then raise no_data_found using message='ENJAZ_AUTOMATION_RULE_NOT_FOUND'; end if;
  if p_expected_version is null or v_rule.version <> p_expected_version then raise serialization_failure using message='ENJAZ_AUTOMATION_RULE_STALE'; end if;
  update public.automation_rules r set enabled=p_enabled,version=r.version+1,updated_by=v_actor
  where r.workspace_id=p_workspace_id and r.id=p_rule_id returning * into v_rule;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,case when p_enabled then 'automation.rule.activated' else 'automation.rule.deactivated' end,
    'automation_rule',v_rule.id,case when p_enabled then 'Automation rule activated' else 'Automation rule deactivated' end,
    jsonb_build_object('ruleKey',v_rule.rule_key,'version',v_rule.version));
  return jsonb_build_object('id',v_rule.id,'enabled',v_rule.enabled,'version',v_rule.version);
end;
$$;

create or replace function public.dispatch_automation_v1(
  p_workspace_id uuid,
  p_rule_id uuid,
  p_event_key text,
  p_event_payload jsonb,
  p_receipt_key text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_rule public.automation_rules%rowtype;
  v_existing public.automation_runs%rowtype;
  v_run public.automation_runs%rowtype;
  v_fingerprint text;
  v_action jsonb;
  v_index bigint;
  v_action_row public.automation_run_actions%rowtype;
  v_transaction_id uuid;
  v_followup_id uuid;
  v_instance_id uuid;
  v_expected_stage integer;
  v_pending boolean := false;
  v_min_seconds integer := 0;
  v_error text;
begin
  if v_actor is null or not exists (
    select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor
  ) then raise insufficient_privilege using message='ENJAZ_AUTOMATION_WORKSPACE_FORBIDDEN'; end if;
  if p_event_key !~ '^[a-z][a-z0-9_.-]{1,119}$' then raise invalid_parameter_value using message='ENJAZ_AUTOMATION_EVENT_KEY_INVALID'; end if;
  if jsonb_typeof(p_event_payload) <> 'object' then raise invalid_parameter_value using message='ENJAZ_AUTOMATION_EVENT_PAYLOAD_INVALID'; end if;
  if char_length(btrim(coalesce(p_receipt_key,''))) not between 8 and 200 then raise invalid_parameter_value using message='ENJAZ_AUTOMATION_RECEIPT_KEY_INVALID'; end if;

  select * into v_rule from public.automation_rules r where r.workspace_id=p_workspace_id and r.id=p_rule_id;
  if not found then raise no_data_found using message='ENJAZ_AUTOMATION_RULE_NOT_FOUND'; end if;
  v_fingerprint := md5(jsonb_build_object('ruleId',p_rule_id,'eventKey',p_event_key,'payload',p_event_payload)::text);

  select * into v_existing from public.automation_runs r where r.workspace_id=p_workspace_id and r.receipt_key=p_receipt_key;
  if found then
    if v_existing.rule_id<>p_rule_id or v_existing.event_key is distinct from p_event_key or v_existing.event_fingerprint is distinct from v_fingerprint then
      raise unique_violation using message='ENJAZ_AUTOMATION_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object('runId',v_existing.id,'status',v_existing.status,'result',v_existing.result,'wasDuplicate',true);
  end if;

  if not v_rule.enabled then
    insert into public.automation_runs(workspace_id,rule_id,status,receipt_key,event_key,event_fingerprint,trigger_payload,requested_by,result,finished_at)
    values(p_workspace_id,p_rule_id,'skipped',p_receipt_key,p_event_key,v_fingerprint,p_event_payload,v_actor,jsonb_build_object('reason','rule_disabled'),now())
    returning * into v_run;
    return jsonb_build_object('runId',v_run.id,'status',v_run.status,'result',v_run.result,'wasDuplicate',false);
  end if;

  if (v_rule.trigger_config->>'type')='manual' and p_event_key<>'manual' then
    raise invalid_parameter_value using message='ENJAZ_AUTOMATION_TRIGGER_MISMATCH';
  end if;
  if (v_rule.trigger_config->>'type')='domain_event' and v_rule.trigger_config->>'event'<>p_event_key then
    raise invalid_parameter_value using message='ENJAZ_AUTOMATION_TRIGGER_MISMATCH';
  end if;

  if v_rule.throttle_policy ? 'minimumSeconds' then v_min_seconds := (v_rule.throttle_policy->>'minimumSeconds')::integer; end if;
  if v_min_seconds>0 and exists (
    select 1 from public.automation_runs prior where prior.workspace_id=p_workspace_id and prior.rule_id=p_rule_id
      and prior.status in ('succeeded','awaiting_approval') and prior.started_at > now() - make_interval(secs=>v_min_seconds)
  ) then
    insert into public.automation_runs(workspace_id,rule_id,status,receipt_key,event_key,event_fingerprint,trigger_payload,requested_by,result,finished_at)
    values(p_workspace_id,p_rule_id,'skipped',p_receipt_key,p_event_key,v_fingerprint,p_event_payload,v_actor,jsonb_build_object('reason','throttled'),now())
    returning * into v_run;
    return jsonb_build_object('runId',v_run.id,'status',v_run.status,'result',v_run.result,'wasDuplicate',false);
  end if;

  if not private.automation_conditions_match_v1(v_rule.conditions,p_event_payload) then
    insert into public.automation_runs(workspace_id,rule_id,status,receipt_key,event_key,event_fingerprint,trigger_payload,requested_by,result,finished_at)
    values(p_workspace_id,p_rule_id,'skipped',p_receipt_key,p_event_key,v_fingerprint,p_event_payload,v_actor,jsonb_build_object('reason','conditions_not_met'),now())
    returning * into v_run;
    return jsonb_build_object('runId',v_run.id,'status',v_run.status,'result',v_run.result,'wasDuplicate',false);
  end if;

  insert into public.automation_runs(workspace_id,rule_id,status,receipt_key,event_key,event_fingerprint,trigger_payload,requested_by,result)
  values(p_workspace_id,p_rule_id,'started',p_receipt_key,p_event_key,v_fingerprint,p_event_payload,v_actor,'{}'::jsonb)
  returning * into v_run;

  for v_action,v_index in select value, ordinality-1 from jsonb_array_elements(v_rule.actions) with ordinality
  loop
    insert into public.automation_run_actions(workspace_id,automation_run_id,action_index,action_type,status,action_snapshot)
    values(p_workspace_id,v_run.id,v_index,v_action->>'type','pending',v_action)
    returning * into v_action_row;

    if v_action->>'type'='workflow_transition' then
      begin
        v_instance_id := private.automation_json_path_text(p_event_payload,v_action->>'instanceIdField')::uuid;
        v_expected_stage := private.automation_json_path_text(p_event_payload,v_action->>'expectedStageField')::integer;
        if v_expected_stage<1 then raise invalid_parameter_value; end if;
        update public.automation_run_actions set status='awaiting_approval',action_snapshot=jsonb_build_object(
          'type','workflow_transition','instanceId',v_instance_id,'expectedStagePosition',v_expected_stage,
          'transitionKey',v_action->>'transitionKey','reason',nullif(btrim(coalesce(v_action->>'reason','')),'')
        ) where workspace_id=p_workspace_id and id=v_action_row.id returning * into v_action_row;
        insert into public.automation_approval_requests(workspace_id,automation_run_id,automation_run_action_id,rule_id,requested_by,action_snapshot)
        values(p_workspace_id,v_run.id,v_action_row.id,p_rule_id,v_actor,v_action_row.action_snapshot);
        v_pending := true;
      exception when others then
        v_error := sqlerrm;
        update public.automation_run_actions set status='failed',executed_at=now(),result=jsonb_build_object('error',v_error) where workspace_id=p_workspace_id and id=v_action_row.id;
        update public.automation_runs set status='failed',finished_at=now(),result=jsonb_build_object('error','action_resolution_failed','actionIndex',v_index) where workspace_id=p_workspace_id and id=v_run.id returning * into v_run;
        exit;
      end;
    elsif v_action->>'type'='create_followup' then
      begin
        v_transaction_id := (p_event_payload->>'transactionId')::uuid;
        if not exists(select 1 from public.transactions t where t.workspace_id=p_workspace_id and t.id=v_transaction_id) then raise no_data_found; end if;
        insert into public.transaction_followups(workspace_id,transaction_id,title,due_at,status)
        values(p_workspace_id,v_transaction_id,btrim(v_action->>'title'),now()+make_interval(days=>(v_action->>'dueInDays')::integer),'open')
        returning id into v_followup_id;
        update public.automation_run_actions set status='succeeded',executed_at=now(),result=jsonb_build_object('followupId',v_followup_id)
        where workspace_id=p_workspace_id and id=v_action_row.id;
      exception when others then
        v_error := sqlerrm;
        update public.automation_run_actions set status='failed',executed_at=now(),result=jsonb_build_object('error',v_error) where workspace_id=p_workspace_id and id=v_action_row.id;
        update public.automation_runs set status='failed',finished_at=now(),result=jsonb_build_object('error','action_execution_failed','actionIndex',v_index) where workspace_id=p_workspace_id and id=v_run.id returning * into v_run;
        exit;
      end;
    end if;
  end loop;

  select * into v_run from public.automation_runs r where r.workspace_id=p_workspace_id and r.id=v_run.id;
  if v_run.status<>'failed' then
    if v_pending then
      update public.automation_runs set status='awaiting_approval',result=jsonb_build_object('approvalRequired',true)
      where workspace_id=p_workspace_id and id=v_run.id returning * into v_run;
    else
      update public.automation_runs set status='succeeded',finished_at=now(),result=jsonb_build_object('approvalRequired',false)
      where workspace_id=p_workspace_id and id=v_run.id returning * into v_run;
    end if;
  end if;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'automation.run.dispatched','automation_run',v_run.id,'Automation rule dispatched',
    jsonb_build_object('ruleId',p_rule_id,'eventKey',p_event_key,'status',v_run.status,'receiptKey',p_receipt_key));
  return jsonb_build_object('runId',v_run.id,'status',v_run.status,'result',v_run.result,'wasDuplicate',false);
end;
$$;

create or replace function public.decide_automation_approval_v1(
  p_workspace_id uuid,
  p_approval_id uuid,
  p_decision text,
  p_decision_note text,
  p_decision_key uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_approval public.automation_approval_requests%rowtype;
  v_action public.automation_run_actions%rowtype;
  v_run public.automation_runs%rowtype;
  v_transition_result jsonb;
  v_error text;
begin
  if v_actor is null or not exists (
    select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor
  ) then raise insufficient_privilege using message='ENJAZ_AUTOMATION_WORKSPACE_FORBIDDEN'; end if;
  if p_decision not in ('approved','rejected') then raise invalid_parameter_value using message='ENJAZ_AUTOMATION_APPROVAL_DECISION_INVALID'; end if;
  if p_decision_note is not null and char_length(btrim(p_decision_note)) not between 3 and 600 then raise invalid_parameter_value using message='ENJAZ_AUTOMATION_APPROVAL_NOTE_INVALID'; end if;
  if p_decision_key is null then raise invalid_parameter_value using message='ENJAZ_AUTOMATION_APPROVAL_KEY_REQUIRED'; end if;

  select * into v_approval from public.automation_approval_requests a where a.workspace_id=p_workspace_id and a.id=p_approval_id for update;
  if not found then raise no_data_found using message='ENJAZ_AUTOMATION_APPROVAL_NOT_FOUND'; end if;
  if v_approval.status<>'pending' then
    if v_approval.status=p_decision and v_approval.decision_key=p_decision_key then
      select * into v_run from public.automation_runs r where r.workspace_id=p_workspace_id and r.id=v_approval.automation_run_id;
      return jsonb_build_object('approvalId',v_approval.id,'decision',v_approval.status,'runId',v_run.id,'runStatus',v_run.status,'wasDuplicate',true);
    end if;
    raise unique_violation using message='ENJAZ_AUTOMATION_APPROVAL_CONFLICT';
  end if;
  if exists(select 1 from public.automation_approval_requests a where a.workspace_id=p_workspace_id and a.decision_key=p_decision_key and a.id<>p_approval_id) then
    raise unique_violation using message='ENJAZ_AUTOMATION_APPROVAL_KEY_CONFLICT';
  end if;

  select * into v_action from public.automation_run_actions a where a.workspace_id=p_workspace_id and a.id=v_approval.automation_run_action_id for update;
  select * into v_run from public.automation_runs r where r.workspace_id=p_workspace_id and r.id=v_approval.automation_run_id for update;

  update public.automation_approval_requests
  set status=p_decision,decided_by=v_actor,decided_at=now(),decision_note=nullif(btrim(coalesce(p_decision_note,'')),''),decision_key=p_decision_key
  where workspace_id=p_workspace_id and id=p_approval_id returning * into v_approval;

  if p_decision='rejected' then
    update public.automation_run_actions set status='skipped',executed_at=now(),result=jsonb_build_object('reason','human_rejected')
    where workspace_id=p_workspace_id and id=v_action.id;
  else
    begin
      if v_action.action_type<>'workflow_transition' then raise invalid_parameter_value using message='ENJAZ_AUTOMATION_APPROVAL_ACTION_UNSUPPORTED'; end if;
      v_transition_result := public.transition_workflow_v1(
        p_workspace_id,
        (v_action.action_snapshot->>'instanceId')::uuid,
        v_action.action_snapshot->>'transitionKey',
        (v_action.action_snapshot->>'expectedStagePosition')::integer,
        v_action.action_snapshot->>'reason',
        p_decision_key
      );
      update public.automation_run_actions set status='succeeded',executed_at=now(),result=v_transition_result
      where workspace_id=p_workspace_id and id=v_action.id;
    exception when others then
      v_error := sqlerrm;
      update public.automation_run_actions set status='failed',executed_at=now(),result=jsonb_build_object('error',v_error)
      where workspace_id=p_workspace_id and id=v_action.id;
      update public.automation_runs set status='failed',finished_at=now(),result=jsonb_build_object('error','approved_action_failed')
      where workspace_id=p_workspace_id and id=v_run.id returning * into v_run;
    end;
  end if;

  if v_run.status<>'failed' then
    if exists(select 1 from public.automation_run_actions a where a.workspace_id=p_workspace_id and a.automation_run_id=v_run.id and a.status='awaiting_approval') then
      update public.automation_runs set status='awaiting_approval' where workspace_id=p_workspace_id and id=v_run.id returning * into v_run;
    elsif exists(select 1 from public.automation_run_actions a where a.workspace_id=p_workspace_id and a.automation_run_id=v_run.id and a.status='failed') then
      update public.automation_runs set status='failed',finished_at=now(),result=jsonb_build_object('error','action_failed') where workspace_id=p_workspace_id and id=v_run.id returning * into v_run;
    elsif exists(select 1 from public.automation_run_actions a where a.workspace_id=p_workspace_id and a.automation_run_id=v_run.id and a.status='skipped') then
      update public.automation_runs set status='skipped',finished_at=now(),result=jsonb_build_object('reason','human_rejected') where workspace_id=p_workspace_id and id=v_run.id returning * into v_run;
    else
      update public.automation_runs set status='succeeded',finished_at=now(),result=jsonb_build_object('approvalRequired',false) where workspace_id=p_workspace_id and id=v_run.id returning * into v_run;
    end if;
  end if;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'automation.approval.'||p_decision,'automation_approval',v_approval.id,'Automation approval decided',
    jsonb_build_object('runId',v_run.id,'ruleId',v_approval.rule_id,'decision',p_decision,'runStatus',v_run.status));
  return jsonb_build_object('approvalId',v_approval.id,'decision',v_approval.status,'runId',v_run.id,'runStatus',v_run.status,'wasDuplicate',false);
end;
$$;

create or replace function public.get_automation_engine_context_v1(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not exists (
    select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor
  ) then raise insufficient_privilege using message='ENJAZ_AUTOMATION_WORKSPACE_FORBIDDEN'; end if;
  return jsonb_build_object(
    'authority','automation_rules_and_runs',
    'workflowWriteAuthority','existing_workflow_rpc_only_after_human_approval',
    'financeWriteAuthority','none',
    'rules',coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,'ruleKey',r.rule_key,'name',r.name,'description',r.description,'enabled',r.enabled,'version',r.version,
      'triggerConfig',r.trigger_config,'conditions',r.conditions,'actions',r.actions,'throttlePolicy',r.throttle_policy,
      'createdAt',r.created_at,'updatedAt',r.updated_at
    ) order by r.created_at,r.id) from public.automation_rules r where r.workspace_id=p_workspace_id),'[]'::jsonb),
    'recentRuns',coalesce((select jsonb_agg(row_data order by started_at desc,id desc) from (
      select rr.id,rr.started_at,jsonb_build_object('id',rr.id,'ruleId',rr.rule_id,'status',rr.status,'receiptKey',rr.receipt_key,
        'eventKey',rr.event_key,'result',rr.result,'startedAt',rr.started_at,'finishedAt',rr.finished_at) row_data
      from public.automation_runs rr where rr.workspace_id=p_workspace_id order by rr.started_at desc,rr.id desc limit 50
    ) q),'[]'::jsonb),
    'pendingApprovals',coalesce((select jsonb_agg(jsonb_build_object(
      'id',a.id,'runId',a.automation_run_id,'ruleId',a.rule_id,'requestedAt',a.requested_at,'actionSnapshot',a.action_snapshot
    ) order by a.requested_at,a.id) from public.automation_approval_requests a where a.workspace_id=p_workspace_id and a.status='pending'),'[]'::jsonb)
  );
end;
$$;

alter table public.automation_run_actions enable row level security;
alter table public.automation_approval_requests enable row level security;
create policy automation_run_actions_select_workspace on public.automation_run_actions for select to authenticated
  using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy automation_approval_requests_select_workspace on public.automation_approval_requests for select to authenticated
  using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));

revoke insert, update, delete on table public.automation_rules from authenticated;
revoke all on table public.automation_run_actions from anon, authenticated;
revoke all on table public.automation_approval_requests from anon, authenticated;
grant select on table public.automation_run_actions to authenticated;
grant select on table public.automation_approval_requests to authenticated;

revoke all on function public.upsert_automation_rule_v1(uuid,uuid,integer,text,text,text,jsonb,jsonb,jsonb,jsonb,boolean) from public;
revoke all on function public.set_automation_rule_enabled_v1(uuid,uuid,integer,boolean) from public;
revoke all on function public.dispatch_automation_v1(uuid,uuid,text,jsonb,text) from public;
revoke all on function public.decide_automation_approval_v1(uuid,uuid,text,text,uuid) from public;
revoke all on function public.get_automation_engine_context_v1(uuid) from public;
grant execute on function public.upsert_automation_rule_v1(uuid,uuid,integer,text,text,text,jsonb,jsonb,jsonb,jsonb,boolean) to authenticated;
grant execute on function public.set_automation_rule_enabled_v1(uuid,uuid,integer,boolean) to authenticated;
grant execute on function public.dispatch_automation_v1(uuid,uuid,text,jsonb,text) to authenticated;
grant execute on function public.decide_automation_approval_v1(uuid,uuid,text,text,uuid) to authenticated;
grant execute on function public.get_automation_engine_context_v1(uuid) to authenticated;

commit;
