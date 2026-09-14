-- ENJAZ Phase 11.1 — authenticated Real Cloud notification/follow-up destruction probe
-- Exercises the exact public RPC/RLS boundary and leaves zero business-data residue.
begin;

create or replace function private.enjaz_phase111_probe_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path=''
as $$ begin if not coalesce(p_condition,false) then raise exception 'ENJAZ_PHASE111_PROBE_FAILED: %',p_message; end if; end $$;
revoke all on function private.enjaz_phase111_probe_assert(boolean,text) from public,anon;
grant execute on function private.enjaz_phase111_probe_assert(boolean,text) to authenticated;

create or replace function private.enjaz_phase111_probe_expect(p_case text)
returns void language plpgsql security invoker set search_path=''
as $$
begin
  if p_case='stale_source' then
    begin
      perform public.upsert_in_app_notification_v1(
        current_setting('p111.ws')::uuid,current_setting('p111.owner')::uuid,
        'follow_up','high','__ENJAZ_PHASE111_STALE__','transaction_followup',current_setting('p111.source')::uuid,
        'due.changed',1,now()-interval '2 minutes',now()
      );
      raise exception 'ENJAZ_PHASE111_EXPECTED_STALE_REJECTION';
    exception when serialization_failure then
      if sqlerrm<>'ENJAZ_NOTIFICATION_STALE_SOURCE_VERSION' then raise; end if;
    end;
  elsif p_case='early_wake' then
    begin
      perform public.mutate_in_app_notification_state_v1(
        current_setting('p111.ws')::uuid,current_setting('p111.notification')::uuid,'wake',null
      );
      raise exception 'ENJAZ_PHASE111_EXPECTED_EARLY_WAKE_REJECTION';
    exception when invalid_parameter_value then
      if sqlerrm<>'ENJAZ_NOTIFICATION_NOT_READY_TO_WAKE' then raise; end if;
    end;
  elsif p_case='cancelled_final' then
    begin
      perform public.mutate_in_app_notification_state_v1(
        current_setting('p111.ws')::uuid,current_setting('p111.notification')::uuid,'mark_read',null
      );
      raise exception 'ENJAZ_PHASE111_EXPECTED_CANCELLED_FINAL_REJECTION';
    exception when invalid_parameter_value then
      if sqlerrm<>'ENJAZ_NOTIFICATION_CANCELLED_FINAL' then raise; end if;
    end;
  elsif p_case='foreign_mutation' then
    begin
      perform public.mutate_in_app_notification_state_v1(
        current_setting('p111.ws')::uuid,current_setting('p111.notification')::uuid,'mark_read',null
      );
      raise exception 'ENJAZ_PHASE111_EXPECTED_FOREIGN_REJECTION';
    exception when insufficient_privilege then
      if sqlerrm<>'ENJAZ_NOTIFICATION_WORKSPACE_FORBIDDEN' then raise; end if;
    end;
  else
    raise exception 'ENJAZ_PHASE111_UNKNOWN_PROBE_CASE: %',p_case;
  end if;
end $$;
revoke all on function private.enjaz_phase111_probe_expect(text) from public,anon;
grant execute on function private.enjaz_phase111_probe_expect(text) to authenticated;

select set_config('p111.ws',(
  select w.id::text
  from public.workspaces w
  join public.workspace_memberships wm on wm.workspace_id=w.id and wm.user_id=w.owner_user_id
  order by w.created_at,w.id limit 1
),true);
select private.enjaz_phase111_probe_assert(nullif(current_setting('p111.ws',true),'') is not null,'no workspace with owner membership');
select set_config('p111.owner',(select owner_user_id::text from public.workspaces where id=current_setting('p111.ws')::uuid),true);
select set_config('p111.outsider',(
  select wm.user_id::text from public.workspace_memberships wm
  where wm.workspace_id<>current_setting('p111.ws')::uuid and wm.user_id<>current_setting('p111.owner')::uuid
  order by wm.created_at,wm.workspace_id limit 1
),true);
select private.enjaz_phase111_probe_assert(nullif(current_setting('p111.outsider',true),'') is not null,'no outsider identity');
select set_config('p111.source',gen_random_uuid()::text,true);

with x as (
  select public.upsert_in_app_notification_v1(
    current_setting('p111.ws')::uuid,current_setting('p111.owner')::uuid,
    'follow_up','high','__ENJAZ_PHASE111_NOTIFICATION__','transaction_followup',current_setting('p111.source')::uuid,
    'due.changed',1,now()-interval '2 minutes',now()
  ) body
) select set_config('p111.notification',body->>'id',true) from x;

select private.enjaz_phase111_probe_assert(
  nullif(current_setting('p111.notification',true),'') is not null,
  'authority insert did not return notification id'
);
select private.enjaz_phase111_probe_assert(
  (public.upsert_in_app_notification_v1(
    current_setting('p111.ws')::uuid,current_setting('p111.owner')::uuid,
    'follow_up','high','__ENJAZ_PHASE111_NOTIFICATION__','transaction_followup',current_setting('p111.source')::uuid,
    'due.changed',1,now()-interval '2 minutes',now()
  )->>'wasDuplicate')::boolean,
  'exact source replay did not dedupe'
);
select private.enjaz_phase111_probe_assert(
  (public.upsert_in_app_notification_v1(
    current_setting('p111.ws')::uuid,current_setting('p111.owner')::uuid,
    'follow_up','critical','__ENJAZ_PHASE111_NOTIFICATION_R2__','transaction_followup',current_setting('p111.source')::uuid,
    'due.changed',2,now()-interval '1 minute',now()+interval '1 minute'
  )->>'sourceVersion')::integer=2,
  'newer source revision did not replace canonical authority'
);
select private.enjaz_phase111_probe_assert(
  (select count(*)=1 and max(source_version)=2 and max(priority)='critical'
   from public.in_app_notifications where id=current_setting('p111.notification')::uuid),
  'canonical source revision projection failed'
);
select private.enjaz_phase111_probe_expect('stale_source');

select private.enjaz_phase111_probe_assert(
  not exists(select 1 from information_schema.columns where table_schema='public' and table_name='notification_deliveries' and column_name in ('read_at','snoozed_until','cancelled_at')),
  'delivery history was repurposed as inbox state'
);
select private.enjaz_phase111_probe_assert(
  (select convalidated from pg_constraint where conname='transaction_followups_completion_actor_check'),
  'follow-up completion actor constraint is not validated'
);
select private.enjaz_phase111_probe_assert(
  (select convalidated from pg_constraint where conname='transaction_followups_terminal_snooze_check'),
  'follow-up terminal snooze constraint is not validated'
);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p111.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p111.owner'),true);
set local role authenticated;
select private.enjaz_phase111_probe_assert(auth.uid()=current_setting('p111.owner')::uuid,'owner auth.uid mismatch');
select private.enjaz_phase111_probe_assert(has_table_privilege('authenticated','public.in_app_notifications','SELECT'),'authenticated select missing');
select private.enjaz_phase111_probe_assert(not has_table_privilege('authenticated','public.in_app_notifications','INSERT'),'direct insert grant leak');
select private.enjaz_phase111_probe_assert(not has_table_privilege('authenticated','public.in_app_notifications','UPDATE'),'direct update grant leak');
select private.enjaz_phase111_probe_assert(not has_table_privilege('authenticated','public.in_app_notifications','DELETE'),'direct delete grant leak');
select private.enjaz_phase111_probe_assert(has_function_privilege('authenticated','public.mutate_in_app_notification_state_v1(uuid,uuid,text,timestamptz)','EXECUTE'),'state mutation RPC missing');
select private.enjaz_phase111_probe_assert(not has_function_privilege('authenticated','public.upsert_in_app_notification_v1(uuid,uuid,text,text,text,text,uuid,text,integer,timestamptz,timestamptz)','EXECUTE'),'authority upsert leaked to browser');
select private.enjaz_phase111_probe_assert(
  (select count(*)=1 from public.in_app_notifications where id=current_setting('p111.notification')::uuid),
  'owner RLS read failed'
);

select public.mutate_in_app_notification_state_v1(current_setting('p111.ws')::uuid,current_setting('p111.notification')::uuid,'mark_read',null);
select private.enjaz_phase111_probe_assert(
  (select read_at is not null from public.in_app_notifications where id=current_setting('p111.notification')::uuid),
  'mark_read failed'
);
select public.mutate_in_app_notification_state_v1(current_setting('p111.ws')::uuid,current_setting('p111.notification')::uuid,'mark_unread',null);
select private.enjaz_phase111_probe_assert(
  (select read_at is null from public.in_app_notifications where id=current_setting('p111.notification')::uuid),
  'mark_unread failed'
);
select public.mutate_in_app_notification_state_v1(current_setting('p111.ws')::uuid,current_setting('p111.notification')::uuid,'snooze',now()+interval '10 minutes');
select private.enjaz_phase111_probe_assert(
  (select snoozed_until is not null from public.in_app_notifications where id=current_setting('p111.notification')::uuid),
  'snooze failed'
);
select private.enjaz_phase111_probe_expect('early_wake');
select public.mutate_in_app_notification_state_v1(current_setting('p111.ws')::uuid,current_setting('p111.notification')::uuid,'cancel',null);
select private.enjaz_phase111_probe_assert(
  (select cancelled_at is not null and snoozed_until is null from public.in_app_notifications where id=current_setting('p111.notification')::uuid),
  'cancel did not become final and clear snooze'
);
select private.enjaz_phase111_probe_expect('cancelled_final');

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p111.outsider'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p111.outsider'),true);
select private.enjaz_phase111_probe_assert(auth.uid()=current_setting('p111.outsider')::uuid,'outsider auth.uid mismatch');
select private.enjaz_phase111_probe_assert(
  (select count(*)=0 from public.in_app_notifications where id=current_setting('p111.notification')::uuid),
  'cross-workspace RLS leak'
);
select private.enjaz_phase111_probe_expect('foreign_mutation');

reset role;
delete from public.in_app_notifications where id=current_setting('p111.notification')::uuid;
select private.enjaz_phase111_probe_assert(
  not exists(select 1 from public.in_app_notifications where id=current_setting('p111.notification')::uuid),
  'notification residue'
);
drop function private.enjaz_phase111_probe_expect(text);
drop function private.enjaz_phase111_probe_assert(boolean,text);
commit;
