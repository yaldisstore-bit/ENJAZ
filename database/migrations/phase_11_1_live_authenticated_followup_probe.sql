-- ENJAZ Phase 11.1 — authenticated Real Cloud follow-up lifecycle destruction probe
-- Requires phase_11_1_followup_lifecycle_authority.sql and leaves zero business-data residue.
begin;

create or replace function private.enjaz_phase111f_assert(p_condition boolean, p_message text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'ENJAZ_PHASE111_FOLLOWUP_PROBE_FAILED: %', p_message;
  end if;
end;
$$;
revoke all on function private.enjaz_phase111f_assert(boolean,text) from public, anon;
grant execute on function private.enjaz_phase111f_assert(boolean,text) to authenticated;

create or replace function private.enjaz_phase111f_expect_direct_lifecycle_block(p_workspace_id uuid, p_followup_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  begin
    update public.transaction_followups
    set snoozed_until = now() + interval '2 hours'
    where workspace_id = p_workspace_id and id = p_followup_id;
    raise exception 'ENJAZ_PHASE111_FOLLOWUP_PROBE_FAILED: direct lifecycle update unexpectedly succeeded';
  exception
    when insufficient_privilege or invalid_parameter_value then null;
  end;
end;
$$;
revoke all on function private.enjaz_phase111f_expect_direct_lifecycle_block(uuid,uuid) from public, anon;
grant execute on function private.enjaz_phase111f_expect_direct_lifecycle_block(uuid,uuid) to authenticated;

create or replace function private.enjaz_phase111f_expect_cross_workspace_denied(p_workspace_id uuid, p_followup_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  begin
    perform public.mutate_transaction_followup_state_v1(p_workspace_id, p_followup_id, 'cancel', null);
    raise exception 'ENJAZ_PHASE111_FOLLOWUP_PROBE_FAILED: outsider mutation unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
revoke all on function private.enjaz_phase111f_expect_cross_workspace_denied(uuid,uuid) from public, anon;
grant execute on function private.enjaz_phase111f_expect_cross_workspace_denied(uuid,uuid) to authenticated;

select set_config('p111f.tx', (
  select t.id::text
  from public.transactions t
  join public.workspace_memberships wm on wm.workspace_id = t.workspace_id
  order by t.created_at, t.id
  limit 1
), true);
select private.enjaz_phase111f_assert(nullif(current_setting('p111f.tx', true), '') is not null, 'no transaction available');
select set_config('p111f.ws', (select workspace_id::text from public.transactions where id = current_setting('p111f.tx')::uuid), true);
select set_config('p111f.owner', (
  select wm.user_id::text from public.workspace_memberships wm
  where wm.workspace_id = current_setting('p111f.ws')::uuid
  order by wm.created_at, wm.user_id limit 1
), true);
select set_config('p111f.outsider', (
  select wm.user_id::text from public.workspace_memberships wm
  where wm.workspace_id <> current_setting('p111f.ws')::uuid
    and wm.user_id <> current_setting('p111f.owner')::uuid
  order by wm.created_at, wm.workspace_id limit 1
), true);
select private.enjaz_phase111f_assert(nullif(current_setting('p111f.outsider', true), '') is not null, 'no outsider identity available');
select set_config('p111f.followup', gen_random_uuid()::text, true);

select set_config('request.jwt.claims', jsonb_build_object('role','authenticated','sub',current_setting('p111f.owner'))::text, true);
select set_config('request.jwt.claim.sub', current_setting('p111f.owner'), true);
set local role authenticated;
select private.enjaz_phase111f_assert(auth.uid() = current_setting('p111f.owner')::uuid, 'owner auth.uid mismatch');

insert into public.transaction_followups(id, workspace_id, transaction_id, title, due_at)
values(
  current_setting('p111f.followup')::uuid,
  current_setting('p111f.ws')::uuid,
  current_setting('p111f.tx')::uuid,
  '__ENJAZ_PHASE111_FOLLOWUP_PROBE__',
  now() + interval '1 day'
);

select private.enjaz_phase111f_assert(
  (select status='open' and completed_at is null and completed_by is null and snoozed_until is null
   from public.transaction_followups where id=current_setting('p111f.followup')::uuid),
  'initial follow-up state invalid'
);

-- Ordinary non-lifecycle browser edit remains allowed.
update public.transaction_followups
set title = '__ENJAZ_PHASE111_FOLLOWUP_PROBE_EDITED__'
where workspace_id=current_setting('p111f.ws')::uuid and id=current_setting('p111f.followup')::uuid;
select private.enjaz_phase111f_assert(
  (select title='__ENJAZ_PHASE111_FOLLOWUP_PROBE_EDITED__' from public.transaction_followups where id=current_setting('p111f.followup')::uuid),
  'ordinary follow-up edit was incorrectly blocked'
);

-- Lifecycle changes must fail when attempted directly from the browser role.
select private.enjaz_phase111f_expect_direct_lifecycle_block(
  current_setting('p111f.ws')::uuid,
  current_setting('p111f.followup')::uuid
);
select private.enjaz_phase111f_assert(
  (select snoozed_until is null from public.transaction_followups where id=current_setting('p111f.followup')::uuid),
  'direct lifecycle update leaked through guard'
);

select public.mutate_transaction_followup_state_v1(
  current_setting('p111f.ws')::uuid,
  current_setting('p111f.followup')::uuid,
  'snooze',
  now() + interval '2 hours'
);
select private.enjaz_phase111f_assert(
  (select status='open' and snoozed_until > now() from public.transaction_followups where id=current_setting('p111f.followup')::uuid),
  'governed snooze failed'
);

select public.mutate_transaction_followup_state_v1(
  current_setting('p111f.ws')::uuid,
  current_setting('p111f.followup')::uuid,
  'wake',
  null
);
select private.enjaz_phase111f_assert(
  (select status='open' and snoozed_until is null from public.transaction_followups where id=current_setting('p111f.followup')::uuid),
  'governed wake failed'
);

select set_config('request.jwt.claims', jsonb_build_object('role','authenticated','sub',current_setting('p111f.outsider'))::text, true);
select set_config('request.jwt.claim.sub', current_setting('p111f.outsider'), true);
select private.enjaz_phase111f_assert(auth.uid() = current_setting('p111f.outsider')::uuid, 'outsider auth.uid mismatch');
select private.enjaz_phase111f_expect_cross_workspace_denied(
  current_setting('p111f.ws')::uuid,
  current_setting('p111f.followup')::uuid
);

select set_config('request.jwt.claims', jsonb_build_object('role','authenticated','sub',current_setting('p111f.owner'))::text, true);
select set_config('request.jwt.claim.sub', current_setting('p111f.owner'), true);
select public.mutate_transaction_followup_state_v1(
  current_setting('p111f.ws')::uuid,
  current_setting('p111f.followup')::uuid,
  'complete',
  null
);
select private.enjaz_phase111f_assert(
  (select status='completed' and completed_at is not null and completed_by=current_setting('p111f.owner')::uuid and snoozed_until is null
   from public.transaction_followups where id=current_setting('p111f.followup')::uuid),
  'governed completion evidence failed'
);

reset role;
delete from public.transaction_followups where id=current_setting('p111f.followup')::uuid;
select private.enjaz_phase111f_assert(not exists(
  select 1 from public.transaction_followups where id=current_setting('p111f.followup')::uuid
), 'follow-up probe residue');

drop function private.enjaz_phase111f_expect_cross_workspace_denied(uuid,uuid);
drop function private.enjaz_phase111f_expect_direct_lifecycle_block(uuid,uuid);
drop function private.enjaz_phase111f_assert(boolean,text);
commit;
