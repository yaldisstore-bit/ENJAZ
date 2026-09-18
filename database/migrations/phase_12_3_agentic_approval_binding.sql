-- ENJAZ Phase 12.3 A2 — immutable agent proposal + explicit approval evidence boundary.
-- Evidence-only authority: no canonical business mutation, no raw goal/plan/model-output persistence.
-- All RPCs are service-role only; authenticated user identity must be derived by the JWT-validating Edge boundary.

begin;

alter table private.copilot_request_traces
  drop constraint if exists copilot_request_traces_operation_check;

alter table private.copilot_request_traces
  add constraint copilot_request_traces_operation_check
  check(operation in (
    'capabilities','provider_probe',
    'search','summarize','compare','draft','explain',
    'plan','propose','approve_proposal','reject_proposal'
  ));

create table private.copilot_agent_proposals(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  request_id uuid not null,
  proposal_hash text not null check(proposal_hash ~ '^[0-9a-f]{64}$'),
  plan_schema text not null default 'enjaz.copilot.agent.plan.v1'
    check(plan_schema='enjaz.copilot.agent.plan.v1'),
  status text not null default 'pending'
    check(status in ('pending','approved','rejected','consumed')),
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_at timestamptz null,
  decided_by uuid null references auth.users(id) on delete restrict,
  decision_key uuid null,
  consumed_at timestamptz null,
  consumed_by uuid null references auth.users(id) on delete restrict,
  execution_key uuid null,
  constraint copilot_agent_proposals_workspace_id_id_key unique(workspace_id,id),
  constraint copilot_agent_proposals_request_unique unique(workspace_id,request_id),
  constraint copilot_agent_proposals_decision_key_unique unique(workspace_id,decision_key),
  constraint copilot_agent_proposals_execution_key_unique unique(workspace_id,execution_key),
  constraint copilot_agent_proposals_expiry_shape check(expires_at>requested_at),
  constraint copilot_agent_proposals_state_consistency check(
    (status='pending'
      and decided_at is null and decided_by is null and decision_key is null
      and consumed_at is null and consumed_by is null and execution_key is null)
    or
    (status='approved'
      and decided_at is not null and decided_by is not null and decision_key is not null
      and consumed_at is null and consumed_by is null and execution_key is null)
    or
    (status='rejected'
      and decided_at is not null and decided_by is not null and decision_key is not null
      and consumed_at is null and consumed_by is null and execution_key is null)
    or
    (status='consumed'
      and decided_at is not null and decided_by is not null and decision_key is not null
      and consumed_at is not null and consumed_by is not null and execution_key is not null)
  )
);

create table private.copilot_agent_approval_events(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  proposal_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check(event_type in ('registered','approved','rejected','consumed')),
  event_key uuid not null,
  proposal_hash text not null check(proposal_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null default now(),
  constraint copilot_agent_approval_events_proposal_fk
    foreign key(workspace_id,proposal_id)
    references private.copilot_agent_proposals(workspace_id,id) on delete cascade,
  constraint copilot_agent_approval_events_key_unique unique(workspace_id,event_type,event_key)
);

create index copilot_agent_proposals_actor_idx
  on private.copilot_agent_proposals(workspace_id,actor_user_id,requested_at desc);
create index copilot_agent_proposals_pending_idx
  on private.copilot_agent_proposals(workspace_id,expires_at)
  where status='pending';
create index copilot_agent_approval_events_proposal_idx
  on private.copilot_agent_approval_events(workspace_id,proposal_id,occurred_at);

revoke all on table private.copilot_agent_proposals from public,anon,authenticated,service_role;
revoke all on table private.copilot_agent_approval_events from public,anon,authenticated,service_role;

create or replace function private.copilot_begin_request_v3_impl(
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
  if p_operation not in ('plan','propose','approve_proposal','reject_proposal') then
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

create or replace function private.copilot_register_agent_proposal_v1_impl(
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_request_id uuid,
  p_proposal_hash text,
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
begin
  if p_workspace_id is null or p_actor_user_id is null or p_request_id is null then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_INVALID_ID';
  end if;
  if p_proposal_hash is null or p_proposal_hash !~ '^[0-9a-f]{64}$' then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_PROPOSAL_HASH_INVALID';
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

  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_request_id::text||':proposal',0));

  select * into v_existing
  from private.copilot_agent_proposals p
  where p.workspace_id=p_workspace_id and p.request_id=p_request_id
  for update;

  if found then
    if v_existing.actor_user_id<>p_actor_user_id
       or v_existing.proposal_hash<>p_proposal_hash then
      raise unique_violation using message='ENJAZ_COPILOT_PROPOSAL_CONFLICT';
    end if;
    return jsonb_build_object(
      'proposalId',v_existing.id,'proposalHash',v_existing.proposal_hash,
      'status',v_existing.status,'expiresAt',v_existing.expires_at,'replayed',true
    );
  end if;

  insert into private.copilot_agent_proposals(
    workspace_id,actor_user_id,request_id,proposal_hash,expires_at
  ) values(
    p_workspace_id,p_actor_user_id,p_request_id,p_proposal_hash,p_expires_at
  ) returning * into v_row;

  insert into private.copilot_agent_approval_events(
    workspace_id,proposal_id,actor_user_id,event_type,event_key,proposal_hash
  ) values(
    p_workspace_id,v_row.id,p_actor_user_id,'registered',p_request_id,p_proposal_hash
  );

  return jsonb_build_object(
    'proposalId',v_row.id,'proposalHash',v_row.proposal_hash,
    'status',v_row.status,'expiresAt',v_row.expires_at,'replayed',false
  );
end;
$$;

create or replace function private.copilot_decide_agent_proposal_v1_impl(
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_proposal_id uuid,
  p_proposal_hash text,
  p_decision text,
  p_decision_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_row private.copilot_agent_proposals%rowtype;
  v_now timestamptz:=clock_timestamp();
begin
  if p_workspace_id is null or p_actor_user_id is null or p_proposal_id is null or p_decision_key is null then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_INVALID_ID';
  end if;
  if p_proposal_hash is null or p_proposal_hash !~ '^[0-9a-f]{64}$' then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_PROPOSAL_HASH_INVALID';
  end if;
  if p_decision not in ('approved','rejected') then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_APPROVAL_DECISION_INVALID';
  end if;
  if not exists(
    select 1 from public.workspace_memberships m
    where m.workspace_id=p_workspace_id and m.user_id=p_actor_user_id
  ) then
    raise insufficient_privilege using message='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_proposal_id::text||':approval',0));

  select * into v_row
  from private.copilot_agent_proposals p
  where p.workspace_id=p_workspace_id and p.id=p_proposal_id
  for update;

  if not found then
    raise no_data_found using message='ENJAZ_COPILOT_PROPOSAL_NOT_FOUND';
  end if;
  if v_row.actor_user_id<>p_actor_user_id then
    raise insufficient_privilege using message='ENJAZ_COPILOT_PROPOSAL_ACTOR_FORBIDDEN';
  end if;
  if v_row.proposal_hash<>p_proposal_hash then
    raise unique_violation using message='ENJAZ_COPILOT_PROPOSAL_HASH_CONFLICT';
  end if;
  if v_row.status<>'pending' then
    if v_row.status=p_decision
       and v_row.decision_key=p_decision_key
       and v_row.decided_by=p_actor_user_id then
      return jsonb_build_object(
        'proposalId',v_row.id,'proposalHash',v_row.proposal_hash,
        'status',v_row.status,'expiresAt',v_row.expires_at,
        'decidedAt',v_row.decided_at,'replayed',true
      );
    end if;
    raise unique_violation using message='ENJAZ_COPILOT_APPROVAL_CONFLICT';
  end if;
  if v_row.expires_at<=v_now then
    raise check_violation using message='ENJAZ_COPILOT_APPROVAL_EXPIRED';
  end if;
  if exists(
    select 1 from private.copilot_agent_proposals p
    where p.workspace_id=p_workspace_id
      and p.decision_key=p_decision_key
      and p.id<>p_proposal_id
  ) then
    raise unique_violation using message='ENJAZ_COPILOT_APPROVAL_REPLAY_CONFLICT';
  end if;

  update private.copilot_agent_proposals
  set status=p_decision,decided_at=v_now,decided_by=p_actor_user_id,decision_key=p_decision_key
  where workspace_id=p_workspace_id and id=p_proposal_id
  returning * into v_row;

  insert into private.copilot_agent_approval_events(
    workspace_id,proposal_id,actor_user_id,event_type,event_key,proposal_hash,occurred_at
  ) values(
    p_workspace_id,v_row.id,p_actor_user_id,p_decision,p_decision_key,p_proposal_hash,v_now
  );

  return jsonb_build_object(
    'proposalId',v_row.id,'proposalHash',v_row.proposal_hash,
    'status',v_row.status,'expiresAt',v_row.expires_at,
    'decidedAt',v_row.decided_at,'replayed',false
  );
end;
$$;

create or replace function public.copilot_begin_request_v3(
  p_workspace_id uuid,p_actor_user_id uuid,p_request_id uuid,
  p_operation text,p_payload_hash text,p_limit integer default 20
)
returns jsonb language sql security invoker set search_path=''
as $$ select private.copilot_begin_request_v3_impl(
  p_workspace_id,p_actor_user_id,p_request_id,p_operation,p_payload_hash,p_limit
); $$;

create or replace function public.copilot_register_agent_proposal_v1(
  p_workspace_id uuid,p_actor_user_id uuid,p_request_id uuid,
  p_proposal_hash text,p_expires_at timestamptz
)
returns jsonb language sql security invoker set search_path=''
as $$ select private.copilot_register_agent_proposal_v1_impl(
  p_workspace_id,p_actor_user_id,p_request_id,p_proposal_hash,p_expires_at
); $$;

create or replace function public.copilot_decide_agent_proposal_v1(
  p_workspace_id uuid,p_actor_user_id uuid,p_proposal_id uuid,
  p_proposal_hash text,p_decision text,p_decision_key uuid
)
returns jsonb language sql security invoker set search_path=''
as $$ select private.copilot_decide_agent_proposal_v1_impl(
  p_workspace_id,p_actor_user_id,p_proposal_id,p_proposal_hash,p_decision,p_decision_key
); $$;

revoke all on function private.copilot_begin_request_v3_impl(uuid,uuid,uuid,text,text,integer)
  from public,anon,authenticated,service_role;
revoke all on function private.copilot_register_agent_proposal_v1_impl(uuid,uuid,uuid,text,timestamptz)
  from public,anon,authenticated,service_role;
revoke all on function private.copilot_decide_agent_proposal_v1_impl(uuid,uuid,uuid,text,text,uuid)
  from public,anon,authenticated,service_role;

grant execute on function private.copilot_begin_request_v3_impl(uuid,uuid,uuid,text,text,integer) to service_role;
grant execute on function private.copilot_register_agent_proposal_v1_impl(uuid,uuid,uuid,text,timestamptz) to service_role;
grant execute on function private.copilot_decide_agent_proposal_v1_impl(uuid,uuid,uuid,text,text,uuid) to service_role;

revoke all on function public.copilot_begin_request_v3(uuid,uuid,uuid,text,text,integer)
  from public,anon,authenticated;
revoke all on function public.copilot_register_agent_proposal_v1(uuid,uuid,uuid,text,timestamptz)
  from public,anon,authenticated;
revoke all on function public.copilot_decide_agent_proposal_v1(uuid,uuid,uuid,text,text,uuid)
  from public,anon,authenticated;

grant execute on function public.copilot_begin_request_v3(uuid,uuid,uuid,text,text,integer) to service_role;
grant execute on function public.copilot_register_agent_proposal_v1(uuid,uuid,uuid,text,timestamptz) to service_role;
grant execute on function public.copilot_decide_agent_proposal_v1(uuid,uuid,uuid,text,text,uuid) to service_role;

commit;
