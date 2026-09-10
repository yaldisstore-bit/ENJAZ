begin;

-- Phase 9.3 / M2 — authoritative corporate ownership persistence foundation.
-- Existing companies/contacts remain the only party identity sources.
-- Browser roles receive SELECT only; sensitive ownership changes are RPC-bound.

create table public.corporate_ownership_states (
  workspace_id uuid not null,
  company_id uuid not null,
  ownership_version integer not null default 0,
  last_effective_from date,
  last_operation_id uuid,
  updated_at timestamptz not null default now(),
  constraint corporate_ownership_states_pkey primary key (workspace_id, company_id),
  constraint corporate_ownership_states_company_fk foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on update cascade on delete restrict,
  constraint corporate_ownership_states_version_check check (ownership_version >= 0),
  constraint corporate_ownership_states_version_date_check check (
    (ownership_version = 0 and last_effective_from is null and last_operation_id is null)
    or (ownership_version > 0 and last_effective_from is not null and last_operation_id is not null)
  )
);

create table public.corporate_ownership_stakes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  company_id uuid not null,
  holder_kind text not null,
  holder_contact_id uuid,
  holder_company_id uuid,
  ownership_role text not null,
  percentage numeric(9,6) not null,
  effective_from date not null,
  effective_to date,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_operation_id uuid not null,
  ended_by_operation_id uuid,
  created_at timestamptz not null default now(),
  constraint corporate_ownership_stakes_workspace_id_id_key unique(workspace_id,id),
  constraint corporate_ownership_stakes_company_fk foreign key(workspace_id,company_id)
    references public.companies(workspace_id,id) on update cascade on delete restrict,
  constraint corporate_ownership_stakes_contact_fk foreign key(workspace_id,holder_contact_id)
    references public.contacts(workspace_id,id) on update cascade on delete restrict,
  constraint corporate_ownership_stakes_holder_company_fk foreign key(workspace_id,holder_company_id)
    references public.companies(workspace_id,id) on update cascade on delete restrict,
  constraint corporate_ownership_stakes_holder_kind_check check(holder_kind in ('person','company')),
  constraint corporate_ownership_stakes_role_check check(ownership_role in ('shareholder','partner')),
  constraint corporate_ownership_stakes_percentage_check check(percentage > 0 and percentage <= 100),
  constraint corporate_ownership_stakes_effective_check check(effective_to is null or effective_to > effective_from),
  constraint corporate_ownership_stakes_holder_shape_check check(
    (holder_kind='person' and holder_contact_id is not null and holder_company_id is null)
    or (holder_kind='company' and holder_contact_id is null and holder_company_id is not null)
  ),
  constraint corporate_ownership_stakes_end_operation_check check(
    (effective_to is null and ended_by_operation_id is null)
    or (effective_to is not null and ended_by_operation_id is not null)
  )
);

create table public.corporate_governance_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  company_id uuid not null,
  event_type text not null,
  effective_on date not null,
  governance_version integer not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  operation_id uuid not null,
  request_payload jsonb not null,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint corporate_governance_events_workspace_id_id_key unique(workspace_id,id),
  constraint corporate_governance_events_company_fk foreign key(workspace_id,company_id)
    references public.companies(workspace_id,id) on update cascade on delete restrict,
  constraint corporate_governance_events_operation_key unique(workspace_id,company_id,operation_id),
  constraint corporate_governance_events_type_check check(event_type in ('ownership.snapshot')),
  constraint corporate_governance_events_version_check check(governance_version > 0),
  constraint corporate_governance_events_payload_check check(jsonb_typeof(request_payload)='object' and octet_length(request_payload::text)<=32768),
  constraint corporate_governance_events_details_check check(jsonb_typeof(details)='object' and octet_length(details::text)<=32768)
);

create index corporate_ownership_stakes_company_asof_idx
  on public.corporate_ownership_stakes(workspace_id,company_id,effective_from,effective_to);
create index corporate_ownership_stakes_person_history_idx
  on public.corporate_ownership_stakes(workspace_id,holder_contact_id,effective_from desc)
  where holder_kind='person';
create index corporate_ownership_stakes_company_holder_history_idx
  on public.corporate_ownership_stakes(workspace_id,holder_company_id,effective_from desc)
  where holder_kind='company';
create index corporate_governance_events_timeline_idx
  on public.corporate_governance_events(workspace_id,company_id,effective_on desc,occurred_at desc,id);

alter table public.corporate_ownership_states enable row level security;
alter table public.corporate_ownership_stakes enable row level security;
alter table public.corporate_governance_events enable row level security;

create or replace function private.can_read_corporate_governance_v1(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select (select auth.uid()) is not null
    and (
      private.is_organization_owner_v1(p_workspace_id)
      or private.current_organization_member_id_v1(p_workspace_id) is not null
    );
$$;

create policy corporate_ownership_states_select_authorized
on public.corporate_ownership_states for select to authenticated
using (private.can_read_corporate_governance_v1(workspace_id));

create policy corporate_ownership_stakes_select_authorized
on public.corporate_ownership_stakes for select to authenticated
using (private.can_read_corporate_governance_v1(workspace_id));

create policy corporate_governance_events_select_authorized
on public.corporate_governance_events for select to authenticated
using (private.can_read_corporate_governance_v1(workspace_id));

revoke all on table public.corporate_ownership_states from anon,authenticated;
revoke all on table public.corporate_ownership_stakes from anon,authenticated;
revoke all on table public.corporate_governance_events from anon,authenticated;
grant select on table public.corporate_ownership_states to authenticated;
grant select on table public.corporate_ownership_stakes to authenticated;
grant select on table public.corporate_governance_events to authenticated;

create or replace function private.reject_corporate_ownership_overlap_v1()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if exists(
    select 1
    from public.corporate_ownership_stakes s
    where s.workspace_id=new.workspace_id
      and s.company_id=new.company_id
      and s.ownership_role=new.ownership_role
      and s.holder_kind=new.holder_kind
      and s.id<>new.id
      and (
        (new.holder_kind='person' and s.holder_contact_id=new.holder_contact_id)
        or (new.holder_kind='company' and s.holder_company_id=new.holder_company_id)
      )
      and daterange(s.effective_from,s.effective_to,'[)') && daterange(new.effective_from,new.effective_to,'[)')
  ) then
    raise exclusion_violation using message='ENJAZ_OWNERSHIP_PERIOD_CONFLICT';
  end if;
  return new;
end;
$$;

create trigger corporate_ownership_stakes_overlap_guard
before insert or update of workspace_id,company_id,holder_kind,holder_contact_id,holder_company_id,ownership_role,effective_from,effective_to
on public.corporate_ownership_stakes
for each row execute function private.reject_corporate_ownership_overlap_v1();

create or replace function private.replace_company_ownership_snapshot_v1_impl(
  p_workspace_id uuid,
  p_company_id uuid,
  p_expected_version integer,
  p_operation_id uuid,
  p_effective_from date,
  p_entries jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_state public.corporate_ownership_states%rowtype;
  v_existing public.corporate_governance_events%rowtype;
  v_entry jsonb;
  v_kind text;
  v_id uuid;
  v_role text;
  v_percentage_text text;
  v_percentage numeric(9,6);
  v_total numeric(12,6):=0;
  v_normalized jsonb:='[]'::jsonb;
  v_sorted jsonb:='[]'::jsonb;
  v_request jsonb;
  v_seen text[]:=array[]::text[];
  v_key text;
  v_count integer;
  v_new_version integer;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);

  if p_company_id is null or p_operation_id is null or p_effective_from is null
     or p_expected_version is null or p_expected_version<0
     or p_entries is null or jsonb_typeof(p_entries)<>'array' then
    raise invalid_parameter_value using message='ENJAZ_OWNERSHIP_INPUT_INVALID';
  end if;

  v_count:=jsonb_array_length(p_entries);
  if v_count<1 or v_count>100 or octet_length(p_entries::text)>32768 then
    raise invalid_parameter_value using message='ENJAZ_OWNERSHIP_ENTRIES_INVALID';
  end if;

  if not exists(
    select 1 from public.companies c
    where c.workspace_id=p_workspace_id and c.id=p_company_id and c.deleted_at is null
  ) then
    raise no_data_found using message='ENJAZ_OWNERSHIP_COMPANY_NOT_FOUND';
  end if;

  for v_entry in select value from jsonb_array_elements(p_entries)
  loop
    if jsonb_typeof(v_entry)<>'object'
       or (select count(*) from jsonb_object_keys(v_entry))<>4
       or not (v_entry ?& array['kind','id','role','percentage']) then
      raise invalid_parameter_value using message='ENJAZ_OWNERSHIP_ENTRY_SHAPE_INVALID';
    end if;

    v_kind:=v_entry->>'kind';
    v_role:=v_entry->>'role';
    v_percentage_text:=v_entry->>'percentage';

    if v_kind not in ('person','company') or v_role not in ('shareholder','partner') then
      raise invalid_parameter_value using message='ENJAZ_OWNERSHIP_ENTRY_ENUM_INVALID';
    end if;
    if v_percentage_text is null
       or v_percentage_text !~ '^(?:0|[1-9][0-9]{0,2})(?:\.[0-9]{1,6})?$' then
      raise invalid_parameter_value using message='ENJAZ_OWNERSHIP_PERCENTAGE_INVALID';
    end if;

    begin
      v_id:=(v_entry->>'id')::uuid;
      v_percentage:=v_percentage_text::numeric(9,6);
    exception when others then
      raise invalid_parameter_value using message='ENJAZ_OWNERSHIP_ENTRY_VALUE_INVALID';
    end;

    if v_percentage<=0 or v_percentage>100 then
      raise invalid_parameter_value using message='ENJAZ_OWNERSHIP_PERCENTAGE_INVALID';
    end if;

    if v_kind='person' then
      if not exists(
        select 1 from public.contacts p
        where p.workspace_id=p_workspace_id and p.id=v_id and p.deleted_at is null
      ) then
        raise no_data_found using message='ENJAZ_OWNERSHIP_PERSON_NOT_FOUND';
      end if;
    else
      if not exists(
        select 1 from public.companies c
        where c.workspace_id=p_workspace_id and c.id=v_id and c.deleted_at is null
      ) then
        raise no_data_found using message='ENJAZ_OWNERSHIP_HOLDER_COMPANY_NOT_FOUND';
      end if;
    end if;

    v_key:=v_kind||':'||v_id::text||':'||v_role;
    if v_key=any(v_seen) then
      raise unique_violation using message='ENJAZ_OWNERSHIP_DUPLICATE_HOLDER';
    end if;
    v_seen:=array_append(v_seen,v_key);
    v_total:=v_total+v_percentage;
    if v_total>100 then
      raise check_violation using message='ENJAZ_OWNERSHIP_TOTAL_EXCEEDS_100';
    end if;

    v_normalized:=v_normalized||jsonb_build_array(jsonb_build_object(
      'kind',v_kind,
      'id',v_id::text,
      'role',v_role,
      'percentage',trim(trailing '.' from trim(trailing '0' from to_char(v_percentage,'FM990.000000')))
    ));
  end loop;

  if v_total<>100.000000::numeric then
    raise check_violation using message='ENJAZ_OWNERSHIP_TOTAL_MUST_EQUAL_100';
  end if;

  select coalesce(jsonb_agg(value order by value->>'kind',value->>'id',value->>'role'),'[]'::jsonb)
    into v_sorted
  from jsonb_array_elements(v_normalized);

  v_request:=jsonb_build_object(
    'effectiveFrom',p_effective_from,
    'entries',v_sorted
  );

  -- Serialize all ownership transitions for one company to eliminate concurrent
  -- snapshot races without requiring the btree_gist extension.
  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text),hashtext(p_company_id::text));

  select * into v_existing
  from public.corporate_governance_events e
  where e.workspace_id=p_workspace_id
    and e.company_id=p_company_id
    and e.operation_id=p_operation_id
  limit 1;

  if found then
    if v_existing.event_type='ownership.snapshot'
       and v_existing.effective_on=p_effective_from
       and v_existing.request_payload=v_request then
      return jsonb_build_object(
        'companyId',p_company_id,
        'version',v_existing.governance_version,
        'effectiveFrom',p_effective_from,
        'replayed',true
      );
    end if;
    raise unique_violation using message='ENJAZ_OWNERSHIP_OPERATION_REUSED';
  end if;

  insert into public.corporate_ownership_states(workspace_id,company_id)
  values(p_workspace_id,p_company_id)
  on conflict(workspace_id,company_id) do nothing;

  select * into v_state
  from public.corporate_ownership_states s
  where s.workspace_id=p_workspace_id and s.company_id=p_company_id
  for update;

  if p_expected_version<>v_state.ownership_version then
    raise serialization_failure using message='ENJAZ_OWNERSHIP_STALE';
  end if;
  if v_state.ownership_version>0 and p_effective_from<=v_state.last_effective_from then
    raise invalid_parameter_value using message='ENJAZ_OWNERSHIP_EFFECTIVE_ORDER_INVALID';
  end if;

  update public.corporate_ownership_stakes
  set effective_to=p_effective_from,
      ended_by_operation_id=p_operation_id
  where workspace_id=p_workspace_id
    and company_id=p_company_id
    and effective_to is null;

  for v_entry in select value from jsonb_array_elements(v_sorted)
  loop
    v_kind:=v_entry->>'kind';
    v_role:=v_entry->>'role';
    v_id:=(v_entry->>'id')::uuid;
    v_percentage:=(v_entry->>'percentage')::numeric(9,6);

    insert into public.corporate_ownership_stakes(
      workspace_id,company_id,holder_kind,holder_contact_id,holder_company_id,
      ownership_role,percentage,effective_from,created_by,created_operation_id
    ) values(
      p_workspace_id,p_company_id,v_kind,
      case when v_kind='person' then v_id else null end,
      case when v_kind='company' then v_id else null end,
      v_role,v_percentage,p_effective_from,v_actor,p_operation_id
    );
  end loop;

  v_new_version:=v_state.ownership_version+1;
  update public.corporate_ownership_states
  set ownership_version=v_new_version,
      last_effective_from=p_effective_from,
      last_operation_id=p_operation_id,
      updated_at=now()
  where workspace_id=p_workspace_id and company_id=p_company_id;

  insert into public.corporate_governance_events(
    workspace_id,company_id,event_type,effective_on,governance_version,
    actor_user_id,operation_id,request_payload,details
  ) values(
    p_workspace_id,p_company_id,'ownership.snapshot',p_effective_from,v_new_version,
    v_actor,p_operation_id,v_request,
    jsonb_build_object('stakeCount',v_count,'totalPercentage','100')
  );

  insert into public.audit_events(
    workspace_id,actor_user_id,action,entity_type,entity_id,summary,details
  ) values(
    p_workspace_id,v_actor,'corporate_ownership.snapshot_replaced','company',p_company_id,
    'Corporate ownership snapshot changed',
    jsonb_build_object(
      'ownershipVersion',v_new_version,
      'effectiveFrom',p_effective_from,
      'stakeCount',v_count,
      'operationId',p_operation_id
    )
  );

  return jsonb_build_object(
    'companyId',p_company_id,
    'version',v_new_version,
    'effectiveFrom',p_effective_from,
    'replayed',false
  );
end;
$$;

create or replace function public.replace_company_ownership_snapshot_v1(
  p_workspace_id uuid,
  p_company_id uuid,
  p_expected_version integer,
  p_operation_id uuid,
  p_effective_from date,
  p_entries jsonb
)
returns jsonb
language sql
security invoker
set search_path=''
as $$
  select private.replace_company_ownership_snapshot_v1_impl(
    p_workspace_id,p_company_id,p_expected_version,p_operation_id,p_effective_from,p_entries
  );
$$;

create or replace function private.get_company_ownership_snapshot_v1_impl(
  p_workspace_id uuid,
  p_company_id uuid,
  p_as_of date
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_as_of date;
  v_version integer;
  v_total numeric(12,6);
  v_stakes jsonb;
begin
  v_actor:=private.require_organization_actor_v1(p_workspace_id);
  v_as_of:=coalesce(p_as_of,current_date);

  if p_company_id is null then
    raise invalid_parameter_value using message='ENJAZ_OWNERSHIP_COMPANY_REQUIRED';
  end if;
  if not exists(
    select 1 from public.companies c
    where c.workspace_id=p_workspace_id and c.id=p_company_id and c.deleted_at is null
  ) then
    raise no_data_found using message='ENJAZ_OWNERSHIP_COMPANY_NOT_FOUND';
  end if;

  select coalesce(sum(s.percentage),0),
         coalesce(jsonb_agg(jsonb_build_object(
           'id',s.id,
           'holder',jsonb_build_object(
             'kind',s.holder_kind,
             'id',case when s.holder_kind='person' then s.holder_contact_id else s.holder_company_id end
           ),
           'role',s.ownership_role,
           'percentage',trim(trailing '.' from trim(trailing '0' from to_char(s.percentage,'FM990.000000'))),
           'effectiveFrom',s.effective_from,
           'effectiveTo',s.effective_to
         ) order by s.ownership_role,s.holder_kind,
           case when s.holder_kind='person' then s.holder_contact_id else s.holder_company_id end),'[]'::jsonb)
    into v_total,v_stakes
  from public.corporate_ownership_stakes s
  where s.workspace_id=p_workspace_id
    and s.company_id=p_company_id
    and s.effective_from<=v_as_of
    and (s.effective_to is null or v_as_of<s.effective_to);

  if jsonb_array_length(v_stakes)>0 and v_total<>100.000000::numeric then
    raise data_exception using message='ENJAZ_OWNERSHIP_HISTORY_NOT_RECONCILED';
  end if;

  select coalesce(max(e.governance_version),0)
    into v_version
  from public.corporate_governance_events e
  where e.workspace_id=p_workspace_id
    and e.company_id=p_company_id
    and e.event_type='ownership.snapshot'
    and e.effective_on<=v_as_of;

  return jsonb_build_object(
    'schema','enjaz.governance-ownership.v1',
    'companyId',p_company_id,
    'asOf',v_as_of,
    'version',v_version,
    'configured',jsonb_array_length(v_stakes)>0,
    'totalPercentage',case when jsonb_array_length(v_stakes)>0 then '100' else null end,
    'reconciledTo100',jsonb_array_length(v_stakes)>0,
    'stakes',v_stakes
  );
end;
$$;

create or replace function public.get_company_ownership_snapshot_v1(
  p_workspace_id uuid,
  p_company_id uuid,
  p_as_of date default null
)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select private.get_company_ownership_snapshot_v1_impl(p_workspace_id,p_company_id,p_as_of);
$$;

-- Private SECURITY DEFINER helpers are never exposed as public API functions.
revoke execute on function private.can_read_corporate_governance_v1(uuid) from public,anon,authenticated;
revoke execute on function private.replace_company_ownership_snapshot_v1_impl(uuid,uuid,integer,uuid,date,jsonb) from public,anon,authenticated;
revoke execute on function private.get_company_ownership_snapshot_v1_impl(uuid,uuid,date) from public,anon,authenticated;
revoke execute on function private.reject_corporate_ownership_overlap_v1() from public,anon,authenticated;

grant execute on function private.can_read_corporate_governance_v1(uuid) to authenticated;
grant execute on function private.replace_company_ownership_snapshot_v1_impl(uuid,uuid,integer,uuid,date,jsonb) to authenticated;
grant execute on function private.get_company_ownership_snapshot_v1_impl(uuid,uuid,date) to authenticated;

revoke execute on function public.replace_company_ownership_snapshot_v1(uuid,uuid,integer,uuid,date,jsonb) from public,anon,authenticated;
revoke execute on function public.get_company_ownership_snapshot_v1(uuid,uuid,date) from public,anon,authenticated;
grant execute on function public.replace_company_ownership_snapshot_v1(uuid,uuid,integer,uuid,date,jsonb) to authenticated;
grant execute on function public.get_company_ownership_snapshot_v1(uuid,uuid,date) to authenticated;

-- No INSERT/UPDATE/DELETE table grants exist for browser roles.
-- No company/contact identity rows are created or mutated by this migration.
-- No cross-workspace party reference can satisfy the composite foreign keys.

commit;
