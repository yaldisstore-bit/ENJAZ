begin;

do $$
declare
  v_workspace uuid;
  v_actor uuid;
  v_company uuid:=gen_random_uuid();
  v_contact uuid:=gen_random_uuid();
  v_transaction uuid:=gen_random_uuid();
  v_provider uuid:=gen_random_uuid();
  v_fp text:=repeat('d',64);
  v_prepared jsonb;
  v_hub jsonb;
  v_read jsonb;
  v_retry jsonb;
  v_conversation uuid;
  v_incoming uuid;
  v_command uuid;
  v_version integer;
begin
  select wm.workspace_id,wm.user_id into v_workspace,v_actor
  from public.workspace_memberships wm order by wm.created_at limit 1;
  if v_workspace is null or v_actor is null then raise exception 'PHASE114D_NO_WORKSPACE'; end if;

  insert into public.companies(id,workspace_id,legal_name,status)
  values(v_company,v_workspace,'Phase 11.4-D Unified Probe','active');
  insert into public.contacts(id,workspace_id,display_name,contact_type,email,status)
  values(v_contact,v_workspace,'Phase 11.4-D Client','client','phase114d@example.invalid','active');
  insert into public.transactions(id,workspace_id,company_id,primary_contact_id,type,status,priority,current_fee)
  values(v_transaction,v_workspace,v_company,v_contact,'Phase 11.4-D Unified Communications','active','normal',1);
  insert into public.communication_provider_accounts(
    id,workspace_id,channel,provider,external_account_ref,display_name,capabilities,enabled,created_by
  ) values(
    v_provider,v_workspace,'email','phase114d_probe','phase114d','Phase 11.4-D Probe',array['send','receive']::text[],true,v_actor
  );
  insert into public.communication_channel_consents(workspace_id,contact_id,channel,endpoint_fingerprint,status,source,updated_by)
  values(v_workspace,v_contact,'email',v_fp,'granted','phase114d_probe',v_actor);

  perform set_config('request.jwt.claim.sub',v_actor::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  set local role authenticated;

  v_prepared:=public.prepare_communication_outbound_v1(
    v_workspace,v_provider,'phase114d-outbound',v_fp,v_contact,v_transaction,null,null,null,
    'Phase 11.4-D outbound','Outbound body','Outbound summary','{}'::uuid[]
  );
  if v_prepared->>'status'<>'queued' then raise exception 'PHASE114D_PREPARE_FAIL %',v_prepared; end if;
  v_command:=(v_prepared->>'commandId')::uuid;
  v_version:=(v_prepared->>'version')::integer;

  reset role;
  select c.conversation_id into v_conversation from public.communications c
  where c.workspace_id=v_workspace and c.id=(v_prepared->>'communicationId')::uuid;
  if v_conversation is null then raise exception 'PHASE114D_CONVERSATION_MISSING'; end if;

  insert into public.communications(
    workspace_id,company_id,contact_id,transaction_id,channel,direction,summary,subject,body_text,
    occurred_at,metadata,conversation_id,link_status
  ) values(
    v_workspace,v_company,v_contact,v_transaction,'email','incoming','Unique inbound summary 114D',
    'Client reply','Unique incoming phrase 114D',now(),jsonb_build_object('source','phase114d_probe'),v_conversation,'linked'
  ) returning id into v_incoming;

  set local role authenticated;
  v_hub:=public.get_communications_hub_v1(v_workspace,null,v_conversation,60);
  if jsonb_array_length(v_hub->'conversations')<1 then raise exception 'PHASE114D_HUB_CONVERSATIONS_EMPTY'; end if;
  if jsonb_array_length(v_hub->'timeline')<>2 then raise exception 'PHASE114D_TIMELINE_COUNT_FAIL %',v_hub->'timeline'; end if;
  if ((v_hub->'summary'->>'unreadCount')::integer)<1 then raise exception 'PHASE114D_UNREAD_NOT_DERIVED %',v_hub->'summary'; end if;
  if v_hub->'conversations'->0->>'awaitingParty'<>'staff' then raise exception 'PHASE114D_AWAITING_STAFF_FAIL %',v_hub->'conversations'->0; end if;

  v_hub:=public.get_communications_hub_v1(v_workspace,'unique incoming phrase 114d',v_conversation,60);
  if jsonb_array_length(v_hub->'conversations')<>1 then raise exception 'PHASE114D_SEARCH_FAIL %',v_hub->'conversations'; end if;

  v_read:=public.mark_communication_conversation_read_v1(v_workspace,v_conversation,null);
  if (v_read->>'version')::integer<>1 then raise exception 'PHASE114D_READ_CREATE_FAIL %',v_read; end if;
  v_hub:=public.get_communications_hub_v1(v_workspace,null,v_conversation,60);
  if (v_hub->'summary'->>'unreadCount')::integer<>0 then raise exception 'PHASE114D_READ_CURSOR_FAIL %',v_hub->'summary'; end if;

  begin
    perform 1 from public.communication_conversation_reads limit 1;
    raise exception 'PHASE114D_DIRECT_READ_TABLE_ALLOWED';
  exception when insufficient_privilege then null;
  end;

  reset role;
  update public.communication_transport_attempts
    set status='failed',error_code='PHASE114D_CONFIRMED_FAILURE',last_event_at=now()
    where workspace_id=v_workspace and communication_id=(v_prepared->>'communicationId')::uuid;
  update public.communication_outbound_commands set status='failed' where workspace_id=v_workspace and id=v_command;

  set local role authenticated;
  v_retry:=public.retry_communication_outbound_v1(v_workspace,v_command,v_version);
  if v_retry->>'status'<>'queued' or (v_retry->>'attemptNo')::integer<>2 then raise exception 'PHASE114D_SAFE_RETRY_FAIL %',v_retry; end if;

  reset role;
  update public.communication_outbound_commands set status='reconciliation_required' where workspace_id=v_workspace and id=v_command;
  set local role authenticated;
  begin
    perform public.retry_communication_outbound_v1(v_workspace,v_command,(v_retry->>'version')::integer);
    raise exception 'PHASE114D_RECONCILIATION_BLIND_RETRY_ALLOWED';
  exception when object_not_in_prerequisite_state then
    if sqlerrm<>'ENJAZ_COMMUNICATION_RETRY_RECONCILIATION_REQUIRED' then raise; end if;
  end;

  reset role;
  raise notice 'ENJAZ PHASE 11.4-D UNIFIED COMMUNICATIONS AUTHENTICATED PROBE PASS';
end;
$$;

rollback;
