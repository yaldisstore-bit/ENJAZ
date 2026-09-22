-- Phase 14.2 A3 isolated hosted certificate. The entire fixture rolls back.
\set ON_ERROR_STOP on
begin;

select set_config('phase142a3.owner_user_id',:'owner_user_id',true);
select set_config('phase142a3.member_user_id',:'member_user_id',true);
select set_config('phase142a3.outsider_user_id',:'outsider_user_id',true);
select set_config('phase142a3.owner_workspace_id',:'owner_workspace_id',true);
select set_config('phase142a3.outsider_workspace_id',:'outsider_workspace_id',true);
select set_config('phase142a3.run_marker',:'run_marker',true);

do $$ begin
 if has_table_privilege('anon','public.integration_service_accounts','SELECT')
    or has_table_privilege('authenticated','public.integration_service_accounts','SELECT')
    or has_function_privilege('authenticated',
      'private.integration_issue_credential_v1(uuid,uuid,text,text[],text,text,timestamptz)','EXECUTE')
 then raise exception 'A3 FAILURE: browser authority escape'; end if;
 raise notice 'PASS 14.2 A3 anonymous and authenticated integration access denied';
end $$;

set local role service_role;

do $$
declare r jsonb;
begin
 select private.integration_issue_credential_v1(
   current_setting('phase142a3.owner_workspace_id')::uuid,current_setting('phase142a3.owner_user_id')::uuid,
   current_setting('phase142a3.run_marker'),
   array['companies:read','webhooks:manage'],'enjz_A3HOSTED1',repeat('1',64),now()+interval '1 hour'
 ) into r;
 perform set_config('phase142a3.account_id',r->>'serviceAccountId',true);
 if r->>'workspaceId'<>current_setting('phase142a3.owner_workspace_id') or r->>'rawTokenPersisted'<>'false'
 then raise exception 'A3 FAILURE: owner issue result invalid'; end if;
 raise notice 'PASS 14.2 A3 authenticated owner identity issues server credential';
end $$;

do $$ begin
 begin
  perform private.integration_issue_credential_v1(
   current_setting('phase142a3.owner_workspace_id')::uuid,current_setting('phase142a3.member_user_id')::uuid,
   'forbidden member',array['companies:read'],
   'enjz_A3MEMBER1',repeat('2',64),now()+interval '1 hour');
  raise exception 'A3 FAILURE: member escalated';
 exception when insufficient_privilege then
  raise notice 'PASS 14.2 A3 same-workspace member escalation denied';
 end;
 begin
  perform private.integration_issue_credential_v1(
   current_setting('phase142a3.owner_workspace_id')::uuid,current_setting('phase142a3.outsider_user_id')::uuid,
   'forbidden outsider',array['companies:read'],
   'enjz_A3OUTSID1',repeat('3',64),now()+interval '1 hour');
  raise exception 'A3 FAILURE: outsider crossed workspace';
 exception when insufficient_privilege then
  raise notice 'PASS 14.2 A3 cross-workspace actor denied';
 end;
end $$;

do $$
declare subscription_id uuid;
begin
 select private.integration_register_webhook_v1(
   current_setting('phase142a3.owner_workspace_id')::uuid,current_setting('phase142a3.account_id')::uuid,
   'https://hooks.example.test/a3',array['company.updated','payment.recorded'],
   'whsec_A3HOST1',repeat('4',64)) into subscription_id;
 perform set_config('phase142a3.subscription_id',subscription_id::text,true);
 begin
  perform private.integration_register_webhook_v1(
   current_setting('phase142a3.outsider_workspace_id')::uuid,current_setting('phase142a3.account_id')::uuid,
   'https://hooks.example.test/cross',array['company.updated'],
   'whsec_A3CROS1',repeat('5',64));
  raise exception 'A3 FAILURE: webhook crossed workspace';
 exception when insufficient_privilege then null;
 end;
 raise notice 'PASS 14.2 A3 webhook scope and workspace binding enforced';
end $$;

do $$
declare no_scope jsonb; expired_id uuid;
begin
 select private.integration_issue_credential_v1(
   current_setting('phase142a3.owner_workspace_id')::uuid,current_setting('phase142a3.owner_user_id')::uuid,
   'no webhook scope',array['companies:read'],
   'enjz_A3NOSCOP1',repeat('6',64),now()+interval '1 hour') into no_scope;
 begin
  perform private.integration_register_webhook_v1(
   current_setting('phase142a3.owner_workspace_id')::uuid,(no_scope->>'serviceAccountId')::uuid,
   'https://hooks.example.test/no-scope',array['company.updated'],
   'whsec_A3NOSC1',repeat('7',64));
  raise exception 'A3 FAILURE: missing webhook scope accepted';
 exception when insufficient_privilege then null;
 end;
 insert into public.integration_service_accounts(workspace_id,name,scopes,status,expires_at,created_by)
 values(current_setting('phase142a3.owner_workspace_id')::uuid,'expired A3 account',array['webhooks:manage'],
   'active',now()-interval '1 second',current_setting('phase142a3.owner_user_id')::uuid)
 returning id into expired_id;
 begin
  perform private.integration_register_webhook_v1(
   current_setting('phase142a3.owner_workspace_id')::uuid,expired_id,
   'https://hooks.example.test/expired',array['company.updated'],
   'whsec_A3EXPI1',repeat('8',64));
  raise exception 'A3 FAILURE: expired account accepted';
 exception when insufficient_privilege then null;
 end;
 raise notice 'PASS 14.2 A3 missing scope and expired authority denied';
end $$;

do $$
declare first_result jsonb; replay_result jsonb;
begin
 select private.integration_record_idempotency_receipt_v1(
   current_setting('phase142a3.owner_workspace_id')::uuid,current_setting('phase142a3.account_id')::uuid,
   'webhooks.register','a3-hosted-idempotency',repeat('9',64),'created',repeat('a',64),
   current_setting('phase142a3.subscription_id')::uuid) into first_result;
 select private.integration_record_idempotency_receipt_v1(
   current_setting('phase142a3.owner_workspace_id')::uuid,current_setting('phase142a3.account_id')::uuid,
   'webhooks.register','a3-hosted-idempotency',repeat('9',64),'created',repeat('a',64),
   current_setting('phase142a3.subscription_id')::uuid) into replay_result;
 if first_result->>'replayed'<>'false' or replay_result->>'replayed'<>'true'
    or first_result->>'receiptId'<>replay_result->>'receiptId'
 then raise exception 'A3 FAILURE: exact replay mismatch'; end if;
 begin
  perform private.integration_record_idempotency_receipt_v1(
   current_setting('phase142a3.owner_workspace_id')::uuid,current_setting('phase142a3.account_id')::uuid,
   'webhooks.register','a3-hosted-idempotency',repeat('b',64),'changed',repeat('c',64),null);
  raise exception 'A3 FAILURE: changed replay accepted';
 exception when serialization_failure then null;
 end;
 raise notice 'PASS 14.2 A3 exact replay stable and changed replay denied';
end $$;

do $$ begin
 perform private.integration_revoke_service_account_v1(
   current_setting('phase142a3.owner_workspace_id')::uuid,current_setting('phase142a3.owner_user_id')::uuid,
   current_setting('phase142a3.account_id')::uuid);
 if exists(select 1 from private.integration_credentials
   where service_account_id=current_setting('phase142a3.account_id')::uuid and status='active')
   or exists(select 1 from private.integration_webhook_subscriptions
   where service_account_id=current_setting('phase142a3.account_id')::uuid and status='active')
 then raise exception 'A3 FAILURE: revoked authority remains active'; end if;
 begin
  perform private.integration_register_webhook_v1(
   current_setting('phase142a3.owner_workspace_id')::uuid,current_setting('phase142a3.account_id')::uuid,
   'https://hooks.example.test/revoked',array['company.updated'],'whsec_A3REVO1',repeat('d',64));
  raise exception 'A3 FAILURE: revoked account accepted';
 exception when insufficient_privilege then null;
 end;
 raise notice 'PASS 14.2 A3 revocation closes credential and webhook authority';
end $$;

do $$ begin
 if exists(select 1 from public.integration_service_accounts
   where name=current_setting('phase142a3.run_marker')
     and workspace_id<>current_setting('phase142a3.owner_workspace_id')::uuid)
 then raise exception 'A3 FAILURE: integration persistence escaped workspace'; end if;
 raise notice 'PASS 14.2 A3 integration persistence remains workspace-bound';
end $$;

rollback;

select count(*) as residue_count from public.integration_service_accounts where name=:'run_marker' \gset
\if :residue_count
  \warn 'A3 FAILURE: rolled-back fixture residue found'
  \quit 1
\endif
\echo 'PASS 14.2 A3 hosted PostgreSQL fixture left zero data residue'
