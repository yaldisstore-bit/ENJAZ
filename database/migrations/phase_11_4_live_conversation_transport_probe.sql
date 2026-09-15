-- ENJAZ Phase 11.4-B — Real Cloud destructive conversation/transport probe
-- Uses existing canonical fixture IDs dynamically, creates only marker-scoped rows,
-- deliberately attacks dedupe/scope/append-only boundaries, then removes all probe
-- residue in the same migration. Any failed assertion aborts the whole migration.

begin;

do $$
declare
  v_workspace uuid;
  v_workspace2 uuid;
  v_actor uuid;
  v_transaction uuid;
  v_company uuid;
  v_provider_email uuid;
  v_provider_sms uuid;
  v_conversation uuid;
  v_conversation2 uuid;
  v_outgoing uuid;
  v_incoming uuid;
  v_out_attempt uuid;
  v_event uuid;
  v_relink uuid;
  v_fp text:=repeat('a',64);
  v_consent_fp text:=repeat('b',64);
  v_policy_count integer;
begin
  select wm.workspace_id,wm.user_id,t.id,t.company_id
    into v_workspace,v_actor,v_transaction,v_company
  from public.workspace_memberships wm
  join public.transactions t
    on t.workspace_id=wm.workspace_id
   and t.deleted_at is null
   and t.company_id is not null
  order by wm.created_at
  limit 1;

  select w.id into v_workspace2
  from public.workspaces w
  where w.id<>v_workspace
  order by w.created_at
  limit 1;

  if v_workspace is null or v_actor is null or v_transaction is null or v_company is null or v_workspace2 is null then
    raise exception 'ENJAZ_PHASE114B_PROBE_FIXTURE_MISSING';
  end if;

  -- Browser roles have no direct table privileges; server authority is explicit.
  if has_table_privilege('authenticated','public.communications','SELECT')
     or has_table_privilege('authenticated','public.communication_conversations','SELECT')
     or has_table_privilege('authenticated','public.communication_transport_attempts','INSERT') then
    raise exception 'ENJAZ_PHASE114B_BROWSER_PRIVILEGE_LEAK';
  end if;
  if not has_table_privilege('service_role','public.communications','SELECT')
     or not has_table_privilege('service_role','public.communication_transport_attempts','INSERT')
     or has_table_privilege('service_role','public.communication_transport_events','UPDATE')
     or has_table_privilege('service_role','public.communication_relink_events','DELETE') then
    raise exception 'ENJAZ_PHASE114B_SERVICE_PRIVILEGE_INVALID';
  end if;

  select count(*) into v_policy_count
  from pg_policies p
  where p.schemaname='public'
    and p.policyname in (
      'communication_conversations_browser_deny','communication_provider_accounts_browser_deny',
      'communication_endpoint_bindings_browser_deny','communication_channel_consents_browser_deny',
      'communication_transport_attempts_browser_deny','communication_transport_events_browser_deny',
      'communication_relink_events_browser_deny','communications_m4_browser_deny'
    )
    and p.permissive='RESTRICTIVE';
  if v_policy_count<>8 then
    raise exception 'ENJAZ_PHASE114B_RESTRICTIVE_POLICY_COUNT_INVALID: %',v_policy_count;
  end if;

  insert into public.communication_provider_accounts(
    workspace_id,channel,provider,external_account_ref,display_name,capabilities,created_by
  ) values(
    v_workspace,'email','enjaz-phase114b-probe','probe-email-account','Probe Email',
    array['send','receive','delivery_receipts'],v_actor
  ) returning id into v_provider_email;

  insert into public.communication_provider_accounts(
    workspace_id,channel,provider,external_account_ref,display_name,capabilities,created_by
  ) values(
    v_workspace,'sms','enjaz-phase114b-probe','probe-sms-account','Probe SMS',
    array['send','receive'],v_actor
  ) returning id into v_provider_sms;

  insert into public.communication_conversations(
    workspace_id,company_id,transaction_id,subject,created_by
  ) values(v_workspace,v_company,v_transaction,'__ENJAZ_PHASE114B_PROBE__',v_actor)
  returning id into v_conversation;

  insert into public.communication_conversations(
    workspace_id,company_id,transaction_id,subject,created_by
  ) values(v_workspace,v_company,v_transaction,'__ENJAZ_PHASE114B_PROBE_RELINK__',v_actor)
  returning id into v_conversation2;

  insert into public.communications(
    workspace_id,company_id,transaction_id,channel,direction,summary,occurred_at,
    metadata,conversation_id,link_status
  ) values(
    v_workspace,v_company,v_transaction,'email','outgoing','__ENJAZ_PHASE114B_OUTGOING__',now(),
    '{"phase114bProbe":true}'::jsonb,v_conversation,'linked'
  ) returning id into v_outgoing;

  insert into public.communications(
    workspace_id,company_id,transaction_id,channel,direction,summary,occurred_at,
    metadata,conversation_id,link_status
  ) values(
    v_workspace,v_company,v_transaction,'email','incoming','__ENJAZ_PHASE114B_INCOMING__',now(),
    '{"phase114bProbe":true}'::jsonb,v_conversation,'linked'
  ) returning id into v_incoming;

  insert into public.communication_transport_attempts(
    workspace_id,communication_id,provider_account_id,direction,idempotency_key,status
  ) values(v_workspace,v_outgoing,v_provider_email,'outgoing','phase114b-probe-outbound','queued')
  returning id into v_out_attempt;

  begin
    insert into public.communication_transport_attempts(
      workspace_id,communication_id,provider_account_id,direction,idempotency_key,status
    ) values(v_workspace,v_outgoing,v_provider_email,'outgoing','phase114b-probe-outbound','queued');
    raise exception 'ENJAZ_PHASE114B_OUTBOUND_DEDUPE_FAILED';
  exception when unique_violation then null;
  end;

  insert into public.communication_transport_attempts(
    workspace_id,communication_id,provider_account_id,direction,provider_message_id,status
  ) values(v_workspace,v_incoming,v_provider_email,'incoming','phase114b-provider-message','received');

  begin
    insert into public.communication_transport_attempts(
      workspace_id,communication_id,provider_account_id,direction,provider_message_id,status
    ) values(v_workspace,v_incoming,v_provider_email,'incoming','phase114b-provider-message','received');
    raise exception 'ENJAZ_PHASE114B_INBOUND_DEDUPE_FAILED';
  exception when unique_violation then null;
  end;

  begin
    insert into public.communication_transport_attempts(
      workspace_id,communication_id,provider_account_id,direction,idempotency_key,status
    ) values(v_workspace,v_outgoing,v_provider_sms,'outgoing','phase114b-wrong-channel','queued');
    raise exception 'ENJAZ_PHASE114B_CHANNEL_GUARD_FAILED';
  exception when invalid_parameter_value then
    if sqlerrm<>'ENJAZ_COMMUNICATION_TRANSPORT_CHANNEL_MISMATCH' then raise; end if;
  end;

  begin
    insert into public.communication_transport_attempts(
      workspace_id,communication_id,provider_account_id,direction,provider_message_id,status
    ) values(v_workspace,v_outgoing,v_provider_email,'incoming','phase114b-wrong-direction','received');
    raise exception 'ENJAZ_PHASE114B_DIRECTION_GUARD_FAILED';
  exception when invalid_parameter_value then
    if sqlerrm<>'ENJAZ_COMMUNICATION_TRANSPORT_DIRECTION_MISMATCH' then raise; end if;
  end;

  insert into public.communication_transport_events(
    workspace_id,attempt_id,provider_account_id,provider_event_id,event_type,occurred_at
  ) values(v_workspace,v_out_attempt,v_provider_email,'phase114b-event-1','accepted',now())
  returning id into v_event;

  begin
    insert into public.communication_transport_events(
      workspace_id,attempt_id,provider_account_id,provider_event_id,event_type,occurred_at
    ) values(v_workspace,v_out_attempt,v_provider_email,'phase114b-event-1','accepted',now());
    raise exception 'ENJAZ_PHASE114B_EVENT_REPLAY_GUARD_FAILED';
  exception when unique_violation then null;
  end;

  begin
    update public.communication_transport_events set error_code='mutated' where id=v_event;
    raise exception 'ENJAZ_PHASE114B_EVENT_APPEND_ONLY_FAILED';
  exception when insufficient_privilege then
    if sqlerrm<>'ENJAZ_COMMUNICATION_EVIDENCE_APPEND_ONLY' then raise; end if;
  end;

  insert into public.communication_relink_events(
    workspace_id,communication_id,actor_user_id,old_conversation_id,new_conversation_id,
    old_company_id,new_company_id,old_transaction_id,new_transaction_id,
    reason,expected_version,resulting_version
  ) values(
    v_workspace,v_outgoing,v_actor,v_conversation,v_conversation2,
    v_company,v_company,v_transaction,v_transaction,
    'Phase 11.4-B relink probe',1,2
  ) returning id into v_relink;

  begin
    update public.communication_relink_events set reason='mutated evidence' where id=v_relink;
    raise exception 'ENJAZ_PHASE114B_RELINK_APPEND_ONLY_FAILED';
  exception when insufficient_privilege then
    if sqlerrm<>'ENJAZ_COMMUNICATION_EVIDENCE_APPEND_ONLY' then raise; end if;
  end;

  insert into public.communication_endpoint_bindings(
    workspace_id,provider_account_id,endpoint_fingerprint,transaction_id,source,created_by
  ) values(v_workspace,v_provider_email,v_fp,v_transaction,'explicit',v_actor);

  begin
    insert into public.communication_endpoint_bindings(
      workspace_id,provider_account_id,endpoint_fingerprint,transaction_id,source,created_by
    ) values(v_workspace,v_provider_email,v_fp,v_transaction,'explicit',v_actor);
    raise exception 'ENJAZ_PHASE114B_EXACT_BINDING_DEDUPE_FAILED';
  exception when unique_violation then null;
  end;

  -- The same endpoint may intentionally map to a genuinely different target;
  -- later matching must return REVIEW_REQUIRED instead of guessing.
  insert into public.communication_endpoint_bindings(
    workspace_id,provider_account_id,endpoint_fingerprint,company_id,source,created_by
  ) values(v_workspace,v_provider_email,v_fp,v_company,'manual_review',v_actor);

  insert into public.communication_channel_consents(
    workspace_id,channel,endpoint_fingerprint,status,source,updated_by
  ) values(v_workspace,'email',v_consent_fp,'granted','phase114b-probe',v_actor);

  begin
    insert into public.communication_channel_consents(
      workspace_id,channel,endpoint_fingerprint,status,source,updated_by
    ) values(v_workspace,'email',v_consent_fp,'withdrawn','phase114b-probe-duplicate',v_actor);
    raise exception 'ENJAZ_PHASE114B_CONSENT_IDENTITY_FAILED';
  exception when unique_violation then null;
  end;

  begin
    insert into public.communication_conversations(
      workspace_id,company_id,transaction_id,subject,created_by
    ) values(v_workspace2,v_company,v_transaction,'__ENJAZ_PHASE114B_CROSS_WORKSPACE__',v_actor);
    raise exception 'ENJAZ_PHASE114B_CROSS_WORKSPACE_FK_FAILED';
  exception when foreign_key_violation then null;
  end;
end $$;

-- Privileged test cleanup. Append-only triggers are disabled only around deletion of
-- marker-scoped probe evidence, then immediately re-enabled inside this transaction.
alter table public.communication_transport_events disable trigger communication_transport_events_append_only;
alter table public.communication_relink_events disable trigger communication_relink_events_append_only;

delete from public.communication_transport_events
where provider_account_id in (
  select id from public.communication_provider_accounts where provider='enjaz-phase114b-probe'
);
delete from public.communication_relink_events
where communication_id in (
  select id from public.communications where metadata->>'phase114bProbe'='true'
);

alter table public.communication_transport_events enable trigger communication_transport_events_append_only;
alter table public.communication_relink_events enable trigger communication_relink_events_append_only;

delete from public.communication_transport_attempts
where provider_account_id in (
  select id from public.communication_provider_accounts where provider='enjaz-phase114b-probe'
);
delete from public.communication_endpoint_bindings
where provider_account_id in (
  select id from public.communication_provider_accounts where provider='enjaz-phase114b-probe'
);
delete from public.communication_channel_consents where source like 'phase114b-probe%';
delete from public.communications where metadata->>'phase114bProbe'='true';
delete from public.communication_conversations where subject like '__ENJAZ_PHASE114B%';
delete from public.communication_provider_accounts where provider='enjaz-phase114b-probe';

do $$
begin
  if exists(select 1 from public.communication_provider_accounts where provider='enjaz-phase114b-probe')
     or exists(select 1 from public.communications where metadata->>'phase114bProbe'='true')
     or exists(select 1 from public.communication_conversations where subject like '__ENJAZ_PHASE114B%')
     or exists(select 1 from public.communication_channel_consents where source like 'phase114b-probe%') then
    raise exception 'ENJAZ_PHASE114B_PROBE_RESIDUE';
  end if;
end $$;

commit;
