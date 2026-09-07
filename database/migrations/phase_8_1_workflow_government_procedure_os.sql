-- ENJAZ Phase 8.1 — Workflow Engine & Government Procedure OS (M1)
-- Extends the existing workflow engine. No second workflow runtime and no duplicated transaction state.
begin;

create table public.government_entities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 240),
  short_name text,
  entity_type text not null default 'other' check (entity_type in ('ministry','commission','directorate','municipality','court','department','other')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint government_entities_workspace_id_id_key unique (workspace_id, id),
  constraint government_entities_name_unique unique (workspace_id, name)
);

create table public.government_entity_branches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  government_entity_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 240),
  address text,
  jurisdiction text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint government_entity_branches_workspace_id_id_key unique (workspace_id, id),
  constraint government_entity_branches_workspace_entity_id_key unique (workspace_id, government_entity_id, id),
  constraint government_entity_branches_entity_fk foreign key (workspace_id, government_entity_id)
    references public.government_entities(workspace_id, id) on delete cascade,
  constraint government_entity_branches_name_unique unique (workspace_id, government_entity_id, name)
);

create table public.government_procedures (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  government_entity_id uuid not null,
  workflow_template_id uuid not null,
  code text not null check (char_length(btrim(code)) between 1 and 80),
  name text not null check (char_length(btrim(name)) between 1 and 320),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint government_procedures_workspace_id_id_key unique (workspace_id, id),
  constraint government_procedures_entity_fk foreign key (workspace_id, government_entity_id)
    references public.government_entities(workspace_id, id) on delete restrict,
  constraint government_procedures_template_fk foreign key (workspace_id, workflow_template_id)
    references public.workflow_templates(workspace_id, id) on delete restrict,
  constraint government_procedures_code_unique unique (workspace_id, code),
  constraint government_procedures_template_unique unique (workspace_id, workflow_template_id)
);

create table public.government_procedure_branches (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  procedure_id uuid not null,
  branch_id uuid not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (workspace_id, procedure_id, branch_id),
  constraint government_procedure_branches_procedure_fk foreign key (workspace_id, procedure_id)
    references public.government_procedures(workspace_id, id) on delete cascade,
  constraint government_procedure_branches_branch_fk foreign key (workspace_id, branch_id)
    references public.government_entity_branches(workspace_id, id) on delete restrict
);

create table public.government_procedure_prerequisites (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  procedure_id uuid not null,
  prerequisite_procedure_id uuid not null,
  required boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  primary key (workspace_id, procedure_id, prerequisite_procedure_id),
  constraint government_procedure_prerequisites_procedure_fk foreign key (workspace_id, procedure_id)
    references public.government_procedures(workspace_id, id) on delete cascade,
  constraint government_procedure_prerequisites_target_fk foreign key (workspace_id, prerequisite_procedure_id)
    references public.government_procedures(workspace_id, id) on delete restrict,
  constraint government_procedure_prerequisites_not_self check (procedure_id <> prerequisite_procedure_id)
);

alter table public.workflow_template_stages
  add column government_entity_id uuid,
  add column government_branch_id uuid,
  add column official_fee numeric,
  add column fee_currency text;

alter table public.workflow_template_stages
  add constraint workflow_template_stages_government_entity_fk foreign key (workspace_id, government_entity_id)
    references public.government_entities(workspace_id, id) on delete restrict,
  add constraint workflow_template_stages_government_branch_fk foreign key (workspace_id, government_entity_id, government_branch_id)
    references public.government_entity_branches(workspace_id, government_entity_id, id) on delete restrict,
  add constraint workflow_template_stages_branch_requires_entity check (government_branch_id is null or government_entity_id is not null),
  add constraint workflow_template_stages_official_fee_exact check (official_fee is null or (official_fee >= 0 and official_fee <= 9999999999999999.99 and official_fee = trunc(official_fee, 2))),
  add constraint workflow_template_stages_fee_currency check ((official_fee is null and fee_currency is null) or (official_fee is not null and fee_currency ~ '^[A-Z]{3}$'));

create table public.workflow_template_transitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  workflow_template_id uuid not null,
  transition_key text not null check (transition_key ~ '^[a-z][a-z0-9_]{1,79}$'),
  label text not null check (char_length(btrim(label)) between 1 and 240),
  transition_kind text not null check (transition_kind in ('advance','complete','reopen')),
  from_stage_position integer not null check (from_stage_position > 0),
  to_stage_position integer,
  requires_reason boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint workflow_template_transitions_workspace_id_id_key unique (workspace_id, id),
  constraint workflow_template_transitions_template_fk foreign key (workspace_id, workflow_template_id)
    references public.workflow_templates(workspace_id, id) on delete cascade,
  constraint workflow_template_transitions_from_stage_fk foreign key (workspace_id, workflow_template_id, from_stage_position)
    references public.workflow_template_stages(workspace_id, workflow_template_id, position) on delete cascade,
  constraint workflow_template_transitions_to_stage_fk foreign key (workspace_id, workflow_template_id, to_stage_position)
    references public.workflow_template_stages(workspace_id, workflow_template_id, position) on delete cascade,
  constraint workflow_template_transitions_shape check (
    (transition_kind = 'complete' and to_stage_position is null)
    or (transition_kind = 'advance' and to_stage_position is not null and to_stage_position > from_stage_position)
    or (transition_kind = 'reopen' and to_stage_position is not null and to_stage_position < from_stage_position)
  ),
  constraint workflow_template_transitions_key_unique unique (workspace_id, workflow_template_id, from_stage_position, transition_key)
);

alter table public.workflow_instances
  add column government_procedure_id uuid,
  add column government_branch_id uuid,
  add column operation_key uuid;

alter table public.workflow_instances
  add constraint workflow_instances_government_procedure_fk foreign key (workspace_id, government_procedure_id)
    references public.government_procedures(workspace_id, id) on delete restrict,
  add constraint workflow_instances_government_branch_fk foreign key (workspace_id, government_branch_id)
    references public.government_entity_branches(workspace_id, id) on delete restrict,
  add constraint workflow_instances_procedure_template_shape check (government_procedure_id is not null or government_branch_id is null);

create unique index workflow_instances_operation_key_unique_idx
  on public.workflow_instances(workspace_id, operation_key) where operation_key is not null;

alter table public.workflow_item_states
  add column stage_position integer,
  add column required boolean,
  add column item_type text,
  add column title text;

alter table public.workflow_item_states
  add constraint workflow_item_states_stage_position_check check (stage_position is null or stage_position > 0),
  add constraint workflow_item_states_item_type_check check (item_type is null or item_type in ('check','document','action')),
  add constraint workflow_item_states_title_check check (title is null or char_length(btrim(title)) between 1 and 320);

create table public.workflow_transition_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  workflow_instance_id uuid not null,
  idempotency_key uuid not null,
  transition_key text not null check (char_length(btrim(transition_key)) between 1 and 80),
  event_kind text not null check (event_kind in ('start','advance','complete','reopen')),
  from_stage_position integer,
  to_stage_position integer,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  reason text,
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object'),
  constraint workflow_transition_events_workspace_id_id_key unique (workspace_id, id),
  constraint workflow_transition_events_instance_fk foreign key (workspace_id, workflow_instance_id)
    references public.workflow_instances(workspace_id, id) on delete cascade,
  constraint workflow_transition_events_idempotency_unique unique (workspace_id, idempotency_key)
);

create index government_procedures_entity_idx on public.government_procedures(workspace_id, government_entity_id, active, name);
create index government_branches_entity_idx on public.government_entity_branches(workspace_id, government_entity_id, active, name);
create index workflow_transitions_source_idx on public.workflow_template_transitions(workspace_id, workflow_template_id, from_stage_position, active);
create index workflow_transition_events_instance_idx on public.workflow_transition_events(workspace_id, workflow_instance_id, occurred_at, id);
create index workflow_item_states_stage_idx on public.workflow_item_states(workspace_id, workflow_instance_id, stage_position, status) where stage_position is not null;

create or replace function private.guard_government_procedure_prerequisite_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.procedure_id = new.prerequisite_procedure_id then
    raise invalid_parameter_value using message = 'ENJAZ_PROCEDURE_PREREQUISITE_SELF';
  end if;
  if exists (
    with recursive chain(id) as (
      select new.prerequisite_procedure_id
      union
      select gp.prerequisite_procedure_id
      from public.government_procedure_prerequisites gp
      join chain c on c.id = gp.procedure_id
      where gp.workspace_id = new.workspace_id
    )
    select 1 from chain where id = new.procedure_id
  ) then
    raise invalid_parameter_value using message = 'ENJAZ_PROCEDURE_PREREQUISITE_CYCLE';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_government_procedure_prerequisite_cycle() from public;
create trigger government_procedure_prerequisites_cycle_guard
before insert or update on public.government_procedure_prerequisites
for each row execute function private.guard_government_procedure_prerequisite_cycle();


create or replace function private.guard_government_procedure_branch_entity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_procedure_entity uuid;
  v_branch_entity uuid;
begin
  select gp.government_entity_id into v_procedure_entity
  from public.government_procedures gp
  where gp.workspace_id = new.workspace_id and gp.id = new.procedure_id;
  select b.government_entity_id into v_branch_entity
  from public.government_entity_branches b
  where b.workspace_id = new.workspace_id and b.id = new.branch_id;
  if v_procedure_entity is not null and v_branch_entity is not null and v_procedure_entity <> v_branch_entity then
    raise check_violation using message = 'ENJAZ_PROCEDURE_BRANCH_ENTITY_MISMATCH';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_government_procedure_branch_entity() from public;
create trigger government_procedure_branches_entity_guard
before insert or update on public.government_procedure_branches
for each row execute function private.guard_government_procedure_branch_entity();

create trigger government_entities_set_updated_at before update on public.government_entities for each row execute function private.set_updated_at();
create trigger government_entity_branches_set_updated_at before update on public.government_entity_branches for each row execute function private.set_updated_at();
create trigger government_procedures_set_updated_at before update on public.government_procedures for each row execute function private.set_updated_at();

alter table public.government_entities enable row level security;
alter table public.government_entity_branches enable row level security;
alter table public.government_procedures enable row level security;
alter table public.government_procedure_branches enable row level security;
alter table public.government_procedure_prerequisites enable row level security;
alter table public.workflow_template_transitions enable row level security;
alter table public.workflow_transition_events enable row level security;

create policy government_entities_workspace on public.government_entities for all to authenticated
  using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())))
  with check ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));
create policy government_entity_branches_workspace on public.government_entity_branches for all to authenticated
  using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())))
  with check ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));
create policy government_procedures_workspace on public.government_procedures for all to authenticated
  using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())))
  with check ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));
create policy government_procedure_branches_workspace on public.government_procedure_branches for all to authenticated
  using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())))
  with check ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));
create policy government_procedure_prerequisites_workspace on public.government_procedure_prerequisites for all to authenticated
  using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())))
  with check ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));
create policy workflow_template_transitions_workspace on public.workflow_template_transitions for all to authenticated
  using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())))
  with check ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));
create policy workflow_transition_events_select_workspace on public.workflow_transition_events for select to authenticated
  using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));

revoke all on table public.government_entities from anon, authenticated;
revoke all on table public.government_entity_branches from anon, authenticated;
revoke all on table public.government_procedures from anon, authenticated;
revoke all on table public.government_procedure_branches from anon, authenticated;
revoke all on table public.government_procedure_prerequisites from anon, authenticated;
revoke all on table public.workflow_template_transitions from anon, authenticated;
revoke all on table public.workflow_transition_events from anon, authenticated;
grant select, insert, update on table public.government_entities to authenticated;
grant select, insert, update on table public.government_entity_branches to authenticated;
grant select, insert, update on table public.government_procedures to authenticated;
grant select, insert, update on table public.government_procedure_branches to authenticated;
grant select, insert, update on table public.government_procedure_prerequisites to authenticated;
grant select, insert, update on table public.workflow_template_transitions to authenticated;
grant select on table public.workflow_transition_events to authenticated;

revoke insert, update, delete on table public.workflow_instances from anon, authenticated;
revoke insert, update, delete on table public.workflow_stage_states from anon, authenticated;
grant select on table public.workflow_instances to authenticated;
grant select on table public.workflow_stage_states to authenticated;

create or replace function public.get_government_procedure_catalog_v1(p_workspace_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then raise insufficient_privilege using message = 'ENJAZ_AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.workspace_memberships wm where wm.workspace_id = p_workspace_id and wm.user_id = v_actor) then
    raise insufficient_privilege using message = 'ENJAZ_WORKSPACE_FORBIDDEN';
  end if;
  return jsonb_build_object(
    'authority', 'workflow_plus_government_catalog',
    'moneyAuthority', 'reference_fees_only_no_finance_write',
    'entities', coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'shortName',e.short_name,'entityType',e.entity_type,'active',e.active) order by e.name)
      from public.government_entities e where e.workspace_id = p_workspace_id), '[]'::jsonb),
    'branches', coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'entityId',b.government_entity_id,'name',b.name,'address',b.address,'jurisdiction',b.jurisdiction,'active',b.active) order by b.name)
      from public.government_entity_branches b where b.workspace_id = p_workspace_id), '[]'::jsonb),
    'procedures', coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'code',p.code,'name',p.name,'description',p.description,'governmentEntityId',p.government_entity_id,
      'workflowTemplateId',p.workflow_template_id,'active',p.active,
      'branchIds',coalesce((select jsonb_agg(pb.branch_id order by pb.branch_id) from public.government_procedure_branches pb where pb.workspace_id=p.workspace_id and pb.procedure_id=p.id and pb.active),'[]'::jsonb),
      'prerequisiteProcedureIds',coalesce((select jsonb_agg(pp.prerequisite_procedure_id order by pp.prerequisite_procedure_id) from public.government_procedure_prerequisites pp where pp.workspace_id=p.workspace_id and pp.procedure_id=p.id and pp.required),'[]'::jsonb),
      'stages',coalesce((select jsonb_agg(jsonb_build_object(
        'position',s.position,'name',s.name,'description',s.description,'dueOffsetDays',s.due_offset_days,
        'governmentEntityId',s.government_entity_id,'governmentBranchId',s.government_branch_id,
        'officialFee',case when s.official_fee is null then null else s.official_fee::text end,'feeCurrency',s.fee_currency,
        'items',coalesce((select jsonb_agg(jsonb_build_object('key',i.id::text,'position',i.position,'itemType',i.item_type,'title',i.title,'required',i.required,'config',i.config) order by i.position)
          from public.workflow_template_items i where i.workspace_id=s.workspace_id and i.stage_id=s.id),'[]'::jsonb)
      ) order by s.position) from public.workflow_template_stages s where s.workspace_id=p.workspace_id and s.workflow_template_id=p.workflow_template_id),'[]'::jsonb),
      'transitions',coalesce((select jsonb_agg(jsonb_build_object('key',t.transition_key,'label',t.label,'kind',t.transition_kind,'fromStagePosition',t.from_stage_position,'toStagePosition',t.to_stage_position,'requiresReason',t.requires_reason) order by t.from_stage_position,t.transition_key)
        from public.workflow_template_transitions t where t.workspace_id=p.workspace_id and t.workflow_template_id=p.workflow_template_id and t.active),'[]'::jsonb)
    ) order by p.name) from public.government_procedures p where p.workspace_id=p_workspace_id),'[]'::jsonb)
  );
end;
$$;

create or replace function public.start_government_procedure_v1(
  p_workspace_id uuid, p_transaction_id uuid, p_procedure_id uuid, p_branch_id uuid, p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_tx public.transactions%rowtype; v_procedure public.government_procedures%rowtype;
  v_template public.workflow_templates%rowtype; v_existing public.workflow_instances%rowtype; v_start_event public.workflow_transition_events%rowtype;
  v_instance public.workflow_instances%rowtype; v_first_stage integer; v_snapshot jsonb;
begin
  if v_actor is null then raise insufficient_privilege using message = 'ENJAZ_AUTH_REQUIRED'; end if;
  if p_idempotency_key is null then raise invalid_parameter_value using message = 'ENJAZ_WORKFLOW_IDEMPOTENCY_REQUIRED'; end if;
  if not exists (select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then raise insufficient_privilege using message='ENJAZ_WORKSPACE_FORBIDDEN'; end if;
  select * into v_existing from public.workflow_instances wi where wi.workspace_id=p_workspace_id and wi.operation_key=p_idempotency_key limit 1;
  if found then
    if v_existing.transaction_id=p_transaction_id and v_existing.government_procedure_id=p_procedure_id and v_existing.government_branch_id is not distinct from p_branch_id then
      select * into v_start_event from public.workflow_transition_events e
      where e.workspace_id=p_workspace_id and e.idempotency_key=p_idempotency_key and e.event_kind='start' limit 1;
      if not found or jsonb_typeof(v_start_event.snapshot->'result') <> 'object' then
        raise data_exception using message='ENJAZ_WORKFLOW_IDEMPOTENCY_EVIDENCE_MISSING';
      end if;
      return (v_start_event.snapshot->'result') || jsonb_build_object('wasDuplicate',true);
    end if;
    raise unique_violation using message='ENJAZ_WORKFLOW_IDEMPOTENCY_CONFLICT';
  end if;
  select * into v_tx from public.transactions tx where tx.workspace_id=p_workspace_id and tx.id=p_transaction_id for update;
  if not found or v_tx.deleted_at is not null or v_tx.archived_at is not null or v_tx.status='completed' then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_TRANSACTION_UNAVAILABLE'; end if;
  select * into v_procedure from public.government_procedures gp where gp.workspace_id=p_workspace_id and gp.id=p_procedure_id and gp.active;
  if not found then raise invalid_parameter_value using message='ENJAZ_PROCEDURE_UNAVAILABLE'; end if;
  if exists (
    select 1
    from public.government_procedure_prerequisites pp
    where pp.workspace_id=p_workspace_id and pp.procedure_id=p_procedure_id and pp.required
      and not exists (
        select 1 from public.workflow_instances prior
        where prior.workspace_id=p_workspace_id
          and prior.transaction_id=p_transaction_id
          and prior.government_procedure_id=pp.prerequisite_procedure_id
          and prior.status='completed'
      )
  ) then raise check_violation using message='ENJAZ_PROCEDURE_PREREQUISITE_INCOMPLETE'; end if;
  select * into v_template from public.workflow_templates wt where wt.workspace_id=p_workspace_id and wt.id=v_procedure.workflow_template_id and wt.active;
  if not found then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_TEMPLATE_UNAVAILABLE'; end if;
  if p_branch_id is null and exists (
    select 1 from public.government_procedure_branches pb
    where pb.workspace_id=p_workspace_id and pb.procedure_id=p_procedure_id and pb.active
  ) then raise invalid_parameter_value using message='ENJAZ_PROCEDURE_BRANCH_REQUIRED'; end if;
  if p_branch_id is not null and not exists (
    select 1 from public.government_procedure_branches pb join public.government_entity_branches b on b.workspace_id=pb.workspace_id and b.id=pb.branch_id
    where pb.workspace_id=p_workspace_id and pb.procedure_id=p_procedure_id and pb.branch_id=p_branch_id and pb.active and b.active
  ) then raise invalid_parameter_value using message='ENJAZ_PROCEDURE_BRANCH_UNAVAILABLE'; end if;
  if exists (select 1 from public.workflow_instances wi where wi.workspace_id=p_workspace_id and wi.transaction_id=p_transaction_id and wi.status='active') then raise unique_violation using message='ENJAZ_WORKFLOW_ACTIVE_INSTANCE_EXISTS'; end if;
  select min(s.position) into v_first_stage from public.workflow_template_stages s where s.workspace_id=p_workspace_id and s.workflow_template_id=v_template.id;
  if v_first_stage is null then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_TEMPLATE_HAS_NO_STAGES'; end if;
  v_snapshot := jsonb_build_object('version',1,'workflowTemplateId',v_template.id,'workflowTemplateVersion',v_template.version,'procedureId',v_procedure.id,'procedureCode',v_procedure.code,'procedureName',v_procedure.name,'governmentEntityId',v_procedure.government_entity_id,'branchId',p_branch_id,
    'stages',coalesce((select jsonb_agg(jsonb_build_object('position',s.position,'name',s.name,'description',s.description,'dueOffsetDays',s.due_offset_days,'governmentEntityId',s.government_entity_id,'governmentBranchId',s.government_branch_id,'officialFee',case when s.official_fee is null then null else s.official_fee::text end,'feeCurrency',s.fee_currency,
      'items',coalesce((select jsonb_agg(jsonb_build_object('key',i.id::text,'position',i.position,'itemType',i.item_type,'title',i.title,'required',i.required,'config',i.config) order by i.position) from public.workflow_template_items i where i.workspace_id=s.workspace_id and i.stage_id=s.id),'[]'::jsonb)) order by s.position)
      from public.workflow_template_stages s where s.workspace_id=p_workspace_id and s.workflow_template_id=v_template.id),'[]'::jsonb));
  insert into public.workflow_instances(workspace_id,transaction_id,workflow_template_id,template_snapshot,current_stage_position,status,started_at,government_procedure_id,government_branch_id,operation_key)
    values(p_workspace_id,p_transaction_id,v_template.id,v_snapshot,v_first_stage,'active',now(),p_procedure_id,p_branch_id,p_idempotency_key) returning * into v_instance;
  insert into public.workflow_stage_states(workspace_id,workflow_instance_id,stage_position,status,started_at)
    select p_workspace_id,v_instance.id,s.position,case when s.position=v_first_stage then 'active' else 'pending' end,case when s.position=v_first_stage then now() else null end
    from public.workflow_template_stages s where s.workspace_id=p_workspace_id and s.workflow_template_id=v_template.id;
  insert into public.workflow_item_states(workspace_id,workflow_instance_id,template_item_key,status,stage_position,required,item_type,title)
    select p_workspace_id,v_instance.id,i.id::text,'pending',s.position,i.required,i.item_type,i.title
    from public.workflow_template_stages s join public.workflow_template_items i on i.workspace_id=s.workspace_id and i.stage_id=s.id
    where s.workspace_id=p_workspace_id and s.workflow_template_id=v_template.id;
  insert into public.workflow_transition_events(workspace_id,workflow_instance_id,idempotency_key,transition_key,event_kind,from_stage_position,to_stage_position,actor_user_id,snapshot)
    values(p_workspace_id,v_instance.id,p_idempotency_key,'start','start',null,v_first_stage,v_actor,jsonb_build_object(
      'procedureId',p_procedure_id,'transactionId',p_transaction_id,'branchId',p_branch_id,'workflowTemplateId',v_template.id,'templateVersion',v_template.version,
      'result',jsonb_build_object('instanceId',v_instance.id,'transactionId',v_instance.transaction_id,'procedureId',v_instance.government_procedure_id,
        'branchId',v_instance.government_branch_id,'currentStagePosition',v_first_stage,'status','active','templateSnapshot',v_snapshot)
    ));
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
    values(p_workspace_id,v_actor,'workflow.procedure.started','workflow_instance',v_instance.id,'Started government procedure workflow',jsonb_build_object('procedureId',p_procedure_id,'transactionId',p_transaction_id,'branchId',p_branch_id,'idempotencyKey',p_idempotency_key));
  return jsonb_build_object('instanceId',v_instance.id,'transactionId',v_instance.transaction_id,'procedureId',v_instance.government_procedure_id,'branchId',v_instance.government_branch_id,'currentStagePosition',v_instance.current_stage_position,'status',v_instance.status,'templateSnapshot',v_instance.template_snapshot,'wasDuplicate',false);
end;
$$;

create or replace function public.transition_workflow_v1(
  p_workspace_id uuid, p_workflow_instance_id uuid, p_transition_key text, p_expected_stage_position integer, p_reason text, p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_instance public.workflow_instances%rowtype; v_transition public.workflow_template_transitions%rowtype;
  v_existing_event public.workflow_transition_events%rowtype; v_pending_required integer := 0; v_waived_required integer := 0;
  v_reason text := nullif(btrim(coalesce(p_reason,'')),''); v_event_id uuid;
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_AUTH_REQUIRED'; end if;
  if p_idempotency_key is null then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_IDEMPOTENCY_REQUIRED'; end if;
  if p_expected_stage_position is null or p_expected_stage_position<1 then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_EXPECTED_STAGE_INVALID'; end if;
  if p_transition_key is null or p_transition_key !~ '^[a-z][a-z0-9_]{1,79}$' then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_TRANSITION_KEY_INVALID'; end if;
  if not exists (select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then raise insufficient_privilege using message='ENJAZ_WORKSPACE_FORBIDDEN'; end if;
  select * into v_existing_event from public.workflow_transition_events e where e.workspace_id=p_workspace_id and e.idempotency_key=p_idempotency_key limit 1;
  if found then
    if v_existing_event.workflow_instance_id=p_workflow_instance_id and v_existing_event.transition_key=p_transition_key and v_existing_event.from_stage_position=p_expected_stage_position and v_existing_event.reason is not distinct from v_reason then
      select * into v_instance from public.workflow_instances wi where wi.workspace_id=p_workspace_id and wi.id=p_workflow_instance_id;
      return jsonb_build_object('instanceId',v_instance.id,'transitionEventId',v_existing_event.id,'transitionKey',v_existing_event.transition_key,'eventKind',v_existing_event.event_kind,'fromStagePosition',v_existing_event.from_stage_position,'toStagePosition',v_existing_event.to_stage_position,'currentStagePosition',(v_existing_event.snapshot->>'resultStagePosition')::integer,'status',v_existing_event.snapshot->>'resultStatus','wasDuplicate',true);
    end if;
    raise unique_violation using message='ENJAZ_WORKFLOW_TRANSITION_IDEMPOTENCY_CONFLICT';
  end if;
  select * into v_instance from public.workflow_instances wi where wi.workspace_id=p_workspace_id and wi.id=p_workflow_instance_id for update;
  if not found or v_instance.status not in ('active','completed') then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_INSTANCE_NOT_TRANSITIONABLE'; end if;
  if v_instance.current_stage_position<>p_expected_stage_position then raise serialization_failure using message='ENJAZ_WORKFLOW_STALE_STAGE'; end if;
  select * into v_transition from public.workflow_template_transitions t where t.workspace_id=p_workspace_id and t.workflow_template_id=v_instance.workflow_template_id and t.from_stage_position=v_instance.current_stage_position and t.transition_key=p_transition_key and t.active;
  if not found then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_TRANSITION_NOT_ALLOWED'; end if;
  if v_instance.status='completed' and v_transition.transition_kind<>'reopen' then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_COMPLETED_REOPEN_ONLY'; end if;
  if v_transition.transition_kind='reopen' and exists (
    select 1 from public.workflow_instances other
    where other.workspace_id=p_workspace_id and other.transaction_id=v_instance.transaction_id
      and other.status='active' and other.id<>v_instance.id
  ) then raise unique_violation using message='ENJAZ_WORKFLOW_REOPEN_ACTIVE_CONFLICT'; end if;
  if v_transition.requires_reason and v_reason is null then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_TRANSITION_REASON_REQUIRED'; end if;
  if v_transition.transition_kind in ('advance','complete') then
    select count(*) into v_pending_required from public.workflow_item_states i where i.workspace_id=p_workspace_id and i.workflow_instance_id=v_instance.id and i.stage_position=v_instance.current_stage_position and i.required is true and i.status='pending';
    if v_pending_required>0 then raise check_violation using message='ENJAZ_WORKFLOW_REQUIRED_ITEMS_PENDING'; end if;
    select count(*) into v_waived_required from public.workflow_item_states i where i.workspace_id=p_workspace_id and i.workflow_instance_id=v_instance.id and i.stage_position=v_instance.current_stage_position and i.required is true and i.status='waived';
    if v_waived_required>0 and v_reason is null then raise check_violation using message='ENJAZ_WORKFLOW_WAIVER_REASON_REQUIRED'; end if;
  end if;
  if v_transition.transition_kind='advance' then
    update public.workflow_stage_states set status='completed',completed_at=now() where workspace_id=p_workspace_id and workflow_instance_id=v_instance.id and stage_position=v_instance.current_stage_position;
    update public.workflow_stage_states set status='active',started_at=coalesce(started_at,now()),completed_at=null where workspace_id=p_workspace_id and workflow_instance_id=v_instance.id and stage_position=v_transition.to_stage_position and status='pending';
    if not found then raise check_violation using message='ENJAZ_WORKFLOW_TARGET_STAGE_NOT_PENDING'; end if;
    update public.workflow_instances set current_stage_position=v_transition.to_stage_position where workspace_id=p_workspace_id and id=v_instance.id returning * into v_instance;
  elsif v_transition.transition_kind='complete' then
    update public.workflow_stage_states set status='completed',completed_at=now() where workspace_id=p_workspace_id and workflow_instance_id=v_instance.id and stage_position=v_instance.current_stage_position;
    update public.workflow_instances set status='completed',completed_at=now() where workspace_id=p_workspace_id and id=v_instance.id returning * into v_instance;
  else
    if v_reason is null then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_REOPEN_REASON_REQUIRED'; end if;
    update public.workflow_stage_states set status='pending',started_at=null,completed_at=null,override_used=false,override_reason=null where workspace_id=p_workspace_id and workflow_instance_id=v_instance.id and stage_position>v_transition.to_stage_position;
    update public.workflow_stage_states set status='reopened',started_at=coalesce(started_at,now()),completed_at=null,override_used=true,override_reason=v_reason where workspace_id=p_workspace_id and workflow_instance_id=v_instance.id and stage_position=v_transition.to_stage_position;
    update public.workflow_instances set current_stage_position=v_transition.to_stage_position,completed_at=null,status='active' where workspace_id=p_workspace_id and id=v_instance.id returning * into v_instance;
  end if;
  insert into public.workflow_transition_events(workspace_id,workflow_instance_id,idempotency_key,transition_key,event_kind,from_stage_position,to_stage_position,actor_user_id,reason,snapshot)
    values(p_workspace_id,v_instance.id,p_idempotency_key,v_transition.transition_key,v_transition.transition_kind,p_expected_stage_position,v_transition.to_stage_position,v_actor,v_reason,jsonb_build_object('workflowTemplateId',v_instance.workflow_template_id,'procedureId',v_instance.government_procedure_id,'transactionId',v_instance.transaction_id,'requiredWaivers',v_waived_required,'resultStatus',v_instance.status,'resultStagePosition',v_instance.current_stage_position)) returning id into v_event_id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
    values(p_workspace_id,v_actor,'workflow.transition.'||v_transition.transition_kind,'workflow_instance',v_instance.id,'Applied workflow transition',jsonb_build_object('transitionKey',v_transition.transition_key,'fromStagePosition',p_expected_stage_position,'toStagePosition',v_transition.to_stage_position,'reason',v_reason,'idempotencyKey',p_idempotency_key));
  return jsonb_build_object('instanceId',v_instance.id,'transitionEventId',v_event_id,'transitionKey',v_transition.transition_key,'eventKind',v_transition.transition_kind,'fromStagePosition',p_expected_stage_position,'toStagePosition',v_transition.to_stage_position,'currentStagePosition',v_instance.current_stage_position,'status',v_instance.status,'wasDuplicate',false);
end;
$$;

revoke execute on function public.get_government_procedure_catalog_v1(uuid) from public, anon;
revoke execute on function public.start_government_procedure_v1(uuid,uuid,uuid,uuid,uuid) from public, anon;
revoke execute on function public.transition_workflow_v1(uuid,uuid,text,integer,text,uuid) from public, anon;
grant execute on function public.get_government_procedure_catalog_v1(uuid) to authenticated;
grant execute on function public.start_government_procedure_v1(uuid,uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.transition_workflow_v1(uuid,uuid,text,integer,text,uuid) to authenticated;

commit;
