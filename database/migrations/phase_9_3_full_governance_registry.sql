begin;

-- Phase 9.3 / M2 — complete corporate governance registry.
-- Existing companies and contacts remain identity truth. Governance adds durable history,
-- guarded commands and derived current/as-of context; browser table access stays read-only.

alter table public.corporate_governance_events
  drop constraint corporate_governance_events_type_check;
alter table public.corporate_governance_events
  add constraint corporate_governance_events_type_check check(event_type in (
    'ownership.snapshot','beneficial_owner.snapshot','authority.grant','authority.revoke',
    'resolution.record','capital.change'
  ));

create table public.corporate_registry_states (
  workspace_id uuid not null,
  company_id uuid not null,
  beneficial_owner_version integer not null default 0,
  authority_version integer not null default 0,
  resolution_version integer not null default 0,
  capital_version integer not null default 0,
  last_beneficial_owner_effective_from date,
  last_authority_effective_on date,
  last_resolution_effective_on date,
  last_capital_effective_on date,
  updated_at timestamptz not null default now(),
  constraint corporate_registry_states_pkey primary key(workspace_id,company_id),
  constraint corporate_registry_states_company_fk foreign key(workspace_id,company_id)
    references public.companies(workspace_id,id) on update cascade on delete restrict,
  constraint corporate_registry_states_versions_check check(
    beneficial_owner_version>=0 and authority_version>=0 and resolution_version>=0 and capital_version>=0
  )
);

create table public.corporate_beneficial_owners (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  company_id uuid not null,
  contact_id uuid not null,
  control_basis text not null,
  percentage numeric(9,6),
  effective_from date not null,
  effective_to date,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_operation_id uuid not null,
  ended_by_operation_id uuid,
  created_at timestamptz not null default now(),
  constraint corporate_beneficial_owners_workspace_id_id_key unique(workspace_id,id),
  constraint corporate_beneficial_owners_company_fk foreign key(workspace_id,company_id)
    references public.companies(workspace_id,id) on update cascade on delete restrict,
  constraint corporate_beneficial_owners_contact_fk foreign key(workspace_id,contact_id)
    references public.contacts(workspace_id,id) on update cascade on delete restrict,
  constraint corporate_beneficial_owners_basis_check check(control_basis in ('ownership','voting_rights','management_control','other')),
  constraint corporate_beneficial_owners_percentage_check check(percentage is null or (percentage>0 and percentage<=100)),
  constraint corporate_beneficial_owners_effective_check check(effective_to is null or effective_to>effective_from),
  constraint corporate_beneficial_owners_end_operation_check check(
    (effective_to is null and ended_by_operation_id is null)
    or (effective_to is not null and ended_by_operation_id is not null)
  )
);

create table public.corporate_authority_grants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  company_id uuid not null,
  contact_id uuid not null,
  governance_role text not null,
  authority_scope text not null,
  powers jsonb not null default '[]'::jsonb,
  effective_from date not null,
  effective_to date,
  end_reason text,
  revocation_reason text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_operation_id uuid not null,
  ended_by_operation_id uuid,
  created_at timestamptz not null default now(),
  constraint corporate_authority_grants_workspace_id_id_key unique(workspace_id,id),
  constraint corporate_authority_grants_company_fk foreign key(workspace_id,company_id)
    references public.companies(workspace_id,id) on update cascade on delete restrict,
  constraint corporate_authority_grants_contact_fk foreign key(workspace_id,contact_id)
    references public.contacts(workspace_id,id) on update cascade on delete restrict,
  constraint corporate_authority_grants_role_check check(governance_role in ('director','manager','authorized_person')),
  constraint corporate_authority_grants_scope_check check(authority_scope in ('full','limited','joint','custom')),
  constraint corporate_authority_grants_powers_check check(jsonb_typeof(powers)='array' and octet_length(powers::text)<=8192),
  constraint corporate_authority_grants_effective_check check(effective_to is null or effective_to>effective_from),
  constraint corporate_authority_grants_end_shape_check check(
    (effective_to is null and end_reason is null and revocation_reason is null and ended_by_operation_id is null)
    or (effective_to is not null and end_reason='expiry' and revocation_reason is null and ended_by_operation_id is null)
    or (effective_to is not null and end_reason='revoked' and revocation_reason is not null and ended_by_operation_id is not null)
  )
);

create table public.corporate_resolutions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  company_id uuid not null,
  resolution_number text,
  title text not null,
  resolution_type text not null,
  effective_on date not null,
  notes text,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  operation_id uuid not null,
  created_at timestamptz not null default now(),
  constraint corporate_resolutions_workspace_id_id_key unique(workspace_id,id),
  constraint corporate_resolutions_company_fk foreign key(workspace_id,company_id)
    references public.companies(workspace_id,id) on update cascade on delete restrict,
  constraint corporate_resolutions_operation_key unique(workspace_id,company_id,operation_id),
  constraint corporate_resolutions_number_check check(resolution_number is null or char_length(btrim(resolution_number)) between 1 and 120),
  constraint corporate_resolutions_title_check check(char_length(btrim(title)) between 1 and 400),
  constraint corporate_resolutions_type_check check(resolution_type in ('appointment','removal','ownership','capital','authorization','general','other')),
  constraint corporate_resolutions_notes_check check(notes is null or char_length(notes)<=4000)
);

create table public.corporate_capital_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  company_id uuid not null,
  change_type text not null,
  amount_before numeric(18,2),
  amount_after numeric(18,2) not null,
  effective_on date not null,
  reason text not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  operation_id uuid not null,
  created_at timestamptz not null default now(),
  constraint corporate_capital_events_workspace_id_id_key unique(workspace_id,id),
  constraint corporate_capital_events_company_fk foreign key(workspace_id,company_id)
    references public.companies(workspace_id,id) on update cascade on delete restrict,
  constraint corporate_capital_events_operation_key unique(workspace_id,company_id,operation_id),
  constraint corporate_capital_events_type_check check(change_type in ('set','increase','decrease','correction')),
  constraint corporate_capital_events_amount_check check(
    amount_after>=0 and (amount_before is null or amount_before>=0) and
    ((change_type='set') or
     (change_type='increase' and amount_before is not null and amount_after>amount_before) or
     (change_type='decrease' and amount_before is not null and amount_after<amount_before) or
     (change_type='correction' and amount_before is not null and amount_after<>amount_before))
  ),
  constraint corporate_capital_events_reason_check check(char_length(btrim(reason)) between 1 and 1000)
);

create index corporate_beneficial_owners_company_asof_idx on public.corporate_beneficial_owners(workspace_id,company_id,effective_from,effective_to);
create index corporate_beneficial_owners_contact_history_idx on public.corporate_beneficial_owners(workspace_id,contact_id,effective_from desc);
create index corporate_beneficial_owners_created_by_fk_idx on public.corporate_beneficial_owners(created_by);
create index corporate_authority_grants_company_asof_idx on public.corporate_authority_grants(workspace_id,company_id,effective_from,effective_to);
create index corporate_authority_grants_contact_history_idx on public.corporate_authority_grants(workspace_id,contact_id,effective_from desc);
create index corporate_authority_grants_created_by_fk_idx on public.corporate_authority_grants(created_by);
create index corporate_resolutions_timeline_idx on public.corporate_resolutions(workspace_id,company_id,effective_on desc,created_at desc);
create index corporate_resolutions_actor_user_id_fk_idx on public.corporate_resolutions(actor_user_id);
create index corporate_capital_events_timeline_idx on public.corporate_capital_events(workspace_id,company_id,effective_on desc,created_at desc);
create index corporate_capital_events_actor_user_id_fk_idx on public.corporate_capital_events(actor_user_id);

alter table public.corporate_registry_states enable row level security;
alter table public.corporate_beneficial_owners enable row level security;
alter table public.corporate_authority_grants enable row level security;
alter table public.corporate_resolutions enable row level security;
alter table public.corporate_capital_events enable row level security;

create policy corporate_registry_states_select_authorized on public.corporate_registry_states for select to authenticated using(private.can_read_corporate_governance_v1(workspace_id));
create policy corporate_beneficial_owners_select_authorized on public.corporate_beneficial_owners for select to authenticated using(private.can_read_corporate_governance_v1(workspace_id));
create policy corporate_authority_grants_select_authorized on public.corporate_authority_grants for select to authenticated using(private.can_read_corporate_governance_v1(workspace_id));
create policy corporate_resolutions_select_authorized on public.corporate_resolutions for select to authenticated using(private.can_read_corporate_governance_v1(workspace_id));
create policy corporate_capital_events_select_authorized on public.corporate_capital_events for select to authenticated using(private.can_read_corporate_governance_v1(workspace_id));

revoke all on table public.corporate_registry_states from anon,authenticated;
revoke all on table public.corporate_beneficial_owners from anon,authenticated;
revoke all on table public.corporate_authority_grants from anon,authenticated;
revoke all on table public.corporate_resolutions from anon,authenticated;
revoke all on table public.corporate_capital_events from anon,authenticated;
grant select on table public.corporate_registry_states to authenticated;
grant select on table public.corporate_beneficial_owners to authenticated;
grant select on table public.corporate_authority_grants to authenticated;
grant select on table public.corporate_resolutions to authenticated;
grant select on table public.corporate_capital_events to authenticated;

create or replace function private.reject_beneficial_owner_overlap_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if exists(select 1 from public.corporate_beneficial_owners x
    where x.workspace_id=new.workspace_id and x.company_id=new.company_id and x.contact_id=new.contact_id
      and x.control_basis=new.control_basis and x.id<>new.id
      and daterange(x.effective_from,x.effective_to,'[)') && daterange(new.effective_from,new.effective_to,'[)')) then
    raise exclusion_violation using message='ENJAZ_BENEFICIAL_OWNER_PERIOD_CONFLICT';
  end if;
  return new;
end; $$;
create trigger corporate_beneficial_owners_overlap_guard before insert or update of workspace_id,company_id,contact_id,control_basis,effective_from,effective_to on public.corporate_beneficial_owners for each row execute function private.reject_beneficial_owner_overlap_v1();

create or replace function private.reject_authority_overlap_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if exists(select 1 from public.corporate_authority_grants x
    where x.workspace_id=new.workspace_id and x.company_id=new.company_id and x.contact_id=new.contact_id
      and x.governance_role=new.governance_role and x.id<>new.id
      and daterange(x.effective_from,x.effective_to,'[)') && daterange(new.effective_from,new.effective_to,'[)')) then
    raise exclusion_violation using message='ENJAZ_AUTHORITY_PERIOD_CONFLICT';
  end if;
  return new;
end; $$;
create trigger corporate_authority_grants_overlap_guard before insert or update of workspace_id,company_id,contact_id,governance_role,effective_from,effective_to on public.corporate_authority_grants for each row execute function private.reject_authority_overlap_v1();

create or replace function private.guard_governed_company_capital_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.capital is distinct from old.capital and coalesce(current_setting('enjaz.governance_capital_write',true),'')<>'allowed' then
    raise insufficient_privilege using message='ENJAZ_CAPITAL_REQUIRES_GOVERNANCE_COMMAND';
  end if;
  return new;
end; $$;
create trigger companies_governed_capital_guard before update of capital on public.companies for each row execute function private.guard_governed_company_capital_v1();

create or replace function private.replace_company_beneficial_owners_v1_impl(
  p_workspace_id uuid,p_company_id uuid,p_expected_version integer,p_operation_id uuid,p_effective_from date,p_entries jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid; v_state public.corporate_registry_states%rowtype; v_existing public.corporate_governance_events%rowtype;
  v_entry jsonb; v_contact uuid; v_basis text; v_pct_text text; v_pct numeric(9,6); v_normalized jsonb:='[]'::jsonb; v_sorted jsonb; v_request jsonb; v_key text; v_seen text[]:=array[]::text[]; v_count int; v_new_version int;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);
  if p_company_id is null or p_operation_id is null or p_effective_from is null or p_expected_version is null or p_expected_version<0 or p_entries is null or jsonb_typeof(p_entries)<>'array' then raise invalid_parameter_value using message='ENJAZ_BENEFICIAL_OWNER_INPUT_INVALID'; end if;
  if not exists(select 1 from public.companies c where c.workspace_id=p_workspace_id and c.id=p_company_id and c.deleted_at is null) then raise no_data_found using message='ENJAZ_GOVERNANCE_COMPANY_NOT_FOUND'; end if;
  v_count:=jsonb_array_length(p_entries); if v_count>100 or octet_length(p_entries::text)>32768 then raise invalid_parameter_value using message='ENJAZ_BENEFICIAL_OWNER_ENTRIES_INVALID'; end if;
  for v_entry in select value from jsonb_array_elements(p_entries) loop
    if jsonb_typeof(v_entry)<>'object' or (select count(*) from jsonb_object_keys(v_entry))<>3 or not(v_entry ?& array['contactId','basis','percentage']) then raise invalid_parameter_value using message='ENJAZ_BENEFICIAL_OWNER_ENTRY_SHAPE_INVALID'; end if;
    begin v_contact:=(v_entry->>'contactId')::uuid; exception when others then raise invalid_parameter_value using message='ENJAZ_BENEFICIAL_OWNER_CONTACT_INVALID'; end;
    v_basis:=v_entry->>'basis'; v_pct_text:=v_entry->>'percentage';
    if v_basis not in ('ownership','voting_rights','management_control','other') then raise invalid_parameter_value using message='ENJAZ_BENEFICIAL_OWNER_BASIS_INVALID'; end if;
    if v_pct_text is not null then
      if v_pct_text !~ '^(?:0|[1-9][0-9]{0,2})(?:\.[0-9]{1,6})?$' then raise invalid_parameter_value using message='ENJAZ_BENEFICIAL_OWNER_PERCENTAGE_INVALID'; end if;
      v_pct:=v_pct_text::numeric(9,6); if v_pct<=0 or v_pct>100 then raise invalid_parameter_value using message='ENJAZ_BENEFICIAL_OWNER_PERCENTAGE_INVALID'; end if;
    else v_pct:=null; end if;
    if v_basis in ('ownership','voting_rights') and v_pct is null then raise invalid_parameter_value using message='ENJAZ_BENEFICIAL_OWNER_PERCENTAGE_REQUIRED'; end if;
    if not exists(select 1 from public.contacts c where c.workspace_id=p_workspace_id and c.id=v_contact and c.deleted_at is null and c.status='active') then raise no_data_found using message='ENJAZ_BENEFICIAL_OWNER_CONTACT_NOT_FOUND'; end if;
    v_key:=v_contact::text||':'||v_basis; if v_key=any(v_seen) then raise unique_violation using message='ENJAZ_BENEFICIAL_OWNER_DUPLICATE'; end if; v_seen:=array_append(v_seen,v_key);
    v_normalized:=v_normalized||jsonb_build_array(jsonb_build_object('contactId',v_contact::text,'basis',v_basis,'percentage',case when v_pct is null then null else trim(trailing '.' from trim(trailing '0' from to_char(v_pct,'FM990.000000'))) end));
  end loop;
  select coalesce(jsonb_agg(value order by value->>'contactId',value->>'basis'),'[]'::jsonb) into v_sorted from jsonb_array_elements(v_normalized);
  v_request:=jsonb_build_object('effectiveFrom',p_effective_from,'entries',v_sorted);
  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text),hashtext(p_company_id::text));
  select * into v_existing from public.corporate_governance_events where workspace_id=p_workspace_id and company_id=p_company_id and operation_id=p_operation_id limit 1;
  if found then if v_existing.event_type='beneficial_owner.snapshot' and v_existing.effective_on=p_effective_from and v_existing.request_payload=v_request then return jsonb_build_object('companyId',p_company_id,'version',v_existing.governance_version,'replayed',true); end if; raise unique_violation using message='ENJAZ_GOVERNANCE_OPERATION_REUSED'; end if;
  insert into public.corporate_registry_states(workspace_id,company_id) values(p_workspace_id,p_company_id) on conflict do nothing;
  select * into v_state from public.corporate_registry_states where workspace_id=p_workspace_id and company_id=p_company_id for update;
  if p_expected_version<>v_state.beneficial_owner_version then raise serialization_failure using message='ENJAZ_BENEFICIAL_OWNER_STALE'; end if;
  if v_state.beneficial_owner_version>0 and p_effective_from<=v_state.last_beneficial_owner_effective_from then raise invalid_parameter_value using message='ENJAZ_BENEFICIAL_OWNER_EFFECTIVE_ORDER_INVALID'; end if;
  update public.corporate_beneficial_owners set effective_to=p_effective_from,ended_by_operation_id=p_operation_id where workspace_id=p_workspace_id and company_id=p_company_id and effective_to is null;
  for v_entry in select value from jsonb_array_elements(v_sorted) loop
    insert into public.corporate_beneficial_owners(workspace_id,company_id,contact_id,control_basis,percentage,effective_from,created_by,created_operation_id)
    values(p_workspace_id,p_company_id,(v_entry->>'contactId')::uuid,v_entry->>'basis',case when v_entry->>'percentage' is null then null else (v_entry->>'percentage')::numeric(9,6) end,p_effective_from,v_actor,p_operation_id);
  end loop;
  v_new_version:=v_state.beneficial_owner_version+1;
  update public.corporate_registry_states set beneficial_owner_version=v_new_version,last_beneficial_owner_effective_from=p_effective_from,updated_at=now() where workspace_id=p_workspace_id and company_id=p_company_id;
  insert into public.corporate_governance_events(workspace_id,company_id,event_type,effective_on,governance_version,actor_user_id,operation_id,request_payload,details) values(p_workspace_id,p_company_id,'beneficial_owner.snapshot',p_effective_from,v_new_version,v_actor,p_operation_id,v_request,jsonb_build_object('declarationCount',v_count));
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'corporate_beneficial_owner.snapshot_replaced','company',p_company_id,'Corporate beneficial-owner register changed',jsonb_build_object('version',v_new_version,'effectiveFrom',p_effective_from,'operationId',p_operation_id));
  return jsonb_build_object('companyId',p_company_id,'version',v_new_version,'effectiveFrom',p_effective_from,'replayed',false);
end; $$;

create or replace function public.replace_company_beneficial_owners_v1(p_workspace_id uuid,p_company_id uuid,p_expected_version integer,p_operation_id uuid,p_effective_from date,p_entries jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select private.replace_company_beneficial_owners_v1_impl(p_workspace_id,p_company_id,p_expected_version,p_operation_id,p_effective_from,p_entries); $$;

create or replace function private.grant_company_authority_v1_impl(
  p_workspace_id uuid,p_company_id uuid,p_expected_version integer,p_operation_id uuid,p_contact_id uuid,p_role text,p_scope text,p_powers jsonb,p_effective_from date,p_expires_on date
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_state public.corporate_registry_states%rowtype; v_existing public.corporate_governance_events%rowtype; v_powers jsonb; v_request jsonb; v_new_version int; v_grant_id uuid;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);
  if p_company_id is null or p_contact_id is null or p_operation_id is null or p_expected_version is null or p_expected_version<0 or p_effective_from is null or p_role not in ('director','manager','authorized_person') or p_scope not in ('full','limited','joint','custom') or p_powers is null or jsonb_typeof(p_powers)<>'array' or jsonb_array_length(p_powers)>40 or octet_length(p_powers::text)>8192 or (p_expires_on is not null and p_expires_on<=p_effective_from) then raise invalid_parameter_value using message='ENJAZ_AUTHORITY_INPUT_INVALID'; end if;
  if exists(select 1 from jsonb_array_elements(p_powers) e where jsonb_typeof(e.value)<>'string' or char_length(btrim(e.value#>>'{}')) not between 1 and 200) then raise invalid_parameter_value using message='ENJAZ_AUTHORITY_POWERS_INVALID'; end if;
  if not exists(select 1 from public.companies c where c.workspace_id=p_workspace_id and c.id=p_company_id and c.deleted_at is null) then raise no_data_found using message='ENJAZ_GOVERNANCE_COMPANY_NOT_FOUND'; end if;
  if not exists(select 1 from public.contacts c where c.workspace_id=p_workspace_id and c.id=p_contact_id and c.deleted_at is null and c.status='active') then raise no_data_found using message='ENJAZ_AUTHORITY_CONTACT_NOT_FOUND'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x),'[]'::jsonb) into v_powers from (select distinct btrim(value#>>'{}') x from jsonb_array_elements(p_powers)) q;
  v_request:=jsonb_build_object('contactId',p_contact_id,'role',p_role,'scope',p_scope,'powers',v_powers,'effectiveFrom',p_effective_from,'expiresOn',p_expires_on);
  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text),hashtext(p_company_id::text));
  select * into v_existing from public.corporate_governance_events where workspace_id=p_workspace_id and company_id=p_company_id and operation_id=p_operation_id limit 1;
  if found then if v_existing.event_type='authority.grant' and v_existing.request_payload=v_request then return jsonb_build_object('companyId',p_company_id,'version',v_existing.governance_version,'grantId',v_existing.details->>'grantId','replayed',true); end if; raise unique_violation using message='ENJAZ_GOVERNANCE_OPERATION_REUSED'; end if;
  insert into public.corporate_registry_states(workspace_id,company_id) values(p_workspace_id,p_company_id) on conflict do nothing;
  select * into v_state from public.corporate_registry_states where workspace_id=p_workspace_id and company_id=p_company_id for update;
  if p_expected_version<>v_state.authority_version then raise serialization_failure using message='ENJAZ_AUTHORITY_STALE'; end if;
  insert into public.corporate_authority_grants(workspace_id,company_id,contact_id,governance_role,authority_scope,powers,effective_from,effective_to,end_reason,created_by,created_operation_id)
  values(p_workspace_id,p_company_id,p_contact_id,p_role,p_scope,v_powers,p_effective_from,p_expires_on,case when p_expires_on is null then null else 'expiry' end,v_actor,p_operation_id) returning id into v_grant_id;
  v_new_version:=v_state.authority_version+1;
  update public.corporate_registry_states set authority_version=v_new_version,last_authority_effective_on=greatest(coalesce(last_authority_effective_on,p_effective_from),p_effective_from),updated_at=now() where workspace_id=p_workspace_id and company_id=p_company_id;
  insert into public.corporate_governance_events(workspace_id,company_id,event_type,effective_on,governance_version,actor_user_id,operation_id,request_payload,details) values(p_workspace_id,p_company_id,'authority.grant',p_effective_from,v_new_version,v_actor,p_operation_id,v_request,jsonb_build_object('grantId',v_grant_id));
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'corporate_authority.granted','company',p_company_id,'Corporate representation authority granted',jsonb_build_object('grantId',v_grant_id,'version',v_new_version,'operationId',p_operation_id));
  return jsonb_build_object('companyId',p_company_id,'version',v_new_version,'grantId',v_grant_id,'replayed',false);
end; $$;

create or replace function public.grant_company_authority_v1(p_workspace_id uuid,p_company_id uuid,p_expected_version integer,p_operation_id uuid,p_contact_id uuid,p_role text,p_scope text,p_powers jsonb,p_effective_from date,p_expires_on date default null)
returns jsonb language sql security invoker set search_path='' as $$ select private.grant_company_authority_v1_impl(p_workspace_id,p_company_id,p_expected_version,p_operation_id,p_contact_id,p_role,p_scope,p_powers,p_effective_from,p_expires_on); $$;

create or replace function private.revoke_company_authority_v1_impl(
  p_workspace_id uuid,p_company_id uuid,p_expected_version integer,p_operation_id uuid,p_grant_id uuid,p_effective_on date,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_state public.corporate_registry_states%rowtype; v_existing public.corporate_governance_events%rowtype; v_grant public.corporate_authority_grants%rowtype; v_request jsonb; v_new_version int;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);
  if p_company_id is null or p_grant_id is null or p_operation_id is null or p_expected_version is null or p_expected_version<0 or p_effective_on is null or p_reason is null or char_length(btrim(p_reason)) not between 1 and 1000 then raise invalid_parameter_value using message='ENJAZ_AUTHORITY_REVOKE_INPUT_INVALID'; end if;
  v_request:=jsonb_build_object('grantId',p_grant_id,'effectiveOn',p_effective_on,'reason',btrim(p_reason));
  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text),hashtext(p_company_id::text));
  select * into v_existing from public.corporate_governance_events where workspace_id=p_workspace_id and company_id=p_company_id and operation_id=p_operation_id limit 1;
  if found then if v_existing.event_type='authority.revoke' and v_existing.request_payload=v_request then return jsonb_build_object('companyId',p_company_id,'version',v_existing.governance_version,'grantId',p_grant_id,'replayed',true); end if; raise unique_violation using message='ENJAZ_GOVERNANCE_OPERATION_REUSED'; end if;
  insert into public.corporate_registry_states(workspace_id,company_id) values(p_workspace_id,p_company_id) on conflict do nothing;
  select * into v_state from public.corporate_registry_states where workspace_id=p_workspace_id and company_id=p_company_id for update;
  if p_expected_version<>v_state.authority_version then raise serialization_failure using message='ENJAZ_AUTHORITY_STALE'; end if;
  select * into v_grant from public.corporate_authority_grants where workspace_id=p_workspace_id and company_id=p_company_id and id=p_grant_id for update;
  if not found then raise no_data_found using message='ENJAZ_AUTHORITY_GRANT_NOT_FOUND'; end if;
  if p_effective_on<=v_grant.effective_from or (v_grant.effective_to is not null and p_effective_on>=v_grant.effective_to) then raise invalid_parameter_value using message='ENJAZ_AUTHORITY_REVOKE_DATE_INVALID'; end if;
  update public.corporate_authority_grants set effective_to=p_effective_on,end_reason='revoked',revocation_reason=btrim(p_reason),ended_by_operation_id=p_operation_id where workspace_id=p_workspace_id and id=p_grant_id;
  v_new_version:=v_state.authority_version+1;
  update public.corporate_registry_states set authority_version=v_new_version,last_authority_effective_on=greatest(coalesce(last_authority_effective_on,p_effective_on),p_effective_on),updated_at=now() where workspace_id=p_workspace_id and company_id=p_company_id;
  insert into public.corporate_governance_events(workspace_id,company_id,event_type,effective_on,governance_version,actor_user_id,operation_id,request_payload,details) values(p_workspace_id,p_company_id,'authority.revoke',p_effective_on,v_new_version,v_actor,p_operation_id,v_request,jsonb_build_object('grantId',p_grant_id));
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'corporate_authority.revoked','company',p_company_id,'Corporate representation authority revoked',jsonb_build_object('grantId',p_grant_id,'version',v_new_version,'operationId',p_operation_id));
  return jsonb_build_object('companyId',p_company_id,'version',v_new_version,'grantId',p_grant_id,'replayed',false);
end; $$;

create or replace function public.revoke_company_authority_v1(p_workspace_id uuid,p_company_id uuid,p_expected_version integer,p_operation_id uuid,p_grant_id uuid,p_effective_on date,p_reason text)
returns jsonb language sql security invoker set search_path='' as $$ select private.revoke_company_authority_v1_impl(p_workspace_id,p_company_id,p_expected_version,p_operation_id,p_grant_id,p_effective_on,p_reason); $$;

create or replace function private.record_company_resolution_v1_impl(
  p_workspace_id uuid,p_company_id uuid,p_expected_version integer,p_operation_id uuid,p_resolution_number text,p_title text,p_resolution_type text,p_effective_on date,p_notes text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_state public.corporate_registry_states%rowtype; v_existing public.corporate_governance_events%rowtype; v_request jsonb; v_new_version int; v_id uuid;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);
  if p_company_id is null or p_operation_id is null or p_expected_version is null or p_expected_version<0 or p_effective_on is null or p_title is null or char_length(btrim(p_title)) not between 1 and 400 or p_resolution_type not in ('appointment','removal','ownership','capital','authorization','general','other') or (p_resolution_number is not null and char_length(btrim(p_resolution_number)) not between 1 and 120) or (p_notes is not null and char_length(p_notes)>4000) then raise invalid_parameter_value using message='ENJAZ_RESOLUTION_INPUT_INVALID'; end if;
  if not exists(select 1 from public.companies c where c.workspace_id=p_workspace_id and c.id=p_company_id and c.deleted_at is null) then raise no_data_found using message='ENJAZ_GOVERNANCE_COMPANY_NOT_FOUND'; end if;
  v_request:=jsonb_build_object('number',case when p_resolution_number is null then null else btrim(p_resolution_number) end,'title',btrim(p_title),'type',p_resolution_type,'effectiveOn',p_effective_on,'notes',p_notes);
  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text),hashtext(p_company_id::text));
  select * into v_existing from public.corporate_governance_events where workspace_id=p_workspace_id and company_id=p_company_id and operation_id=p_operation_id limit 1;
  if found then if v_existing.event_type='resolution.record' and v_existing.request_payload=v_request then return jsonb_build_object('companyId',p_company_id,'version',v_existing.governance_version,'resolutionId',v_existing.details->>'resolutionId','replayed',true); end if; raise unique_violation using message='ENJAZ_GOVERNANCE_OPERATION_REUSED'; end if;
  insert into public.corporate_registry_states(workspace_id,company_id) values(p_workspace_id,p_company_id) on conflict do nothing;
  select * into v_state from public.corporate_registry_states where workspace_id=p_workspace_id and company_id=p_company_id for update;
  if p_expected_version<>v_state.resolution_version then raise serialization_failure using message='ENJAZ_RESOLUTION_STALE'; end if;
  insert into public.corporate_resolutions(workspace_id,company_id,resolution_number,title,resolution_type,effective_on,notes,actor_user_id,operation_id) values(p_workspace_id,p_company_id,case when p_resolution_number is null then null else btrim(p_resolution_number) end,btrim(p_title),p_resolution_type,p_effective_on,p_notes,v_actor,p_operation_id) returning id into v_id;
  v_new_version:=v_state.resolution_version+1;
  update public.corporate_registry_states set resolution_version=v_new_version,last_resolution_effective_on=greatest(coalesce(last_resolution_effective_on,p_effective_on),p_effective_on),updated_at=now() where workspace_id=p_workspace_id and company_id=p_company_id;
  insert into public.corporate_governance_events(workspace_id,company_id,event_type,effective_on,governance_version,actor_user_id,operation_id,request_payload,details) values(p_workspace_id,p_company_id,'resolution.record',p_effective_on,v_new_version,v_actor,p_operation_id,v_request,jsonb_build_object('resolutionId',v_id));
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'corporate_resolution.recorded','company',p_company_id,'Corporate resolution recorded',jsonb_build_object('resolutionId',v_id,'version',v_new_version,'operationId',p_operation_id));
  return jsonb_build_object('companyId',p_company_id,'version',v_new_version,'resolutionId',v_id,'replayed',false);
end; $$;

create or replace function public.record_company_resolution_v1(p_workspace_id uuid,p_company_id uuid,p_expected_version integer,p_operation_id uuid,p_resolution_number text,p_title text,p_resolution_type text,p_effective_on date,p_notes text default null)
returns jsonb language sql security invoker set search_path='' as $$ select private.record_company_resolution_v1_impl(p_workspace_id,p_company_id,p_expected_version,p_operation_id,p_resolution_number,p_title,p_resolution_type,p_effective_on,p_notes); $$;

create or replace function private.record_company_capital_event_v1_impl(
  p_workspace_id uuid,p_company_id uuid,p_expected_version integer,p_operation_id uuid,p_change_type text,p_amount_after text,p_effective_on date,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_state public.corporate_registry_states%rowtype; v_existing public.corporate_governance_events%rowtype; v_before numeric; v_after numeric(18,2); v_request jsonb; v_new_version int;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);
  if p_company_id is null or p_operation_id is null or p_expected_version is null or p_expected_version<0 or p_effective_on is null or p_change_type not in ('set','increase','decrease','correction') or p_amount_after is null or p_amount_after !~ '^(?:0|[1-9][0-9]{0,15})(?:\.[0-9]{1,2})?$' or p_reason is null or char_length(btrim(p_reason)) not between 1 and 1000 then raise invalid_parameter_value using message='ENJAZ_CAPITAL_INPUT_INVALID'; end if;
  v_after:=p_amount_after::numeric(18,2);
  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text),hashtext(p_company_id::text));
  select * into v_existing from public.corporate_governance_events where workspace_id=p_workspace_id and company_id=p_company_id and operation_id=p_operation_id limit 1;
  v_request:=jsonb_build_object('changeType',p_change_type,'amountAfter',trim(trailing '.' from trim(trailing '0' from to_char(v_after,'FM9999999999999990.00'))),'effectiveOn',p_effective_on,'reason',btrim(p_reason));
  if found then if v_existing.event_type='capital.change' and v_existing.request_payload=v_request then return jsonb_build_object('companyId',p_company_id,'version',v_existing.governance_version,'capital',v_existing.details->>'amountAfter','replayed',true); end if; raise unique_violation using message='ENJAZ_GOVERNANCE_OPERATION_REUSED'; end if;
  select c.capital into v_before from public.companies c where c.workspace_id=p_workspace_id and c.id=p_company_id and c.deleted_at is null for update;
  if not found then raise no_data_found using message='ENJAZ_GOVERNANCE_COMPANY_NOT_FOUND'; end if;
  if v_before is not null and (v_before>9999999999999999.99::numeric or scale(v_before)>2) then raise numeric_value_out_of_range using message='ENJAZ_CAPITAL_CURRENT_UNSAFE'; end if;
  if p_change_type='increase' and (v_before is null or v_after<=v_before) then raise check_violation using message='ENJAZ_CAPITAL_DIRECTION_INVALID'; end if;
  if p_change_type='decrease' and (v_before is null or v_after>=v_before) then raise check_violation using message='ENJAZ_CAPITAL_DIRECTION_INVALID'; end if;
  if p_change_type='correction' and (v_before is null or v_after=v_before) then raise check_violation using message='ENJAZ_CAPITAL_DIRECTION_INVALID'; end if;
  insert into public.corporate_registry_states(workspace_id,company_id) values(p_workspace_id,p_company_id) on conflict do nothing;
  select * into v_state from public.corporate_registry_states where workspace_id=p_workspace_id and company_id=p_company_id for update;
  if p_expected_version<>v_state.capital_version then raise serialization_failure using message='ENJAZ_CAPITAL_STALE'; end if;
  if v_state.capital_version>0 and p_effective_on<=v_state.last_capital_effective_on then raise invalid_parameter_value using message='ENJAZ_CAPITAL_EFFECTIVE_ORDER_INVALID'; end if;
  perform set_config('enjaz.governance_capital_write','allowed',true);
  update public.companies set capital=v_after,updated_at=now() where workspace_id=p_workspace_id and id=p_company_id;
  perform set_config('enjaz.governance_capital_write','',true);
  insert into public.corporate_capital_events(workspace_id,company_id,change_type,amount_before,amount_after,effective_on,reason,actor_user_id,operation_id) values(p_workspace_id,p_company_id,p_change_type,v_before,v_after,p_effective_on,btrim(p_reason),v_actor,p_operation_id);
  v_new_version:=v_state.capital_version+1;
  update public.corporate_registry_states set capital_version=v_new_version,last_capital_effective_on=p_effective_on,updated_at=now() where workspace_id=p_workspace_id and company_id=p_company_id;
  insert into public.corporate_governance_events(workspace_id,company_id,event_type,effective_on,governance_version,actor_user_id,operation_id,request_payload,details) values(p_workspace_id,p_company_id,'capital.change',p_effective_on,v_new_version,v_actor,p_operation_id,v_request,jsonb_build_object('amountBefore',case when v_before is null then null else trim(trailing '.' from trim(trailing '0' from to_char(v_before,'FM9999999999999990.00'))) end,'amountAfter',trim(trailing '.' from trim(trailing '0' from to_char(v_after,'FM9999999999999990.00')))));
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'corporate_capital.changed','company',p_company_id,'Company capital changed through governance',jsonb_build_object('version',v_new_version,'effectiveOn',p_effective_on,'operationId',p_operation_id));
  return jsonb_build_object('companyId',p_company_id,'version',v_new_version,'capital',trim(trailing '.' from trim(trailing '0' from to_char(v_after,'FM9999999999999990.00'))),'replayed',false);
exception when others then
  perform set_config('enjaz.governance_capital_write','',true);
  raise;
end; $$;

create or replace function public.record_company_capital_event_v1(p_workspace_id uuid,p_company_id uuid,p_expected_version integer,p_operation_id uuid,p_change_type text,p_amount_after text,p_effective_on date,p_reason text)
returns jsonb language sql security invoker set search_path='' as $$ select private.record_company_capital_event_v1_impl(p_workspace_id,p_company_id,p_expected_version,p_operation_id,p_change_type,p_amount_after,p_effective_on,p_reason); $$;

create or replace function private.get_company_governance_context_v1_impl(p_workspace_id uuid,p_company_id uuid,p_as_of date)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_actor uuid; v_as_of date:=coalesce(p_as_of,current_date); v_company public.companies%rowtype; v_state public.corporate_registry_states%rowtype;
  v_ownership jsonb; v_beneficial jsonb; v_authorities jsonb; v_resolutions jsonb; v_timeline jsonb; v_risks jsonb:='[]'::jsonb; v_capital_event public.corporate_capital_events%rowtype; v_capital jsonb; v_owner boolean;
begin
  v_actor:=private.require_organization_actor_v1(p_workspace_id); v_owner:=private.is_organization_owner_v1(p_workspace_id);
  select * into v_company from public.companies where workspace_id=p_workspace_id and id=p_company_id and deleted_at is null;
  if not found then raise no_data_found using message='ENJAZ_GOVERNANCE_COMPANY_NOT_FOUND'; end if;
  select * into v_state from public.corporate_registry_states where workspace_id=p_workspace_id and company_id=p_company_id;
  v_ownership:=private.get_company_ownership_snapshot_v1_impl(p_workspace_id,p_company_id,v_as_of);
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'contactId',b.contact_id,'displayName',c.display_name,'basis',b.control_basis,'percentage',case when b.percentage is null then null else trim(trailing '.' from trim(trailing '0' from to_char(b.percentage,'FM990.000000'))) end,'effectiveFrom',b.effective_from,'effectiveTo',b.effective_to) order by c.display_name,b.control_basis),'[]'::jsonb) into v_beneficial
  from public.corporate_beneficial_owners b join public.contacts c on c.workspace_id=b.workspace_id and c.id=b.contact_id
  where b.workspace_id=p_workspace_id and b.company_id=p_company_id and b.effective_from<=v_as_of and (b.effective_to is null or v_as_of<b.effective_to);
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'contactId',a.contact_id,'displayName',c.display_name,'role',a.governance_role,'scope',a.authority_scope,'powers',a.powers,'effectiveFrom',a.effective_from,'effectiveTo',a.effective_to,'endReason',a.end_reason) order by a.governance_role,c.display_name),'[]'::jsonb) into v_authorities
  from public.corporate_authority_grants a join public.contacts c on c.workspace_id=a.workspace_id and c.id=a.contact_id
  where a.workspace_id=p_workspace_id and a.company_id=p_company_id and a.effective_from<=v_as_of and (a.effective_to is null or v_as_of<a.effective_to);
  select coalesce(jsonb_agg(x.obj order by x.effective_on desc,x.created_at desc),'[]'::jsonb) into v_resolutions from (
    select r.effective_on,r.created_at,jsonb_build_object('id',r.id,'number',r.resolution_number,'title',r.title,'type',r.resolution_type,'effectiveOn',r.effective_on,'notes',r.notes) obj
    from public.corporate_resolutions r where r.workspace_id=p_workspace_id and r.company_id=p_company_id and r.effective_on<=v_as_of order by r.effective_on desc,r.created_at desc limit 50
  ) x;
  select * into v_capital_event from public.corporate_capital_events where workspace_id=p_workspace_id and company_id=p_company_id and effective_on<=v_as_of order by effective_on desc,created_at desc limit 1;
  if found then v_capital:=jsonb_build_object('known',true,'amount',trim(trailing '.' from trim(trailing '0' from to_char(v_capital_event.amount_after,'FM9999999999999990.00'))),'source','governance_history','effectiveOn',v_capital_event.effective_on,'version',coalesce(v_state.capital_version,0));
  elsif v_as_of=current_date then v_capital:=jsonb_build_object('known',v_company.capital is not null,'amount',case when v_company.capital is null then null else v_company.capital::text end,'source','company_core_current','effectiveOn',null,'version',coalesce(v_state.capital_version,0));
  else v_capital:=jsonb_build_object('known',false,'amount',null,'source','unknown_before_governance_history','effectiveOn',null,'version',coalesce(v_state.capital_version,0)); end if;
  select coalesce(jsonb_agg(x.obj order by x.effective_on desc,x.occurred_at desc),'[]'::jsonb) into v_timeline from (
    select e.effective_on,e.occurred_at,jsonb_build_object('id',e.id,'type',e.event_type,'effectiveOn',e.effective_on,'version',e.governance_version,'details',e.details,'occurredAt',e.occurred_at) obj
    from public.corporate_governance_events e where e.workspace_id=p_workspace_id and e.company_id=p_company_id and e.effective_on<=v_as_of order by e.effective_on desc,e.occurred_at desc limit 100
  ) x;
  if coalesce((v_ownership->>'configured')::boolean,false)=false then v_risks:=v_risks||jsonb_build_array(jsonb_build_object('code','OWNERSHIP_NOT_CONFIGURED','severity','high','message','Ownership register is not configured')); end if;
  if jsonb_array_length(v_beneficial)=0 then v_risks:=v_risks||jsonb_build_array(jsonb_build_object('code','BENEFICIAL_OWNER_MISSING','severity','high','message','No active beneficial owner declaration')); end if;
  if not exists(select 1 from jsonb_array_elements(v_authorities) x where x->>'role' in ('manager','authorized_person')) then v_risks:=v_risks||jsonb_build_array(jsonb_build_object('code','REPRESENTATION_AUTHORITY_MISSING','severity','medium','message','No active manager or authorized person')); end if;
  if exists(select 1 from public.corporate_authority_grants a where a.workspace_id=p_workspace_id and a.company_id=p_company_id and a.effective_to>v_as_of and a.effective_to<=v_as_of+30 and a.end_reason='expiry') then v_risks:=v_risks||jsonb_build_array(jsonb_build_object('code','AUTHORITY_EXPIRING','severity','medium','message','An authority grant expires within 30 days')); end if;
  return jsonb_build_object('schema','enjaz.governance-context.v1','companyId',p_company_id,'asOf',v_as_of,'canMutate',v_owner,'versions',jsonb_build_object('ownership',coalesce((v_ownership->>'version')::int,0),'beneficialOwners',coalesce(v_state.beneficial_owner_version,0),'authority',coalesce(v_state.authority_version,0),'resolutions',coalesce(v_state.resolution_version,0),'capital',coalesce(v_state.capital_version,0)),'ownership',v_ownership,'beneficialOwners',v_beneficial,'authorities',v_authorities,'resolutions',v_resolutions,'capital',v_capital,'timeline',v_timeline,'risks',v_risks);
end; $$;

create or replace function public.get_company_governance_context_v1(p_workspace_id uuid,p_company_id uuid,p_as_of date default null)
returns jsonb language sql stable security invoker set search_path='' as $$ select private.get_company_governance_context_v1_impl(p_workspace_id,p_company_id,p_as_of); $$;

revoke execute on function private.reject_beneficial_owner_overlap_v1() from public,anon,authenticated;
revoke execute on function private.reject_authority_overlap_v1() from public,anon,authenticated;
revoke execute on function private.guard_governed_company_capital_v1() from public,anon,authenticated;
revoke execute on function private.replace_company_beneficial_owners_v1_impl(uuid,uuid,integer,uuid,date,jsonb) from public,anon,authenticated;
revoke execute on function private.grant_company_authority_v1_impl(uuid,uuid,integer,uuid,uuid,text,text,jsonb,date,date) from public,anon,authenticated;
revoke execute on function private.revoke_company_authority_v1_impl(uuid,uuid,integer,uuid,uuid,date,text) from public,anon,authenticated;
revoke execute on function private.record_company_resolution_v1_impl(uuid,uuid,integer,uuid,text,text,text,date,text) from public,anon,authenticated;
revoke execute on function private.record_company_capital_event_v1_impl(uuid,uuid,integer,uuid,text,text,date,text) from public,anon,authenticated;
revoke execute on function private.get_company_governance_context_v1_impl(uuid,uuid,date) from public,anon,authenticated;

grant execute on function private.replace_company_beneficial_owners_v1_impl(uuid,uuid,integer,uuid,date,jsonb) to authenticated;
grant execute on function private.grant_company_authority_v1_impl(uuid,uuid,integer,uuid,uuid,text,text,jsonb,date,date) to authenticated;
grant execute on function private.revoke_company_authority_v1_impl(uuid,uuid,integer,uuid,uuid,date,text) to authenticated;
grant execute on function private.record_company_resolution_v1_impl(uuid,uuid,integer,uuid,text,text,text,date,text) to authenticated;
grant execute on function private.record_company_capital_event_v1_impl(uuid,uuid,integer,uuid,text,text,date,text) to authenticated;
grant execute on function private.get_company_governance_context_v1_impl(uuid,uuid,date) to authenticated;

revoke execute on function public.replace_company_beneficial_owners_v1(uuid,uuid,integer,uuid,date,jsonb) from public,anon,authenticated;
revoke execute on function public.grant_company_authority_v1(uuid,uuid,integer,uuid,uuid,text,text,jsonb,date,date) from public,anon,authenticated;
revoke execute on function public.revoke_company_authority_v1(uuid,uuid,integer,uuid,uuid,date,text) from public,anon,authenticated;
revoke execute on function public.record_company_resolution_v1(uuid,uuid,integer,uuid,text,text,text,date,text) from public,anon,authenticated;
revoke execute on function public.record_company_capital_event_v1(uuid,uuid,integer,uuid,text,text,date,text) from public,anon,authenticated;
revoke execute on function public.get_company_governance_context_v1(uuid,uuid,date) from public,anon,authenticated;
grant execute on function public.replace_company_beneficial_owners_v1(uuid,uuid,integer,uuid,date,jsonb) to authenticated;
grant execute on function public.grant_company_authority_v1(uuid,uuid,integer,uuid,uuid,text,text,jsonb,date,date) to authenticated;
grant execute on function public.revoke_company_authority_v1(uuid,uuid,integer,uuid,uuid,date,text) to authenticated;
grant execute on function public.record_company_resolution_v1(uuid,uuid,integer,uuid,text,text,text,date,text) to authenticated;
grant execute on function public.record_company_capital_event_v1(uuid,uuid,integer,uuid,text,text,date,text) to authenticated;
grant execute on function public.get_company_governance_context_v1(uuid,uuid,date) to authenticated;

comment on trigger companies_governed_capital_guard on public.companies is 'Phase 9.3: capital changes must pass the audited governance command; unchanged capital in ordinary company edits remains allowed.';
comment on table public.corporate_registry_states is 'M2 per-company optimistic versions for beneficial-owner, authority, resolution and capital registries.';

commit;
