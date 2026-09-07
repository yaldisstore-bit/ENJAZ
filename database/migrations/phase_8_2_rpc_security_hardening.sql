-- ENJAZ Phase 8.2 — Automation RPC security hardening
-- Public RPCs remain SECURITY INVOKER. Privileged mutation bodies live in the
-- unexposed private schema as SECURITY DEFINER functions with preserved auth.uid()
-- + workspace membership guards and an empty search_path.
begin;

do $$
declare
  r record;
  v_def text;
  v_private_name text;
begin
  for r in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'upsert_automation_rule_v1',
        'set_automation_rule_enabled_v1',
        'dispatch_automation_v1',
        'decide_automation_approval_v1'
      )
  loop
    v_private_name := r.proname || '_impl';
    v_def := pg_get_functiondef(r.oid);
    v_def := replace(
      v_def,
      'CREATE OR REPLACE FUNCTION public.' || r.proname,
      'CREATE OR REPLACE FUNCTION private.' || v_private_name
    );

    if position('SECURITY DEFINER' in upper(v_def)) = 0 then
      v_def := replace(
        v_def,
        E'\n SET search_path TO',
        E'\n SECURITY DEFINER\n SET search_path TO'
      );
    end if;

    if position('SECURITY DEFINER' in upper(v_def)) = 0 then
      raise exception 'ENJAZ_PHASE82_HARDENING_FAILED: could not promote % to private SECURITY DEFINER', r.proname;
    end if;

    execute v_def;
  end loop;
end $$;

create or replace function public.upsert_automation_rule_v1(
  p_workspace_id uuid,
  p_rule_id uuid,
  p_expected_version integer,
  p_rule_key text,
  p_name text,
  p_description text,
  p_trigger_config jsonb,
  p_conditions jsonb,
  p_actions jsonb,
  p_throttle_policy jsonb,
  p_enabled boolean
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.upsert_automation_rule_v1_impl(
    p_workspace_id,p_rule_id,p_expected_version,p_rule_key,p_name,p_description,
    p_trigger_config,p_conditions,p_actions,p_throttle_policy,p_enabled
  );
$$;

create or replace function public.set_automation_rule_enabled_v1(
  p_workspace_id uuid,
  p_rule_id uuid,
  p_expected_version integer,
  p_enabled boolean
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.set_automation_rule_enabled_v1_impl(
    p_workspace_id,p_rule_id,p_expected_version,p_enabled
  );
$$;

create or replace function public.dispatch_automation_v1(
  p_workspace_id uuid,
  p_rule_id uuid,
  p_event_key text,
  p_event_payload jsonb,
  p_receipt_key text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.dispatch_automation_v1_impl(
    p_workspace_id,p_rule_id,p_event_key,p_event_payload,p_receipt_key
  );
$$;

create or replace function public.decide_automation_approval_v1(
  p_workspace_id uuid,
  p_approval_id uuid,
  p_decision text,
  p_decision_note text,
  p_decision_key uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.decide_automation_approval_v1_impl(
    p_workspace_id,p_approval_id,p_decision,p_decision_note,p_decision_key
  );
$$;

-- Private schema is not exposed by the Data API. The browser can only reach these
-- implementations through the four guarded public wrappers above.
grant usage on schema private to authenticated;

revoke all on function private.upsert_automation_rule_v1_impl(uuid,uuid,integer,text,text,text,jsonb,jsonb,jsonb,jsonb,boolean) from public, anon;
revoke all on function private.set_automation_rule_enabled_v1_impl(uuid,uuid,integer,boolean) from public, anon;
revoke all on function private.dispatch_automation_v1_impl(uuid,uuid,text,jsonb,text) from public, anon;
revoke all on function private.decide_automation_approval_v1_impl(uuid,uuid,text,text,uuid) from public, anon;

grant execute on function private.upsert_automation_rule_v1_impl(uuid,uuid,integer,text,text,text,jsonb,jsonb,jsonb,jsonb,boolean) to authenticated;
grant execute on function private.set_automation_rule_enabled_v1_impl(uuid,uuid,integer,boolean) to authenticated;
grant execute on function private.dispatch_automation_v1_impl(uuid,uuid,text,jsonb,text) to authenticated;
grant execute on function private.decide_automation_approval_v1_impl(uuid,uuid,text,text,uuid) to authenticated;

revoke all on function public.upsert_automation_rule_v1(uuid,uuid,integer,text,text,text,jsonb,jsonb,jsonb,jsonb,boolean) from public, anon;
revoke all on function public.set_automation_rule_enabled_v1(uuid,uuid,integer,boolean) from public, anon;
revoke all on function public.dispatch_automation_v1(uuid,uuid,text,jsonb,text) from public, anon;
revoke all on function public.decide_automation_approval_v1(uuid,uuid,text,text,uuid) from public, anon;

grant execute on function public.upsert_automation_rule_v1(uuid,uuid,integer,text,text,text,jsonb,jsonb,jsonb,jsonb,boolean) to authenticated;
grant execute on function public.set_automation_rule_enabled_v1(uuid,uuid,integer,boolean) to authenticated;
grant execute on function public.dispatch_automation_v1(uuid,uuid,text,jsonb,text) to authenticated;
grant execute on function public.decide_automation_approval_v1(uuid,uuid,text,text,uuid) to authenticated;

-- Direct table mutation stays denied. SECURITY DEFINER exists only in private and the
-- copied implementations retain the Phase 8.2 auth.uid()/membership checks.
revoke insert, update, delete on table public.automation_rules from authenticated;
revoke insert, update, delete on table public.automation_runs from authenticated;
revoke insert, update, delete on table public.automation_run_actions from authenticated;
revoke insert, update, delete on table public.automation_approval_requests from authenticated;

commit;
