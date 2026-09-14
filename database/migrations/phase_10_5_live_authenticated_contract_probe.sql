-- ENJAZ Phase 10.5 — authenticated Real Cloud contract destruction probe
-- Exercises the exact public RPC/RLS boundary with real workspace identities and leaves zero residue.

begin;

create or replace function private.enjaz_phase105_probe_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path=''
as $$ begin if not coalesce(p_condition,false) then raise exception 'ENJAZ_PHASE105_PROBE_FAILED: %',p_message; end if; end $$;
revoke all on function private.enjaz_phase105_probe_assert(boolean,text) from public,anon;
grant execute on function private.enjaz_phase105_probe_assert(boolean,text) to authenticated;

select set_config('p105.draft',(
  select d.id::text from public.document_drafts d
  join public.workspaces w on w.id=d.workspace_id
  join public.workspace_memberships wm on wm.workspace_id=d.workspace_id and wm.user_id=w.owner_user_id
  where d.status='final' and d.company_id is not null and d.transaction_id is not null
    and d.template_version_id is not null and d.final_document_id is not null and d.final_document_version_id is not null
  order by d.created_at desc,d.id limit 1
),true);
select private.enjaz_phase105_probe_assert(nullif(current_setting('p105.draft',true),'') is not null,'no final factory artifact');
select set_config('p105.ws',(select workspace_id::text from public.document_drafts where id=current_setting('p105.draft')::uuid),true);
select set_config('p105.company',(select company_id::text from public.document_drafts where id=current_setting('p105.draft')::uuid),true);
select set_config('p105.tx',(select transaction_id::text from public.document_drafts where id=current_setting('p105.draft')::uuid),true);
select set_config('p105.tv',(select template_version_id::text from public.document_drafts where id=current_setting('p105.draft')::uuid),true);
select set_config('p105.doc',(select final_document_id::text from public.document_drafts where id=current_setting('p105.draft')::uuid),true);
select set_config('p105.dv',(select final_document_version_id::text from public.document_drafts where id=current_setting('p105.draft')::uuid),true);
select set_config('p105.owner',(select owner_user_id::text from public.workspaces where id=current_setting('p105.ws')::uuid),true);
select set_config('p105.outsider',(
  select wm.user_id::text from public.workspace_memberships wm
  where wm.workspace_id<>current_setting('p105.ws')::uuid and wm.user_id<>current_setting('p105.owner')::uuid
  order by wm.created_at,wm.workspace_id limit 1
),true);
select private.enjaz_phase105_probe_assert(nullif(current_setting('p105.outsider',true),'') is not null,'no outsider identity');
select set_config('p105.ek',gen_random_uuid()::text,true);
select set_config('p105.ck',gen_random_uuid()::text,true);
select set_config('p105.ref','__P105_'||replace(left(gen_random_uuid()::text,13),'-',''),true);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p105.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p105.owner'),true);
set local role authenticated;
select private.enjaz_phase105_probe_assert(auth.uid()=current_setting('p105.owner')::uuid,'owner auth.uid mismatch');
select private.enjaz_phase105_probe_assert(not has_table_privilege('authenticated','public.engagement_contract_revisions','INSERT'),'direct insert grant leak');
select private.enjaz_phase105_probe_assert(not has_table_privilege('authenticated','public.engagement_contract_revisions','UPDATE'),'direct update grant leak');
select private.enjaz_phase105_probe_assert(not has_table_privilege('authenticated','public.engagement_contract_revisions','DELETE'),'direct delete grant leak');

with x as (
  select public.create_billing_engagement_v1(
    current_setting('p105.ws')::uuid,current_setting('p105.company')::uuid,current_setting('p105.tx')::uuid,
    '__ENJAZ_PHASE105_CONTRACT_PROBE__','contract','fixed',current_setting('p105.ref'),current_date,current_date+30,current_setting('p105.ek')::uuid
  ) body
) select set_config('p105.engagement',body->>'engagementId',true) from x;

with x as (
  select public.create_engagement_contract_revision_v1(
    current_setting('p105.ws')::uuid,current_setting('p105.engagement')::uuid,current_setting('p105.tv')::uuid,
    current_setting('p105.draft')::uuid,'__ENJAZ_PHASE105_CONTRACT_REVISION__',current_setting('p105.ck')::uuid
  ) body
) select set_config('p105.revision',body->>'revisionId',true) from x;

select private.enjaz_phase105_probe_assert(
  (public.create_engagement_contract_revision_v1(
    current_setting('p105.ws')::uuid,current_setting('p105.engagement')::uuid,current_setting('p105.tv')::uuid,
    current_setting('p105.draft')::uuid,'__ENJAZ_PHASE105_CONTRACT_REVISION__',current_setting('p105.ck')::uuid
  )->>'wasDuplicate')::boolean,'idempotency replay failed'
);
select private.enjaz_phase105_probe_assert(
  (select count(*)=1 from public.engagement_contract_revisions where id=current_setting('p105.revision')::uuid and status='draft'),
  'owner RLS read failed'
);

select public.transition_engagement_contract_revision_v1(current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'under_review');
select public.transition_engagement_contract_revision_v1(current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'approved');
select public.transition_engagement_contract_revision_v1(
  current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'signature_pending',
  current_setting('p105.doc')::uuid,current_setting('p105.dv')::uuid
);
select public.transition_engagement_contract_revision_v1(current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'approved');
select private.enjaz_phase105_probe_assert(
  (select status='approved' and document_id is null and document_version_id is null from public.engagement_contract_revisions where id=current_setting('p105.revision')::uuid),
  'signature rollback did not release artifact'
);
select public.transition_engagement_contract_revision_v1(
  current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'signature_pending',
  current_setting('p105.doc')::uuid,current_setting('p105.dv')::uuid
);
select public.transition_engagement_contract_revision_v1(
  current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'signed',null,null,null,null,
  jsonb_build_object('method','authenticated_real_cloud_probe','signerUserId',current_setting('p105.owner'),'documentVersionId',current_setting('p105.dv')),
  'Phase 10.5 probe signature'
);
select public.transition_engagement_contract_revision_v1(
  current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'effective',null,null,current_date,current_date+30
);
select private.enjaz_phase105_probe_assert(
  (select status='effective' and signed_at is not null and document_id=current_setting('p105.doc')::uuid and document_version_id=current_setting('p105.dv')::uuid and signature_provenance<>'{}'::jsonb from public.engagement_contract_revisions where id=current_setting('p105.revision')::uuid),
  'effective signed authority invariant failed'
);
select private.enjaz_phase105_probe_assert(
  (select status='active' and start_on=current_date and end_on=current_date+30 from public.commercial_engagements where id=current_setting('p105.engagement')::uuid),
  'canonical engagement lifecycle projection failed'
);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p105.outsider'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p105.outsider'),true);
select private.enjaz_phase105_probe_assert(auth.uid()=current_setting('p105.outsider')::uuid,'outsider auth.uid mismatch');
select private.enjaz_phase105_probe_assert(
  (select count(*)=0 from public.engagement_contract_revisions where id=current_setting('p105.revision')::uuid),
  'cross-workspace RLS leak'
);

reset role;
delete from public.audit_events where entity_id in (current_setting('p105.revision')::uuid,current_setting('p105.engagement')::uuid);
delete from public.engagement_contract_revisions where id=current_setting('p105.revision')::uuid;
delete from public.commercial_engagement_transactions where engagement_id=current_setting('p105.engagement')::uuid;
delete from public.commercial_engagements where id=current_setting('p105.engagement')::uuid;
select private.enjaz_phase105_probe_assert(not exists(select 1 from public.engagement_contract_revisions where id=current_setting('p105.revision')::uuid),'revision residue');
select private.enjaz_phase105_probe_assert(not exists(select 1 from public.commercial_engagements where id=current_setting('p105.engagement')::uuid),'engagement residue');
drop function private.enjaz_phase105_probe_assert(boolean,text);
commit;
