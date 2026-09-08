-- ENJAZ Phase 8.4 — focused authenticated Real Cloud CRM probe v2
begin;
create or replace function private.enjaz_p84_crm_assert(p_ok boolean,p_msg text)
returns void language plpgsql security invoker set search_path='' as $$ begin if not coalesce(p_ok,false) then raise exception 'ENJAZ_P84_CRM_PROBE: %',p_msg; end if; end $$;
revoke all on function private.enjaz_p84_crm_assert(boolean,text) from public,anon;
grant execute on function private.enjaz_p84_crm_assert(boolean,text) to authenticated;

select set_config('enjaz.p84.user',(select wm.user_id::text from public.workspace_memberships wm join auth.users u on u.id=wm.user_id order by wm.created_at limit 1),true);
select set_config('enjaz.p84.ws',(select wm.workspace_id::text from public.workspace_memberships wm where wm.user_id=current_setting('enjaz.p84.user')::uuid order by wm.created_at limit 1),true);
select set_config('enjaz.p84.mark',replace(gen_random_uuid()::text,'-',''),true);
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('enjaz.p84.user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('enjaz.p84.user'),true);
set local role authenticated;

select private.enjaz_p84_crm_assert(auth.uid()=current_setting('enjaz.p84.user')::uuid,'auth.uid');
select private.enjaz_p84_crm_assert(not has_table_privilege('public.crm_leads','INSERT') and not has_table_privilege('public.crm_leads','UPDATE'),'direct table mutation');
with c as (select public.get_crm_intake_context_v1(current_setting('enjaz.p84.ws')::uuid) j)
select private.enjaz_p84_crm_assert(j->>'externalSubmissionAuthority'='non_authoritative' and j->>'financeLedgerWriteAuthority'='none','authority context') from c;

with x as (select public.save_service_catalog_item_v1(current_setting('enjaz.p84.ws')::uuid,null,'P84-'||left(current_setting('enjaz.p84.mark'),8),'P84 Cloud Service','probe',125000,3,'[]','{}',true) j)
select set_config('enjaz.p84.svc',j->>'id',true) from x;
with x as (select public.create_crm_lead_v1(current_setting('enjaz.p84.ws')::uuid,'P84 Probe Lead','__P84_ORG_'||left(current_setting('enjaz.p84.mark'),16),'+9647700000844','p84-probe@example.invalid','phase84_crm_probe_v2',null) j)
select set_config('enjaz.p84.lead',j->>'id',true),set_config('enjaz.p84.lv',j->>'version',true) from x;
with x as (select public.advance_crm_lead_v1(current_setting('enjaz.p84.ws')::uuid,current_setting('enjaz.p84.lead')::uuid,current_setting('enjaz.p84.lv')::int,'qualified',null) j)
select set_config('enjaz.p84.lv',j->>'version',true) from x;
with x as (select public.create_crm_service_request_v1(current_setting('enjaz.p84.ws')::uuid,current_setting('enjaz.p84.lead')::uuid,current_setting('enjaz.p84.svc')::uuid,'probe') j)
select set_config('enjaz.p84.req',j->>'id',true) from x;
with x as (select public.create_crm_quotation_v1(current_setting('enjaz.p84.ws')::uuid,current_setting('enjaz.p84.lead')::uuid,current_setting('enjaz.p84.req')::uuid,'IQD',5,current_date+7,jsonb_build_array(jsonb_build_object('serviceId',current_setting('enjaz.p84.svc'),'description','P84 item','quantity',1,'unitPrice',125000))) j)
select set_config('enjaz.p84.quote',j->>'id',true),set_config('enjaz.p84.qv',j->>'version',true),private.enjaz_p84_crm_assert(j->>'status'='approved','quote approval') from x;
with x as (select public.accept_crm_quotation_v1(current_setting('enjaz.p84.ws')::uuid,current_setting('enjaz.p84.quote')::uuid,current_setting('enjaz.p84.qv')::int) j)
select private.enjaz_p84_crm_assert(j->>'status'='accepted','quote acceptance') from x;
with x as (select public.convert_crm_lead_v1(current_setting('enjaz.p84.ws')::uuid,current_setting('enjaz.p84.lead')::uuid,null,'P84 Real Cloud','QA') j)
select set_config('enjaz.p84.co',j->>'companyId',true),set_config('enjaz.p84.ct',coalesce(j->>'contactId',''),true),set_config('enjaz.p84.tx',j->>'transactionId',true),private.enjaz_p84_crm_assert((j->>'currentFee')::numeric=118750,'accepted quote fee binding') from x;
select private.enjaz_p84_crm_assert(not exists(select 1 from public.payments where workspace_id=current_setting('enjaz.p84.ws')::uuid and transaction_id=current_setting('enjaz.p84.tx')::uuid),'finance isolation');

reset role;
delete from public.audit_events where workspace_id=current_setting('enjaz.p84.ws')::uuid and entity_id in (current_setting('enjaz.p84.svc')::uuid,current_setting('enjaz.p84.lead')::uuid,current_setting('enjaz.p84.req')::uuid,current_setting('enjaz.p84.quote')::uuid);
delete from public.crm_conversion_audits where workspace_id=current_setting('enjaz.p84.ws')::uuid and lead_id=current_setting('enjaz.p84.lead')::uuid;
delete from public.crm_quotation_items where workspace_id=current_setting('enjaz.p84.ws')::uuid and quotation_id=current_setting('enjaz.p84.quote')::uuid;
delete from public.crm_quotations where workspace_id=current_setting('enjaz.p84.ws')::uuid and id=current_setting('enjaz.p84.quote')::uuid;
delete from public.crm_service_requests where workspace_id=current_setting('enjaz.p84.ws')::uuid and id=current_setting('enjaz.p84.req')::uuid;
delete from public.crm_leads where workspace_id=current_setting('enjaz.p84.ws')::uuid and id=current_setting('enjaz.p84.lead')::uuid;
delete from public.transactions where workspace_id=current_setting('enjaz.p84.ws')::uuid and id=current_setting('enjaz.p84.tx')::uuid;
delete from public.company_contacts where workspace_id=current_setting('enjaz.p84.ws')::uuid and company_id=current_setting('enjaz.p84.co')::uuid;
delete from public.companies where workspace_id=current_setting('enjaz.p84.ws')::uuid and id=current_setting('enjaz.p84.co')::uuid;
delete from public.contacts where workspace_id=current_setting('enjaz.p84.ws')::uuid and id=nullif(current_setting('enjaz.p84.ct'),'')::uuid;
delete from public.service_catalog_items where workspace_id=current_setting('enjaz.p84.ws')::uuid and id=current_setting('enjaz.p84.svc')::uuid;
select private.enjaz_p84_crm_assert(not exists(select 1 from public.crm_leads where source='phase84_crm_probe_v2'),'cleanup');
drop function private.enjaz_p84_crm_assert(boolean,text);
commit;
