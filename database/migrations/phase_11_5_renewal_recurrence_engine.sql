-- ENJAZ Phase 11.5-C — recurring renewal occurrence projection.
-- `renewals` remains canonical recurrence truth; occurrence rows preserve governed provenance.
begin;

create table public.renewal_occurrences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  renewal_id uuid not null,
  occurrence_sequence integer not null check (occurrence_sequence > 0),
  anchor_due_date date not null,
  due_date date not null,
  recurrence_rule_snapshot text not null check (char_length(btrim(recurrence_rule_snapshot)) between 1 and 160),
  source_renewal_version integer not null check (source_renewal_version > 0),
  status text not null default 'pending' check (status in ('pending','completed')),
  materialized_by uuid not null references auth.users(id) on delete restrict,
  materialized_at timestamptz not null default now(),
  completed_by uuid references auth.users(id) on delete restrict,
  completed_at timestamptz,
  constraint renewal_occurrences_workspace_id_id_key unique(workspace_id,id),
  constraint renewal_occurrences_renewal_fk foreign key(workspace_id,renewal_id)
    references public.renewals(workspace_id,id) on delete cascade,
  constraint renewal_occurrences_sequence_key unique(workspace_id,renewal_id,occurrence_sequence),
  constraint renewal_occurrences_due_key unique(workspace_id,renewal_id,due_date),
  constraint renewal_occurrences_completion_check check (
    (status='pending' and completed_by is null and completed_at is null)
    or (status='completed' and completed_by is not null and completed_at is not null)
  )
);
create index renewal_occurrences_due_idx on public.renewal_occurrences(workspace_id,due_date,status);
create index renewal_occurrences_root_idx on public.renewal_occurrences(workspace_id,renewal_id,occurrence_sequence desc);

alter table public.renewal_occurrences enable row level security;
revoke all on table public.renewal_occurrences from public,anon,authenticated;
grant select on table public.renewal_occurrences to authenticated;
grant select,insert,update,delete on table public.renewal_occurrences to service_role;
create policy renewal_occurrences_member_select on public.renewal_occurrences
for select to authenticated using (
  exists(select 1 from public.workspace_memberships wm where wm.workspace_id=renewal_occurrences.workspace_id and wm.user_id=(select auth.uid()))
);

create or replace function private.m10_normalize_recurrence_rule_v1(p_rule text)
returns text language plpgsql immutable security invoker set search_path=''
as $$
declare v text:=upper(regexp_replace(btrim(coalesce(p_rule,'')),'\s+','','g')); begin
  if v !~ '^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(;INTERVAL=([1-9][0-9]{0,2}))?$' then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_RECURRENCE_RULE_UNSUPPORTED';
  end if;
  return v;
end; $$;
revoke all on function private.m10_normalize_recurrence_rule_v1(text) from public,anon,authenticated;

create or replace function private.m10_renewal_occurrence_date_v1(p_anchor date,p_rule text,p_sequence integer)
returns date language plpgsql immutable security invoker set search_path=''
as $$
declare
  v_rule text:=private.m10_normalize_recurrence_rule_v1(p_rule);
  v_freq text:=substring(v_rule from 'FREQ=([A-Z]+)');
  v_interval integer:=coalesce(nullif(substring(v_rule from 'INTERVAL=([0-9]+)'),'')::integer,1);
  v_steps integer;
  v_month date;
  v_last date;
  v_day integer:=extract(day from p_anchor)::integer;
begin
  if p_anchor is null or p_sequence is null or p_sequence<1 or p_sequence>100000 then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_RECURRENCE_SEQUENCE_INVALID';
  end if;
  v_steps:=(p_sequence-1)*v_interval;
  if v_freq='DAILY' then return p_anchor+v_steps; end if;
  if v_freq='WEEKLY' then return p_anchor+(v_steps*7); end if;
  if v_freq='MONTHLY' then
    v_month:=(date_trunc('month',p_anchor::timestamp)::date + make_interval(months=>v_steps))::date;
  else
    v_month:=(date_trunc('month',p_anchor::timestamp)::date + make_interval(months=>v_steps*12))::date;
  end if;
  v_last:=(v_month+interval '1 month - 1 day')::date;
  return make_date(extract(year from v_month)::integer,extract(month from v_month)::integer,least(v_day,extract(day from v_last)::integer));
end; $$;
revoke all on function private.m10_renewal_occurrence_date_v1(date,text,integer) from public,anon,authenticated;

create or replace function private.materialize_renewal_occurrence_v1_impl(
  p_workspace_id uuid,p_renewal_id uuid,p_operation_id uuid,p_expected_version integer
) returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
  v_actor uuid;
  v_renewal public.renewals%rowtype;
  v_rule text;
  v_seq integer;
  v_anchor date;
  v public.renewal_occurrences%rowtype;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_payload jsonb;
  v_response jsonb;
begin
  v_actor:=private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_renewal_id is null or p_operation_id is null or p_expected_version is null or p_expected_version<1 then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_COMMAND_INVALID'; end if;
  v_payload:=jsonb_build_object('renewalId',p_renewal_id,'expectedVersion',p_expected_version);
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_operation_id::text,0));
  select * into v_receipt from private.scheduling_command_receipts r where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'renewal_occurrence_materialize' or v_receipt.entity_id<>p_renewal_id or v_receipt.actor_user_id<>v_actor or v_receipt.request_payload<>v_payload then raise unique_violation using message='ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT'; end if;
    return v_receipt.response_payload||jsonb_build_object('wasDuplicate',true);
  end if;
  select * into v_renewal from public.renewals r where r.workspace_id=p_workspace_id and r.id=p_renewal_id for update;
  if not found then raise no_data_found using message='ENJAZ_SCHEDULING_RENEWAL_NOT_FOUND'; end if;
  if v_renewal.version<>p_expected_version then raise serialization_failure using message='ENJAZ_SCHEDULING_STALE_VERSION'; end if;
  if v_renewal.status<>'active' then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_RENEWAL_TERMINAL'; end if;
  if v_renewal.recurrence_rule is null then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_RENEWAL_NOT_RECURRING'; end if;
  v_rule:=private.m10_normalize_recurrence_rule_v1(v_renewal.recurrence_rule);
  select coalesce(max(o.occurrence_sequence),0)+1,coalesce(min(o.anchor_due_date),v_renewal.due_date) into v_seq,v_anchor
  from public.renewal_occurrences o where o.workspace_id=p_workspace_id and o.renewal_id=p_renewal_id;
  if exists(select 1 from public.renewal_occurrences o where o.workspace_id=p_workspace_id and o.renewal_id=p_renewal_id and o.due_date=v_renewal.due_date) then
    select * into v from public.renewal_occurrences o where o.workspace_id=p_workspace_id and o.renewal_id=p_renewal_id and o.due_date=v_renewal.due_date;
  else
    if private.m10_renewal_occurrence_date_v1(v_anchor,v_rule,v_seq)<>v_renewal.due_date then raise serialization_failure using message='ENJAZ_SCHEDULING_RENEWAL_RECURRENCE_DRIFT'; end if;
    insert into public.renewal_occurrences(workspace_id,renewal_id,occurrence_sequence,anchor_due_date,due_date,recurrence_rule_snapshot,source_renewal_version,materialized_by)
    values(p_workspace_id,p_renewal_id,v_seq,v_anchor,v_renewal.due_date,v_rule,v_renewal.version,v_actor) returning * into v;
  end if;
  if v.status<>'pending' then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_TERMINAL'; end if;
  if v.recurrence_rule_snapshot<>v_rule then raise serialization_failure using message='ENJAZ_SCHEDULING_RENEWAL_RECURRENCE_CHANGED'; end if;
  v_response:=jsonb_build_object('schema','enjaz.scheduling-renewal-occurrence.v1','id',v.id,'workspaceId',v.workspace_id,'renewalId',v.renewal_id,
    'sequence',v.occurrence_sequence,'anchorDueDate',v.anchor_due_date,'dueDate',v.due_date,'recurrenceRule',v.recurrence_rule_snapshot,
    'sourceRenewalVersion',v.source_renewal_version,'status',v.status,'wasDuplicate',false);
  insert into private.scheduling_command_receipts(workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload)
  values(p_workspace_id,p_operation_id,'renewal_occurrence_materialize',p_renewal_id,v_actor,v_payload,v_response);
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'scheduling.renewal_occurrence.materialized','renewal_occurrence',v.id,'Recurring renewal occurrence materialized',
    jsonb_build_object('operationId',p_operation_id,'renewalId',p_renewal_id,'sequence',v.occurrence_sequence,'dueDate',v.due_date,'sourceRenewalVersion',v.source_renewal_version));
  return v_response;
end; $$;

create or replace function public.materialize_renewal_occurrence_v1(uuid,uuid,uuid,integer)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.materialize_renewal_occurrence_v1_impl($1,$2,$3,$4); $$;
revoke all on function private.materialize_renewal_occurrence_v1_impl(uuid,uuid,uuid,integer) from public,anon;
grant execute on function private.materialize_renewal_occurrence_v1_impl(uuid,uuid,uuid,integer) to authenticated,service_role;
revoke all on function public.materialize_renewal_occurrence_v1(uuid,uuid,uuid,integer) from public,anon,service_role;
grant execute on function public.materialize_renewal_occurrence_v1(uuid,uuid,uuid,integer) to authenticated;

create or replace function private.complete_renewal_occurrence_v1_impl(
  p_workspace_id uuid,p_occurrence_id uuid,p_operation_id uuid,p_expected_renewal_version integer
) returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
  v_actor uuid;
  v_occ public.renewal_occurrences%rowtype;
  v_renewal public.renewals%rowtype;
  v_rule text;
  v_next_date date;
  v_next public.renewal_occurrences%rowtype;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_payload jsonb;
  v_response jsonb;
begin
  v_actor:=private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_occurrence_id is null or p_operation_id is null or p_expected_renewal_version is null or p_expected_renewal_version<1 then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_COMMAND_INVALID'; end if;
  v_payload:=jsonb_build_object('occurrenceId',p_occurrence_id,'expectedRenewalVersion',p_expected_renewal_version);
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_operation_id::text,0));
  select * into v_receipt from private.scheduling_command_receipts r where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'renewal_occurrence_complete' or v_receipt.entity_id<>p_occurrence_id or v_receipt.actor_user_id<>v_actor or v_receipt.request_payload<>v_payload then raise unique_violation using message='ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT'; end if;
    return v_receipt.response_payload||jsonb_build_object('wasDuplicate',true);
  end if;
  select * into v_occ from public.renewal_occurrences o where o.workspace_id=p_workspace_id and o.id=p_occurrence_id for update;
  if not found then raise no_data_found using message='ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_NOT_FOUND'; end if;
  if v_occ.status<>'pending' then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_TERMINAL'; end if;
  select * into v_renewal from public.renewals r where r.workspace_id=p_workspace_id and r.id=v_occ.renewal_id for update;
  if not found or v_renewal.status<>'active' then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_RENEWAL_TERMINAL'; end if;
  if v_renewal.version<>p_expected_renewal_version then raise serialization_failure using message='ENJAZ_SCHEDULING_STALE_VERSION'; end if;
  if v_renewal.due_date<>v_occ.due_date then raise serialization_failure using message='ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_NOT_CURRENT'; end if;
  if v_renewal.recurrence_rule is null then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_RENEWAL_NOT_RECURRING'; end if;
  v_rule:=private.m10_normalize_recurrence_rule_v1(v_renewal.recurrence_rule);
  if v_rule<>v_occ.recurrence_rule_snapshot then raise serialization_failure using message='ENJAZ_SCHEDULING_RENEWAL_RECURRENCE_CHANGED'; end if;
  v_next_date:=private.m10_renewal_occurrence_date_v1(v_occ.anchor_due_date,v_rule,v_occ.occurrence_sequence+1);
  update public.renewal_occurrences set status='completed',completed_by=v_actor,completed_at=now() where workspace_id=p_workspace_id and id=v_occ.id;
  update public.renewals set due_date=v_next_date,last_completed_at=now(),updated_at=now(),version=version+1 where workspace_id=p_workspace_id and id=v_renewal.id returning * into v_renewal;
  insert into public.renewal_occurrences(workspace_id,renewal_id,occurrence_sequence,anchor_due_date,due_date,recurrence_rule_snapshot,source_renewal_version,materialized_by)
  values(p_workspace_id,v_renewal.id,v_occ.occurrence_sequence+1,v_occ.anchor_due_date,v_next_date,v_rule,v_renewal.version,v_actor)
  returning * into v_next;
  v_response:=jsonb_build_object('schema','enjaz.scheduling-renewal-occurrence-completion.v1','occurrenceId',v_occ.id,'renewalId',v_renewal.id,
    'completedDueDate',v_occ.due_date,'nextOccurrenceId',v_next.id,'nextDueDate',v_next.due_date,'renewalVersion',v_renewal.version,'wasDuplicate',false);
  insert into private.scheduling_command_receipts(workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload)
  values(p_workspace_id,p_operation_id,'renewal_occurrence_complete',p_occurrence_id,v_actor,v_payload,v_response);
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'scheduling.renewal_occurrence.completed','renewal_occurrence',v_occ.id,'Recurring renewal occurrence completed and next occurrence advanced',
    jsonb_build_object('operationId',p_operation_id,'renewalId',v_renewal.id,'completedDueDate',v_occ.due_date,'nextDueDate',v_next_date,'newRenewalVersion',v_renewal.version));
  return v_response;
end; $$;

create or replace function public.complete_renewal_occurrence_v1(uuid,uuid,uuid,integer)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.complete_renewal_occurrence_v1_impl($1,$2,$3,$4); $$;
revoke all on function private.complete_renewal_occurrence_v1_impl(uuid,uuid,uuid,integer) from public,anon;
grant execute on function private.complete_renewal_occurrence_v1_impl(uuid,uuid,uuid,integer) to authenticated,service_role;
revoke all on function public.complete_renewal_occurrence_v1(uuid,uuid,uuid,integer) from public,anon,service_role;
grant execute on function public.complete_renewal_occurrence_v1(uuid,uuid,uuid,integer) to authenticated;

commit;
