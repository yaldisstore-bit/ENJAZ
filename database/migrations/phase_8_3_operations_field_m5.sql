-- ENJAZ Phase 8.3 — Operations Center + Field Operations — M5
-- Canonical authority: assignments, visits, visit evidence and replay-safe sync receipts.
-- No shadow transaction/workflow/automation/finance state. Location evidence is workspace-policy controlled and visit scoped.
begin;

alter table public.workspace_settings
  add column field_operations_policy jsonb not null default '{"locationEvidence":"disabled"}'::jsonb,
  add constraint workspace_settings_field_operations_policy_object check (jsonb_typeof(field_operations_policy) = 'object'),
  add constraint workspace_settings_field_location_policy_check check (coalesce(field_operations_policy->>'locationEvidence','disabled') in ('disabled','optional','required'));

create table public.field_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid not null,
  assigned_user_id uuid not null,
  scheduled_for date not null,
  destination_label text not null check (char_length(btrim(destination_label)) between 1 and 320),
  department text check (department is null or char_length(btrim(department)) between 1 and 240),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'queued' check (status in ('queued','in_progress','visit_complete','handoff_complete','cancelled')),
  version integer not null default 1 check (version > 0),
  handoff_direction text check (handoff_direction is null or handoff_direction in ('office_to_field','field_to_office')),
  handoff_note text check (handoff_note is null or char_length(btrim(handoff_note)) between 3 and 1200),
  handoff_at timestamptz,
  handoff_by uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint field_assignments_workspace_id_id_key unique (workspace_id,id),
  constraint field_assignments_transaction_fk foreign key (workspace_id,transaction_id)
    references public.transactions(workspace_id,id) on delete restrict,
  constraint field_assignments_assignee_fk foreign key (workspace_id,assigned_user_id)
    references public.workspace_memberships(workspace_id,user_id) on delete restrict,
  constraint field_assignments_handoff_consistency check (
    (handoff_at is null and handoff_by is null and handoff_direction is null and handoff_note is null)
    or (handoff_at is not null and handoff_by is not null and handoff_direction is not null and handoff_note is not null)
  )
);

create table public.field_visits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  assignment_id uuid not null,
  transaction_id uuid not null,
  assigned_user_id uuid not null,
  status text not null default 'checked_in' check (status in ('checked_in','completed','could_not_complete')),
  version integer not null default 1 check (version > 0),
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  check_in_location jsonb,
  check_out_location jsonb,
  counter_department text check (counter_department is null or char_length(btrim(counter_department)) between 1 and 320),
  official_reference text check (official_reference is null or char_length(btrim(official_reference)) between 1 and 320),
  official_fee_paid numeric(18,2) check (official_fee_paid is null or official_fee_paid > 0),
  failure_reason text check (failure_reason is null or failure_reason in ('office_closed','missing_requirement','payment_issue','authority_delay','rejected','technical_issue','other')),
  outcome_note text check (outcome_note is null or char_length(btrim(outcome_note)) between 3 and 1600),
  started_by uuid not null references auth.users(id) on delete restrict,
  completed_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint field_visits_workspace_id_id_key unique (workspace_id,id),
  constraint field_visits_assignment_fk foreign key (workspace_id,assignment_id)
    references public.field_assignments(workspace_id,id) on delete restrict,
  constraint field_visits_transaction_fk foreign key (workspace_id,transaction_id)
    references public.transactions(workspace_id,id) on delete restrict,
  constraint field_visits_assignee_fk foreign key (workspace_id,assigned_user_id)
    references public.workspace_memberships(workspace_id,user_id) on delete restrict,
  constraint field_visits_location_object_check check (
    (check_in_location is null or jsonb_typeof(check_in_location)='object')
    and (check_out_location is null or jsonb_typeof(check_out_location)='object')
  ),
  constraint field_visits_completion_consistency check (
    (status='checked_in' and check_out_at is null and completed_by is null and failure_reason is null)
    or (status='completed' and check_out_at is not null and completed_by is not null and failure_reason is null)
    or (status='could_not_complete' and check_out_at is not null and completed_by is not null and failure_reason is not null)
  )
);

create unique index field_visits_one_active_assignment_idx
  on public.field_visits(workspace_id,assignment_id)
  where status='checked_in';

create table public.field_visit_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  visit_id uuid not null,
  transaction_id uuid not null,
  document_id uuid,
  evidence_type text not null check (evidence_type in ('photo','document','receipt','other')),
  note text check (note is null or char_length(btrim(note)) between 1 and 1200),
  captured_by uuid not null references auth.users(id) on delete restrict,
  captured_at timestamptz not null default now(),
  constraint field_visit_evidence_workspace_id_id_key unique (workspace_id,id),
  constraint field_visit_evidence_visit_fk foreign key (workspace_id,visit_id)
    references public.field_visits(workspace_id,id) on delete restrict,
  constraint field_visit_evidence_transaction_fk foreign key (workspace_id,transaction_id)
    references public.transactions(workspace_id,id) on delete restrict,
  constraint field_visit_evidence_document_fk foreign key (workspace_id,document_id)
    references public.documents(workspace_id,id) on delete restrict,
  constraint field_visit_evidence_document_required check (
    (evidence_type in ('photo','document','receipt') and document_id is not null)
    or evidence_type='other'
  )
);

create table public.field_sync_receipts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_operation_id uuid not null,
  operation_type text not null check (operation_type in ('reassign','check_in','check_out','evidence','handoff')),
  target_id uuid,
  payload_fingerprint text not null check (payload_fingerprint ~ '^[0-9a-f]{32}$'),
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result)='object'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint field_sync_receipts_workspace_id_id_key unique (workspace_id,id),
  constraint field_sync_receipts_operation_unique unique (workspace_id,client_operation_id)
);

create index field_assignments_queue_idx on public.field_assignments(workspace_id,scheduled_for,status,priority);
create index field_assignments_assignee_idx on public.field_assignments(workspace_id,assigned_user_id,scheduled_for,status);
create index field_visits_assignment_idx on public.field_visits(workspace_id,assignment_id,created_at desc);
create index field_visits_assignee_idx on public.field_visits(workspace_id,assigned_user_id,check_in_at desc);
create index field_visit_evidence_visit_idx on public.field_visit_evidence(workspace_id,visit_id,captured_at);
create index field_sync_receipts_created_by_idx on public.field_sync_receipts(workspace_id,created_by,created_at desc);

create or replace function private.validate_field_location_v1(p_workspace_id uuid,p_location jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_policy text := 'disabled';
  v_lat numeric;
  v_lng numeric;
  v_accuracy numeric;
begin
  select coalesce(ws.field_operations_policy->>'locationEvidence','disabled') into v_policy
  from public.workspace_settings ws where ws.workspace_id=p_workspace_id;
  v_policy := coalesce(v_policy,'disabled');

  if p_location is null then
    if v_policy='required' then raise invalid_parameter_value using message='ENJAZ_FIELD_LOCATION_REQUIRED'; end if;
    return null;
  end if;
  if v_policy='disabled' then raise insufficient_privilege using message='ENJAZ_FIELD_LOCATION_DISABLED_BY_POLICY'; end if;
  if jsonb_typeof(p_location)<>'object' or jsonb_typeof(p_location->'lat')<>'number' or jsonb_typeof(p_location->'lng')<>'number' then
    raise invalid_parameter_value using message='ENJAZ_FIELD_LOCATION_INVALID';
  end if;
  v_lat := (p_location->>'lat')::numeric;
  v_lng := (p_location->>'lng')::numeric;
  if v_lat < -90 or v_lat > 90 or v_lng < -180 or v_lng > 180 then raise invalid_parameter_value using message='ENJAZ_FIELD_LOCATION_INVALID'; end if;
  if p_location ? 'accuracyMeters' then
    if jsonb_typeof(p_location->'accuracyMeters')<>'number' then raise invalid_parameter_value using message='ENJAZ_FIELD_LOCATION_INVALID'; end if;
    v_accuracy := (p_location->>'accuracyMeters')::numeric;
    if v_accuracy < 0 or v_accuracy > 10000 then raise invalid_parameter_value using message='ENJAZ_FIELD_LOCATION_INVALID'; end if;
  end if;
  return jsonb_strip_nulls(jsonb_build_object('lat',v_lat,'lng',v_lng,'accuracyMeters',v_accuracy));
end;
$$;

create or replace function private.set_field_location_policy_v1_impl(p_workspace_id uuid,p_policy text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then
    raise insufficient_privilege using message='ENJAZ_FIELD_WORKSPACE_FORBIDDEN';
  end if;
  if p_policy not in ('disabled','optional','required') then raise invalid_parameter_value using message='ENJAZ_FIELD_LOCATION_POLICY_INVALID'; end if;
  insert into public.workspace_settings(workspace_id,field_operations_policy)
  values(p_workspace_id,jsonb_build_object('locationEvidence',p_policy))
  on conflict(workspace_id) do update set field_operations_policy=jsonb_build_object('locationEvidence',excluded.field_operations_policy->>'locationEvidence'),updated_at=now();
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'field.location_policy.changed','workspace',p_workspace_id,'Field location evidence policy changed',jsonb_build_object('locationEvidence',p_policy));
  return jsonb_build_object('locationEvidence',p_policy);
end;
$$;

create or replace function private.upsert_field_assignment_v1_impl(
  p_workspace_id uuid,p_assignment_id uuid,p_expected_version integer,p_transaction_id uuid,p_assigned_user_id uuid,
  p_scheduled_for date,p_destination_label text,p_department text,p_priority text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_row public.field_assignments%rowtype;
begin
  if v_actor is null or not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then raise insufficient_privilege using message='ENJAZ_FIELD_WORKSPACE_FORBIDDEN'; end if;
  if not exists(select 1 from public.transactions t where t.workspace_id=p_workspace_id and t.id=p_transaction_id and t.deleted_at is null) then raise foreign_key_violation using message='ENJAZ_FIELD_TRANSACTION_NOT_FOUND'; end if;
  if not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=p_assigned_user_id) then raise foreign_key_violation using message='ENJAZ_FIELD_ASSIGNEE_NOT_MEMBER'; end if;
  if p_scheduled_for is null then raise invalid_parameter_value using message='ENJAZ_FIELD_SCHEDULE_REQUIRED'; end if;
  if char_length(btrim(coalesce(p_destination_label,''))) not between 1 and 320 then raise invalid_parameter_value using message='ENJAZ_FIELD_DESTINATION_INVALID'; end if;
  if p_priority not in ('low','normal','high','urgent') then raise invalid_parameter_value using message='ENJAZ_FIELD_PRIORITY_INVALID'; end if;

  if p_assignment_id is null then
    if p_expected_version is not null then raise invalid_parameter_value using message='ENJAZ_FIELD_ASSIGNMENT_CREATE_VERSION_INVALID'; end if;
    insert into public.field_assignments(workspace_id,transaction_id,assigned_user_id,scheduled_for,destination_label,department,priority,created_by)
    values(p_workspace_id,p_transaction_id,p_assigned_user_id,p_scheduled_for,btrim(p_destination_label),nullif(btrim(coalesce(p_department,'')),''),p_priority,v_actor)
    returning * into v_row;
  else
    select * into v_row from public.field_assignments a where a.workspace_id=p_workspace_id and a.id=p_assignment_id for update;
    if not found then raise no_data_found using message='ENJAZ_FIELD_ASSIGNMENT_NOT_FOUND'; end if;
    if p_expected_version is null or v_row.version<>p_expected_version then raise serialization_failure using message='ENJAZ_FIELD_ASSIGNMENT_STALE'; end if;
    if v_row.status in ('handoff_complete','cancelled') then raise invalid_parameter_value using message='ENJAZ_FIELD_ASSIGNMENT_TERMINAL'; end if;
    update public.field_assignments set transaction_id=p_transaction_id,assigned_user_id=p_assigned_user_id,scheduled_for=p_scheduled_for,
      destination_label=btrim(p_destination_label),department=nullif(btrim(coalesce(p_department,'')),''),priority=p_priority,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=p_assignment_id returning * into v_row;
  end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,case when p_assignment_id is null then 'field.assignment.created' else 'field.assignment.updated' end,'field_assignment',v_row.id,'Field assignment saved',jsonb_build_object('transactionId',v_row.transaction_id,'assignedUserId',v_row.assigned_user_id,'scheduledFor',v_row.scheduled_for,'version',v_row.version));
  return jsonb_build_object('id',v_row.id,'transactionId',v_row.transaction_id,'assignedUserId',v_row.assigned_user_id,'scheduledFor',v_row.scheduled_for,'destinationLabel',v_row.destination_label,'department',v_row.department,'priority',v_row.priority,'status',v_row.status,'version',v_row.version);
end;
$$;

create or replace function private.reassign_field_assignment_v1_impl(
  p_workspace_id uuid,p_assignment_id uuid,p_expected_version integer,p_assigned_user_id uuid,p_reason text,p_client_operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid()); v_row public.field_assignments%rowtype; v_receipt public.field_sync_receipts%rowtype; v_result jsonb; v_fingerprint text;
begin
  if v_actor is null or not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then raise insufficient_privilege using message='ENJAZ_FIELD_WORKSPACE_FORBIDDEN'; end if;
  if p_client_operation_id is null then raise invalid_parameter_value using message='ENJAZ_FIELD_OPERATION_ID_REQUIRED'; end if;
  if char_length(btrim(coalesce(p_reason,''))) not between 3 and 1200 then raise invalid_parameter_value using message='ENJAZ_FIELD_REASSIGN_REASON_INVALID'; end if;
  if not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=p_assigned_user_id) then raise foreign_key_violation using message='ENJAZ_FIELD_ASSIGNEE_NOT_MEMBER'; end if;
  v_fingerprint := md5(jsonb_build_object('assignmentId',p_assignment_id,'expectedVersion',p_expected_version,'assignedUserId',p_assigned_user_id,'reason',btrim(p_reason))::text);
  select * into v_receipt from public.field_sync_receipts r where r.workspace_id=p_workspace_id and r.client_operation_id=p_client_operation_id;
  if found then
    if v_receipt.payload_fingerprint<>v_fingerprint or v_receipt.operation_type<>'reassign' then raise unique_violation using message='ENJAZ_FIELD_IDEMPOTENCY_CONFLICT'; end if;
    return v_receipt.result || jsonb_build_object('wasDuplicate',true);
  end if;
  select * into v_row from public.field_assignments a where a.workspace_id=p_workspace_id and a.id=p_assignment_id for update;
  if not found then raise no_data_found using message='ENJAZ_FIELD_ASSIGNMENT_NOT_FOUND'; end if;
  if v_row.version<>p_expected_version then raise serialization_failure using message='ENJAZ_FIELD_ASSIGNMENT_STALE'; end if;
  if v_row.status in ('handoff_complete','cancelled') then raise invalid_parameter_value using message='ENJAZ_FIELD_ASSIGNMENT_TERMINAL'; end if;
  update public.field_assignments set assigned_user_id=p_assigned_user_id,version=version+1,updated_at=now(),handoff_direction='office_to_field',handoff_note=btrim(p_reason),handoff_at=now(),handoff_by=v_actor
    where workspace_id=p_workspace_id and id=p_assignment_id returning * into v_row;
  update public.field_visits set assigned_user_id=p_assigned_user_id,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and assignment_id=p_assignment_id and status='checked_in';
  v_result:=jsonb_build_object('assignmentId',v_row.id,'assignedUserId',v_row.assigned_user_id,'status',v_row.status,'version',v_row.version,'wasDuplicate',false);
  insert into public.field_sync_receipts(workspace_id,client_operation_id,operation_type,target_id,payload_fingerprint,result,created_by)
  values(p_workspace_id,p_client_operation_id,'reassign',v_row.id,v_fingerprint,v_result,v_actor);
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'field.assignment.reassigned','field_assignment',v_row.id,'Field assignment emergency reassigned',jsonb_build_object('assignedUserId',p_assigned_user_id,'reason',btrim(p_reason),'version',v_row.version));
  return v_result;
end;
$$;

create or replace function private.start_field_visit_v1_impl(
  p_workspace_id uuid,p_assignment_id uuid,p_expected_assignment_version integer,p_location jsonb,p_client_operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid()); v_assignment public.field_assignments%rowtype; v_visit public.field_visits%rowtype; v_receipt public.field_sync_receipts%rowtype;
  v_location jsonb; v_result jsonb; v_fingerprint text;
begin
  if v_actor is null or not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then raise insufficient_privilege using message='ENJAZ_FIELD_WORKSPACE_FORBIDDEN'; end if;
  if p_client_operation_id is null then raise invalid_parameter_value using message='ENJAZ_FIELD_OPERATION_ID_REQUIRED'; end if;
  v_fingerprint:=md5(jsonb_build_object('assignmentId',p_assignment_id,'expectedVersion',p_expected_assignment_version,'location',p_location)::text);
  select * into v_receipt from public.field_sync_receipts r where r.workspace_id=p_workspace_id and r.client_operation_id=p_client_operation_id;
  if found then if v_receipt.payload_fingerprint<>v_fingerprint or v_receipt.operation_type<>'check_in' then raise unique_violation using message='ENJAZ_FIELD_IDEMPOTENCY_CONFLICT'; end if; return v_receipt.result||jsonb_build_object('wasDuplicate',true); end if;
  select * into v_assignment from public.field_assignments a where a.workspace_id=p_workspace_id and a.id=p_assignment_id for update;
  if not found then raise no_data_found using message='ENJAZ_FIELD_ASSIGNMENT_NOT_FOUND'; end if;
  if v_assignment.version<>p_expected_assignment_version then raise serialization_failure using message='ENJAZ_FIELD_ASSIGNMENT_STALE'; end if;
  if v_assignment.assigned_user_id<>v_actor then raise insufficient_privilege using message='ENJAZ_FIELD_NOT_ASSIGNED_ACTOR'; end if;
  if v_assignment.status<>'queued' then raise invalid_parameter_value using message='ENJAZ_FIELD_ASSIGNMENT_NOT_READY'; end if;
  if exists(select 1 from public.field_visits v where v.workspace_id=p_workspace_id and v.assignment_id=p_assignment_id and v.status='checked_in') then raise unique_violation using message='ENJAZ_FIELD_VISIT_ALREADY_ACTIVE'; end if;
  v_location:=private.validate_field_location_v1(p_workspace_id,p_location);
  insert into public.field_visits(workspace_id,assignment_id,transaction_id,assigned_user_id,check_in_location,started_by)
  values(p_workspace_id,v_assignment.id,v_assignment.transaction_id,v_actor,v_location,v_actor) returning * into v_visit;
  update public.field_assignments set status='in_progress',version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=v_assignment.id returning * into v_assignment;
  v_result:=jsonb_build_object('visitId',v_visit.id,'visitStatus',v_visit.status,'visitVersion',v_visit.version,'assignmentId',v_assignment.id,'assignmentStatus',v_assignment.status,'assignmentVersion',v_assignment.version,'checkedInAt',v_visit.check_in_at,'wasDuplicate',false);
  insert into public.field_sync_receipts(workspace_id,client_operation_id,operation_type,target_id,payload_fingerprint,result,created_by)
  values(p_workspace_id,p_client_operation_id,'check_in',v_visit.id,v_fingerprint,v_result,v_actor);
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'field.visit.checked_in','field_visit',v_visit.id,'Field visit checked in',jsonb_build_object('assignmentId',v_assignment.id,'transactionId',v_visit.transaction_id,'locationRecorded',v_location is not null));
  return v_result;
end;
$$;

create or replace function private.finish_field_visit_v1_impl(
  p_workspace_id uuid,p_visit_id uuid,p_expected_visit_version integer,p_outcome text,p_failure_reason text,p_outcome_note text,
  p_counter_department text,p_official_reference text,p_official_fee_paid numeric,p_location jsonb,p_client_operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid()); v_visit public.field_visits%rowtype; v_assignment public.field_assignments%rowtype; v_receipt public.field_sync_receipts%rowtype;
  v_location jsonb; v_result jsonb; v_fingerprint text;
begin
  if v_actor is null or not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then raise insufficient_privilege using message='ENJAZ_FIELD_WORKSPACE_FORBIDDEN'; end if;
  if p_client_operation_id is null then raise invalid_parameter_value using message='ENJAZ_FIELD_OPERATION_ID_REQUIRED'; end if;
  if p_outcome not in ('completed','could_not_complete') then raise invalid_parameter_value using message='ENJAZ_FIELD_OUTCOME_INVALID'; end if;
  if p_outcome='could_not_complete' and p_failure_reason not in ('office_closed','missing_requirement','payment_issue','authority_delay','rejected','technical_issue','other') then raise invalid_parameter_value using message='ENJAZ_FIELD_FAILURE_REASON_REQUIRED'; end if;
  if p_outcome='completed' and p_failure_reason is not null then raise invalid_parameter_value using message='ENJAZ_FIELD_FAILURE_REASON_UNEXPECTED'; end if;
  if p_official_fee_paid is not null and p_official_fee_paid<=0 then raise invalid_parameter_value using message='ENJAZ_FIELD_OFFICIAL_FEE_INVALID'; end if;
  v_fingerprint:=md5(jsonb_build_object('visitId',p_visit_id,'expectedVersion',p_expected_visit_version,'outcome',p_outcome,'failureReason',p_failure_reason,'outcomeNote',p_outcome_note,'counterDepartment',p_counter_department,'officialReference',p_official_reference,'officialFeePaid',p_official_fee_paid,'location',p_location)::text);
  select * into v_receipt from public.field_sync_receipts r where r.workspace_id=p_workspace_id and r.client_operation_id=p_client_operation_id;
  if found then if v_receipt.payload_fingerprint<>v_fingerprint or v_receipt.operation_type<>'check_out' then raise unique_violation using message='ENJAZ_FIELD_IDEMPOTENCY_CONFLICT'; end if; return v_receipt.result||jsonb_build_object('wasDuplicate',true); end if;
  select * into v_visit from public.field_visits v where v.workspace_id=p_workspace_id and v.id=p_visit_id for update;
  if not found then raise no_data_found using message='ENJAZ_FIELD_VISIT_NOT_FOUND'; end if;
  if v_visit.version<>p_expected_visit_version then raise serialization_failure using message='ENJAZ_FIELD_VISIT_STALE'; end if;
  if v_visit.status<>'checked_in' then raise invalid_parameter_value using message='ENJAZ_FIELD_VISIT_ALREADY_FINISHED'; end if;
  select * into v_assignment from public.field_assignments a where a.workspace_id=p_workspace_id and a.id=v_visit.assignment_id for update;
  if v_assignment.assigned_user_id<>v_actor then raise insufficient_privilege using message='ENJAZ_FIELD_NOT_ASSIGNED_ACTOR'; end if;
  v_location:=private.validate_field_location_v1(p_workspace_id,p_location);
  update public.field_visits set status=p_outcome,check_out_at=now(),check_out_location=v_location,
    counter_department=nullif(btrim(coalesce(p_counter_department,'')),''),official_reference=nullif(btrim(coalesce(p_official_reference,'')),''),official_fee_paid=p_official_fee_paid,
    failure_reason=case when p_outcome='could_not_complete' then p_failure_reason else null end,outcome_note=nullif(btrim(coalesce(p_outcome_note,'')),''),completed_by=v_actor,version=version+1,updated_at=now()
  where workspace_id=p_workspace_id and id=p_visit_id returning * into v_visit;
  update public.field_assignments set status='visit_complete',version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=v_assignment.id returning * into v_assignment;
  v_result:=jsonb_build_object('visitId',v_visit.id,'visitStatus',v_visit.status,'visitVersion',v_visit.version,'assignmentId',v_assignment.id,'assignmentStatus',v_assignment.status,'assignmentVersion',v_assignment.version,'checkedOutAt',v_visit.check_out_at,'officialFeeEvidenceOnly',p_official_fee_paid is not null,'wasDuplicate',false);
  insert into public.field_sync_receipts(workspace_id,client_operation_id,operation_type,target_id,payload_fingerprint,result,created_by)
  values(p_workspace_id,p_client_operation_id,'check_out',v_visit.id,v_fingerprint,v_result,v_actor);
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'field.visit.'||p_outcome,'field_visit',v_visit.id,'Field visit finished',jsonb_build_object('assignmentId',v_assignment.id,'transactionId',v_visit.transaction_id,'outcome',p_outcome,'failureReason',v_visit.failure_reason,'officialFeeEvidenceOnly',p_official_fee_paid));
  return v_result;
end;
$$;

create or replace function private.add_field_visit_evidence_v1_impl(
  p_workspace_id uuid,p_visit_id uuid,p_expected_visit_version integer,p_evidence_type text,p_document_id uuid,p_note text,p_client_operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid()); v_visit public.field_visits%rowtype; v_assignment public.field_assignments%rowtype; v_evidence public.field_visit_evidence%rowtype; v_receipt public.field_sync_receipts%rowtype; v_result jsonb; v_fingerprint text;
begin
  if v_actor is null or not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then raise insufficient_privilege using message='ENJAZ_FIELD_WORKSPACE_FORBIDDEN'; end if;
  if p_client_operation_id is null then raise invalid_parameter_value using message='ENJAZ_FIELD_OPERATION_ID_REQUIRED'; end if;
  if p_evidence_type not in ('photo','document','receipt','other') then raise invalid_parameter_value using message='ENJAZ_FIELD_EVIDENCE_TYPE_INVALID'; end if;
  if p_evidence_type in ('photo','document','receipt') and p_document_id is null then raise invalid_parameter_value using message='ENJAZ_FIELD_EVIDENCE_DOCUMENT_REQUIRED'; end if;
  v_fingerprint:=md5(jsonb_build_object('visitId',p_visit_id,'expectedVersion',p_expected_visit_version,'evidenceType',p_evidence_type,'documentId',p_document_id,'note',p_note)::text);
  select * into v_receipt from public.field_sync_receipts r where r.workspace_id=p_workspace_id and r.client_operation_id=p_client_operation_id;
  if found then if v_receipt.payload_fingerprint<>v_fingerprint or v_receipt.operation_type<>'evidence' then raise unique_violation using message='ENJAZ_FIELD_IDEMPOTENCY_CONFLICT'; end if; return v_receipt.result||jsonb_build_object('wasDuplicate',true); end if;
  select * into v_visit from public.field_visits v where v.workspace_id=p_workspace_id and v.id=p_visit_id for update;
  if not found then raise no_data_found using message='ENJAZ_FIELD_VISIT_NOT_FOUND'; end if;
  if v_visit.version<>p_expected_visit_version then raise serialization_failure using message='ENJAZ_FIELD_VISIT_STALE'; end if;
  select * into v_assignment from public.field_assignments a where a.workspace_id=p_workspace_id and a.id=v_visit.assignment_id;
  if v_assignment.assigned_user_id<>v_actor then raise insufficient_privilege using message='ENJAZ_FIELD_NOT_ASSIGNED_ACTOR'; end if;
  if p_document_id is not null and not exists(select 1 from public.documents d where d.workspace_id=p_workspace_id and d.id=p_document_id and d.transaction_id=v_visit.transaction_id and d.status<>'failed') then raise foreign_key_violation using message='ENJAZ_FIELD_EVIDENCE_DOCUMENT_MISMATCH'; end if;
  insert into public.field_visit_evidence(workspace_id,visit_id,transaction_id,document_id,evidence_type,note,captured_by)
  values(p_workspace_id,v_visit.id,v_visit.transaction_id,p_document_id,p_evidence_type,nullif(btrim(coalesce(p_note,'')),''),v_actor) returning * into v_evidence;
  update public.field_visits set version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=p_visit_id returning * into v_visit;
  v_result:=jsonb_build_object('evidenceId',v_evidence.id,'visitId',v_visit.id,'visitVersion',v_visit.version,'documentId',v_evidence.document_id,'evidenceType',v_evidence.evidence_type,'wasDuplicate',false);
  insert into public.field_sync_receipts(workspace_id,client_operation_id,operation_type,target_id,payload_fingerprint,result,created_by)
  values(p_workspace_id,p_client_operation_id,'evidence',v_evidence.id,v_fingerprint,v_result,v_actor);
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'field.visit.evidence_added','field_visit_evidence',v_evidence.id,'Field visit evidence attached',jsonb_build_object('visitId',v_visit.id,'transactionId',v_visit.transaction_id,'documentId',v_evidence.document_id,'evidenceType',v_evidence.evidence_type));
  return v_result;
end;
$$;

create or replace function private.handoff_field_assignment_v1_impl(
  p_workspace_id uuid,p_assignment_id uuid,p_expected_version integer,p_note text,p_client_operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid()); v_assignment public.field_assignments%rowtype; v_receipt public.field_sync_receipts%rowtype; v_result jsonb; v_fingerprint text;
begin
  if v_actor is null or not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then raise insufficient_privilege using message='ENJAZ_FIELD_WORKSPACE_FORBIDDEN'; end if;
  if p_client_operation_id is null then raise invalid_parameter_value using message='ENJAZ_FIELD_OPERATION_ID_REQUIRED'; end if;
  if char_length(btrim(coalesce(p_note,''))) not between 3 and 1200 then raise invalid_parameter_value using message='ENJAZ_FIELD_HANDOFF_NOTE_INVALID'; end if;
  v_fingerprint:=md5(jsonb_build_object('assignmentId',p_assignment_id,'expectedVersion',p_expected_version,'note',btrim(p_note))::text);
  select * into v_receipt from public.field_sync_receipts r where r.workspace_id=p_workspace_id and r.client_operation_id=p_client_operation_id;
  if found then if v_receipt.payload_fingerprint<>v_fingerprint or v_receipt.operation_type<>'handoff' then raise unique_violation using message='ENJAZ_FIELD_IDEMPOTENCY_CONFLICT'; end if; return v_receipt.result||jsonb_build_object('wasDuplicate',true); end if;
  select * into v_assignment from public.field_assignments a where a.workspace_id=p_workspace_id and a.id=p_assignment_id for update;
  if not found then raise no_data_found using message='ENJAZ_FIELD_ASSIGNMENT_NOT_FOUND'; end if;
  if v_assignment.version<>p_expected_version then raise serialization_failure using message='ENJAZ_FIELD_ASSIGNMENT_STALE'; end if;
  if v_assignment.assigned_user_id<>v_actor then raise insufficient_privilege using message='ENJAZ_FIELD_NOT_ASSIGNED_ACTOR'; end if;
  if v_assignment.status<>'visit_complete' then raise invalid_parameter_value using message='ENJAZ_FIELD_HANDOFF_NOT_READY'; end if;
  update public.field_assignments set status='handoff_complete',version=version+1,updated_at=now(),handoff_direction='field_to_office',handoff_note=btrim(p_note),handoff_at=now(),handoff_by=v_actor
  where workspace_id=p_workspace_id and id=p_assignment_id returning * into v_assignment;
  v_result:=jsonb_build_object('assignmentId',v_assignment.id,'status',v_assignment.status,'version',v_assignment.version,'handoffDirection','field_to_office','wasDuplicate',false);
  insert into public.field_sync_receipts(workspace_id,client_operation_id,operation_type,target_id,payload_fingerprint,result,created_by)
  values(p_workspace_id,p_client_operation_id,'handoff',v_assignment.id,v_fingerprint,v_result,v_actor);
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'field.assignment.handed_off','field_assignment',v_assignment.id,'Field assignment handed back to office',jsonb_build_object('note',btrim(p_note),'version',v_assignment.version));
  return v_result;
end;
$$;

create or replace function public.get_field_operations_context_v1(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then raise insufficient_privilege using message='ENJAZ_FIELD_WORKSPACE_FORBIDDEN'; end if;
  return jsonb_build_object(
    'authority','field_assignments_visits_evidence_receipts',
    'transactionWriteAuthority','none',
    'workflowWriteAuthority','existing_workflow_rpc_only',
    'automationWriteAuthority','existing_automation_rpc_only',
    'financeWriteAuthority','none',
    'locationPolicy',coalesce((select ws.field_operations_policy->>'locationEvidence' from public.workspace_settings ws where ws.workspace_id=p_workspace_id),'disabled'),
    'metrics',jsonb_build_object(
      'activeTransactions',(select count(*) from public.transactions t where t.workspace_id=p_workspace_id and t.deleted_at is null and t.archived_at is null and t.status='active'),
      'stalledTransactions',(select count(*) from public.transactions t where t.workspace_id=p_workspace_id and t.deleted_at is null and t.archived_at is null and t.status='stalled'),
      'highCriticalBlockers',(select count(*) from public.transaction_blockers b where b.workspace_id=p_workspace_id and b.status='open' and b.severity in ('high','critical')),
      'pendingAutomationApprovals',(select count(*) from public.automation_approval_requests a where a.workspace_id=p_workspace_id and a.status='pending'),
      'queuedAssignments',(select count(*) from public.field_assignments a where a.workspace_id=p_workspace_id and a.status='queued'),
      'activeVisits',(select count(*) from public.field_visits v where v.workspace_id=p_workspace_id and v.status='checked_in')
    ),
    'members',coalesce((select jsonb_agg(jsonb_build_object('userId',wm.user_id,'displayName',coalesce(p.display_name,'عضو مساحة العمل')) order by coalesce(p.display_name,''),wm.user_id) from public.workspace_memberships wm left join public.profiles p on p.id=wm.user_id where wm.workspace_id=p_workspace_id),'[]'::jsonb),
    'assignments',coalesce((select jsonb_agg(row_data order by scheduled_for,priority_rank desc,id) from (
      select a.id,a.scheduled_for,a.priority,case a.priority when 'urgent' then 4 when 'high' then 3 when 'normal' then 2 else 1 end priority_rank,
        jsonb_build_object(
          'id',a.id,'transactionId',a.transaction_id,'transactionType',t.type,'transactionStatus',t.status,'companyName',c.legal_name,
          'assignedUserId',a.assigned_user_id,'assignedUserName',coalesce(p.display_name,'عضو مساحة العمل'),'scheduledFor',a.scheduled_for,
          'destinationLabel',a.destination_label,'department',a.department,'priority',a.priority,'status',a.status,'version',a.version,
          'openBlockers',(select count(*) from public.transaction_blockers b where b.workspace_id=a.workspace_id and b.transaction_id=a.transaction_id and b.status='open'),
          'nextRequiredAction',coalesce(
            (select 'حل المانع: '||b.title from public.transaction_blockers b where b.workspace_id=a.workspace_id and b.transaction_id=a.transaction_id and b.status='open' order by case b.severity when 'critical' then 4 when 'high' then 3 when 'medium' then 2 else 1 end desc,b.opened_at limit 1),
            (select 'متابعة: '||f.title from public.transaction_followups f where f.workspace_id=a.workspace_id and f.transaction_id=a.transaction_id and f.status='open' order by f.due_at limit 1),
            (select 'متابعة سير العمل · المرحلة '||wi.current_stage_position::text from public.workflow_instances wi where wi.workspace_id=a.workspace_id and wi.transaction_id=a.transaction_id and wi.status='active' order by wi.started_at desc limit 1),
            'مراجعة المعاملة وتحديد الخطوة التالية'
          )
        ) row_data
      from public.field_assignments a
      join public.transactions t on t.workspace_id=a.workspace_id and t.id=a.transaction_id
      join public.companies c on c.workspace_id=t.workspace_id and c.id=t.company_id
      left join public.profiles p on p.id=a.assigned_user_id
      where a.workspace_id=p_workspace_id and a.status<>'cancelled'
      order by a.scheduled_for,a.created_at limit 200
    ) q),'[]'::jsonb),
    'visits',coalesce((select jsonb_agg(row_data order by check_in_at desc,id desc) from (
      select v.id,v.check_in_at,jsonb_build_object('id',v.id,'assignmentId',v.assignment_id,'transactionId',v.transaction_id,'assignedUserId',v.assigned_user_id,
        'status',v.status,'version',v.version,'checkInAt',v.check_in_at,'checkOutAt',v.check_out_at,'counterDepartment',v.counter_department,
        'officialReference',v.official_reference,'officialFeePaid',v.official_fee_paid,'failureReason',v.failure_reason,'outcomeNote',v.outcome_note,
        'checkInLocationRecorded',v.check_in_location is not null,'checkOutLocationRecorded',v.check_out_location is not null,
        'evidenceCount',(select count(*) from public.field_visit_evidence e where e.workspace_id=v.workspace_id and e.visit_id=v.id)) row_data
      from public.field_visits v where v.workspace_id=p_workspace_id order by v.check_in_at desc,v.id desc limit 100
    ) q),'[]'::jsonb)
  );
end;
$$;

create or replace function public.set_field_location_policy_v1(p_workspace_id uuid,p_policy text) returns jsonb language sql security invoker set search_path='' as $$ select private.set_field_location_policy_v1_impl(p_workspace_id,p_policy); $$;
create or replace function public.upsert_field_assignment_v1(p_workspace_id uuid,p_assignment_id uuid,p_expected_version integer,p_transaction_id uuid,p_assigned_user_id uuid,p_scheduled_for date,p_destination_label text,p_department text,p_priority text) returns jsonb language sql security invoker set search_path='' as $$ select private.upsert_field_assignment_v1_impl(p_workspace_id,p_assignment_id,p_expected_version,p_transaction_id,p_assigned_user_id,p_scheduled_for,p_destination_label,p_department,p_priority); $$;
create or replace function public.reassign_field_assignment_v1(p_workspace_id uuid,p_assignment_id uuid,p_expected_version integer,p_assigned_user_id uuid,p_reason text,p_client_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.reassign_field_assignment_v1_impl(p_workspace_id,p_assignment_id,p_expected_version,p_assigned_user_id,p_reason,p_client_operation_id); $$;
create or replace function public.start_field_visit_v1(p_workspace_id uuid,p_assignment_id uuid,p_expected_assignment_version integer,p_location jsonb,p_client_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.start_field_visit_v1_impl(p_workspace_id,p_assignment_id,p_expected_assignment_version,p_location,p_client_operation_id); $$;
create or replace function public.finish_field_visit_v1(p_workspace_id uuid,p_visit_id uuid,p_expected_visit_version integer,p_outcome text,p_failure_reason text,p_outcome_note text,p_counter_department text,p_official_reference text,p_official_fee_paid numeric,p_location jsonb,p_client_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.finish_field_visit_v1_impl(p_workspace_id,p_visit_id,p_expected_visit_version,p_outcome,p_failure_reason,p_outcome_note,p_counter_department,p_official_reference,p_official_fee_paid,p_location,p_client_operation_id); $$;
create or replace function public.add_field_visit_evidence_v1(p_workspace_id uuid,p_visit_id uuid,p_expected_visit_version integer,p_evidence_type text,p_document_id uuid,p_note text,p_client_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.add_field_visit_evidence_v1_impl(p_workspace_id,p_visit_id,p_expected_visit_version,p_evidence_type,p_document_id,p_note,p_client_operation_id); $$;
create or replace function public.handoff_field_assignment_v1(p_workspace_id uuid,p_assignment_id uuid,p_expected_version integer,p_note text,p_client_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.handoff_field_assignment_v1_impl(p_workspace_id,p_assignment_id,p_expected_version,p_note,p_client_operation_id); $$;

grant usage on schema private to authenticated;
revoke all on function private.validate_field_location_v1(uuid,jsonb) from public,anon;
revoke all on function private.set_field_location_policy_v1_impl(uuid,text) from public,anon;
revoke all on function private.upsert_field_assignment_v1_impl(uuid,uuid,integer,uuid,uuid,date,text,text,text) from public,anon;
revoke all on function private.reassign_field_assignment_v1_impl(uuid,uuid,integer,uuid,text,uuid) from public,anon;
revoke all on function private.start_field_visit_v1_impl(uuid,uuid,integer,jsonb,uuid) from public,anon;
revoke all on function private.finish_field_visit_v1_impl(uuid,uuid,integer,text,text,text,text,text,numeric,jsonb,uuid) from public,anon;
revoke all on function private.add_field_visit_evidence_v1_impl(uuid,uuid,integer,text,uuid,text,uuid) from public,anon;
revoke all on function private.handoff_field_assignment_v1_impl(uuid,uuid,integer,text,uuid) from public,anon;
grant execute on function private.validate_field_location_v1(uuid,jsonb) to authenticated;
grant execute on function private.set_field_location_policy_v1_impl(uuid,text) to authenticated;
grant execute on function private.upsert_field_assignment_v1_impl(uuid,uuid,integer,uuid,uuid,date,text,text,text) to authenticated;
grant execute on function private.reassign_field_assignment_v1_impl(uuid,uuid,integer,uuid,text,uuid) to authenticated;
grant execute on function private.start_field_visit_v1_impl(uuid,uuid,integer,jsonb,uuid) to authenticated;
grant execute on function private.finish_field_visit_v1_impl(uuid,uuid,integer,text,text,text,text,text,numeric,jsonb,uuid) to authenticated;
grant execute on function private.add_field_visit_evidence_v1_impl(uuid,uuid,integer,text,uuid,text,uuid) to authenticated;
grant execute on function private.handoff_field_assignment_v1_impl(uuid,uuid,integer,text,uuid) to authenticated;

revoke all on function public.set_field_location_policy_v1(uuid,text) from public,anon;
revoke all on function public.upsert_field_assignment_v1(uuid,uuid,integer,uuid,uuid,date,text,text,text) from public,anon;
revoke all on function public.reassign_field_assignment_v1(uuid,uuid,integer,uuid,text,uuid) from public,anon;
revoke all on function public.start_field_visit_v1(uuid,uuid,integer,jsonb,uuid) from public,anon;
revoke all on function public.finish_field_visit_v1(uuid,uuid,integer,text,text,text,text,text,numeric,jsonb,uuid) from public,anon;
revoke all on function public.add_field_visit_evidence_v1(uuid,uuid,integer,text,uuid,text,uuid) from public,anon;
revoke all on function public.handoff_field_assignment_v1(uuid,uuid,integer,text,uuid) from public,anon;
revoke all on function public.get_field_operations_context_v1(uuid) from public,anon;
grant execute on function public.set_field_location_policy_v1(uuid,text) to authenticated;
grant execute on function public.upsert_field_assignment_v1(uuid,uuid,integer,uuid,uuid,date,text,text,text) to authenticated;
grant execute on function public.reassign_field_assignment_v1(uuid,uuid,integer,uuid,text,uuid) to authenticated;
grant execute on function public.start_field_visit_v1(uuid,uuid,integer,jsonb,uuid) to authenticated;
grant execute on function public.finish_field_visit_v1(uuid,uuid,integer,text,text,text,text,text,numeric,jsonb,uuid) to authenticated;
grant execute on function public.add_field_visit_evidence_v1(uuid,uuid,integer,text,uuid,text,uuid) to authenticated;
grant execute on function public.handoff_field_assignment_v1(uuid,uuid,integer,text,uuid) to authenticated;
grant execute on function public.get_field_operations_context_v1(uuid) to authenticated;

alter table public.field_assignments enable row level security;
alter table public.field_visits enable row level security;
alter table public.field_visit_evidence enable row level security;
alter table public.field_sync_receipts enable row level security;
create policy field_assignments_select_workspace on public.field_assignments for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy field_visits_select_workspace on public.field_visits for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy field_visit_evidence_select_workspace on public.field_visit_evidence for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy field_sync_receipts_select_own on public.field_sync_receipts for select to authenticated using ((select auth.uid()) is not null and created_by=(select auth.uid()) and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));

revoke all on table public.field_assignments,public.field_visits,public.field_visit_evidence,public.field_sync_receipts from anon,authenticated;
grant select on table public.field_assignments,public.field_visits,public.field_visit_evidence to authenticated;
grant select on table public.field_sync_receipts to authenticated;

commit;
