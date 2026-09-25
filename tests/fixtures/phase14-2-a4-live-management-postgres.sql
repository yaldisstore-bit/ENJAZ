\set ON_ERROR_STOP on
begin;

select set_config('phase142a4live.owner_user_id',:'owner_user_id',true);
select set_config('phase142a4live.member_user_id',:'member_user_id',true);
select set_config('phase142a4live.outsider_user_id',:'outsider_user_id',true);
select set_config('phase142a4live.owner_workspace_id',:'owner_workspace_id',true);
select set_config('phase142a4live.run_marker',:'run_marker',true);

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('phase142a4live.owner_user_id'),true);

select public.integration_issue_credential_owner_v1(
  current_setting('phase142a4live.owner_workspace_id')::uuid,
  current_setting('phase142a4live.run_marker'),
  array['companies:read','webhooks:read','webhooks:manage'],
  now()+interval '1 hour'
) as issued
\gset

select (:'issued'::jsonb->>'serviceAccountId') as account_id,
       (:'issued'::jsonb->>'rawToken') as raw_token
\gset
select (length(:'raw_token')>32 and :'raw_token' like 'enjz_%') as owner_issue_ok
\gset
\if :owner_issue_ok
  \echo 'PASS 14.2 A4 LIVE owner issues one-time credential'
\else
  \warn 'A4 LIVE FAILURE: owner credential issue invalid'
  \quit 1
\endif

select public.integration_management_snapshot_v1(current_setting('phase142a4live.owner_workspace_id')::uuid) as snapshot_after_issue
\gset
select (
  position(:'raw_token' in :'snapshot_after_issue'::jsonb::text)=0
  and :'snapshot_after_issue'::jsonb::text not like '%token_hash%'
  and :'snapshot_after_issue'::jsonb::text not like '%signing_secret%'
) as snapshot_secret_safe
\gset
\if :snapshot_secret_safe
  \echo 'PASS 14.2 A4 LIVE snapshot excludes raw credential material'
\else
  \warn 'A4 LIVE FAILURE: snapshot leaked credential material'
  \quit 1
\endif

select public.integration_register_webhook_owner_v1(
  current_setting('phase142a4live.owner_workspace_id')::uuid,
  :'account_id'::uuid,
  'https://hooks.example.test/a4-live',
  array['company.updated','payment.recorded']
) as webhook
\gset
select (:'webhook'::jsonb->>'subscriptionId') as subscription_id,
       (:'webhook'::jsonb->>'signingSecret') as signing_secret
\gset
select (length(:'signing_secret')=64) as webhook_secret_ok
\gset
\if :webhook_secret_ok
  \echo 'PASS 14.2 A4 LIVE owner registers one-time Vault webhook secret'
\else
  \warn 'A4 LIVE FAILURE: webhook secret invalid'
  \quit 1
\endif

select public.integration_management_snapshot_v1(current_setting('phase142a4live.owner_workspace_id')::uuid) as snapshot_after_webhook
\gset
select (
  position(:'signing_secret' in :'snapshot_after_webhook'::jsonb::text)=0
  and :'snapshot_after_webhook'::jsonb::text like '%signingKeyPrefix%'
) as webhook_snapshot_safe
\gset
\if :webhook_snapshot_safe
  \echo 'PASS 14.2 A4 LIVE webhook snapshot exposes prefix not secret'
\else
  \warn 'A4 LIVE FAILURE: webhook snapshot secret contract invalid'
  \quit 1
\endif

select public.integration_disable_webhook_owner_v1(
  current_setting('phase142a4live.owner_workspace_id')::uuid,:'subscription_id'::uuid
) as disabled
\gset
select (:'disabled'::jsonb->>'status'='disabled') as disable_ok
\gset
\if :disable_ok
  \echo 'PASS 14.2 A4 LIVE owner disables webhook'
\else
  \warn 'A4 LIVE FAILURE: webhook disable failed'
  \quit 1
\endif

select public.integration_revoke_service_account_owner_v1(
  current_setting('phase142a4live.owner_workspace_id')::uuid,:'account_id'::uuid
) as revoked
\gset
select (:'revoked'::jsonb->>'status'='revoked') as revoke_ok
\gset
\if :revoke_ok
  \echo 'PASS 14.2 A4 LIVE owner revokes credential authority'
\else
  \warn 'A4 LIVE FAILURE: credential revoke failed'
  \quit 1
\endif

select set_config('request.jwt.claim.sub',current_setting('phase142a4live.member_user_id'),true);
do $member$
begin
  begin
    perform public.integration_management_snapshot_v1(current_setting('phase142a4live.owner_workspace_id')::uuid);
    raise exception 'A4 LIVE FAILURE: member reached owner snapshot';
  exception when insufficient_privilege then
    raise notice 'PASS 14.2 A4 LIVE same-workspace member owner management denied';
  end;
end;
$member$;

select set_config('request.jwt.claim.sub',current_setting('phase142a4live.outsider_user_id'),true);
do $outsider$
begin
  begin
    perform public.integration_management_snapshot_v1(current_setting('phase142a4live.owner_workspace_id')::uuid);
    raise exception 'A4 LIVE FAILURE: outsider reached owner snapshot';
  exception when insufficient_privilege then
    raise notice 'PASS 14.2 A4 LIVE cross-workspace owner management denied';
  end;
end;
$outsider$;

reset role;
rollback;

select count(*) as residue_count
from public.integration_service_accounts
where name=:'run_marker'
\gset
\if :residue_count
  \warn 'A4 LIVE FAILURE: transactional account residue found'
  \quit 1
\endif

\echo 'PASS 14.2 A4 LIVE transactional owner management left zero account residue'
