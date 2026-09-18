-- ENJAZ Phase 12.3 A3-A — action-specific follow-up snooze execution.
-- First executable adapter only. No generic tool, no service-role business read/write.
-- Exact action fields are stored before approval; execution takes proposal identity only.

begin;

alter table private.copilot_request_traces
  drop constraint if exists copilot_request_traces_operation_check;

alter table private.copilot_request_traces
  add constraint copilot_request_traces_operation_check
  check(operation in (
    'capabilities','provider_probe',
    'search','summarize','compare','draft','explain',
    'plan','propose','approve_proposal','reject_proposal',
    'prepare_followup_snooze','execute_followup_snooze'
  ));

alter table private.copilot_agent_proposals
  add column proposal_kind text not null default 'plan',
  add column action_kind text null,
  add column action_target_id uuid null,
  add column action_snoozed_until timestamptz null,
  add column execution_result jsonb null;

alter table private.copilot_agent_proposals
  add constraint copilot_agent_proposals_kind_check
    check(proposal_kind in ('plan','action')),
  add constraint copilot_agent_proposals_action_shape_check
    check(
      (proposal_kind='plan'
        and action_kind is null
        and action_target_id is null
        and action_snoozed_until is null)
      or
      (proposal_kind='action'
        and action_kind='followup.snooze'
        and action_target_id is not null
        and action_snoozed_until is not null)
    ),
  add constraint copilot_agent_proposals_execution_result_check
    check(
      (status='consumed' and execution_result is not null and jsonb_typeof(execution_result)='object')
      or
      (status<>'consumed' and execution_result is null)
    );

create index copilot_agent_proposals_action_target_idx
  on private.copilot_agent_proposals(workspace_id,action_target_id)
  where proposal_kind='action';

create or replace function private.copilot_followup_snooze_hash_v1(
  p_workspace_id uuid,
  p_request_id uuid,
  p_followup_id uuid,
  p_snoozed_until timestamptz
)
returns text
language sql
immutable
security invoker
set search_path=''
as $$
  select encode(
    extensions.digest(
      convert_to(
        'enjaz.copilot.agent.action.v1'
        ||'|'||lower(p_workspace_id::text)
        ||'|'||lower(p_request_id::text)
        ||'|prepare_followup_snooze'
        ||'|'||lower(p_followup_id::text)
        ||'|'||to_char(p_snoozed_until at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function private.copilot_followup_snooze_hash_v1(uuid,uuid,uuid,timestamptz)
  from public,anon,authenticated,service_role;

create or replace function private.copilot_begin_request_v4_impl(
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_request_id uuid,
  p_operation text,
  p_payload_hash text,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_existing private.copilot_request_traces%rowtype;
  v_trace private.copilot_request_traces%rowtype;
  v_window timestamptz:=date_trunc('minute',clock_timestamp());
  v_count integer;
begin
  if p_workspace_id is null or p_actor_user_id is null or p_request_id is null then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_INVALID_ID';
  end if;
  if p_operation not in (
    'plan','propose','approve_proposal','reject_proposal',
    'prepare_followup_snooze','execute_followup_snooze'
  ) then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_OPERATION_FORBIDDEN';
  end if;
  if p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_PAYLOAD_HASH_INVALID';
  end if;
  if p_limit is null or p_limit<1 or p_limit>100 then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_RATE_LIMIT_INVALID';
  end if;
  if not exists(
    select 1 from public.workspace_memberships m
    where m.workspace_id=p_workspace_id and m.user_id=p_actor_user_id
  ) then
    raise insufficient_privilege using message='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_request_id::text,0));

  select * into v_existing
  from private.copilot_request_traces t
  where t.workspace_id=p_workspace_id and t.request_id=p_request_id
  for update;

  if found then
    if v_existing.actor_user_id<>p_actor_user_id
       or v_existing.operation<>p_operation
       or v_existing.payload_hash<>p_payload_hash then
      raise unique_violation using message='ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object(
      'allowed',true,'traceId',v_existing.id,'requestId',v_existing.request_id,
      'status',v_existing.status,'replayed',true,'rateCount',null
    );
  end if;

  insert into private.copilot_rate_buckets(workspace_id,actor_user_id,window_start,request_count,updated_at)
  values(p_workspace_id,p_actor_user_id,v_window,1,clock_timestamp())
  on conflict(workspace_id,actor_user_id) do update
  set window_start=excluded.window_start,
      request_count=case
        when private.copilot_rate_buckets.window_start=excluded.window_start
          then least(private.copilot_rate_buckets.request_count+1,p_limit+1)
        else 1
      end,
      updated_at=clock_timestamp()
  returning request_count into v_count;

  if v_count>p_limit then
    return jsonb_build_object(
      'allowed',false,'traceId',null,'requestId',p_request_id,
      'status','rate_limited','replayed',false,'rateCount',v_count
    );
  end if;

  insert into private.copilot_request_traces(
    workspace_id,actor_user_id,request_id,operation,payload_hash,status,metadata
  )
  values(
    p_workspace_id,p_actor_user_id,p_request_id,p_operation,p_payload_hash,'accepted',
    jsonb_build_object('schema','enjaz.copilot.agent.v1')
  )
  returning * into v_trace;

  return jsonb_build_object(
    'allowed',true,'traceId',v_trace.id,'requestId',v_trace.request_id,
    'status',v_trace.status,'replayed',false,'rateCount',v_count
  );
end;
$$;

create or replace function private.copilot_register_followup_snooze_proposal_v1_impl(
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_request_id uuid,
  p_proposal_hash text,
  p_followup_id uuid,
  p_snoozed_until timestamptz,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_existing private.copilot_agent_proposals%rowtype;
  v_row private.copilot_agent_proposals%rowtype;
  v_now timestamptz:=clock_timestamp();
  v_expected_hash text;
begin
  if p_workspace_id is null or p_actor_user_id is null or p_request_id is null or p_followup_id is null then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_INVALID_ID';
  end if;
  if p_proposal_hash is null or p_proposal_hash !~ '^[0-9a-f]{64}$' then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_PROPOSAL_HASH_INVALID';
  end if;
  if p_snoozed_until is null or p_snoozed_until<=v_now+interval '30 seconds' then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_ACTION_SNOOZE_INVALID';
  end if;
  if p_expires_at is null
     or p_expires_at<=v_now+interval '30 seconds'
     or p_expires_at>v_now+interval '30 minutes' then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_APPROVAL_EXPIRY_INVALID';
  end if;
  if not exists(
    select 1 from public.workspace_memberships m
    where m.workspace_id=p_workspace_id and m.user_id=p_actor_user_id
  ) then
    raise insufficient_privilege using message='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN';
  end if;

  v_expected_hash:=private.copilot_followup_snooze_hash_v1(
    p_workspace_id,p_request_id,p_followup_id,p_snoozed_until
  );
  if v_expected_hash<>p_proposal_hash then
    raise unique_violation using message='ENJAZ_COPILOT_ACTION_HASH_CONFLICT';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_request_id::text||':action',0));

  select * into v_existing
  from private.copilot_agent_proposals p
  where p.workspace_id=p_workspace_id and p.request_id=p_request_id
  for update;

  if found then
    if v_existing.actor_user_id<>p_actor_user_id
       or v_existing.proposal_hash<>p_proposal_hash
       or v_existing.proposal_kind<>'action'
       or v_existing.action_kind<>'followup.snooze'
       or v_existing.action_target_id<>p_followup_id
       or v_existing.action_snoozed_until<>p_snoozed_until then
      raise unique_violation using message='ENJAZ_COPILOT_ACTION_PROPOSAL_CONFLICT';
    end if;
    return jsonb_build_object(
      'proposalId',v_existing.id,'proposalHash',v_existing.proposal_hash,
      'status',v_existing.status,'expiresAt',v_existing.expires_at,
      'actionKind',v_existing.action_kind,'targetId',v_existing.action_target_id,
      'snoozedUntil',v_existing.action_snoozed_until,'replayed',true
    );
  end if;

  insert into private.copilot_agent_proposals(
    workspace_id,actor_user_id,request_id,proposal_hash,plan_schema,proposal_kind,
    action_kind,action_target_id,action_snoozed_until,expires_at
  ) values(
    p_workspace_id,p_actor_user_id,p_request_id,p_proposal_hash,'enjaz.copilot.agent.plan.v1','action',
    'followup.snooze',p_followup_id,p_snoozed_until,p_expires_at
  ) returning * into v_row;

  insert into private.copilot_agent_approval_events(
    workspace_id,proposal_id,actor_user_id,event_type,event_key,proposal_hash
  ) values(
    p_workspace_id,v_row.id,p_actor_user_id,'registered',p_request_id,p_proposal_hash
  );

  return jsonb_build_object(
    'proposalId',v_row.id,'proposalHash',v_row.proposal_hash,
    'status',v_row.status,'expiresAt',v_row.expires_at,
    'actionKind',v_row.action_kind,'targetId',v_row.action_target_id,
    'snoozedUntil',v_row.action_snoozed_until,'replayed',false
  );
end;
$$;

create or replace function private.copilot_execute_followup_snooze_v1_impl(
  p_workspace_id uuid,
  p_proposal_id uuid,
  p_proposal_hash text,
  p_execution_key uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_row private.copilot_agent_proposals%rowtype;
  v_now timestamptz:=clock_timestamp();
  v_domain jsonb;
begin
  if v_actor is null then
    raise insufficient_privilege using message='ENJAZ_COPILOT_AUTH_REQUIRED';
  end if;
  if p_workspace_id is null or p_proposal_id is null or p_execution_key is null then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_INVALID_ID';
  end if;
  if p_proposal_hash is null or p_proposal_hash !~ '^[0-9a-f]{64}$' then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_PROPOSAL_HASH_INVALID';
  end if;
  if not exists(
    select 1 from public.workspace_memberships m
    where m.workspace_id=p_workspace_id and m.user_id=v_actor
  ) then
    raise insufficient_privilege using message='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_proposal_id::text||':execute',0));

  select * into v_row
  from private.copilot_agent_proposals p
  where p.workspace_id=p_workspace_id and p.id=p_proposal_id
  for update;

  if not found then
    raise no_data_found using message='ENJAZ_COPILOT_PROPOSAL_NOT_FOUND';
  end if;
  if v_row.actor_user_id<>v_actor then
    raise insufficient_privilege using message='ENJAZ_COPILOT_PROPOSAL_ACTOR_FORBIDDEN';
  end if;
  if v_row.proposal_hash<>p_proposal_hash then
    raise unique_violation using message='ENJAZ_COPILOT_PROPOSAL_HASH_CONFLICT';
  end if;
  if v_row.proposal_kind<>'action'
     or v_row.action_kind<>'followup.snooze'
     or v_row.action_target_id is null
     or v_row.action_snoozed_until is null then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_ACTION_KIND_CONFLICT';
  end if;

  if v_row.status='consumed' then
    if v_row.execution_key=p_execution_key and v_row.consumed_by=v_actor then
      return jsonb_build_object(
        'schema','enjaz.copilot.agent.action-execution.v1',
        'proposalId',v_row.id,'proposalHash',v_row.proposal_hash,
        'executionKey',v_row.execution_key,'actionKind',v_row.action_kind,
        'targetId',v_row.action_target_id,'snoozedUntil',v_row.action_snoozed_until,
        'result',v_row.execution_result,'replayed',true
      );
    end if;
    raise unique_violation using message='ENJAZ_COPILOT_EXECUTION_REPLAY_CONFLICT';
  end if;

  if v_row.status<>'approved' then
    raise object_not_in_prerequisite_state using message='ENJAZ_COPILOT_ACTION_APPROVAL_REQUIRED';
  end if;
  if v_row.expires_at<=v_now then
    raise check_violation using message='ENJAZ_COPILOT_APPROVAL_EXPIRED';
  end if;
  if v_row.action_snoozed_until<=v_now then
    raise check_violation using message='ENJAZ_COPILOT_ACTION_SNOOZE_STALE';
  end if;
  if exists(
    select 1 from private.copilot_agent_proposals p
    where p.workspace_id=p_workspace_id
      and p.execution_key=p_execution_key
      and p.id<>p_proposal_id
  ) then
    raise unique_violation using message='ENJAZ_COPILOT_EXECUTION_REPLAY_CONFLICT';
  end if;

  v_domain:=public.mutate_transaction_followup_state_v1(
    p_workspace_id,v_row.action_target_id,'snooze',v_row.action_snoozed_until
  );

  update private.copilot_agent_proposals
  set status='consumed',consumed_at=v_now,consumed_by=v_actor,
      execution_key=p_execution_key,execution_result=v_domain
  where workspace_id=p_workspace_id and id=p_proposal_id
  returning * into v_row;

  insert into private.copilot_agent_approval_events(
    workspace_id,proposal_id,actor_user_id,event_type,event_key,proposal_hash,occurred_at
  ) values(
    p_workspace_id,v_row.id,v_actor,'consumed',p_execution_key,p_proposal_hash,v_now
  );

  return jsonb_build_object(
    'schema','enjaz.copilot.agent.action-execution.v1',
    'proposalId',v_row.id,'proposalHash',v_row.proposal_hash,
    'executionKey',v_row.execution_key,'actionKind',v_row.action_kind,
    'targetId',v_row.action_target_id,'snoozedUntil',v_row.action_snoozed_until,
    'result',v_row.execution_result,'replayed',false
  );
end;
$$;

create or replace function public.copilot_begin_request_v4(
  p_workspace_id uuid,p_actor_user_id uuid,p_request_id uuid,
  p_operation text,p_payload_hash text,p_limit integer default 20
)
returns jsonb language sql security invoker set search_path=''
as $$ select private.copilot_begin_request_v4_impl(
  p_workspace_id,p_actor_user_id,p_request_id,p_operation,p_payload_hash,p_limit
); $$;

create or replace function public.copilot_register_followup_snooze_proposal_v1(
  p_workspace_id uuid,p_actor_user_id uuid,p_request_id uuid,p_proposal_hash text,
  p_followup_id uuid,p_snoozed_until timestamptz,p_expires_at timestamptz
)
returns jsonb language sql security invoker set search_path=''
as $$ select private.copilot_register_followup_snooze_proposal_v1_impl(
  p_workspace_id,p_actor_user_id,p_request_id,p_proposal_hash,p_followup_id,p_snoozed_until,p_expires_at
); $$;

create or replace function public.copilot_execute_followup_snooze_v1(
  p_workspace_id uuid,p_proposal_id uuid,p_proposal_hash text,p_execution_key uuid
)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.copilot_execute_followup_snooze_v1_impl(
  p_workspace_id,p_proposal_id,p_proposal_hash,p_execution_key
); $$;

revoke all on function private.copilot_begin_request_v4_impl(uuid,uuid,uuid,text,text,integer)
  from public,anon,authenticated,service_role;
grant execute on function private.copilot_begin_request_v4_impl(uuid,uuid,uuid,text,text,integer)
  to service_role;

revoke all on function public.copilot_begin_request_v4(uuid,uuid,uuid,text,text,integer)
  from public,anon,authenticated;
grant execute on function public.copilot_begin_request_v4(uuid,uuid,uuid,text,text,integer)
  to service_role;

revoke all on function private.copilot_register_followup_snooze_proposal_v1_impl(uuid,uuid,uuid,text,uuid,timestamptz,timestamptz)
  from public,anon,authenticated,service_role;
grant execute on function private.copilot_register_followup_snooze_proposal_v1_impl(uuid,uuid,uuid,text,uuid,timestamptz,timestamptz)
  to service_role;

revoke all on function public.copilot_register_followup_snooze_proposal_v1(uuid,uuid,uuid,text,uuid,timestamptz,timestamptz)
  from public,anon,authenticated;
grant execute on function public.copilot_register_followup_snooze_proposal_v1(uuid,uuid,uuid,text,uuid,timestamptz,timestamptz)
  to service_role;

revoke all on function private.copilot_execute_followup_snooze_v1_impl(uuid,uuid,text,uuid)
  from public,anon,service_role;
grant execute on function private.copilot_execute_followup_snooze_v1_impl(uuid,uuid,text,uuid)
  to authenticated;

revoke all on function public.copilot_execute_followup_snooze_v1(uuid,uuid,text,uuid)
  from public,anon,service_role;
grant execute on function public.copilot_execute_followup_snooze_v1(uuid,uuid,text,uuid)
  to authenticated;

commit;
