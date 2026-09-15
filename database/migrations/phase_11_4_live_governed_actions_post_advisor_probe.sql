-- ENJAZ Phase 11.4-C — authenticated public-facade probe after advisor hardening.
-- Proves the SECURITY INVOKER public RPC facades work under the actual authenticated role.

begin;

do $$
declare
  v_workspace uuid;
  v_actor uuid;
  v_company uuid:=gen_random_uuid();
  v_contact uuid:=gen_random_uuid();
  v_transaction uuid:=gen_random_uuid();
  v_provider uuid:=gen_random_uuid();
  v_template uuid:=gen_random_uuid();
  v_sensitive uuid:=gen_random_uuid();
  v_fp text:=repeat('e',64);
  v_prepared jsonb;
  v_sensitive_prepared jsonb;
  v_approved jsonb;
  v_followup uuid:=gen_random_uuid();
  v_task uuid:=gen_random_uuid();
  v_relinked jsonb;
begin
  select wm.workspace_id,wm.user_id into v_workspace,v_actor
  from public.workspace_memberships wm order by wm.created_at limit 1;
  if v_workspace is null or v_actor is null then raise exception 'PHASE114C_POST_ADVISOR_NO_WORKSPACE'; end if;

  insert into public.companies(id,workspace_id,legal_name,status)
  values(v_company,v_workspace,'Phase 11.4-C Post Advisor Probe','active');
  insert into public.contacts(id,workspace_id,display_name,contact_type,email,status)
  values(v_contact,v_workspace,'Phase 11.4-C Post Advisor Contact','client','post-advisor@example.invalid','active');
  insert into public.transactions(id,workspace_id,company_id,primary_contact_id,type,status,priority,current_fee)
  values(v_transaction,v_workspace,v_company,v_contact,'Phase 11.4-C Post Advisor','active','normal',1);
  insert into public.communication_provider_accounts(
    id,workspace_id,channel,provider,external_account_ref,display_name,capabilities,enabled,created_by
  ) values(
    v_provider,v_workspace,'email','phase114c_probe','phase114c-post-advisor','Phase 11.4-C Post Advisor',array['send','receive']::text[],true,v_actor
  );
  insert into public.communication_channel_consents(workspace_id,contact_id,channel,endpoint_fingerprint,status,source,updated_by)
  values(v_workspace,v_contact,'email',v_fp,'granted','phase114c_post_advisor',v_actor);

  perform set_config('request.jwt.claim.sub',v_actor::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  set local role authenticated;

  perform public.save_communication_template_v1(
    v_workspace,v_template,null,'email','Phase 11.4-C Post Advisor Standard',null,'Post advisor body','standard',true
  );
  perform public.save_communication_template_v1(
    v_workspace,v_sensitive,null,'email','Phase 11.4-C Post Advisor Sensitive','Sensitive','Post advisor sensitive body','sensitive',true
  );

  v_prepared:=public.prepare_communication_outbound_v1(
    v_workspace,v_provider,'post-advisor-standard',v_fp,v_contact,v_transaction,null,v_template,1,
    null,'Post advisor body','Post advisor summary','{}'::uuid[]
  );
  if v_prepared->>'status'<>'queued' then raise exception 'PHASE114C_POST_ADVISOR_PREPARE_FAIL %',v_prepared; end if;

  v_sensitive_prepared:=public.prepare_communication_outbound_v1(
    v_workspace,v_provider,'post-advisor-sensitive',v_fp,v_contact,v_transaction,null,v_sensitive,1,
    'Sensitive','Post advisor sensitive body','Sensitive summary','{}'::uuid[]
  );
  if v_sensitive_prepared->>'status'<>'awaiting_approval' then raise exception 'PHASE114C_POST_ADVISOR_SENSITIVE_PREPARE_FAIL %',v_sensitive_prepared; end if;

  v_approved:=public.decide_communication_outbound_v1(
    v_workspace,(v_sensitive_prepared->>'commandId')::uuid,(v_sensitive_prepared->>'version')::integer,'approve','post advisor approval'
  );
  if v_approved->>'status'<>'queued' then raise exception 'PHASE114C_POST_ADVISOR_APPROVAL_FAIL %',v_approved; end if;

  v_relinked:=public.relink_communication_v1(
    v_workspace,(v_prepared->>'communicationId')::uuid,1,null,v_company,v_contact,v_transaction,'post advisor relink proof'
  );
  if (v_relinked->>'linkVersion')::integer<>2 then raise exception 'PHASE114C_POST_ADVISOR_RELINK_FAIL %',v_relinked; end if;

  perform public.convert_communication_to_followup_v1(
    v_workspace,(v_prepared->>'communicationId')::uuid,'post-advisor-followup',v_followup,'Post advisor follow-up',now()+interval '1 day'
  );
  perform public.convert_communication_to_task_v1(
    v_workspace,(v_prepared->>'communicationId')::uuid,'post-advisor-task',v_task,'Post advisor task',now()+interval '2 days'
  );

  if (select count(*) from public.transaction_followups where workspace_id=v_workspace and id in (v_followup,v_task))<>2 then
    raise exception 'PHASE114C_POST_ADVISOR_CONVERSION_FAIL';
  end if;

  reset role;
  raise notice 'ENJAZ PHASE 11.4-C POST-ADVISOR AUTHENTICATED FACADE PROBE PASS';
end;
$$;

rollback;
