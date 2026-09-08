-- ENJAZ Phase 8.4 — authenticated Real Cloud CRM + Smart Intake destruction probe
-- Exercises the real authenticated/anon RPC boundaries against one existing workspace,
-- proves non-authoritative public intake + guarded Core conversion + finance isolation,
-- and deletes every probe row before commit.
begin;

create or replace function private.enjaz_phase84_probe_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not coalesce(p_condition,false) then
    raise exception 'ENJAZ_PHASE84_PROBE_FAILED: %',p_message;
  end if;
end;
$$;
revoke all on function private.enjaz_phase84_probe_assert(boolean,text) from public,anon;
grant execute on function private.enjaz_phase84_probe_assert(boolean,text) to authenticated;

select set_config('enjaz.p84.user_id',(
  select wm.user_id::text
  from public.workspace_memberships wm
  join auth.users u on u.id=wm.user_id
  order by wm.created_at,wm.workspace_id
  limit 1
),true);
select private.enjaz_phase84_probe_assert(nullif(current_setting('enjaz.p84.user_id',true),'') is not null,'no real workspace member exists');
select set_config('enjaz.p84.workspace_id',(
  select wm.workspace_id::text
  from public.workspace_memberships wm
  where wm.user_id=current_setting('enjaz.p84.user_id')::uuid
  order by wm.created_at,wm.workspace_id
  limit 1
),true);
select set_config('enjaz.p84.marker',replace(gen_random_uuid()::text,'-',''),true);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('enjaz.p84.user_id'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('enjaz.p84.user_id'),true);
set local role authenticated;

select private.enjaz_phase84_probe_assert(auth.uid()=current_setting('enjaz.p84.user_id')::uuid,'auth.uid did not resolve to real member');
select private.enjaz_phase84_probe_assert(
  not has_table_privilege('public.crm_leads','INSERT')
  and not has_table_privilege('public.crm_leads','UPDATE')
  and not has_table_privilege('public.crm_leads','DELETE')
  and not has_table_privilege('public.crm_quotations','INSERT')
  and not has_table_privilege('public.crm_quotations','UPDATE')
  and not has_table_privilege('public.intake_submissions','INSERT')
  and not has_table_privilege('public.intake_submissions','UPDATE')
  and not has_table_privilege('public.intake_submission_files','UPDATE'),
  'authenticated direct mutation privileges are not fail-closed'
);

with c as (select public.get_crm_intake_context_v1(current_setting('enjaz.p84.workspace_id')::uuid) body)
select private.enjaz_phase84_probe_assert(
  body->>'authority'='crm_pre_transaction_and_reviewed_intake'
  and body->>'externalSubmissionAuthority'='non_authoritative'
  and body->>'companyWriteAuthority'='guarded_conversion_rpc_only'
  and body->>'transactionWriteAuthority'='guarded_conversion_rpc_only'
  and body->>'financeLedgerWriteAuthority'='none',
  'CRM authority context drifted'
) from c;

with x as (
  select public.save_service_catalog_item_v1(
    current_setting('enjaz.p84.workspace_id')::uuid,null,
    '__P84_'||left(current_setting('enjaz.p84.marker'),12),
    'Phase 8.4 Real Cloud Probe Service','Temporary probe',125000,3,'[]'::jsonb,'{}'::jsonb,true
  ) body
)
select set_config('enjaz.p84.service_id',body->>'id',true) from x;

with x as (
  select public.create_crm_lead_v1(
    current_setting('enjaz.p84.workspace_id')::uuid,
    'Phase 8.4 Real Cloud Probe Lead',
    '__P84_ORG_'||left(current_setting('enjaz.p84.marker'),16),
    '+9647700000844','phase84-real-cloud@example.invalid','phase84_real_cloud_probe',null
  ) body
)
select set_config('enjaz.p84.lead_id',body->>'id',true),set_config('enjaz.p84.lead_version',body->>'version',true) from x;

with x as (
  select public.advance_crm_lead_v1(
    current_setting('enjaz.p84.workspace_id')::uuid,current_setting('enjaz.p84.lead_id')::uuid,
    current_setting('enjaz.p84.lead_version')::integer,'qualified',null
  ) body
)
select set_config('enjaz.p84.lead_version',body->>'version',true) from x;

with x as (
  select public.create_crm_service_request_v1(
    current_setting('enjaz.p84.workspace_id')::uuid,current_setting('enjaz.p84.lead_id')::uuid,
    current_setting('enjaz.p84.service_id')::uuid,'Phase 8.4 Real Cloud request'
  ) body
)
select set_config('enjaz.p84.request_id',body->>'id',true) from x;

with x as (
  select public.create_crm_quotation_v1(
    current_setting('enjaz.p84.workspace_id')::uuid,current_setting('enjaz.p84.lead_id')::uuid,
    current_setting('enjaz.p84.request_id')::uuid,'IQD',5,current_date+7,
    jsonb_build_array(jsonb_build_object(
      'serviceId',current_setting('enjaz.p84.service_id'),
      'description','Phase 8.4 Real Cloud item','quantity',1,'unitPrice',125000
    ))
  ) body
)
select set_config('enjaz.p84.quote_id',body->>'id',true),set_config('enjaz.p84.quote_version',body->>'version',true),
       private.enjaz_phase84_probe_assert(body->>'status'='approved','<=10% quote was not auto-approved')
from x;

with x as (
  select public.accept_crm_quotation_v1(
    current_setting('enjaz.p84.workspace_id')::uuid,current_setting('enjaz.p84.quote_id')::uuid,
    current_setting('enjaz.p84.quote_version')::integer
  ) body
)
select set_config('enjaz.p84.quote_version',body->>'version',true),
       private.enjaz_phase84_probe_assert(body->>'status'='accepted','quote acceptance failed')
from x;

with x as (
  select public.convert_crm_lead_v1(
    current_setting('enjaz.p84.workspace_id')::uuid,current_setting('enjaz.p84.lead_id')::uuid,null,
    'Phase 8.4 Real Cloud Transaction','QA'
  ) body
)
select set_config('enjaz.p84.company_id',body->>'companyId',true),
       set_config('enjaz.p84.contact_id',coalesce(body->>'contactId',''),true),
       set_config('enjaz.p84.transaction_id',body->>'transactionId',true),
       private.enjaz_phase84_probe_assert(not (body->>'wasDuplicate')::boolean,'fresh CRM conversion reported duplicate')
from x;

select private.enjaz_phase84_probe_assert(
  exists(select 1 from public.crm_conversion_audits a
    where a.workspace_id=current_setting('enjaz.p84.workspace_id')::uuid
      and a.lead_id=current_setting('enjaz.p84.lead_id')::uuid
      and a.company_id=current_setting('enjaz.p84.company_id')::uuid
      and a.transaction_id=current_setting('enjaz.p84.transaction_id')::uuid),
  'guarded conversion audit missing'
);
select private.enjaz_phase84_probe_assert(
  not exists(select 1 from public.payments p
    where p.workspace_id=current_setting('enjaz.p84.workspace_id')::uuid
      and p.transaction_id=current_setting('enjaz.p84.transaction_id')::uuid),
  'CRM conversion wrote finance rows'
);

with x as (
  select public.save_intake_form_v1(
    current_setting('enjaz.p84.workspace_id')::uuid,null,
    'Phase 8.4 Real Cloud Probe Intake','Phase 8.4 Real Cloud Probe Intake','Temporary reviewed intake',true,
    jsonb_build_array(
      jsonb_build_object('key','displayName','label','Name','type','text','required',true,'config','{}'::jsonb),
      jsonb_build_object('key','organizationName','label','Organization','type','text','required',true,'config','{}'::jsonb),
      jsonb_build_object('key','email','label','Email','type','email','required',true,'config','{}'::jsonb)
    )
  ) body
)
select set_config('enjaz.p84.form_id',body->>'id',true) from x;

with x as (
  select public.issue_intake_link_v1(
    current_setting('enjaz.p84.workspace_id')::uuid,current_setting('enjaz.p84.form_id')::uuid,null,2
  ) body
)
select set_config('enjaz.p84.link_id',body->>'linkId',true),set_config('enjaz.p84.token',body->>'token',true) from x;

select private.enjaz_phase84_probe_assert(
  (select length(token_hash)=64 and token_hash<>current_setting('enjaz.p84.token')
   from public.intake_links where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and id=current_setting('enjaz.p84.link_id')::uuid),
  'raw intake bearer token was persisted or hash malformed'
);

reset role;
set local role anon;
with x as (select public.get_public_intake_v1(current_setting('enjaz.p84.token')) body)
select set_config('enjaz.p84.public_authority',body->>'publicAuthority',true) from x;
select private.enjaz_phase84_probe_assert(current_setting('enjaz.p84.public_authority')='non_authoritative','public intake authority drifted');

with x as (
  select public.save_public_intake_v1(
    current_setting('enjaz.p84.token'),
    jsonb_build_object(
      'displayName','Phase 8.4 Reviewed Intake Lead',
      'organizationName','__P84_INTAKE_'||left(current_setting('enjaz.p84.marker'),16),
      'email','phase84-intake@example.invalid'
    ),'[]'::jsonb,true
  ) body
)
select set_config('enjaz.p84.submission_id',body->>'submissionId',true),
       set_config('enjaz.p84.submission_version',body->>'version',true),
       private.enjaz_phase84_probe_assert(body->>'authoritative'='false','public submission became authoritative')
from x;

reset role;
set local role authenticated;
with x as (
  select public.review_intake_submission_v1(
    current_setting('enjaz.p84.workspace_id')::uuid,current_setting('enjaz.p84.submission_id')::uuid,
    current_setting('enjaz.p84.submission_version')::integer,'approve',
    jsonb_build_object('displayName','displayName','organizationName','organizationName','email','email'),
    'Phase 8.4 Real Cloud reviewed approval'
  ) body
)
select set_config('enjaz.p84.review_lead_id',body->>'leadId',true),
       private.enjaz_phase84_probe_assert(body->>'status'='approved','review approval failed'),
       private.enjaz_phase84_probe_assert(body->>'authoritativeCoreCreated'='false','review bypassed Core conversion gate')
from x;

select private.enjaz_phase84_probe_assert(
  exists(select 1 from public.crm_leads l where l.workspace_id=current_setting('enjaz.p84.workspace_id')::uuid
    and l.id=current_setting('enjaz.p84.review_lead_id')::uuid and l.stage='inquiry'
    and l.converted_company_id is null and l.converted_transaction_id is null),
  'reviewed submission did not stop at non-authoritative CRM lead'
);
select private.enjaz_phase84_probe_assert(
  not exists(select 1 from public.crm_conversion_audits a where a.workspace_id=current_setting('enjaz.p84.workspace_id')::uuid
    and a.lead_id=current_setting('enjaz.p84.review_lead_id')::uuid),
  'reviewed submission bypassed guarded conversion RPC'
);

reset role;

-- Delete only probe-owned audit events and entities, in FK-safe order.
delete from public.audit_events
where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid
  and entity_id in (
    current_setting('enjaz.p84.service_id')::uuid,current_setting('enjaz.p84.lead_id')::uuid,
    current_setting('enjaz.p84.request_id')::uuid,current_setting('enjaz.p84.quote_id')::uuid,
    current_setting('enjaz.p84.form_id')::uuid,current_setting('enjaz.p84.link_id')::uuid,
    current_setting('enjaz.p84.submission_id')::uuid,current_setting('enjaz.p84.review_lead_id')::uuid
  );
delete from public.crm_conversion_audits where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and lead_id=current_setting('enjaz.p84.lead_id')::uuid;
delete from public.intake_submissions where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and id=current_setting('enjaz.p84.submission_id')::uuid;
delete from public.intake_links where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and id=current_setting('enjaz.p84.link_id')::uuid;
delete from public.intake_forms where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and id=current_setting('enjaz.p84.form_id')::uuid;
delete from public.crm_leads where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and id=current_setting('enjaz.p84.review_lead_id')::uuid;
delete from public.crm_quotation_items where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and quotation_id=current_setting('enjaz.p84.quote_id')::uuid;
delete from public.crm_quotations where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and id=current_setting('enjaz.p84.quote_id')::uuid;
delete from public.crm_service_requests where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and id=current_setting('enjaz.p84.request_id')::uuid;
delete from public.crm_leads where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and id=current_setting('enjaz.p84.lead_id')::uuid;
delete from public.transactions where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and id=current_setting('enjaz.p84.transaction_id')::uuid;
delete from public.company_contacts where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and company_id=current_setting('enjaz.p84.company_id')::uuid;
delete from public.companies where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and id=current_setting('enjaz.p84.company_id')::uuid;
delete from public.contacts where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and id=nullif(current_setting('enjaz.p84.contact_id'),'')::uuid;
delete from public.service_catalog_items where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and id=current_setting('enjaz.p84.service_id')::uuid;

select private.enjaz_phase84_probe_assert(
  not exists(select 1 from public.crm_leads where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and source='phase84_real_cloud_probe')
  and not exists(select 1 from public.companies where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and legal_name like '__P84_%')
  and not exists(select 1 from public.intake_forms where workspace_id=current_setting('enjaz.p84.workspace_id')::uuid and name='Phase 8.4 Real Cloud Probe Intake'),
  'probe cleanup incomplete'
);

drop function private.enjaz_phase84_probe_assert(boolean,text);
commit;
