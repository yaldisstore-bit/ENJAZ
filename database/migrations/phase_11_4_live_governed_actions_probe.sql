-- ENJAZ Phase 11.4-C — Real Cloud governed actions destruction probe.
-- Runs destructive provider/approval/relink/conversion scenarios inside a transaction,
-- then rolls back so production canonical data remains unchanged.

begin;

do $$
declare
  v_workspace uuid;
  v_actor uuid;
  v_company uuid:=gen_random_uuid();
  v_contact uuid:=gen_random_uuid();
  v_contact2 uuid:=gen_random_uuid();
  v_transaction uuid:=gen_random_uuid();
  v_provider uuid:=gen_random_uuid();
  v_template uuid:=gen_random_uuid();
  v_sensitive uuid:=gen_random_uuid();
  v_fp text:=repeat('c',64);
  v_fp_missing text:=repeat('d',64);
  v_prepared jsonb;
  v_duplicate jsonb;
  v_sensitive_prepared jsonb;
  v_approved jsonb;
  v_claim jsonb;
  v_completed jsonb;
  v_inbound jsonb;
  v_inbound_duplicate jsonb;
  v_ambiguous jsonb;
  v_relinked jsonb;
  v_followup_id uuid:=gen_random_uuid();
  v_task_id uuid:=gen_random_uuid();
  v_followup jsonb;
  v_followup_dup jsonb;
  v_task jsonb;
  v_event jsonb;
  v_event_dup jsonb;
  v_failed boolean:=false;
  v_comm uuid;
  v_ambiguous_comm uuid;
begin
  select wm.workspace_id,wm.user_id into v_workspace,v_actor from public.workspace_memberships wm order by wm.created_at limit 1;
  if v_workspace is null or v_actor is null then raise exception 'PHASE114C_PROBE_NO_WORKSPACE'; end if;
  perform set_config('request.jwt.claim.sub',v_actor::text,true);
  if auth.uid() is distinct from v_actor then raise exception 'PHASE114C_AUTH_CONTEXT_FAIL'; end if;

  if has_table_privilege('authenticated','public.communication_outbound_commands','SELECT')
     or has_table_privilege('authenticated','public.communication_templates','SELECT')
     or has_table_privilege('authenticated','public.communication_document_links','SELECT')
     or has_table_privilege('authenticated','public.communication_conversion_receipts','SELECT') then
    raise exception 'PHASE114C_BROWSER_TABLE_PRIVILEGE_LEAK';
  end if;
  if not has_function_privilege('authenticated','public.prepare_communication_outbound_v1(uuid,uuid,text,text,uuid,uuid,uuid,uuid,integer,text,text,text,uuid[])','EXECUTE') then raise exception 'PHASE114C_AUTH_PREPARE_EXECUTE_MISSING'; end if;
  if has_function_privilege('authenticated','public.ingest_communication_provider_message_v1(uuid,uuid,text,text,text,text,text,text,timestamptz)','EXECUTE') then raise exception 'PHASE114C_PROVIDER_INGRESS_BROWSER_EXECUTE_LEAK'; end if;

  insert into public.companies(id,workspace_id,legal_name,status) values(v_company,v_workspace,'Phase 11.4-C Probe Company','active');
  insert into public.contacts(id,workspace_id,display_name,contact_type,email,status) values(v_contact,v_workspace,'Phase 11.4-C Probe Contact','client','probe@example.invalid','active');
  insert into public.contacts(id,workspace_id,display_name,contact_type,email,status) values(v_contact2,v_workspace,'Phase 11.4-C Probe Contact 2','client','probe2@example.invalid','active');
  insert into public.transactions(id,workspace_id,company_id,primary_contact_id,type,status,priority,current_fee) values(v_transaction,v_workspace,v_company,v_contact,'Phase 11.4-C Probe','active','normal',1);
  insert into public.communication_provider_accounts(id,workspace_id,channel,provider,external_account_ref,display_name,capabilities,enabled,created_by) values(v_provider,v_workspace,'email','phase114c_probe','phase114c-live-probe','Phase 11.4-C Probe',array['send','receive','delivery_receipts']::text[],true,v_actor);
  insert into public.communication_channel_consents(workspace_id,contact_id,channel,endpoint_fingerprint,status,source,updated_by) values(v_workspace,v_contact,'email',v_fp,'granted','phase114c_probe',v_actor);
  insert into public.communication_endpoint_bindings(workspace_id,provider_account_id,endpoint_fingerprint,company_id,contact_id,transaction_id,source,created_by) values(v_workspace,v_provider,v_fp,v_company,v_contact,v_transaction,'explicit',v_actor);

  perform public.save_communication_template_v1(v_workspace,v_template,null,'email','Phase 11.4-C Standard',null,'Hello {{name}}','standard',true);
  perform public.save_communication_template_v1(v_workspace,v_sensitive,null,'email','Phase 11.4-C Sensitive','Sensitive subject','Sensitive body {{name}}','sensitive',true);

  v_failed:=false;
  begin
    perform public.prepare_communication_outbound_v1(v_workspace,v_provider,'probe-consent-denied',v_fp_missing,v_contact,v_transaction,null,v_template,1,null,'Denied body','Denied summary','{}'::uuid[]);
  exception when insufficient_privilege then
    if sqlerrm='ENJAZ_COMMUNICATION_CONSENT_REQUIRED' then v_failed:=true; else raise; end if;
  end;
  if not v_failed then raise exception 'PHASE114C_CONSENT_FAIL_CLOSED_MISSING'; end if;

  v_prepared:=public.prepare_communication_outbound_v1(v_workspace,v_provider,'probe-standard',v_fp,v_contact,v_transaction,null,v_template,1,null,'Hello Probe','Probe outbound summary','{}'::uuid[]);
  if v_prepared->>'status'<>'queued' or v_prepared->>'approvalStatus'<>'not_required' or (v_prepared->>'attemptId') is null then raise exception 'PHASE114C_STANDARD_PREPARE_FAIL %',v_prepared; end if;
  v_duplicate:=public.prepare_communication_outbound_v1(v_workspace,v_provider,'probe-standard',v_fp,v_contact,v_transaction,null,v_template,1,null,'Hello Probe','Probe outbound summary','{}'::uuid[]);
  if coalesce((v_duplicate->>'wasDuplicate')::boolean,false) is not true or v_duplicate->>'communicationId'<>v_prepared->>'communicationId' or v_duplicate->>'attemptId'<>v_prepared->>'attemptId' then raise exception 'PHASE114C_OUTBOUND_DEDUPE_FAIL % %',v_prepared,v_duplicate; end if;

  v_sensitive_prepared:=public.prepare_communication_outbound_v1(v_workspace,v_provider,'probe-sensitive',v_fp,v_contact,v_transaction,null,v_sensitive,1,'Sensitive subject','Sensitive body Probe','Sensitive summary','{}'::uuid[]);
  if v_sensitive_prepared->>'status'<>'awaiting_approval' or v_sensitive_prepared->>'approvalStatus'<>'pending' or v_sensitive_prepared->>'attemptId' is not null then raise exception 'PHASE114C_SENSITIVE_PREPARE_FAIL %',v_sensitive_prepared; end if;
  v_comm:=(v_sensitive_prepared->>'communicationId')::uuid;
  v_failed:=false;
  begin
    update public.communications set body_text='tampered' where workspace_id=v_workspace and id=v_comm;
  exception when invalid_parameter_value then
    if sqlerrm='ENJAZ_COMMUNICATION_RENDERED_CONTENT_IMMUTABLE' then v_failed:=true; else raise; end if;
  end;
  if not v_failed then raise exception 'PHASE114C_PREAPPROVAL_CONTENT_MUTABLE'; end if;

  v_approved:=public.decide_communication_outbound_v1(v_workspace,(v_sensitive_prepared->>'commandId')::uuid,(v_sensitive_prepared->>'version')::integer,'approve','probe approval');
  if v_approved->>'status'<>'queued' or v_approved->>'approvalStatus'<>'approved' or v_approved->>'attemptId' is null then raise exception 'PHASE114C_APPROVAL_FAIL %',v_approved; end if;

  v_claim:=public.claim_communication_outbound_dispatch_v1(v_workspace,(v_sensitive_prepared->>'commandId')::uuid);
  if v_claim->>'dispatchToken' is null then raise exception 'PHASE114C_DISPATCH_CLAIM_FAIL %',v_claim; end if;
  v_completed:=public.complete_communication_outbound_dispatch_v1(v_workspace,(v_sensitive_prepared->>'commandId')::uuid,(v_claim->>'dispatchToken')::uuid,'probe-provider-outbound-1','probe-dispatch-event-1','accepted',now());
  if v_completed->>'status'<>'dispatched' then raise exception 'PHASE114C_DISPATCH_COMPLETE_FAIL %',v_completed; end if;
  v_event:=public.record_communication_provider_event_v1(v_workspace,v_provider,'probe-provider-outbound-1','probe-delivered-event-1','delivered',null,now());
  if v_event->>'status'<>'delivered' or coalesce((v_event->>'wasDuplicate')::boolean,false) then raise exception 'PHASE114C_DELIVERY_EVENT_FAIL %',v_event; end if;
  v_event_dup:=public.record_communication_provider_event_v1(v_workspace,v_provider,'probe-provider-outbound-1','probe-delivered-event-1','delivered',null,now());
  if coalesce((v_event_dup->>'wasDuplicate')::boolean,false) is not true then raise exception 'PHASE114C_DELIVERY_REPLAY_NOT_DEDUPED %',v_event_dup; end if;

  v_inbound:=public.ingest_communication_provider_message_v1(v_workspace,v_provider,'probe-inbound-message-1','probe-inbound-event-1',v_fp,'Inbound probe','Inbound body','Inbound summary',now());
  if v_inbound->>'linkStatus'<>'linked' or (v_inbound->>'candidateCount')::integer<>1 then raise exception 'PHASE114C_INBOUND_LINK_FAIL %',v_inbound; end if;
  v_inbound_duplicate:=public.ingest_communication_provider_message_v1(v_workspace,v_provider,'probe-inbound-message-1','probe-inbound-event-1',v_fp,'Inbound probe','Inbound body','Inbound summary',now());
  if coalesce((v_inbound_duplicate->>'wasDuplicate')::boolean,false) is not true or v_inbound_duplicate->>'communicationId'<>v_inbound->>'communicationId' then raise exception 'PHASE114C_INBOUND_REPLAY_FAIL % %',v_inbound,v_inbound_duplicate; end if;
  if (select count(*) from public.communication_transport_attempts where workspace_id=v_workspace and provider_account_id=v_provider and provider_message_id='probe-inbound-message-1')<>1 then raise exception 'PHASE114C_INBOUND_DUPLICATE_ATTEMPT'; end if;

  insert into public.communication_endpoint_bindings(workspace_id,provider_account_id,endpoint_fingerprint,company_id,contact_id,transaction_id,source,created_by) values(v_workspace,v_provider,v_fp,v_company,v_contact2,v_transaction,'manual_review',v_actor);
  v_ambiguous:=public.ingest_communication_provider_message_v1(v_workspace,v_provider,'probe-inbound-message-2','probe-inbound-event-2',v_fp,'Ambiguous probe','Ambiguous body','Ambiguous summary',now());
  if v_ambiguous->>'linkStatus'<>'review_required' or (v_ambiguous->>'candidateCount')::integer<>2 then raise exception 'PHASE114C_AMBIGUOUS_MATCH_DID_NOT_FAIL_CLOSED %',v_ambiguous; end if;
  v_ambiguous_comm:=(v_ambiguous->>'communicationId')::uuid;
  if exists(select 1 from public.communications where workspace_id=v_workspace and id=v_ambiguous_comm and (company_id is not null or contact_id is not null or transaction_id is not null)) then raise exception 'PHASE114C_AMBIGUOUS_AUTO_LINKED'; end if;

  v_relinked:=public.relink_communication_v1(v_workspace,v_ambiguous_comm,1,null,v_company,v_contact,v_transaction,'probe manual review resolution');
  if v_relinked->>'linkStatus'<>'linked' or (v_relinked->>'linkVersion')::integer<>2 then raise exception 'PHASE114C_RELINK_FAIL %',v_relinked; end if;
  v_failed:=false;
  begin
    perform public.relink_communication_v1(v_workspace,v_ambiguous_comm,1,null,v_company,v_contact,v_transaction,'stale probe');
  exception when serialization_failure then
    if sqlerrm='ENJAZ_COMMUNICATION_RELINK_STALE' then v_failed:=true; else raise; end if;
  end;
  if not v_failed then raise exception 'PHASE114C_STALE_RELINK_ACCEPTED'; end if;

  v_followup:=public.convert_communication_to_followup_v1(v_workspace,v_ambiguous_comm,'probe-followup',v_followup_id,'Probe follow-up',now()+interval '1 day');
  v_followup_dup:=public.convert_communication_to_followup_v1(v_workspace,v_ambiguous_comm,'probe-followup',v_followup_id,'Probe follow-up',now()+interval '1 day');
  if coalesce((v_followup_dup->>'wasDuplicate')::boolean,false) is not true or v_followup_dup->>'followupId'<>v_followup->>'followupId' then raise exception 'PHASE114C_FOLLOWUP_CONVERSION_REPLAY_FAIL'; end if;
  v_task:=public.convert_communication_to_task_v1(v_workspace,v_ambiguous_comm,'probe-task',v_task_id,'Probe task',now()+interval '2 days');
  if v_task->>'canonicalAuthority'<>'transaction_followup' then raise exception 'PHASE114C_TASK_SHADOW_AUTHORITY'; end if;
  if (select count(*) from public.transaction_followups where workspace_id=v_workspace and id in (v_followup_id,v_task_id))<>2 then raise exception 'PHASE114C_CONVERSION_TARGET_COUNT_FAIL'; end if;

  if not exists(select 1 from public.communication_relink_events where workspace_id=v_workspace and communication_id=v_ambiguous_comm and expected_version=1 and resulting_version=2) then raise exception 'PHASE114C_RELINK_EVIDENCE_MISSING'; end if;
  if not exists(select 1 from public.audit_events where workspace_id=v_workspace and entity_id=v_ambiguous_comm and action='communication.relinked') then raise exception 'PHASE114C_RELINK_AUDIT_MISSING'; end if;

  raise notice 'ENJAZ PHASE 11.4-C LIVE GOVERNED ACTIONS PROBE PASS';
end;
$$;

rollback;
