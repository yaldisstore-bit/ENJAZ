-- ENJAZ Phase 8.4 — conversion fee hardening
-- Authoritative transaction creation requires an accepted positive quotation and carries
-- its total into transactions.current_fee. No finance ledger row is created here.
begin;

create or replace function public.convert_crm_lead_v1(p_workspace_id uuid,p_lead_id uuid,p_reuse_company_id uuid,p_transaction_type text,p_department text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid;
  v_lead public.crm_leads%rowtype;
  v_existing public.crm_conversion_audits%rowtype;
  v_company_id uuid;
  v_contact_id uuid;
  v_tx_id uuid;
  v_duplicate_company uuid;
  v_duplicate_contact uuid;
  v_submission uuid;
  v_snapshot jsonb;
  v_current_fee numeric(18,2);
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id);
  select * into v_existing from public.crm_conversion_audits a where a.workspace_id=p_workspace_id and a.lead_id=p_lead_id;
  if found then
    return jsonb_build_object('leadId',p_lead_id,'companyId',v_existing.company_id,'contactId',v_existing.contact_id,'transactionId',v_existing.transaction_id,'wasDuplicate',true);
  end if;

  select * into v_lead from public.crm_leads l where l.workspace_id=p_workspace_id and l.id=p_lead_id for update;
  if not found then raise no_data_found using message='ENJAZ_CRM_LEAD_NOT_FOUND'; end if;
  if v_lead.stage<>'accepted' then raise invalid_parameter_value using message='ENJAZ_CRM_LEAD_NOT_ACCEPTED'; end if;
  if char_length(btrim(coalesce(p_transaction_type,''))) not between 1 and 180 or char_length(btrim(coalesce(p_department,''))) not between 1 and 240 then
    raise invalid_parameter_value using message='ENJAZ_CRM_CONVERSION_TRANSACTION_INVALID';
  end if;

  select q.total into v_current_fee
  from public.crm_quotations q
  where q.workspace_id=p_workspace_id and q.lead_id=p_lead_id and q.status='accepted' and q.total>0
  order by q.accepted_at desc
  limit 1;
  if v_current_fee is null then
    raise invalid_parameter_value using message='ENJAZ_CRM_ACCEPTED_QUOTATION_REQUIRED';
  end if;

  if v_lead.organization_name is not null then
    select c.id into v_duplicate_company from public.companies c
    where c.workspace_id=p_workspace_id and c.deleted_at is null
      and (lower(c.legal_name)=lower(v_lead.organization_name) or lower(coalesce(c.display_name,''))=lower(v_lead.organization_name))
    limit 1;
  end if;
  if v_lead.email is not null or v_lead.phone is not null then
    select c.id into v_duplicate_contact from public.contacts c
    where c.workspace_id=p_workspace_id and c.status='active'
      and ((v_lead.email is not null and lower(coalesce(c.email,''))=lower(v_lead.email)) or (v_lead.phone is not null and c.phone=v_lead.phone))
    limit 1;
  end if;
  if p_reuse_company_id is null and v_duplicate_company is not null then
    raise unique_violation using message='ENJAZ_CRM_DUPLICATE_COMPANY_REVIEW_REQUIRED';
  end if;
  if p_reuse_company_id is not null then
    select c.id into v_company_id from public.companies c where c.workspace_id=p_workspace_id and c.id=p_reuse_company_id and c.deleted_at is null;
    if v_company_id is null then raise foreign_key_violation using message='ENJAZ_CRM_REUSE_COMPANY_INVALID'; end if;
  else
    if v_lead.organization_name is null then raise invalid_parameter_value using message='ENJAZ_CRM_ORGANIZATION_REQUIRED_FOR_NEW_COMPANY'; end if;
    insert into public.companies(workspace_id,legal_name,display_name,status)
    values(p_workspace_id,v_lead.organization_name,v_lead.organization_name,'active') returning id into v_company_id;
  end if;

  if v_duplicate_contact is not null then
    v_contact_id:=v_duplicate_contact;
  elsif v_lead.display_name is not null then
    insert into public.contacts(workspace_id,display_name,contact_type,phone,email,status)
    values(p_workspace_id,v_lead.display_name,'client',v_lead.phone,v_lead.email,'active') returning id into v_contact_id;
  end if;
  if v_contact_id is not null then
    insert into public.company_contacts(workspace_id,company_id,contact_id,relation_type)
    values(p_workspace_id,v_company_id,v_contact_id,'primary')
    on conflict(workspace_id,company_id,contact_id,relation_type) do nothing;
    update public.companies set primary_contact_id=coalesce(primary_contact_id,v_contact_id),updated_at=now()
    where workspace_id=p_workspace_id and id=v_company_id;
  end if;

  insert into public.transactions(workspace_id,company_id,primary_contact_id,type,department,status,priority,current_fee)
  values(p_workspace_id,v_company_id,v_contact_id,btrim(p_transaction_type),btrim(p_department),'active','normal',v_current_fee)
  returning id into v_tx_id;

  select s.id into v_submission from public.intake_submissions s
  where s.workspace_id=p_workspace_id and s.converted_lead_id=p_lead_id
  order by s.created_at desc limit 1;
  v_snapshot:=jsonb_build_object(
    'displayName',v_lead.display_name,'organizationName',v_lead.organization_name,'phone',v_lead.phone,'email',v_lead.email,
    'source',v_lead.source,'leadVersion',v_lead.version,
    'acceptedQuotation',(select jsonb_build_object('id',q.id,'currency',q.currency,'subtotal',q.subtotal,'discountPercent',q.discount_percent,'total',q.total)
      from public.crm_quotations q where q.workspace_id=p_workspace_id and q.lead_id=p_lead_id and q.status='accepted' order by q.accepted_at desc limit 1)
  );
  insert into public.crm_conversion_audits(workspace_id,lead_id,submission_id,company_id,contact_id,transaction_id,source_snapshot,converted_by)
  values(p_workspace_id,p_lead_id,v_submission,v_company_id,v_contact_id,v_tx_id,v_snapshot,v_actor);
  update public.crm_leads set stage='converted',converted_company_id=v_company_id,converted_contact_id=v_contact_id,converted_transaction_id=v_tx_id,version=version+1,updated_at=now()
  where workspace_id=p_workspace_id and id=p_lead_id;
  update public.crm_service_requests set status='converted',updated_at=now()
  where workspace_id=p_workspace_id and lead_id=p_lead_id and status='accepted';
  if v_submission is not null then
    update public.intake_submissions set status='converted',version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=v_submission and status='approved';
  end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'crm.lead.converted','crm_lead',p_lead_id,'CRM lead converted to authoritative work',
    jsonb_build_object('companyId',v_company_id,'contactId',v_contact_id,'transactionId',v_tx_id,'submissionId',v_submission,'currentFee',v_current_fee,'financeLedgerWritten',false));
  return jsonb_build_object('leadId',p_lead_id,'companyId',v_company_id,'contactId',v_contact_id,'transactionId',v_tx_id,'currentFee',v_current_fee,'wasDuplicate',false);
end;
$$;

revoke all on function public.convert_crm_lead_v1(uuid,uuid,uuid,text,text) from public,anon;
grant execute on function public.convert_crm_lead_v1(uuid,uuid,uuid,text,text) to authenticated;

commit;
