-- ENJAZ Phase 11.4-C — authenticated template/merge-field Real Cloud probe.
-- Verifies strict missing-field rejection, rendered canonical content and replay idempotency,
-- then rolls back with zero residue.

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
  v_fp text:=repeat('f',64);
  v_prepared jsonb;
  v_duplicate jsonb;
  v_comm public.communications%rowtype;
  v_failed boolean:=false;
begin
  select wm.workspace_id,wm.user_id into v_workspace,v_actor
  from public.workspace_memberships wm order by wm.created_at limit 1;
  if v_workspace is null or v_actor is null then raise exception 'PHASE114C_TEMPLATE_PROBE_NO_WORKSPACE'; end if;

  insert into public.companies(id,workspace_id,legal_name,status)
  values(v_company,v_workspace,'Phase 11.4-C Template Probe','active');
  insert into public.contacts(id,workspace_id,display_name,contact_type,email,status)
  values(v_contact,v_workspace,'Phase 11.4-C Template Contact','client','template@example.invalid','active');
  insert into public.transactions(id,workspace_id,company_id,primary_contact_id,type,status,priority,current_fee)
  values(v_transaction,v_workspace,v_company,v_contact,'Phase 11.4-C Template Probe','active','normal',1);
  insert into public.communication_provider_accounts(
    id,workspace_id,channel,provider,external_account_ref,display_name,capabilities,enabled,created_by
  ) values(
    v_provider,v_workspace,'email','phase114c_probe','template-probe@example.invalid','Template Probe',array['send']::text[],true,v_actor
  );
  insert into public.communication_channel_consents(workspace_id,contact_id,channel,endpoint_fingerprint,status,source,updated_by)
  values(v_workspace,v_contact,'email',v_fp,'granted','phase114c_template_probe',v_actor);

  perform set_config('request.jwt.claim.sub',v_actor::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  set local role authenticated;

  perform public.save_communication_template_v1(
    v_workspace,v_template,null,'email','Phase 11.4-C Merge Template',
    'Case {{caseNo}} for {{client}}','Hello {{ client }}, amount {{amount}} approved={{approved}}',
    'standard',true
  );

  v_failed:=false;
  begin
    perform public.prepare_communication_outbound_from_template_v1(
      v_workspace,v_provider,'template-missing-field',v_fp,v_contact,v_transaction,null,
      v_template,1,jsonb_build_object('caseNo','A-7','client','Ali','amount',15),
      'Template missing-field probe','{}'::uuid[]
    );
  exception when invalid_parameter_value then
    if sqlerrm='ENJAZ_COMMUNICATION_MERGE_FIELD_MISSING:approved' then v_failed:=true; else raise; end if;
  end;
  if not v_failed then raise exception 'PHASE114C_TEMPLATE_MISSING_FIELD_DID_NOT_FAIL_CLOSED'; end if;

  v_prepared:=public.prepare_communication_outbound_from_template_v1(
    v_workspace,v_provider,'template-render',v_fp,v_contact,v_transaction,null,
    v_template,1,jsonb_build_object('caseNo','A-7','client','Ali','amount',15,'approved',true),
    'Template render probe','{}'::uuid[]
  );
  if v_prepared->>'status'<>'queued' or v_prepared->>'approvalStatus'<>'not_required' then
    raise exception 'PHASE114C_TEMPLATE_PREPARE_FAILED %',v_prepared;
  end if;

  v_duplicate:=public.prepare_communication_outbound_from_template_v1(
    v_workspace,v_provider,'template-render',v_fp,v_contact,v_transaction,null,
    v_template,1,jsonb_build_object('caseNo','A-7','client','Ali','amount',15,'approved',true),
    'Template render probe','{}'::uuid[]
  );
  if coalesce((v_duplicate->>'wasDuplicate')::boolean,false) is not true
     or v_duplicate->>'communicationId'<>v_prepared->>'communicationId' then
    raise exception 'PHASE114C_TEMPLATE_RENDER_REPLAY_FAILED %',v_duplicate;
  end if;

  reset role;
  select * into v_comm from public.communications c
  where c.workspace_id=v_workspace and c.id=(v_prepared->>'communicationId')::uuid;
  if v_comm.subject<>'Case A-7 for Ali' then raise exception 'PHASE114C_TEMPLATE_SUBJECT_RENDER_FAILED %',v_comm.subject; end if;
  if v_comm.body_text<>'Hello Ali, amount 15 approved=true' then raise exception 'PHASE114C_TEMPLATE_BODY_RENDER_FAILED %',v_comm.body_text; end if;

  raise notice 'ENJAZ PHASE 11.4-C TEMPLATE RENDERING PROBE PASS';
end;
$$;

rollback;
