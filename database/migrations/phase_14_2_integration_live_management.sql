-- ENJAZ Phase 14.2 A4 — authenticated owner management bridge.
-- Browser callers use their normal Supabase JWT. No service-role material is exposed.

begin;

create or replace function private.integration_assert_current_owner_v1(p_workspace_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path=''
as $fn$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise insufficient_privilege using message='ENJAZ_INTEGRATION_AUTH_REQUIRED';
  end if;
  perform private.integration_assert_owner_v1(p_workspace_id,v_user_id);
  return v_user_id;
end;
$fn$;

create or replace function public.integration_management_snapshot_v1(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $fn$
declare
  v_actor uuid;
  v_accounts jsonb;
  v_subscriptions jsonb;
  v_deliveries jsonb;
begin
  v_actor := private.integration_assert_current_owner_v1(p_workspace_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,
    'name',a.name,
    'scopes',a.scopes,
    'status',a.status,
    'expiresAt',a.expires_at,
    'revokedAt',a.revoked_at,
    'createdAt',a.created_at
  ) order by a.created_at desc),'[]'::jsonb)
  into v_accounts
  from public.integration_service_accounts a
  where a.workspace_id=p_workspace_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,
    'serviceAccountId',s.service_account_id,
    'endpointUrl',s.endpoint_url,
    'eventTypes',s.event_types,
    'signingKeyPrefix',s.signing_key_prefix,
    'status',s.status,
    'disabledAt',s.disabled_at,
    'createdAt',s.created_at,
    'updatedAt',s.updated_at
  ) order by s.created_at desc),'[]'::jsonb)
  into v_subscriptions
  from private.integration_webhook_subscriptions s
  where s.workspace_id=p_workspace_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',d.id,
    'subscriptionId',d.subscription_id,
    'eventId',d.event_id,
    'eventType',d.event_type,
    'attemptNo',d.attempt_no,
    'outcome',d.outcome,
    'httpStatus',d.http_status,
    'errorCode',d.error_code,
    'requestedAt',d.requested_at,
    'completedAt',d.completed_at,
    'nextAttemptAt',d.next_attempt_at
  ) order by d.completed_at desc),'[]'::jsonb)
  into v_deliveries
  from (
    select *
    from private.integration_webhook_delivery_attempts
    where workspace_id=p_workspace_id
    order by completed_at desc
    limit 100
  ) d;

  return jsonb_build_object(
    'workspaceId',p_workspace_id,
    'accounts',v_accounts,
    'subscriptions',v_subscriptions,
    'deliveries',v_deliveries
  );
end;
$fn$;

create or replace function public.integration_issue_credential_owner_v1(
  p_workspace_id uuid,
  p_name text,
  p_scopes text[],
  p_expires_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $fn$
declare
  v_actor uuid;
  v_raw_token text;
  v_token_prefix text;
  v_token_hash text;
  v_result jsonb;
begin
  v_actor := private.integration_assert_current_owner_v1(p_workspace_id);
  if p_name is null or char_length(btrim(p_name)) not between 1 and 120 then
    raise invalid_parameter_value using message='ENJAZ_INTEGRATION_NAME_INVALID';
  end if;

  v_raw_token := 'enjz_' || encode(extensions.gen_random_bytes(32),'hex');
  v_token_prefix := left(v_raw_token,17);
  v_token_hash := encode(extensions.digest(convert_to(v_raw_token,'UTF8'),'sha256'),'hex');

  v_result := private.integration_issue_credential_v1(
    p_workspace_id,v_actor,btrim(p_name),p_scopes,
    v_token_prefix,v_token_hash,p_expires_at
  );

  return v_result || jsonb_build_object(
    'rawToken',v_raw_token,
    'oneTimeSecret',true
  );
end;
$fn$;

create or replace function public.integration_revoke_service_account_owner_v1(
  p_workspace_id uuid,
  p_service_account_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $fn$
declare
  v_actor uuid;
begin
  v_actor := private.integration_assert_current_owner_v1(p_workspace_id);
  return private.integration_revoke_service_account_v1(
    p_workspace_id,v_actor,p_service_account_id
  );
end;
$fn$;

create or replace function public.integration_register_webhook_owner_v1(
  p_workspace_id uuid,
  p_service_account_id uuid,
  p_endpoint_url text,
  p_event_types text[]
) returns jsonb
language plpgsql
security definer
set search_path=''
as $fn$
declare
  v_actor uuid;
  v_secret text;
  v_result jsonb;
begin
  v_actor := private.integration_assert_current_owner_v1(p_workspace_id);
  v_secret := encode(extensions.gen_random_bytes(32),'hex');

  v_result := public.integration_register_webhook_v2(
    p_workspace_id,p_service_account_id,p_endpoint_url,p_event_types,v_secret
  );

  return v_result || jsonb_build_object(
    'signingSecret',v_secret,
    'oneTimeSecret',true
  );
end;
$fn$;

create or replace function public.integration_disable_webhook_owner_v1(
  p_workspace_id uuid,
  p_subscription_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $fn$
declare
  v_actor uuid;
  v_count integer;
begin
  v_actor := private.integration_assert_current_owner_v1(p_workspace_id);

  update private.integration_webhook_subscriptions
  set status='disabled',disabled_at=clock_timestamp(),updated_at=clock_timestamp()
  where workspace_id=p_workspace_id
    and id=p_subscription_id
    and status='active';
  get diagnostics v_count=row_count;

  if v_count=0 then
    raise no_data_found using message='ENJAZ_INTEGRATION_WEBHOOK_NOT_ACTIVE';
  end if;

  return jsonb_build_object('subscriptionId',p_subscription_id,'status','disabled');
end;
$fn$;

revoke all on function private.integration_assert_current_owner_v1(uuid)
  from public,anon,authenticated,service_role;

revoke all on function public.integration_management_snapshot_v1(uuid)
  from public,anon,authenticated,service_role;
revoke all on function public.integration_issue_credential_owner_v1(uuid,text,text[],timestamptz)
  from public,anon,authenticated,service_role;
revoke all on function public.integration_revoke_service_account_owner_v1(uuid,uuid)
  from public,anon,authenticated,service_role;
revoke all on function public.integration_register_webhook_owner_v1(uuid,uuid,text,text[])
  from public,anon,authenticated,service_role;
revoke all on function public.integration_disable_webhook_owner_v1(uuid,uuid)
  from public,anon,authenticated,service_role;

grant execute on function public.integration_management_snapshot_v1(uuid) to authenticated;
grant execute on function public.integration_issue_credential_owner_v1(uuid,text,text[],timestamptz) to authenticated;
grant execute on function public.integration_revoke_service_account_owner_v1(uuid,uuid) to authenticated;
grant execute on function public.integration_register_webhook_owner_v1(uuid,uuid,text,text[]) to authenticated;
grant execute on function public.integration_disable_webhook_owner_v1(uuid,uuid) to authenticated;

commit;
