-- ENJAZ Phase 8.4 Real Cloud probe v2
begin;
create or replace function private.p84v2_assert(ok boolean,msg text) returns void language plpgsql security invoker set search_path='' as $$begin if not coalesce(ok,false) then raise exception 'P84V2: %',msg; end if; end$$;
revoke all on function private.p84v2_assert(boolean,text) from public,anon;
grant execute on function private.p84v2_assert(boolean,text) to authenticated;
select set_config('p84.u',(select wm.user_id::text from public.workspace_memberships wm join auth.users u on u.id=wm.user_id order by wm.created_at limit 1),true);
select set_config('p84.w',(select wm.workspace_id::text from public.workspace_memberships wm where wm.user_id=current_setting('p84.u')::uuid order by wm.created_at limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p84.u'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p84.u'),true);
set local role authenticated;
select private.p84v2_assert(auth.uid()=current_setting('p84.u')::uuid,'auth boundary failed');
select private.p84v2_assert(not has_table_privilege('public.crm_leads','INSERT') and not has_table_privilege('public.intake_submissions','INSERT'),'direct writes exposed');
with x as (select public.create_crm_lead_v1(current_setting('p84.w')::uuid,'P84V2 CRM lead','P84V2 org',null,'p84v2-crm@example.invalid','phase84_probe_v2',null) body)
select set_config('p84.crmlead',body->>'id',true) from x;
with x as (select public.save_intake_form_v1(current_setting('p84.w')::uuid,null,'P84V2 Intake','P84V2 Intake',null,true,jsonb_build_array(jsonb_build_object('key','displayName','label','Name','type','text','required',true,'config','{}'::jsonb))) body)
select set_config('p84.form',body->>'id',true) from x;
with x as (select public.issue_intake_link_v1(current_setting('p84.w')::uuid,current_setting('p84.form')::uuid,null,1) body)
select set_config('p84.link',body->>'linkId',true),set_config('p84.token',body->>'token',true) from x;
select private.p84v2_assert((select length(token_hash)=64 and token_hash<>current_setting('p84.token') from public.intake_links where id=current_setting('p84.link')::uuid),'token hash failed');
reset role;
set local role anon;
with x as (select public.get_public_intake_v1(current_setting('p84.token')) body) select set_config('p84.auth',body->>'publicAuthority',true) from x;
with x as (select public.save_public_intake_v1(current_setting('p84.token'),jsonb_build_object('displayName','P84V2 reviewed lead'),'[]'::jsonb,true) body)
select set_config('p84.sub',body->>'submissionId',true),set_config('p84.ver',body->>'version',true),set_config('p84.pubauth',body->>'authoritative',true) from x;
reset role;
select private.p84v2_assert(current_setting('p84.auth')='non_authoritative' and current_setting('p84.pubauth')='false','public intake became authoritative');
set local role authenticated;
with x as (select public.review_intake_submission_v1(current_setting('p84.w')::uuid,current_setting('p84.sub')::uuid,current_setting('p84.ver')::int,'approve',jsonb_build_object('displayName','displayName'),'P84V2 review') body)
select set_config('p84.rlead',body->>'leadId',true),set_config('p84.rstatus',body->>'status',true),set_config('p84.core',body->>'authoritativeCoreCreated',true) from x;
reset role;
select private.p84v2_assert(current_setting('p84.rstatus')='approved' and current_setting('p84.core')='false','review bypassed guarded conversion');
select private.p84v2_assert(not exists(select 1 from public.crm_conversion_audits where lead_id=current_setting('p84.rlead')::uuid),'review created Core audit');
delete from public.audit_events where workspace_id=current_setting('p84.w')::uuid and entity_id in (current_setting('p84.crmlead')::uuid,current_setting('p84.form')::uuid,current_setting('p84.link')::uuid,current_setting('p84.sub')::uuid,current_setting('p84.rlead')::uuid);
delete from public.intake_submissions where id=current_setting('p84.sub')::uuid;
delete from public.intake_links where id=current_setting('p84.link')::uuid;
delete from public.intake_forms where id=current_setting('p84.form')::uuid;
delete from public.crm_leads where id in (current_setting('p84.crmlead')::uuid,current_setting('p84.rlead')::uuid);
select private.p84v2_assert(not exists(select 1 from public.crm_leads where source='phase84_probe_v2') and not exists(select 1 from public.intake_forms where name='P84V2 Intake'),'cleanup failed');
drop function private.p84v2_assert(boolean,text);
commit;
