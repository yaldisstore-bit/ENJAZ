-- Disposable PostgreSQL 17 fixture for Phase 14.2 A2 only. Never run on production.
\set ON_ERROR_STOP on
create schema auth;
create schema private;
create extension if not exists pgcrypto;
create role anon;
create role authenticated;
create role service_role bypassrls;

create table auth.users(id uuid primary key);
create table public.workspaces(id uuid primary key,owner_user_id uuid not null references auth.users(id));
create table public.workspace_memberships(
  workspace_id uuid not null references public.workspaces(id),
  user_id uuid not null references auth.users(id),
  role text not null check(role in ('owner','member')),
  primary key(workspace_id,user_id)
);

insert into auth.users values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
insert into public.workspaces values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.workspace_memberships values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','owner'),
 ('11111111-1111-4111-8111-111111111111','cccccccc-cccc-4ccc-8ccc-cccccccccccc','member'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','owner');

grant usage on schema private to service_role;
grant select on public.workspace_memberships to service_role;

\i database/migrations/phase_14_2_integration_platform_foundation.sql

do $$ begin
 if has_table_privilege('anon','public.integration_service_accounts','SELECT')
    or has_table_privilege('authenticated','public.integration_service_accounts','SELECT')
 then raise exception 'A2 FAILURE: browser role gained service-account table access'; end if;
 if has_function_privilege('authenticated',
   'private.integration_issue_credential_v1(uuid,uuid,text,text[],text,text,timestamptz)','EXECUTE')
 then raise exception 'A2 FAILURE: authenticated role gained credential issue authority'; end if;
 if not has_function_privilege('service_role',
   'private.integration_issue_credential_v1(uuid,uuid,text,text[],text,text,timestamptz)','EXECUTE')
 then raise exception 'A2 FAILURE: server credential issue authority missing'; end if;
 raise notice 'PASS 14.2 A2 browser denied and server function boundary explicit';
end $$;

set role service_role;
do $$
declare r jsonb;
begin
 select private.integration_issue_credential_v1(
   '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'CI accounting connector',array['companies:read','webhooks:manage'],
   'enjz_A1B2C3D4','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',now()+interval '30 days'
 ) into r;
 if r->>'workspaceId'<>'11111111-1111-4111-8111-111111111111'
    or r->>'rawTokenPersisted'<>'false' then
   raise exception 'A2 FAILURE: credential issue result invalid';
 end if;
 perform set_config('phase142.account_id',r->>'serviceAccountId',false);
 raise notice 'PASS 14.2 A2 owner issued hashed workspace credential';
end $$;

do $ begin
 begin
  perform private.integration_issue_credential_v1(
   '11111111-1111-4111-8111-111111111111','cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   'forbidden',array['companies:read'],'enjz_B1B2C3D4',
   'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',now()+interval '1 day');
  raise exception 'A2 FAILURE: non-owner issued credential';
 exception when insufficient_privilege then
  raise notice 'PASS 14.2 A2 same-workspace non-owner issue denied';
 end;
 begin
  perform private.integration_issue_credential_v1(
   '11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'cross workspace',array['companies:read'],'enjz_C1B2C3D4',
   'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',now()+interval '1 day');
  raise exception 'A2 FAILURE: cross-workspace owner issued credential';
 exception when insufficient_privilege then
  raise notice 'PASS 14.2 A2 cross-workspace owner issue denied';
 end;
end $;

do $ begin
 update public.workspace_memberships
 set role='owner'
 where workspace_id='11111111-1111-4111-8111-111111111111'
   and user_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 begin
  perform private.integration_issue_credential_v1(
   '11111111-1111-4111-8111-111111111111','cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   'forged owner membership',array['companies:read'],'enjz_D1B2C3D4',
   'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',now()+interval '1 day');
  raise exception 'A2 FAILURE: forged owner membership issued credential';
 exception when insufficient_privilege then
  raise notice 'PASS 14.2 A2 owner-labelled membership cannot replace canonical workspace owner';
 end;
 update public.workspace_memberships
 set role='member'
 where workspace_id='11111111-1111-4111-8111-111111111111'
   and user_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
end $;

do $ begin
 if exists(
   select 1 from information_schema.columns
   where (table_schema,table_name) in (
     ('public','integration_service_accounts'),('private','integration_credentials'),
     ('private','integration_webhook_subscriptions')
   ) and column_name in ('raw_token','token','secret','signing_secret','raw_secret')
 ) then raise exception 'A2 FAILURE: raw secret storage column exists'; end if;
 if (select count(*) from private.integration_credentials where token_hash like 'aaaaaaaa%')<>1 then
   raise exception 'A2 FAILURE: hashed credential absent';
 end if;
 raise notice 'PASS 14.2 A2 raw token/signing secret persistence absent';
end $$;

do $$
declare v_subscription uuid;
begin
 select private.integration_register_webhook_v1(
   '11111111-1111-4111-8111-111111111111',current_setting('phase142.account_id')::uuid,
   'https://hooks.example.test/enjaz',array['company.updated','payment.recorded'],
   'whsec_A1B2C3','dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
 ) into v_subscription;
 perform set_config('phase142.subscription_id',v_subscription::text,false);
 begin
  perform private.integration_register_webhook_v1(
   '22222222-2222-4222-8222-222222222222',current_setting('phase142.account_id')::uuid,
   'https://hooks.example.test/cross',array['company.updated'],
   'whsec_B1B2C3','eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
  raise exception 'A2 FAILURE: cross-workspace webhook registered';
 exception when insufficient_privilege then
  raise notice 'PASS 14.2 A2 cross-workspace webhook registration denied';
 end;
 raise notice 'PASS 14.2 A2 scoped webhook subscription registered';
end $$;

do $$
declare r1 jsonb; r2 jsonb;
begin
 select private.integration_record_idempotency_receipt_v1(
   '11111111-1111-4111-8111-111111111111',current_setting('phase142.account_id')::uuid,
   'webhooks.register','fixture-key-0001',repeat('1',64),'created',repeat('2',64),
   current_setting('phase142.subscription_id')::uuid) into r1;
 select private.integration_record_idempotency_receipt_v1(
   '11111111-1111-4111-8111-111111111111',current_setting('phase142.account_id')::uuid,
   'webhooks.register','fixture-key-0001',repeat('1',64),'created',repeat('2',64),
   current_setting('phase142.subscription_id')::uuid) into r2;
 if r1->>'replayed'<>'false' or r2->>'replayed'<>'true' or r1->>'receiptId'<>r2->>'receiptId' then
  raise exception 'A2 FAILURE: exact idempotency replay invalid';
 end if;
 begin
  perform private.integration_record_idempotency_receipt_v1(
   '11111111-1111-4111-8111-111111111111',current_setting('phase142.account_id')::uuid,
   'webhooks.register','fixture-key-0001',repeat('9',64),'changed',repeat('8',64),null);
  raise exception 'A2 FAILURE: changed replay accepted';
 exception when serialization_failure then
  raise notice 'PASS 14.2 A2 changed idempotency replay denied';
 end;
 raise notice 'PASS 14.2 A2 exact idempotency replay returns one receipt';
end $$;

insert into private.integration_webhook_delivery_attempts(
 workspace_id,subscription_id,event_id,event_type,payload_hash,attempt_no,outcome,http_status,
 requested_at,completed_at,next_attempt_at
) values(
 '11111111-1111-4111-8111-111111111111',current_setting('phase142.subscription_id')::uuid,
 '44444444-4444-4444-8444-444444444444','company.updated',repeat('3',64),1,'delivered',204,
 now()-interval '1 second',now(),null
);

do $$ begin
 begin
  update private.integration_webhook_delivery_attempts set http_status=200;
  raise exception 'A2 FAILURE: delivery evidence updated';
 exception when insufficient_privilege then
  raise notice 'PASS 14.2 A2 delivery evidence update denied';
 end;
 begin
  delete from private.integration_idempotency_receipts;
  raise exception 'A2 FAILURE: idempotency evidence deleted';
 exception when insufficient_privilege then
  raise notice 'PASS 14.2 A2 idempotency evidence delete denied';
 end;
end $$;

do $$ begin
 perform private.integration_revoke_service_account_v1(
   '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   current_setting('phase142.account_id')::uuid);
 if exists(select 1 from private.integration_credentials where status='active')
    or exists(select 1 from private.integration_webhook_subscriptions where status='active') then
   raise exception 'A2 FAILURE: revocation left active authority';
 end if;
 raise notice 'PASS 14.2 A2 account revocation closes credentials and subscriptions';
end $$;

reset role;
do $$ begin
 if (select count(*) from public.integration_service_accounts)<>1
    or (select count(*) from private.integration_credentials)<>1
    or (select count(*) from private.integration_webhook_subscriptions)<>1
    or (select count(*) from private.integration_webhook_delivery_attempts)<>1
    or (select count(*) from private.integration_idempotency_receipts)<>1 then
   raise exception 'A2 FAILURE: unexpected fixture residue/counts';
 end if;
 raise notice 'PASS 14.2 A2 isolated fixture exact durable counts';
end $$;

