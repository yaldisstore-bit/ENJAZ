\set ON_ERROR_STOP on
begin;

select set_config('phase142a4.owner_user_id',:'owner_user_id',true);
select set_config('phase142a4.owner_workspace_id',:'owner_workspace_id',true);
select set_config('phase142a4.run_marker',:'run_marker',true);

set local role authenticated;
do $$
begin
  begin
    perform public.integration_claim_webhook_delivery_v1(gen_random_uuid());
    raise exception 'A4 FAILURE: authenticated caller reached worker RPC';
  exception when insufficient_privilege then
    raise notice 'PASS 14.2 A4 authenticated worker RPC denied';
  end;
end;
$$;
reset role;

set local role service_role;

do $$
declare r jsonb;
begin
  select private.integration_issue_credential_v1(
    current_setting('phase142a4.owner_workspace_id')::uuid,
    current_setting('phase142a4.owner_user_id')::uuid,
    current_setting('phase142a4.run_marker'),
    array['webhooks:read','webhooks:manage'],
    'enjz_A4HOSTED1',repeat('1',64),now()+interval '1 hour'
  ) into r;
  perform set_config('phase142a4.account_id',r->>'serviceAccountId',true);
  raise notice 'PASS 14.2 A4 service account authority prepared';
end;
$$;

do $$
declare r jsonb; sid uuid;
begin
  select public.integration_register_webhook_v2(
    current_setting('phase142a4.owner_workspace_id')::uuid,
    current_setting('phase142a4.account_id')::uuid,
    'https://hooks.example.test/a4',
    array['company.updated'],
    'A4-hosted-signing-secret-0123456789-abcdefghijklmnopqrstuvwxyz'
  ) into r;
  sid := (r->>'subscriptionId')::uuid;
  perform set_config('phase142a4.subscription_id',sid::text,true);
  if r->>'rawSecretPersistedInEnjazTables'<>'false'
     or r->>'vaultSecretIdRecorded'<>'true' then
    raise exception 'A4 FAILURE: secret persistence contract invalid';
  end if;
  raise notice 'PASS 14.2 A4 Vault-backed subscription registered';
end;
$$;

reset role;

select id as subscription_id, signing_secret_id as vault_secret_id
from private.integration_webhook_subscriptions
where id=current_setting('phase142a4.subscription_id')::uuid
\gset

do $$
declare clear_secret text; stored_hash text;
begin
  select d.decrypted_secret,s.signing_key_hash
    into clear_secret,stored_hash
  from private.integration_webhook_subscriptions s
  join vault.decrypted_secrets d on d.id=s.signing_secret_id
  where s.id=current_setting('phase142a4.subscription_id')::uuid;
  if clear_secret<>'A4-hosted-signing-secret-0123456789-abcdefghijklmnopqrstuvwxyz'
     or stored_hash<>encode(extensions.digest(convert_to(clear_secret,'UTF8'),'sha256'),'hex') then
    raise exception 'A4 FAILURE: Vault/hash binding invalid';
  end if;
  if exists(
    select 1 from information_schema.columns
    where table_schema='private' and table_name='integration_webhook_subscriptions'
      and column_name in ('raw_secret','signing_secret','webhook_secret')
  ) then raise exception 'A4 FAILURE: raw secret column exists'; end if;
  raise notice 'PASS 14.2 A4 Vault decrypt and hash binding verified';
end;
$$;

set local role service_role;

select public.integration_enqueue_webhook_event_v1(
  current_setting('phase142a4.owner_workspace_id')::uuid,
  gen_random_uuid(),
  'company.updated',
  jsonb_build_object('kind','a4-hosted','safe',true)
) as enqueue_count
\gset
\if :enqueue_count
\else
  \warn 'A4 FAILURE: event did not enqueue'
  \quit 1
\endif
\echo 'PASS 14.2 A4 matching webhook event enqueued'

select gen_random_uuid() as worker_id \gset
select public.integration_claim_webhook_delivery_v1(:'worker_id'::uuid) as claim_one \gset
select (:'claim_one'::jsonb->>'jobId') as job_id,
       (:'claim_one'::jsonb->>'attemptNo')::int as attempt_one,
       (:'claim_one'::jsonb->>'signingSecret') as claimed_secret
\gset
\if :attempt_one
\else
  \warn 'A4 FAILURE: first delivery claim missing'
  \quit 1
\endif

do $$
begin
  if :'claimed_secret'<>'A4-hosted-signing-secret-0123456789-abcdefghijklmnopqrstuvwxyz' then
    raise exception 'A4 FAILURE: server worker secret unavailable';
  end if;
  raise notice 'PASS 14.2 A4 server-only claim receives Vault secret';
end;
$$;

select public.integration_complete_webhook_delivery_v1(
  :'job_id'::uuid,:'worker_id'::uuid,'retryable',503,'UPSTREAM_503',now()+interval '60 seconds'
) as retry_result \gset

update private.integration_webhook_outbox
set next_attempt_at=now()-interval '1 second'
where id=:'job_id'::uuid and status='retry_scheduled';

select public.integration_claim_webhook_delivery_v1(:'worker_id'::uuid) as claim_two \gset
select (:'claim_two'::jsonb->>'attemptNo')::int as attempt_two \gset
select public.integration_complete_webhook_delivery_v1(
  :'job_id'::uuid,:'worker_id'::uuid,'delivered',204,null,null
) as delivered_result \gset

do $$
declare attempts integer; final_status text;
begin
  select count(*) into attempts
  from private.integration_webhook_delivery_attempts
  where subscription_id=current_setting('phase142a4.subscription_id')::uuid;
  select status into final_status
  from private.integration_webhook_outbox
  where id=:'job_id'::uuid;
  if attempts<>2 or :'attempt_two'::int<>2 or final_status<>'delivered' then
    raise exception 'A4 FAILURE: retry/delivery ledger invalid';
  end if;
  raise notice 'PASS 14.2 A4 retry then delivery persisted append-only evidence';
end;
$$;

do $$
begin
  begin
    update private.integration_webhook_delivery_attempts
    set error_code='tampered'
    where subscription_id=current_setting('phase142a4.subscription_id')::uuid;
    raise exception 'A4 FAILURE: immutable delivery evidence mutated';
  exception when insufficient_privilege then
    raise notice 'PASS 14.2 A4 delivery evidence mutation denied';
  end;
end;
$$;

reset role;
rollback;

select count(*) as residue_count
from public.integration_service_accounts
where name=:'run_marker'
\gset
\if :residue_count
  \warn 'A4 FAILURE: service account residue found'
  \quit 1
\endif

select count(*) as vault_residue_count
from vault.decrypted_secrets
where id=:'vault_secret_id'::uuid
\gset
\if :vault_residue_count
  \warn 'A4 FAILURE: Vault residue found after rollback'
  \quit 1
\endif

\echo 'PASS 14.2 A4 transactional fixture and Vault cleanup verified'
