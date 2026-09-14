-- ENJAZ Phase 10.5 — authenticated Real Cloud contract destruction probe
-- Uses a real owner/workspace and an existing canonical FINAL Document Factory artifact.
-- All probe engagement/revision/audit rows are deleted before commit.

begin;

create or replace function private.enjaz_phase105_probe_assert(p_condition boolean,p_message text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not coalesce(p_condition,false) then
    raise exception 'ENJAZ_PHASE105_PROBE_FAILED: %',p_message;
  end if;
end;
$$;
revoke all on function private.enjaz_phase105_probe_assert(boolean,text) from public,anon;
grant execute on function private.enjaz_phase105_probe_assert(boolean,text) to authenticated;

-- Resolve one real finalized factory artifact whose company/transaction can anchor M16.
select set_config('p105.draft_id',(
  select d.id::text
  from public.document_drafts d
  join public.workspaces w on w.id=d.workspace_id
  join public.workspace_memberships wm on wm.workspace_id=d.workspace_id and wm.user_id=w.owner_user_id
  where d.status='final'
    and d.company_id is not null
    and d.transaction_id is not null
    and d.template_version_id is not null
    and d.final_document_id is not null
    and d.final_document_version_id is not null
  order by d.created_at desc,d.id
  limit 1
),true);
select private.enjaz_phase105_probe_assert(nullif(current_setting('p105.draft_id',true),'') is not null,'no canonical final Document Factory draft exists');

select set_config('p105.ws',(select d.workspace_id::text from public.document_drafts d where d.id=current_setting('p105.draft_id')::uuid),true);
select set_config('p105.company',(select d.company_id::text from public.document_drafts d where d.id=current_setting('p105.draft_id')::uuid),true);
select set_config('p105.tx',(select d.transaction_id::text from public.document_drafts d where d.id=current_setting('p105.draft_id')::uuid),true);
select set_config('p105.template_version',(select d.template_version_id::text from public.document_drafts d where d.id=current_setting('p105.draft_id')::uuid),true);
select set_config('p105.document',(select d.final_document_id::text from public.document_drafts d where d.id=current_setting('p105.draft_id')::uuid),true);
select set_config('p105.document_version',(select d.final_document_version_id::text from public.document_drafts d where d.id=current_setting('p105.draft_id')::uuid),true);
select set_config('p105.owner',(select w.owner_user_id::text from public.workspaces w where w.id=current_setting('p105.ws')::uuid),true);
select set_config('p105.outsider',(
  select wm.user_id::text
  from public.workspace_memberships wm
  where wm.workspace_id<>current_setting('p105.ws')::uuid
    and wm.user_id<>current_setting('p105.owner')::uuid
  order by wm.created_at,wm.workspace_id
  limit 1
),true);
select private.enjaz_phase105_probe_assert(nullif(current_setting('p105.owner',true),'') is not null,'owner resolution failed');
select private.enjaz_phase105_probe_assert(nullif(current_setting('p105.outsider',true),'') is not null,'outsider resolution failed');
select private.enjaz_phase105_probe_assert(
  exists(select 1 from public.document_template_versions tv where tv.workspace_id=current_setting('p105.ws')::uuid and tv.id=current_setting('p105.template_version')::uuid and tv.status='published'),
  'final draft template version is not published'
);

select set_config('p105.engagement_key',gen_random_uuid()::text,true);
select set_config('p105.contract_key',gen_random_uuid()::text,true);
select set_config('p105.ref','__ENJAZ_P105_'||replace(left(gen_random_uuid()::text,13),'-',''),true);

-- Data API identity simulation: real owner, authenticated role.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p105.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p105.owner'),true);
set local role authenticated;

select private.enjaz_phase105_probe_assert((select auth.uid())=current_setting('p105.owner')::uuid,'auth.uid owner mismatch');
select private.enjaz_phase105_probe_assert(not has_table_privilege('authenticated','public.engagement_contract_revisions','INSERT'),'direct contract insert must stay revoked');
select private.enjaz_phase105_probe_assert(not has_table_privilege('authenticated','public.engagement_contract_revisions','UPDATE'),'direct contract update must stay revoked');
select private.enjaz_phase105_probe_assert(not has_table_privilege('authenticated','public.engagement_contract_revisions','DELETE'),'direct contract delete must stay revoked');

with x as (
  select public.create_billing_engagement_v1(
    current_setting('p105.ws')::uuid,
    current_setting('p105.company')::uuid,
    current_setting('p105.tx')::uuid,
    '__ENJAZ_PHASE105_CONTRACT_PROBE__',
    'contract','fixed',current_setting('p105.ref'),
    current_date,current_date+30,
    current_setting('p105.engagement_key')::uuid
  ) body
)
select set_config('p105.engagement',body->>'engagementId',true) from x;
select private.enjaz_phase105_probe_assert(nullif(current_setting('p105.engagement',true),'') is not null,'engagement RPC failed');

with x as (
  select public.create_engagement_contract_revision_v1(
    current_setting('p105.ws')::uuid,
    current_setting('p105.engagement')::uuid,
    current_setting('p105.template_version')::uuid,
    current_setting('p105.draft_id')::uuid,
    '__ENJAZ_PHASE105_CONTRACT_REVISION__',
    current_setting('p105.contract_key')::uuid
  ) body
)
select set_config('p105.revision',body->>'revisionId',true) from x;

select private.enjaz_phase105_probe_assert(
  (public.create_engagement_contract_revision_v1(
    current_setting('p105.ws')::uuid,
    current_setting('p105.engagement')::uuid,
    current_setting('p105.template_version')::uuid,
    current_setting('p105.draft_id')::uuid,
    '__ENJAZ_PHASE105_CONTRACT_REVISION__',
    current_setting('p105.contract_key')::uuid
  )->>'wasDuplicate')::boolean,
  'contract create idempotency replay failed'
);

select private.enjaz_phase105_probe_assert(
  (select count(*)=1 from public.engagement_contract_revisions r where r.workspace_id=current_setting('p105.ws')::uuid and r.id=current_setting('p105.revision')::uuid and r.status='draft'),
  'owner cannot read created contract revision through RLS'
);

perform public.transition_engagement_contract_revision_v1(current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'under_review');
perform public.transition_engagement_contract_revision_v1(current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'approved');
perform public.transition_engagement_contract_revision_v1(
  current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'signature_pending',
  current_setting('p105.document')::uuid,current_setting('p105.document_version')::uuid
);

-- Destructive rollback path: unsigned binding must be released when returned to approved.
perform public.transition_engagement_contract_revision_v1(current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'approved');
select private.enjaz_phase105_probe_assert(
  (select document_id is null and document_version_id is null and status='approved' from public.engagement_contract_revisions r where r.id=current_setting('p105.revision')::uuid),
  'signature_pending -> approved did not release unsigned artifact binding'
);

perform public.transition_engagement_contract_revision_v1(
  current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'signature_pending',
  current_setting('p105.document')::uuid,current_setting('p105.document_version')::uuid
);
perform public.transition_engagement_contract_revision_v1(
  current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'signed',
  null,null,null,null,
  jsonb_build_object(
    'method','authenticated_real_cloud_probe',
    'signerUserId',current_setting('p105.owner'),
    'documentVersionId',current_setting('p105.document_version'),
    'documentChecksum',(select dv.checksum from public.document_versions dv where dv.id=current_setting('p105.document_version')::uuid)
  ),
  'Phase 10.5 authenticated signing probe'
);
perform public.transition_engagement_contract_revision_v1(
  current_setting('p105.ws')::uuid,current_setting('p105.revision')::uuid,'effective',
  null,null,current_date,current_date+30
);

select private.enjaz_phase105_probe_assert(
  (select status='effective' and signed_at is not null and document_id=current_setting('p105.document')::uuid and document_version_id=current_setting('p105.document_version')::uuid and signature_provenance<>'{}'::jsonb from public.engagement_contract_revisions r where r.id=current_setting('p105.revision')::uuid),
  'signed/effective authority invariant failed'
);
select private.enjaz_phase105_probe_assert(
  (select status='active' and start_on=current_date and end_on=current_date+30 from public.commercial_engagements e where e.id=current_setting('p105.engagement')::uuid),
  'effective contract did not project lifecycle to canonical engagement authority'
);

-- Switch to a real user from another workspace; RLS must hide the revision completely.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p105.outsider'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p105.outsider'),true);
select private.enjaz_phase105_probe_assert((select auth.uid())=current_setting('p105.outsider')::uuid,'outsider auth.uid mismatch');
select private.enjaz_phase105_probe_assert(
  (select count(*)=0 from public.engagement_contract_revisions r where r.id=current_setting('p105.revision')::uuid),
  'cross-workspace RLS leak detected'
);

-- Cleanup as migration owner. No probe residue may survive.
reset role;
delete from public.audit_events
where entity_id=current_setting('p105.revision')::uuid
   or (entity_type='engagement' and entity_id=current_setting('p105.engagement')::uuid);
delete from public.engagement_contract_revisions where id=current_setting('p105.revision')::uuid;
delete from public.commercial_engagement_transactions where engagement_id=current_setting('p105.engagement')::uuid;
delete from public.commercial_engagements where id=current_setting('p105.engagement')::uuid;

select private.enjaz_phase105_probe_assert(not exists(select 1 from public.engagement_contract_revisions r where r.id=current_setting('p105.revision')::uuid),'contract probe residue remains');
select private.enjaz_phase105_probe_assert(not exists(select 1 from public.commercial_engagements e where e.id=current_setting('p105.engagement')::uuid),'engagement probe residue remains');

drop function private.enjaz_phase105_probe_assert(boolean,text);
commit;
