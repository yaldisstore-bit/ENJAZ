-- ENJAZ Phase 12.2 — Contextual Assistance governed request boundary.
-- Extends the private Copilot trace vocabulary and adds a service-only v2 begin RPC.
-- No canonical business table is written. Context reads remain authenticated-user scoped.

begin;

alter table private.copilot_request_traces
  drop constraint if exists copilot_request_traces_operation_check;

alter table private.copilot_request_traces
  add constraint copilot_request_traces_operation_check
  check(operation in (
    'capabilities','provider_probe',
    'search','summarize','compare','draft','explain'
  ));

create or replace function private.copilot_begin_request_v2_impl(
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
  if p_operation not in ('search','summarize','compare','draft','explain') then
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
      'allowed',true,
      'traceId',v_existing.id,
      'requestId',v_existing.request_id,
      'status',v_existing.status,
      'replayed',true,
      'rateCount',null
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
      'allowed',false,
      'traceId',null,
      'requestId',p_request_id,
      'status','rate_limited',
      'replayed',false,
      'rateCount',v_count
    );
  end if;

  insert into private.copilot_request_traces(
    workspace_id,actor_user_id,request_id,operation,payload_hash,status,metadata
  )
  values(
    p_workspace_id,p_actor_user_id,p_request_id,p_operation,p_payload_hash,'accepted',
    jsonb_build_object('schema','enjaz.copilot.context.v1')
  )
  returning * into v_trace;

  return jsonb_build_object(
    'allowed',true,
    'traceId',v_trace.id,
    'requestId',v_trace.request_id,
    'status',v_trace.status,
    'replayed',false,
    'rateCount',v_count
  );
end;
$$;

create or replace function public.copilot_begin_request_v2(
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_request_id uuid,
  p_operation text,
  p_payload_hash text,
  p_limit integer default 20
)
returns jsonb
language sql
security invoker
set search_path=''
as $$
  select private.copilot_begin_request_v2_impl(
    p_workspace_id,p_actor_user_id,p_request_id,p_operation,p_payload_hash,p_limit
  );
$$;

revoke all on function private.copilot_begin_request_v2_impl(uuid,uuid,uuid,text,text,integer)
  from public,anon,authenticated,service_role;
grant execute on function private.copilot_begin_request_v2_impl(uuid,uuid,uuid,text,text,integer)
  to service_role;

revoke all on function public.copilot_begin_request_v2(uuid,uuid,uuid,text,text,integer)
  from public,anon,authenticated;
grant execute on function public.copilot_begin_request_v2(uuid,uuid,uuid,text,text,integer)
  to service_role;

commit;
