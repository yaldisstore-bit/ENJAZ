-- ENJAZ Phase 11.6-C1 — authenticated Real Cloud M16 transition probe
-- Proves versioned/idempotent transition ownership and leaves zero residue.

begin;

create or replace function private.enjaz_phase116c1_probe_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path=''
as $$ begin if not coalesce(p_condition,false) then raise exception 'P116C1_FAILED: %',p_message; end if; end $$;
revoke all on function private.enjaz_phase116c1_probe_assert(boolean,text) from public,anon;
grant execute on function private.enjaz_phase116c1_probe_assert(boolean,text) to authenticated;

select set_config('p116c1.draft',(
  select d.id::text from public.document_drafts d
  join public.workspaces w on w.id=d.workspace_id
  join public.workspace_memberships wm on wm.workspace_id=d.workspace_id and wm.user_id=w.owner_user_id
  where d.status='final' and d.company_id is not null and d.transaction_id is not null
    and d.template_version_id is not null and d.final_document_id is not null and d.final_document_version_id is not null
  order by d.created_at desc,d.id limit 1
),true);
select private.enjaz_phase116c1_probe_assert(nullif(current_setting('p116c1.draft',true),'') is not null,'no final factory artifact');

select set_config('p116c1.ws',(select workspace_id::text from public.document_drafts where id=current_setting('p116c1.draft')::uuid),true);
select set_config('p116c1.company',(select company_id::text from public.document_drafts where id=current_setting('p116c1.draft')::uuid),true);
select set_config('p116c1.tx',(select transaction_id::text from public.document_drafts where id=current_setting('p116c1.draft')::uuid),true);
select set_config('p116c1.tv',(select template_version_id::text from public.document_drafts where id=current_setting('p116c1.draft')::uuid),true);
select set_config('p116c1.owner',(select owner_user_id::text from public.workspaces where id=current_setting('p116c1.ws')::uuid),true);
select set_config('p116c1.outsider',(
  select wm.user_id::text from public.workspace_memberships wm
  where wm.workspace_id<>current_setting('p116c1.ws')::uuid and wm.user_id<>current_setting('p116c1.owner')::uuid
  order by wm.created_at,wm.workspace_id limit 1
),true);
select private.enjaz_phase116c1_probe_assert(nullif(current_setting('p116c1.outsider',true),'') is not null,'no outsider identity');

select set_config('p116c1.engagement_key',gen_random_uuid()::text,true);
select set_config('p116c1.contract_key',gen_random_uuid()::text,true);
select set_config('p116c1.op1',gen_random_uuid()::text,true);
select set_config('p116c1.op2',gen_random_uuid()::text,true);
select set_config('p116c1.ref','__P116C1_'||replace(left(gen_random_uuid()::text,13),'-',''),true);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116c1.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116c1.owner'),true);
set local role authenticated;

select private.enjaz_phase116c1_probe_assert(auth.uid()=current_setting('p116c1.owner')::uuid,'owner auth.uid mismatch');
select private.enjaz_phase116c1_probe_assert(not has_table_privilege('authenticated','public.engagement_contract_revisions','UPDATE'),'direct contract update grant leak');
select private.enjaz_phase116c1_probe_assert(
  not has_function_privilege('authenticated','public.transition_engagement_contract_revision_v1(uuid,uuid,text,uuid,uuid,date,date,jsonb,text)','EXECUTE'),
  'legacy v1 transition still executable'
);
select private.enjaz_phase116c1_probe_assert(
  has_function_privilege('authenticated','public.transition_engagement_contract_revision_v2(uuid,uuid,uuid,integer,text,uuid,uuid,date,date,jsonb,text)','EXECUTE'),
  'governed v2 transition not executable'
);

with x as (
  select public.create_billing_engagement_v1(
    current_setting('p116c1.ws')::uuid,current_setting('p116c1.company')::uuid,current_setting('p116c1.tx')::uuid,
    '__ENJAZ_PHASE116C1_CONTRACT_PROBE__','contract','fixed',current_setting('p116c1.ref'),
    current_date,current_date+30,current_setting('p116c1.engagement_key')::uuid
  ) body
) select set_config('p116c1.engagement',body->>'engagementId',true) from x;

with x as (
  select public.create_engagement_contract_revision_v1(
    current_setting('p116c1.ws')::uuid,current_setting('p116c1.engagement')::uuid,current_setting('p116c1.tv')::uuid,
    current_setting('p116c1.draft')::uuid,'__ENJAZ_PHASE116C1_REVISION__',current_setting('p116c1.contract_key')::uuid
  ) body
) select set_config('p116c1.revision',body->>'revisionId',true) from x;

select private.enjaz_phase116c1_probe_assert(
  (select status='draft' and version=1 from public.engagement_contract_revisions where id=current_setting('p116c1.revision')::uuid),
  'initial revision version invalid'
);

with x as (
  select public.transition_engagement_contract_revision_v2(
    current_setting('p116c1.ws')::uuid,current_setting('p116c1.revision')::uuid,
    current_setting('p116c1.op1')::uuid,1,'under_review'
  ) body
) select set_config('p116c1.first_response',body::text,true) from x;

select private.enjaz_phase116c1_probe_assert(
  (current_setting('p116c1.first_response')::jsonb->>'version')::integer=2
  and coalesce((current_setting('p116c1.first_response')::jsonb->>'wasDuplicate')::boolean,false)=false,
  'v2 first transition response invalid'
);
select private.enjaz_phase116c1_probe_assert(
  (select status='under_review' and version=2 from public.engagement_contract_revisions where id=current_setting('p116c1.revision')::uuid),
  'v2 first transition did not persist exact version'
);

select private.enjaz_phase116c1_probe_assert(
  coalesce((
    public.transition_engagement_contract_revision_v2(
      current_setting('p116c1.ws')::uuid,current_setting('p116c1.revision')::uuid,
      current_setting('p116c1.op1')::uuid,1,'under_review'
    )->>'wasDuplicate'
  )::boolean,false),
  'exact replay was not idempotent'
);
select private.enjaz_phase116c1_probe_assert(
  (select version=2 from public.engagement_contract_revisions where id=current_setting('p116c1.revision')::uuid),
  'idempotent replay changed version'
);

do $$
begin
  perform public.transition_engagement_contract_revision_v2(
    current_setting('p116c1.ws')::uuid,current_setting('p116c1.revision')::uuid,
    current_setting('p116c1.op1')::uuid,1,'approved'
  );
  raise exception 'P116C1_IDEMPOTENCY_CONFLICT_NOT_REJECTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_TRANSITION_IDEMPOTENCY_CONFLICT%' then raise; end if;
end $$;

do $$
begin
  perform public.transition_engagement_contract_revision_v2(
    current_setting('p116c1.ws')::uuid,current_setting('p116c1.revision')::uuid,
    gen_random_uuid(),1,'approved'
  );
  raise exception 'P116C1_STALE_NOT_REJECTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_TRANSITION_STALE%' then raise; end if;
end $$;

with x as (
  select public.transition_engagement_contract_revision_v2(
    current_setting('p116c1.ws')::uuid,current_setting('p116c1.revision')::uuid,
    current_setting('p116c1.op2')::uuid,2,'approved'
  ) body
) select set_config('p116c1.second_response',body::text,true) from x;

select private.enjaz_phase116c1_probe_assert(
  (select status='approved' and version=3 from public.engagement_contract_revisions where id=current_setting('p116c1.revision')::uuid),
  'second governed transition invalid'
);
select private.enjaz_phase116c1_probe_assert(
  (select count(*)=2 from private.engagement_contract_transition_receipts
   where workspace_id=current_setting('p116c1.ws')::uuid and revision_id=current_setting('p116c1.revision')::uuid),
  'transition receipt count invalid'
);

do $$
begin
  perform public.transition_engagement_contract_revision_v1(
    current_setting('p116c1.ws')::uuid,current_setting('p116c1.revision')::uuid,'under_review'
  );
  raise exception 'P116C1_LEGACY_V1_EXECUTED';
exception when insufficient_privilege then null;
end $$;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116c1.outsider'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116c1.outsider'),true);
select private.enjaz_phase116c1_probe_assert(auth.uid()=current_setting('p116c1.outsider')::uuid,'outsider auth.uid mismatch');

do $$
begin
  perform public.transition_engagement_contract_revision_v2(
    current_setting('p116c1.ws')::uuid,current_setting('p116c1.revision')::uuid,
    gen_random_uuid(),3,'under_review'
  );
  raise exception 'P116C1_CROSS_WORKSPACE_NOT_REJECTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_WORKSPACE_FORBIDDEN%' then raise; end if;
end $$;

reset role;

select private.enjaz_phase116c1_probe_assert(
  (select count(*)>=4 from public.audit_events
   where workspace_id=current_setting('p116c1.ws')::uuid
     and entity_id=current_setting('p116c1.revision')::uuid
     and action in ('engagement.contract.revision.transitioned','engagement.contract.transition.receipted')),
  'audit evidence incomplete'
);

delete from private.engagement_contract_transition_receipts
where workspace_id=current_setting('p116c1.ws')::uuid and revision_id=current_setting('p116c1.revision')::uuid;
delete from public.audit_events
where workspace_id=current_setting('p116c1.ws')::uuid
  and entity_id in (current_setting('p116c1.revision')::uuid,current_setting('p116c1.engagement')::uuid);
delete from public.engagement_contract_revisions where id=current_setting('p116c1.revision')::uuid;
delete from public.commercial_engagement_transactions where engagement_id=current_setting('p116c1.engagement')::uuid;
delete from public.commercial_engagements where id=current_setting('p116c1.engagement')::uuid;

select private.enjaz_phase116c1_probe_assert(
  not exists(select 1 from private.engagement_contract_transition_receipts where revision_id=current_setting('p116c1.revision')::uuid),
  'receipt residue'
);
select private.enjaz_phase116c1_probe_assert(
  not exists(select 1 from public.engagement_contract_revisions where id=current_setting('p116c1.revision')::uuid),
  'revision residue'
);
select private.enjaz_phase116c1_probe_assert(
  not exists(select 1 from public.commercial_engagements where id=current_setting('p116c1.engagement')::uuid),
  'engagement residue'
);
select private.enjaz_phase116c1_probe_assert(
  not exists(select 1 from public.audit_events
    where workspace_id=current_setting('p116c1.ws')::uuid
      and entity_id in (current_setting('p116c1.revision')::uuid,current_setting('p116c1.engagement')::uuid)),
  'audit residue'
);

drop function private.enjaz_phase116c1_probe_assert(boolean,text);
commit;
