-- ENJAZ Phase 11.3-D — durable fresh-session probe fixture
-- Creates a short-lived invited client + exact transaction grant + information request.
-- A later migration must activate/write from a separate authenticated session.

begin;

do $$
begin
  if exists(select 1 from public.client_portal_requests where title='__ENJAZ_PHASE113_DURABLE__') then
    raise exception 'ENJAZ_PHASE113_DURABLE_RESIDUE_EXISTS';
  end if;
end $$;

select set_config('p113d.ws',(
  select w.id::text
  from public.workspaces w
  join public.workspace_memberships own on own.workspace_id=w.id and own.user_id=w.owner_user_id
  where exists(
    select 1 from public.transactions t
    where t.workspace_id=w.id and t.deleted_at is null and t.company_id is not null
  )
  and exists(
    select 1 from auth.users u
    where u.id<>w.owner_user_id
      and not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=w.id and wm.user_id=u.id)
      and not exists(select 1 from public.organization_members om where om.workspace_id=w.id and om.user_id=u.id)
      and not exists(select 1 from public.client_portal_principals p where p.workspace_id=w.id and p.user_id=u.id)
  )
  order by w.created_at,w.id limit 1
),true);

select set_config('p113d.owner',(select owner_user_id::text from public.workspaces where id=current_setting('p113d.ws')::uuid),true);
select set_config('p113d.tx',(
  select t.id::text from public.transactions t
  where t.workspace_id=current_setting('p113d.ws')::uuid and t.deleted_at is null and t.company_id is not null
  order by t.created_at,t.id limit 1
),true);
select set_config('p113d.client',(
  select u.id::text from auth.users u
  where u.id<>current_setting('p113d.owner')::uuid
    and not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=current_setting('p113d.ws')::uuid and wm.user_id=u.id)
    and not exists(select 1 from public.organization_members om where om.workspace_id=current_setting('p113d.ws')::uuid and om.user_id=u.id)
    and not exists(select 1 from public.client_portal_principals p where p.workspace_id=current_setting('p113d.ws')::uuid and p.user_id=u.id)
  order by u.created_at,u.id limit 1
),true);
select set_config('p113d.request',gen_random_uuid()::text,true);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p113d.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p113d.owner'),true);
set local role authenticated;

with p as (
  select public.save_client_portal_principal_v1(
    current_setting('p113d.ws')::uuid,current_setting('p113d.client')::uuid,null,'invited',null
  ) body
) select set_config('p113d.principal',body->>'principalId',true) from p;

with g as (
  select public.save_client_portal_grant_v1(
    current_setting('p113d.ws')::uuid,current_setting('p113d.principal')::uuid,null,null,
    'transaction',current_setting('p113d.tx')::uuid,array['view','message']::text[],null,null
  ) body
) select set_config('p113d.grant',body->>'grantId',true) from g;

select public.save_client_portal_request_v1(
  current_setting('p113d.ws')::uuid,current_setting('p113d.principal')::uuid,current_setting('p113d.request')::uuid,null,
  current_setting('p113d.tx')::uuid,'information','__ENJAZ_PHASE113_DURABLE__','Fresh-session durability probe',null,null,null,null
);

reset role;

do $$
begin
  if not exists(
    select 1 from public.client_portal_principals p
    where p.id=current_setting('p113d.principal')::uuid and p.status='invited'
  ) then raise exception 'ENJAZ_PHASE113_DURABLE_PRINCIPAL_MISSING'; end if;
  if not exists(
    select 1 from public.client_portal_grants g
    where g.id=current_setting('p113d.grant')::uuid and g.transaction_id=current_setting('p113d.tx')::uuid
      and g.permissions @> array['view','message']::text[] and g.revoked_at is null
  ) then raise exception 'ENJAZ_PHASE113_DURABLE_GRANT_MISSING'; end if;
  if not exists(
    select 1 from public.client_portal_requests r
    where r.id=current_setting('p113d.request')::uuid and r.title='__ENJAZ_PHASE113_DURABLE__' and r.status='open'
  ) then raise exception 'ENJAZ_PHASE113_DURABLE_REQUEST_MISSING'; end if;
end $$;

commit;
