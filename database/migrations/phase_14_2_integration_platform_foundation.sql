-- ENJAZ Phase 14.2 A2 — authoritative integration persistence and delivery ledger.
-- Raw API tokens and webhook signing secrets are deliberately never persisted.

begin;

create table public.integration_service_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  scopes text[] not null check (
    cardinality(scopes) between 1 and 32
    and scopes <@ array[
      'companies:read','transactions:read','webhooks:read','webhooks:manage',
      'imports:dry-run','imports:execute'
    ]::text[]
  ),
  status text not null default 'active' check (status in ('active','revoked')),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_service_accounts_workspace_id_id_key unique(workspace_id,id),
  constraint integration_service_accounts_lifecycle_check check (
    (status='active' and revoked_at is null)
    or (status='revoked' and revoked_at is not null)
  )
);

create index integration_service_accounts_workspace_status_idx
  on public.integration_service_accounts(workspace_id,status,created_at desc);
create index integration_service_accounts_created_by_idx
  on public.integration_service_accounts(created_by);

create table private.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  service_account_id uuid not null,
  token_prefix text not null check (token_prefix ~ '^enjz_[A-Za-z0-9]{8,20}$'),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  hash_scheme text not null default 'sha256-v1' check (hash_scheme='sha256-v1'),
  status text not null default 'active' check (status in ('active','rotated','revoked')),
  valid_from timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  replaced_by_credential_id uuid references private.integration_credentials(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint integration_credentials_service_account_fk
    foreign key(workspace_id,service_account_id)
    references public.integration_service_accounts(workspace_id,id) on delete cascade,
  constraint integration_credentials_prefix_key unique(token_prefix),
  constraint integration_credentials_hash_key unique(token_hash),
  constraint integration_credentials_expiry_check check (expires_at is null or expires_at>valid_from),
  constraint integration_credentials_lifecycle_check check (
    (status='active' and revoked_at is null and replaced_by_credential_id is null)
    or (status='rotated' and revoked_at is not null and replaced_by_credential_id is not null)
    or (status='revoked' and revoked_at is not null and replaced_by_credential_id is null)
  )
);

create index integration_credentials_account_idx
  on private.integration_credentials(workspace_id,service_account_id,created_at desc);

create table private.integration_webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  service_account_id uuid not null,
  endpoint_url text not null check (endpoint_url ~ '^https://[^[:space:]]+$' and octet_length(endpoint_url)<=2048),
  event_types text[] not null check (
    cardinality(event_types) between 1 and 16
    and event_types <@ array[
      'company.updated','transaction.updated','followup.due','payment.recorded','document.ready'
    ]::text[]
  ),
  signing_key_hash text not null check (signing_key_hash ~ '^[0-9a-f]{64}$'),
  signing_key_prefix text not null check (signing_key_prefix ~ '^whsec_[A-Za-z0-9]{6,20}$'),
  status text not null default 'active' check (status in ('active','disabled')),
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_webhook_subscriptions_account_fk
    foreign key(workspace_id,service_account_id)
    references public.integration_service_accounts(workspace_id,id) on delete cascade,
  constraint integration_webhook_subscriptions_workspace_id_id_key unique(workspace_id,id),
  constraint integration_webhook_subscriptions_lifecycle_check check (
    (status='active' and disabled_at is null) or (status='disabled' and disabled_at is not null)
  )
);

create index integration_webhook_subscriptions_dispatch_idx
  on private.integration_webhook_subscriptions(workspace_id,status,created_at)
  where status='active';

create table private.integration_webhook_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  subscription_id uuid not null,
  event_id uuid not null,
  event_type text not null check (event_type in (
    'company.updated','transaction.updated','followup.due','payment.recorded','document.ready'
  )),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  attempt_no integer not null check (attempt_no between 1 and 8),
  outcome text not null check (outcome in ('delivered','retryable','dead_letter')),
  http_status integer check (http_status is null or http_status between 100 and 599),
  error_code text check (error_code is null or char_length(btrim(error_code)) between 1 and 120),
  requested_at timestamptz not null,
  completed_at timestamptz not null,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  constraint integration_webhook_delivery_subscription_fk
    foreign key(workspace_id,subscription_id)
    references private.integration_webhook_subscriptions(workspace_id,id) on delete restrict,
  constraint integration_webhook_delivery_attempt_key unique(subscription_id,event_id,attempt_no),
  constraint integration_webhook_delivery_time_check check (completed_at>=requested_at),
  constraint integration_webhook_delivery_retry_check check (
    (outcome='retryable' and attempt_no<8 and next_attempt_at>completed_at)
    or (outcome in ('delivered','dead_letter') and next_attempt_at is null)
  )
);

create index integration_webhook_delivery_event_idx
  on private.integration_webhook_delivery_attempts(workspace_id,subscription_id,event_id,attempt_no);
create index integration_webhook_delivery_dead_letter_idx
  on private.integration_webhook_delivery_attempts(workspace_id,completed_at desc)
  where outcome='dead_letter';

create table private.integration_idempotency_receipts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  service_account_id uuid not null,
  operation text not null check (operation in ('webhooks.register','webhooks.disable','imports.execute')),
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 8 and 200),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  result_code text not null check (char_length(btrim(result_code)) between 1 and 80),
  response_hash text not null check (response_hash ~ '^[0-9a-f]{64}$'),
  resource_id uuid,
  created_at timestamptz not null default now(),
  constraint integration_idempotency_receipts_account_fk
    foreign key(workspace_id,service_account_id)
    references public.integration_service_accounts(workspace_id,id) on delete restrict,
  constraint integration_idempotency_receipts_key unique(workspace_id,service_account_id,operation,idempotency_key)
);

create index integration_idempotency_receipts_time_idx
  on private.integration_idempotency_receipts(workspace_id,created_at desc);

create or replace function private.reject_integration_evidence_mutation_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  raise insufficient_privilege using message='ENJAZ_INTEGRATION_EVIDENCE_APPEND_ONLY';
end;
$$;

create trigger integration_webhook_delivery_attempts_append_only
before update or delete on private.integration_webhook_delivery_attempts
for each row execute function private.reject_integration_evidence_mutation_v1();
create trigger integration_idempotency_receipts_append_only
before update or delete on private.integration_idempotency_receipts
for each row execute function private.reject_integration_evidence_mutation_v1();

create or replace function private.integration_assert_owner_v1(p_workspace_id uuid,p_actor_user_id uuid)
returns void language plpgsql stable security definer set search_path='' as $$
begin
  if p_workspace_id is null or p_actor_user_id is null or not exists(
    select 1 from public.workspace_memberships wm
    where wm.workspace_id=p_workspace_id and wm.user_id=p_actor_user_id and wm.role='owner'
  ) then
    raise insufficient_privilege using message='ENJAZ_INTEGRATION_OWNER_REQUIRED';
  end if;
end;
$$;

create or replace function private.integration_issue_credential_v1(
  p_workspace_id uuid,p_actor_user_id uuid,p_name text,p_scopes text[],
  p_token_prefix text,p_token_hash text,p_expires_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_account public.integration_service_accounts%rowtype; v_credential_id uuid;
begin
  perform private.integration_assert_owner_v1(p_workspace_id,p_actor_user_id);
  if p_scopes is null or cardinality(p_scopes)<>cardinality(array(select distinct x from unnest(p_scopes) x)) then
    raise invalid_parameter_value using message='ENJAZ_INTEGRATION_SCOPES_INVALID';
  end if;
  if p_expires_at is not null and p_expires_at<=clock_timestamp() then
    raise invalid_parameter_value using message='ENJAZ_INTEGRATION_EXPIRY_INVALID';
  end if;
  insert into public.integration_service_accounts(workspace_id,name,scopes,expires_at,created_by)
  values(p_workspace_id,btrim(p_name),p_scopes,p_expires_at,p_actor_user_id) returning * into v_account;
  insert into private.integration_credentials(workspace_id,service_account_id,token_prefix,token_hash,expires_at)
  values(p_workspace_id,v_account.id,p_token_prefix,p_token_hash,p_expires_at) returning id into v_credential_id;
  return jsonb_build_object('serviceAccountId',v_account.id,'credentialId',v_credential_id,
    'workspaceId',p_workspace_id,'tokenPrefix',p_token_prefix,'rawTokenPersisted',false);
end;
$$;

create or replace function private.integration_revoke_service_account_v1(
  p_workspace_id uuid,p_actor_user_id uuid,p_service_account_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
  perform private.integration_assert_owner_v1(p_workspace_id,p_actor_user_id);
  update public.integration_service_accounts set status='revoked',revoked_at=clock_timestamp(),updated_at=clock_timestamp()
  where workspace_id=p_workspace_id and id=p_service_account_id and status='active';
  get diagnostics v_count=row_count;
  if v_count=0 then raise no_data_found using message='ENJAZ_INTEGRATION_ACCOUNT_NOT_ACTIVE'; end if;
  update private.integration_credentials set status='revoked',revoked_at=clock_timestamp()
  where workspace_id=p_workspace_id and service_account_id=p_service_account_id and status='active';
  update private.integration_webhook_subscriptions set status='disabled',disabled_at=clock_timestamp(),updated_at=clock_timestamp()
  where workspace_id=p_workspace_id and service_account_id=p_service_account_id and status='active';
  return jsonb_build_object('serviceAccountId',p_service_account_id,'status','revoked');
end;
$$;

create or replace function private.integration_register_webhook_v1(
  p_workspace_id uuid,p_service_account_id uuid,p_endpoint_url text,p_event_types text[],
  p_signing_key_prefix text,p_signing_key_hash text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if p_event_types is null or cardinality(p_event_types)<>cardinality(array(select distinct x from unnest(p_event_types) x)) then
    raise invalid_parameter_value using message='ENJAZ_INTEGRATION_WEBHOOK_EVENTS_INVALID';
  end if;
  if not exists(
    select 1 from public.integration_service_accounts a
    where a.workspace_id=p_workspace_id and a.id=p_service_account_id and a.status='active'
      and (a.expires_at is null or a.expires_at>clock_timestamp()) and 'webhooks:manage'=any(a.scopes)
  ) then raise insufficient_privilege using message='ENJAZ_INTEGRATION_WEBHOOK_SCOPE_REQUIRED'; end if;
  insert into private.integration_webhook_subscriptions(
    workspace_id,service_account_id,endpoint_url,event_types,signing_key_prefix,signing_key_hash
  ) values(p_workspace_id,p_service_account_id,p_endpoint_url,p_event_types,p_signing_key_prefix,p_signing_key_hash)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function private.integration_record_idempotency_receipt_v1(
  p_workspace_id uuid,p_service_account_id uuid,p_operation text,p_idempotency_key text,
  p_request_hash text,p_result_code text,p_response_hash text,p_resource_id uuid default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row private.integration_idempotency_receipts%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_workspace_id::text||chr(31)||p_service_account_id::text||chr(31)||p_operation||chr(31)||p_idempotency_key,0));
  select * into v_row from private.integration_idempotency_receipts r
  where r.workspace_id=p_workspace_id and r.service_account_id=p_service_account_id
    and r.operation=p_operation and r.idempotency_key=p_idempotency_key;
  if found then
    if v_row.request_hash<>p_request_hash then
      raise serialization_failure using message='ENJAZ_INTEGRATION_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object('receiptId',v_row.id,'replayed',true,'resultCode',v_row.result_code,'resourceId',v_row.resource_id);
  end if;
  insert into private.integration_idempotency_receipts(
    workspace_id,service_account_id,operation,idempotency_key,request_hash,result_code,response_hash,resource_id
  ) values(p_workspace_id,p_service_account_id,p_operation,p_idempotency_key,p_request_hash,p_result_code,p_response_hash,p_resource_id)
  returning * into v_row;
  return jsonb_build_object('receiptId',v_row.id,'replayed',false,'resultCode',v_row.result_code,'resourceId',v_row.resource_id);
end;
$$;

alter table public.integration_service_accounts enable row level security;
alter table public.integration_service_accounts force row level security;
alter table private.integration_credentials enable row level security;
alter table private.integration_credentials force row level security;
alter table private.integration_webhook_subscriptions enable row level security;
alter table private.integration_webhook_subscriptions force row level security;
alter table private.integration_webhook_delivery_attempts enable row level security;
alter table private.integration_webhook_delivery_attempts force row level security;
alter table private.integration_idempotency_receipts enable row level security;
alter table private.integration_idempotency_receipts force row level security;

revoke all on table public.integration_service_accounts from public,anon,authenticated;
revoke all on table private.integration_credentials,private.integration_webhook_subscriptions,
  private.integration_webhook_delivery_attempts,private.integration_idempotency_receipts
  from public,anon,authenticated,service_role;
grant select,insert,update on table public.integration_service_accounts to service_role;
grant select,insert,update on table private.integration_credentials,private.integration_webhook_subscriptions to service_role;
grant select,insert on table private.integration_webhook_delivery_attempts,private.integration_idempotency_receipts to service_role;

revoke all on function private.reject_integration_evidence_mutation_v1() from public,anon,authenticated,service_role;
revoke all on function private.integration_assert_owner_v1(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function private.integration_issue_credential_v1(uuid,uuid,text,text[],text,text,timestamptz) from public,anon,authenticated;
revoke all on function private.integration_revoke_service_account_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function private.integration_register_webhook_v1(uuid,uuid,text,text[],text,text) from public,anon,authenticated;
revoke all on function private.integration_record_idempotency_receipt_v1(uuid,uuid,text,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function private.integration_issue_credential_v1(uuid,uuid,text,text[],text,text,timestamptz) to service_role;
grant execute on function private.integration_revoke_service_account_v1(uuid,uuid,uuid) to service_role;
grant execute on function private.integration_register_webhook_v1(uuid,uuid,text,text[],text,text) to service_role;
grant execute on function private.integration_record_idempotency_receipt_v1(uuid,uuid,text,text,text,text,text,uuid) to service_role;

commit;
