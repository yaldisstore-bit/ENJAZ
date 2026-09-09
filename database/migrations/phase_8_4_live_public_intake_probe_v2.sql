-- ENJAZ Phase 8.4 — focused public intake + review Real Cloud probe v2
begin;
create or replace function private.enjaz_p84_intake_assert(p_ok boolean,p_msg text)
returns void language plpgsql security invoker set search_path='' as $$ begin if not coalesce(p_ok,false) then raise exception 'ENJAZ_P84_INTAKE_PROBE: %',p_msg; end if; end $$;

select set_config('enjaz.p84.user',(select wm.user_id::text from public.workspace_memberships wm join auth.users u on u.id=wm.user_id order by wm.created_at limit 1),true);
select set_config('enjaz.p84.ws',(select wm.workspace_id::text from public.workspace_memberships wm where wm.user_id=current_setting('enjaz.p84.user')::uuid order by wm.created_at limit 1),true);
select set_config('enjaz.p84.mark',replace(gen_random_uuid()::text,'-',''),true);
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('enjaz.p84.user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('enjaz.p84.user'),true);
set local role authenticated;

with x as (select public.save_intake_form_v1(current_setting('enjaz.p84.ws')::uuid,null,'P84 Public Probe','P84 Public Probe','review probe',true,jsonb_build_array(
 jsonb_build_object('key','displayName','label','Name','type','text','required',true,'config','{}'::jsonb),
 jsonb_build_object('key','organizationName','label','Organization','type','text','required',true,'config','{}'::jsonb),
 jsonb_build_object('key','email','label','Email','type','email','required',true,'config','{}'::jsonb))) j)
select set_config('enjaz.p84.form',j->>'id',true) from x;
with x as (select public.issue_intake_link_v1(current_setting('enjaz.p84.ws')::uuid,current_setting('enjaz.p84.form')::uuid,null,2) j)
select set_config('enjaz.p84.link',j->>'linkId',true),set_config('enjaz.p84.token',j->>'token',true) from x;
reset role;
select private.enjaz_p84_intake_assert((select length(token_hash)=64 and token_hash<>current_setting('enjaz.p84.token') from public.intake_links where id=current_setting('enjaz.p84.link')::uuid),'raw token persistence');

set local role anon;
select set_config('enjaz.p84.anon_closed',((not has_table_privilege('public.intake_submissions','INSERT')) and (not has_table_privilege('public.intake_submissions','UPDATE')) and (not has_table_privilege('public.crm_leads','INSERT')))::text,true);
with x as (select public.get_public_intake_v1(current_setting('enjaz.p84.token')) j)
select set_config('enjaz.p84.authority',j->>'publicAuthority',true) from x;
with x as (select public.save_public_intake_v1(current_setting('enjaz.p84.token'),jsonb_build_object(
 'displayName','P84 Reviewed Lead','organizationName','__P84_INTAKE_'||left(current_setting('enjaz.p84.mark'),16),'email','p84-intake@example.invalid'),
 '[]'::jsonb,true) j)
select set_config('enjaz.p84.sub',j->>'submissionId',true),set_config('enjaz.p84.sv',j->>'version',true),set_config('enjaz.p84.authflag',j->>'authoritative',true) from x;
reset role;
select private.enjaz_p84_intake_assert(current_setting('enjaz.p84.anon_closed')='true','anon direct mutation');
select private.enjaz_p84_intake_assert(current_setting('enjaz.p84.authority')='non_authoritative','public authority');
select private.enjaz_p84_intake_assert(current_setting('enjaz.p84.authflag')='false','public submission authority');

set local role authenticated;
with x as (select public.review_intake_submission_v1(current_setting('enjaz.p84.ws')::uuid,current_setting('enjaz.p84.sub')::uuid,current_setting('enjaz.p84.sv')::int,'approve',jsonb_build_object('displayName','displayName','organizationName','organizationName','email','email'),'P84 reviewed approval') j)
select set_config('enjaz.p84.lead',j->>'leadId',true),set_config('enjaz.p84.core',j->>'authoritativeCoreCreated',true),set_config('enjaz.p84.reviewstatus',j->>'status',true) from x;
reset role;
select private.enjaz_p84_intake_assert(current_setting('enjaz.p84.reviewstatus')='approved' and current_setting('enjaz.p84.core')='false','review Core boundary');
select private.enjaz_p84_intake_assert(exists(select 1 from public.crm_leads where id=current_setting('enjaz.p84.lead')::uuid and stage='inquiry' and converted_company_id is null and converted_transaction_id is null),'review lead state');
select private.enjaz_p84_intake_assert(not exists(select 1 from public.crm_conversion_audits where lead_id=current_setting('enjaz.p84.lead')::uuid),'guarded conversion bypass');

delete from public.audit_events where workspace_id=current_setting('enjaz.p84.ws')::uuid and entity_id in (current_setting('enjaz.p84.form')::uuid,current_setting('enjaz.p84.link')::uuid,current_setting('enjaz.p84.sub')::uuid,current_setting('enjaz.p84.lead')::uuid);
delete from public.intake_submissions where workspace_id=current_setting('enjaz.p84.ws')::uuid and id=current_setting('enjaz.p84.sub')::uuid;
delete from public.intake_links where workspace_id=current_setting('enjaz.p84.ws')::uuid and id=current_setting('enjaz.p84.link')::uuid;
delete from public.intake_forms where workspace_id=current_setting('enjaz.p84.ws')::uuid and id=current_setting('enjaz.p84.form')::uuid;
delete from public.crm_leads where workspace_id=current_setting('enjaz.p84.ws')::uuid and id=current_setting('enjaz.p84.lead')::uuid;
select private.enjaz_p84_intake_assert(not exists(select 1 from public.intake_forms where name='P84 Public Probe'),'cleanup');
drop function private.enjaz_p84_intake_assert(boolean,text);
commit;
