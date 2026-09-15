-- ENJAZ Phase 11.4-B — Real Cloud canonical communication content probe
-- Proves that full message content lives on `communications`, remains editable before
-- transport begins, and becomes immutable once provider transport evidence exists.
-- All marker-scoped rows are removed before commit; any failed assertion aborts.

begin;

do $$
declare
  v_workspace uuid;
  v_actor uuid;
  v_transaction uuid;
  v_company uuid;
  v_provider uuid;
  v_conversation uuid;
  v_communication uuid;
  v_attempt uuid;
  v_long_body text:=repeat('Canonical body ',400);
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

  if v_workspace is null or v_actor is null or v_transaction is null or v_company is null then
    raise exception 'ENJAZ_PHASE114B_CONTENT_PROBE_FIXTURE_MISSING';
  end if;

  if char_length(v_long_body)<=1200 then
    raise exception 'ENJAZ_PHASE114B_CONTENT_PROBE_BODY_NOT_LONG_ENOUGH';
  end if;

  insert into public.communication_provider_accounts(
    workspace_id,channel,provider,external_account_ref,display_name,capabilities,created_by
  ) values(
    v_workspace,'email','enjaz-phase114b-content-probe','content-probe-account','Content Probe Email',
    array['send'],v_actor
  ) returning id into v_provider;

  insert into public.communication_conversations(
    workspace_id,company_id,transaction_id,subject,created_by
  ) values(v_workspace,v_company,v_transaction,'__ENJAZ_PHASE114B_CONTENT_PROBE__',v_actor)
  returning id into v_conversation;

  insert into public.communications(
    workspace_id,company_id,transaction_id,channel,direction,summary,subject,body_text,
    occurred_at,metadata,conversation_id,link_status
  ) values(
    v_workspace,v_company,v_transaction,'email','outgoing','Canonical content probe preview',
    'Canonical content probe subject',v_long_body,now(),'{"phase114bContentProbe":true}'::jsonb,
    v_conversation,'linked'
  ) returning id into v_communication;

  -- Before transport starts the draft content remains editable.
  update public.communications
  set subject='Canonical content probe subject edited before transport',
      body_text=v_long_body||' pre-transport edit'
  where id=v_communication;

  if not exists(
    select 1 from public.communications
    where id=v_communication
      and subject='Canonical content probe subject edited before transport'
      and body_text=v_long_body||' pre-transport edit'
      and char_length(body_text)>1200
  ) then
    raise exception 'ENJAZ_PHASE114B_PRETRANSPORT_CONTENT_EDIT_FAILED';
  end if;

  insert into public.communication_transport_attempts(
    workspace_id,communication_id,provider_account_id,direction,idempotency_key,status
  ) values(v_workspace,v_communication,v_provider,'outgoing','phase114b-content-probe-send','queued')
  returning id into v_attempt;

  begin
    update public.communications set body_text='mutated after transport' where id=v_communication;
    raise exception 'ENJAZ_PHASE114B_POSTTRANSPORT_BODY_MUTATION_ALLOWED';
  exception when invalid_parameter_value then
    if sqlerrm<>'ENJAZ_COMMUNICATION_CONTENT_IMMUTABLE_AFTER_TRANSPORT' then raise; end if;
  end;

  begin
    update public.communications set subject='mutated after transport' where id=v_communication;
    raise exception 'ENJAZ_PHASE114B_POSTTRANSPORT_SUBJECT_MUTATION_ALLOWED';
  exception when invalid_parameter_value then
    if sqlerrm<>'ENJAZ_COMMUNICATION_CONTENT_IMMUTABLE_AFTER_TRANSPORT' then raise; end if;
  end;

  begin
    update public.communications set summary='mutated after transport' where id=v_communication;
    raise exception 'ENJAZ_PHASE114B_POSTTRANSPORT_SUMMARY_MUTATION_ALLOWED';
  exception when invalid_parameter_value then
    if sqlerrm<>'ENJAZ_COMMUNICATION_CONTENT_IMMUTABLE_AFTER_TRANSPORT' then raise; end if;
  end;

  begin
    update public.communications set metadata=metadata||'{"mutated":true}'::jsonb where id=v_communication;
    raise exception 'ENJAZ_PHASE114B_POSTTRANSPORT_METADATA_MUTATION_ALLOWED';
  exception when invalid_parameter_value then
    if sqlerrm<>'ENJAZ_COMMUNICATION_CONTENT_IMMUTABLE_AFTER_TRANSPORT' then raise; end if;
  end;

  -- Governed link state remains a separate mutable authority for 11.4-C relinking.
  update public.communications
  set link_status='review_required',link_version=link_version+1
  where id=v_communication;

  if not exists(
    select 1 from public.communications
    where id=v_communication and link_status='review_required' and link_version=2
  ) then
    raise exception 'ENJAZ_PHASE114B_RELINK_STATE_SEPARATION_FAILED';
  end if;
end $$;

delete from public.communication_transport_attempts
where provider_account_id in (
  select id from public.communication_provider_accounts where provider='enjaz-phase114b-content-probe'
);
delete from public.communications where metadata->>'phase114bContentProbe'='true';
delete from public.communication_conversations where subject='__ENJAZ_PHASE114B_CONTENT_PROBE__';
delete from public.communication_provider_accounts where provider='enjaz-phase114b-content-probe';

do $$
begin
  if exists(select 1 from public.communication_provider_accounts where provider='enjaz-phase114b-content-probe')
     or exists(select 1 from public.communications where metadata->>'phase114bContentProbe'='true')
     or exists(select 1 from public.communication_conversations where subject='__ENJAZ_PHASE114B_CONTENT_PROBE__') then
    raise exception 'ENJAZ_PHASE114B_CONTENT_PROBE_RESIDUE';
  end if;
end $$;

commit;
