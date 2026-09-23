-- ENJAZ Phase 14.2 A4 — Vault-backed webhook outbox and server-only delivery bridge.
-- Per-subscription signing secrets are encrypted in Supabase Vault; raw secrets never enter ENJAZ tables.

begin;

create schema if not exists vault;
create extension if not exists supabase_vault with schema vault;

do $
begin
  if to_regclass('vault.secrets') is null
     or to_regclass('vault.decrypted_secrets') is null
     or to_regprocedure('vault.create_secret(text,text,text)') is null then
    raise feature_not_supported using message='ENJAZ_INTEGRATION_VAULT_REQUIRED';
  end if;
end;
$;

revoke all on schema vault from public,anon,authenticated,service_role;
revoke all on table vault.secrets from public,anon,authenticated,service_role;
revoke all on table vault.decrypted_secrets from public,anon,authenticated,service_role;
revoke all on function vault.create_secret(text,text,text) from public,anon,authenticated,service_role;

alter table private.integration_webhook_subscriptions
  add column if not exists signing_secret_id uuid;

create unique index if not exists integration_webhook_subscriptions_signing_secret_idx
  on private.integration_webhook_subscriptions(signing_secret_id)
  where signing_secret_id is not null;

create table if not exists private.integration_webhook_outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  subscription_id uuid not null,
  event_id uuid not null,
  event_type text not null check (event_type in (
    'company.updated','transaction.updated','followup.due','payment.recorded','document.ready'
  )),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'queued'
    check (status in ('queued','processing','retry_scheduled','delivered','dead_letter')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_webhook_outbox_subscription_fk
    foreign key(workspace_id,subscription_id)
    references private.integration_webhook_subscriptions(workspace_id,id) on delete restrict,
  constraint integration_webhook_outbox_event_key unique(subscription_id,event_id),
  constraint integration_webhook_outbox_lock_check check (
    (status='processing' and locked_at is not null and locked_by is not null)
    or (status<>'processing' and locked_at is null and locked_by is null)
  )
);

create index if not exists integration_webhook_outbox_due_idx
  on private.integration_webhook_outbox(next_attempt_at,created_at)
  where status in ('queued','retry_scheduled');

alter table private.integration_webhook_outbox enable row level security;
alter table private.integration_webhook_outbox force row level security;
revoke all on table private.integration_webhook_outbox from public,anon,authenticated,service_role;
grant select,insert,update on table private.integration_webhook_outbox to service_role;

create or replace function public.integration_register_webhook_v2(
  p_workspace_id uuid,
  p_service_account_id uuid,
  p_endpoint_url text,
  p_event_types text[],
  p_signing_secret text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_id uuid;
  v_secret_id uuid;
  v_hash text;
  v_prefix text;
  v_secret_name text;
begin
  if p_signing_secret is null or char_length(p_signing_secret) < 32 or char_length(p_signing_secret) > 256 then
    raise invalid_parameter_value using message='ENJAZ_INTEGRATION_WEBHOOK_SECRET_INVALID';
  end if;
  if p_endpoint_url is null or p_endpoint_url !~ '^https://[^[:space:]]+$' or octet_length(p_endpoint_url)>2048 then
    raise invalid_parameter_value using message='ENJAZ_INTEGRATION_WEBHOOK_ENDPOINT_INVALID';
  end if;
  if p_event_types is null
     or cardinality(p_event_types)=0
     or cardinality(p_event_types)<>cardinality(array(select distinct x from unnest(p_event_types) x))
     or not (p_event_types <@ array[
       'company.updated','transaction.updated','followup.due','payment.recorded','document.ready'
     ]::text[]) then
    raise invalid_parameter_value using message='ENJAZ_INTEGRATION_WEBHOOK_EVENTS_INVALID';
  end if;
  if not exists(
    select 1
    from public.integration_service_accounts a
    where a.workspace_id=p_workspace_id
      and a.id=p_service_account_id
      and a.status='active'
      and (a.expires_at is null or a.expires_at>clock_timestamp())
      and 'webhooks:manage'=any(a.scopes)
  ) then
    raise insufficient_privilege using message='ENJAZ_INTEGRATION_WEBHOOK_SCOPE_REQUIRED';
  end if;

  v_hash := encode(extensions.digest(convert_to(p_signing_secret,'UTF8'),'sha256'),'hex');
  v_prefix := 'whsec_' || substr(v_hash,1,12);
  v_secret_name := 'enjaz-webhook-' || gen_random_uuid()::text;
  v_secret_id := vault.create_secret(
    p_signing_secret,
    v_secret_name,
    'ENJAZ Phase 14.2 webhook signing secret; server-only'
  );

  insert into private.integration_webhook_subscriptions(
    workspace_id,service_account_id,endpoint_url,event_types,
    signing_key_hash,signing_key_prefix,signing_secret_id
  ) values(
    p_workspace_id,p_service_account_id,p_endpoint_url,p_event_types,
    v_hash,v_prefix,v_secret_id
  )
  returning id into v_id;

  return jsonb_build_object(
    'subscriptionId',v_id,
    'workspaceId',p_workspace_id,
    'signingKeyPrefix',v_prefix,
    'rawSecretPersistedInEnjazTables',false,
    'vaultSecretIdRecorded',true
  );
end;
$$;

create or replace function public.integration_enqueue_webhook_event_v1(
  p_workspace_id uuid,
  p_event_id uuid,
  p_event_type text,
  p_payload jsonb
) returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_count integer;
  v_hash text;
begin
  if p_event_id is null
     or p_event_type is null
     or p_event_type not in ('company.updated','transaction.updated','followup.due','payment.recorded','document.ready')
     or p_payload is null
     or jsonb_typeof(p_payload)<>'object'
     or octet_length(p_payload::text)>1048576 then
    raise invalid_parameter_value using message='ENJAZ_INTEGRATION_WEBHOOK_EVENT_INVALID';
  end if;

  v_hash := encode(extensions.digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');

  insert into private.integration_webhook_outbox(
    workspace_id,subscription_id,event_id,event_type,payload,payload_hash
  )
  select s.workspace_id,s.id,p_event_id,p_event_type,p_payload,v_hash
  from private.integration_webhook_subscriptions s
  join public.integration_service_accounts a
    on a.workspace_id=s.workspace_id and a.id=s.service_account_id
  where s.workspace_id=p_workspace_id
    and s.status='active'
    and s.signing_secret_id is not null
    and p_event_type=any(s.event_types)
    and a.status='active'
    and (a.expires_at is null or a.expires_at>clock_timestamp())
  on conflict(subscription_id,event_id) do nothing;

  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

create or replace function public.integration_claim_webhook_delivery_v1(
  p_worker_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_job private.integration_webhook_outbox%rowtype;
  v_endpoint text;
  v_secret text;
begin
  if p_worker_id is null then
    raise invalid_parameter_value using message='ENJAZ_INTEGRATION_WORKER_ID_REQUIRED';
  end if;

  select o.* into v_job
  from private.integration_webhook_outbox o
  join private.integration_webhook_subscriptions s
    on s.workspace_id=o.workspace_id and s.id=o.subscription_id and s.status='active'
  where o.status in ('queued','retry_scheduled')
    and o.next_attempt_at<=clock_timestamp()
    and o.attempt_count<5
  order by o.next_attempt_at,o.created_at
  for update of o skip locked
  limit 1;

  if not found then return null; end if;

  update private.integration_webhook_outbox
  set status='processing',
      attempt_count=attempt_count+1,
      locked_at=clock_timestamp(),
      locked_by=p_worker_id,
      updated_at=clock_timestamp()
  where id=v_job.id
  returning * into v_job;

  select s.endpoint_url,d.decrypted_secret
    into v_endpoint,v_secret
  from private.integration_webhook_subscriptions s
  left join vault.decrypted_secrets d on d.id=s.signing_secret_id
  where s.workspace_id=v_job.workspace_id and s.id=v_job.subscription_id;

  return jsonb_build_object(
    'jobId',v_job.id,
    'workspaceId',v_job.workspace_id,
    'subscriptionId',v_job.subscription_id,
    'eventId',v_job.event_id,
    'eventType',v_job.event_type,
    'payload',v_job.payload,
    'payloadHash',v_job.payload_hash,
    'attemptNo',v_job.attempt_count,
    'endpointUrl',v_endpoint,
    'signingSecret',v_secret
  );
end;
$$;

create or replace function public.integration_complete_webhook_delivery_v1(
  p_job_id uuid,
  p_worker_id uuid,
  p_outcome text,
  p_http_status integer default null,
  p_error_code text default null,
  p_next_attempt_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_job private.integration_webhook_outbox%rowtype;
  v_final_status text;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_job
  from private.integration_webhook_outbox
  where id=p_job_id
  for update;

  if not found
     or v_job.status<>'processing'
     or v_job.locked_by is distinct from p_worker_id
     or v_job.locked_at is null then
    raise serialization_failure using message='ENJAZ_INTEGRATION_WEBHOOK_CLAIM_INVALID';
  end if;

  if p_http_status is not null and (p_http_status<100 or p_http_status>599) then
    raise invalid_parameter_value using message='ENJAZ_INTEGRATION_WEBHOOK_HTTP_STATUS_INVALID';
  end if;

  if p_outcome='delivered' then
    v_final_status := 'delivered';
    p_next_attempt_at := null;
  elsif p_outcome='dead_letter' then
    v_final_status := 'dead_letter';
    p_next_attempt_at := null;
  elsif p_outcome='retryable' then
    if v_job.attempt_count>=5 or p_next_attempt_at is null or p_next_attempt_at<=v_now then
      raise invalid_parameter_value using message='ENJAZ_INTEGRATION_WEBHOOK_RETRY_INVALID';
    end if;
    v_final_status := 'retry_scheduled';
  else
    raise invalid_parameter_value using message='ENJAZ_INTEGRATION_WEBHOOK_OUTCOME_INVALID';
  end if;

  insert into private.integration_webhook_delivery_attempts(
    workspace_id,subscription_id,event_id,event_type,payload_hash,
    attempt_no,outcome,http_status,error_code,requested_at,completed_at,next_attempt_at
  ) values(
    v_job.workspace_id,v_job.subscription_id,v_job.event_id,v_job.event_type,v_job.payload_hash,
    v_job.attempt_count,p_outcome,p_http_status,left(nullif(btrim(p_error_code),''),120),
    v_job.locked_at,v_now,p_next_attempt_at
  );

  update private.integration_webhook_outbox
  set status=v_final_status,
      next_attempt_at=coalesce(p_next_attempt_at,v_now),
      locked_at=null,
      locked_by=null,
      updated_at=v_now
  where id=v_job.id;

  return jsonb_build_object(
    'jobId',v_job.id,
    'status',v_final_status,
    'attemptNo',v_job.attempt_count,
    'nextAttemptAt',p_next_attempt_at
  );
end;
$$;

revoke all on function public.integration_register_webhook_v2(uuid,uuid,text,text[],text) from public,anon,authenticated;
revoke all on function public.integration_enqueue_webhook_event_v1(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.integration_claim_webhook_delivery_v1(uuid) from public,anon,authenticated;
revoke all on function public.integration_complete_webhook_delivery_v1(uuid,uuid,text,integer,text,timestamptz) from public,anon,authenticated;

grant execute on function public.integration_register_webhook_v2(uuid,uuid,text,text[],text) to service_role;
grant execute on function public.integration_enqueue_webhook_event_v1(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.integration_claim_webhook_delivery_v1(uuid) to service_role;
grant execute on function public.integration_complete_webhook_delivery_v1(uuid,uuid,text,integer,text,timestamptz) to service_role;

commit;
