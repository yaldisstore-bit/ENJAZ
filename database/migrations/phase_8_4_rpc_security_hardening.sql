-- ENJAZ Phase 8.4 — authenticated mutation RPC security hardening
-- Direct table mutation remains denied to authenticated. Trusted RPCs execute as postgres
-- only after their existing private.require_crm_member_v1(workspace) authorization check.
begin;

alter function public.save_service_catalog_item_v1(uuid,uuid,text,text,text,numeric,integer,jsonb,jsonb,boolean) security definer;
alter function public.create_crm_lead_v1(uuid,text,text,text,text,text,uuid) security definer;
alter function public.advance_crm_lead_v1(uuid,uuid,integer,text,text) security definer;
alter function public.create_crm_service_request_v1(uuid,uuid,uuid,text) security definer;
alter function public.create_crm_quotation_v1(uuid,uuid,uuid,text,numeric,date,jsonb) security definer;
alter function public.approve_crm_quotation_v1(uuid,uuid,integer) security definer;
alter function public.accept_crm_quotation_v1(uuid,uuid,integer) security definer;
alter function public.save_intake_form_v1(uuid,uuid,text,text,text,boolean,jsonb) security definer;
alter function public.issue_intake_link_v1(uuid,uuid,uuid,integer) security definer;
alter function public.revoke_intake_link_v1(uuid,uuid) security definer;
alter function public.review_intake_submission_v1(uuid,uuid,integer,text,jsonb,text) security definer;
alter function public.convert_crm_lead_v1(uuid,uuid,uuid,text,text) security definer;

-- Reassert hardened execution surface. No table mutation grants are introduced.
revoke all on function public.save_service_catalog_item_v1(uuid,uuid,text,text,text,numeric,integer,jsonb,jsonb,boolean) from public,anon;
revoke all on function public.create_crm_lead_v1(uuid,text,text,text,text,text,uuid) from public,anon;
revoke all on function public.advance_crm_lead_v1(uuid,uuid,integer,text,text) from public,anon;
revoke all on function public.create_crm_service_request_v1(uuid,uuid,uuid,text) from public,anon;
revoke all on function public.create_crm_quotation_v1(uuid,uuid,uuid,text,numeric,date,jsonb) from public,anon;
revoke all on function public.approve_crm_quotation_v1(uuid,uuid,integer) from public,anon;
revoke all on function public.accept_crm_quotation_v1(uuid,uuid,integer) from public,anon;
revoke all on function public.save_intake_form_v1(uuid,uuid,text,text,text,boolean,jsonb) from public,anon;
revoke all on function public.issue_intake_link_v1(uuid,uuid,uuid,integer) from public,anon;
revoke all on function public.revoke_intake_link_v1(uuid,uuid) from public,anon;
revoke all on function public.review_intake_submission_v1(uuid,uuid,integer,text,jsonb,text) from public,anon;
revoke all on function public.convert_crm_lead_v1(uuid,uuid,uuid,text,text) from public,anon;

grant execute on function public.save_service_catalog_item_v1(uuid,uuid,text,text,text,numeric,integer,jsonb,jsonb,boolean) to authenticated;
grant execute on function public.create_crm_lead_v1(uuid,text,text,text,text,text,uuid) to authenticated;
grant execute on function public.advance_crm_lead_v1(uuid,uuid,integer,text,text) to authenticated;
grant execute on function public.create_crm_service_request_v1(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.create_crm_quotation_v1(uuid,uuid,uuid,text,numeric,date,jsonb) to authenticated;
grant execute on function public.approve_crm_quotation_v1(uuid,uuid,integer) to authenticated;
grant execute on function public.accept_crm_quotation_v1(uuid,uuid,integer) to authenticated;
grant execute on function public.save_intake_form_v1(uuid,uuid,text,text,text,boolean,jsonb) to authenticated;
grant execute on function public.issue_intake_link_v1(uuid,uuid,uuid,integer) to authenticated;
grant execute on function public.revoke_intake_link_v1(uuid,uuid) to authenticated;
grant execute on function public.review_intake_submission_v1(uuid,uuid,integer,text,jsonb,text) to authenticated;
grant execute on function public.convert_crm_lead_v1(uuid,uuid,uuid,text,text) to authenticated;

commit;
