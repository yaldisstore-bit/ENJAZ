-- ENJAZ Phase 12.1 — Copilot Foundation evidence + quota boundary.
-- Server-only evidence. No business authority and no prompt/model content persistence.

begin;

create table private.copilot_rate_buckets(
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null check(request_count between 1 and 1000000),
  updated_at timestamptz not null default now(),
  primary key(workspace_id,actor_user_id)
);

create table private.copilot_request_traces(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  operation text not null check(operation in ('capabilities','provider_probe')),
  payload_hash text not null check(payload_hash ~ '^[0-9a-f]{64}$'),
  status text not null check(status in ('accepted','completed','provider_unavailable','failed')),
  provider_name text null check(provider_name is null or (char_length(btrim(provider_name)) between 1 and 80)),
  model_name text null check(model_name is null or (char_length(btrim(model_name)) between 1 and 160)),
  error_code text null check(error_code is null or (char_length(btrim(error_code)) between 1 and 120)),
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=2048),
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  latency_ms integer null check(latency_ms is null or latency_ms between 0 and 600000),
  unique(workspace_id,request_id)
);

create index copilot_request_traces_actor_idx
  on private.copilot_request_traces(workspace_id,actor_user_id,started_at desc);
create index copilot_request_traces_status_idx
  on private.copilot_request_traces(workspace_id,status,started_at desc);

revoke all on table private.copilot_rate_buckets from public,anon,authenticated,service_role;
revoke all on table private.copilot_request_traces from public,anon,authenticated,service_role;

create or replace function private.copilot_begin_request_v1_impl(
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
  if p_operation not in ('capabilities','provider_probe') then
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
    jsonb_build_object('schema','enjaz.copilot.foundation.v1')
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

create or replace function private.copilot_finish_request_v1_impl(
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_request_id uuid,
  p_trace_id uuid,
  p_status text,
  p_error_code text default null,
  p_provider_name text default null,
  p_model_name text default null,
  p_latency_ms integer default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_trace private.copilot_request_traces%rowtype;
begin
  if not exists(
    select 1 from public.workspace_memberships m
    where m.workspace_id=p_workspace_id and m.user_id=p_actor_user_id
  ) then
    raise insufficient_privilege using message='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN';
  end if;
  if p_status not in ('completed','provider_unavailable','failed') then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_TRACE_STATUS_INVALID';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata)<>'object' or octet_length(p_metadata::text)>2048 then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_TRACE_METADATA_INVALID';
  end if;
  if p_latency_ms is not null and (p_latency_ms<0 or p_latency_ms>600000) then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_TRACE_LATENCY_INVALID';
  end if;

  select * into v_trace
  from private.copilot_request_traces t
  where t.workspace_id=p_workspace_id and t.id=p_trace_id and t.request_id=p_request_id
  for update;
  if not found or v_trace.actor_user_id<>p_actor_user_id then
    raise no_data_found using message='ENJAZ_COPILOT_TRACE_NOT_FOUND';
  end if;

  if v_trace.status<>'accepted' then
    if v_trace.status=p_status
       and v_trace.error_code is not distinct from nullif(btrim(p_error_code),'')
       and v_trace.provider_name is not distinct from nullif(btrim(p_provider_name),'')
       and v_trace.model_name is not distinct from nullif(btrim(p_model_name),'') then
      return jsonb_build_object('traceId',v_trace.id,'status',v_trace.status,'replayed',true);
    end if;
    raise unique_violation using message='ENJAZ_COPILOT_TRACE_COMPLETION_CONFLICT';
  end if;

  update private.copilot_request_traces
  set status=p_status,
      error_code=nullif(btrim(p_error_code),''),
      provider_name=nullif(btrim(p_provider_name),''),
      model_name=nullif(btrim(p_model_name),''),
      latency_ms=p_latency_ms,
      metadata=p_metadata,
      completed_at=clock_timestamp()
  where id=v_trace.id
  returning * into v_trace;

  return jsonb_build_object('traceId',v_trace.id,'status',v_trace.status,'replayed',false);
end;
$$;

create or replace function public.copilot_begin_request_v1(
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
  select private.copilot_begin_request_v1_impl(
    p_workspace_id,p_actor_user_id,p_request_id,p_operation,p_payload_hash,p_limit
  );
$$;

create or replace function public.copilot_finish_request_v1(
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_request_id uuid,
  p_trace_id uuid,
  p_status text,
  p_error_code text default null,
  p_provider_name text default null,
  p_model_name text default null,
  p_latency_ms integer default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language sql
security invoker
set search_path=''
as $$
  select private.copilot_finish_request_v1_impl(
    p_workspace_id,p_actor_user_id,p_request_id,p_trace_id,p_status,p_error_code,
    p_provider_name,p_model_name,p_latency_ms,p_metadata
  );
$$;

revoke all on function private.copilot_begin_request_v1_impl(uuid,uuid,uuid,text,text,integer)
  from public,anon,authenticated,service_role;
revoke all on function private.copilot_finish_request_v1_impl(uuid,uuid,uuid,uuid,text,text,text,text,integer,jsonb)
  from public,anon,authenticated,service_role;
grant execute on function private.copilot_begin_request_v1_impl(uuid,uuid,uuid,text,text,integer)
  to service_role;
grant execute on function private.copilot_finish_request_v1_impl(uuid,uuid,uuid,uuid,text,text,text,text,integer,jsonb)
  to service_role;

revoke all on function public.copilot_begin_request_v1(uuid,uuid,uuid,text,text,integer)
  from public,anon,authenticated;
revoke all on function public.copilot_finish_request_v1(uuid,uuid,uuid,uuid,text,text,text,text,integer,jsonb)
  from public,anon,authenticated;
grant execute on function public.copilot_begin_request_v1(uuid,uuid,uuid,text,text,integer)
  to service_role;
grant execute on function public.copilot_finish_request_v1(uuid,uuid,uuid,uuid,text,text,text,text,integer,jsonb)
  to service_role;

commit;
