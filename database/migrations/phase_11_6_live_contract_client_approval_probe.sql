-- ENJAZ Phase 11.6-C2 — authenticated Real Cloud Client Portal -> M16 decision bridge probe
-- Runs real governed M3 + Document Factory + M16 flows inside a SAVEPOINT and rolls
-- all probe fixtures back before recording the migration, proving zero residue.

begin;

create or replace function private.enjaz_phase116c2_probe_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path=''
as $$ begin if not coalesce(p_condition,false) then raise exception 'P116C2_FAILED: %',p_message; end if; end $$;
revoke all on function private.enjaz_phase116c2_probe_assert(boolean,text) from public,anon;
grant execute on function private.enjaz_phase116c2_probe_assert(boolean,text) to authenticated;

select set_config('p116c2.tx',(
  select t.id::text
  from public.transactions t
  join public.companies c on c.workspace_id=t.workspace_id and c.id=t.company_id and c.deleted_at is null
  where t.deleted_at is null
    and t.company_id is not null
    and nullif(btrim(coalesce(c.legal_name,'')),'') is not null
    and c.capital is not null
    and nullif(btrim(coalesce(c.registration_number,'')),'') is not null
    and nullif(btrim(coalesce(t.type,'')),'') is not null
    and nullif(btrim(coalesce(t.department,'')),'') is not null
    and exists(
      select 1 from public.documents d
      where d.workspace_id=t.workspace_id and d.transaction_id=t.id
        and d.status='ready' and d.archived_at is null
    )
    and exists(
      select 1
      from public.document_template_versions tv
      join public.document_templates dt on dt.workspace_id=tv.workspace_id and dt.id=tv.template_id and dt.active=true
      where tv.workspace_id=t.workspace_id and tv.status='published'
        and not exists(
          select 1 from jsonb_each(tv.token_schema) e
          where coalesce((e.value->>'required')::boolean,false)
            and lower(coalesce(e.value->>'source','')) not in ('company','transaction')
        )
    )
  order by t.updated_at desc,t.id
  limit 1
),true);
select private.enjaz_phase116c2_probe_assert(nullif(current_setting('p116c2.tx',true),'') is not null,'no suitable transaction anchor');

select set_config('p116c2.ws',(select workspace_id::text from public.transactions where id=current_setting('p116c2.tx')::uuid),true);
select set_config('p116c2.company',(select company_id::text from public.transactions where id=current_setting('p116c2.tx')::uuid),true);
select set_config('p116c2.owner',(select owner_user_id::text from public.workspaces where id=current_setting('p116c2.ws')::uuid),true);
select set_config('p116c2.doc',(
  select d.id::text from public.documents d
  where d.workspace_id=current_setting('p116c2.ws')::uuid
    and d.transaction_id=current_setting('p116c2.tx')::uuid
    and d.status='ready' and d.archived_at is null
  order by d.created_at desc,d.id limit 1
),true);
select set_config('p116c2.tv',(
  select tv.id::text
  from public.document_template_versions tv
  join public.document_templates dt on dt.workspace_id=tv.workspace_id and dt.id=tv.template_id and dt.active=true
  where tv.workspace_id=current_setting('p116c2.ws')::uuid and tv.status='published'
    and not exists(
      select 1 from jsonb_each(tv.token_schema) e
      where coalesce((e.value->>'required')::boolean,false)
        and lower(coalesce(e.value->>'source','')) not in ('company','transaction')
    )
  order by tv.created_at desc,tv.id limit 1
),true);
select set_config('p116c2.client',(
  select u.id::text
  from auth.users u
  where u.id<>current_setting('p116c2.owner')::uuid
    and not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=current_setting('p116c2.ws')::uuid and wm.user_id=u.id)
    and not exists(select 1 from public.organization_members om where om.workspace_id=current_setting('p116c2.ws')::uuid and om.user_id=u.id)
    and not exists(select 1 from public.client_portal_principals p where p.workspace_id=current_setting('p116c2.ws')::uuid and p.user_id=u.id)
  order by u.created_at,u.id limit 1
),true);

select private.enjaz_phase116c2_probe_assert(
  nullif(current_setting('p116c2.ws',true),'') is not null
  and nullif(current_setting('p116c2.company',true),'') is not null
  and nullif(current_setting('p116c2.owner',true),'') is not null
  and nullif(current_setting('p116c2.doc',true),'') is not null
  and nullif(current_setting('p116c2.tv',true),'') is not null
  and nullif(current_setting('p116c2.client',true),'') is not null,
  'C2 probe anchors incomplete'
);

select set_config('p116c2.gen1',gen_random_uuid()::text,true);
select set_config('p116c2.gen2',gen_random_uuid()::text,true);
select set_config('p116c2.engkey1',gen_random_uuid()::text,true);
select set_config('p116c2.engkey2',gen_random_uuid()::text,true);
select set_config('p116c2.engkey3',gen_random_uuid()::text,true);
select set_config('p116c2.contractkey1',gen_random_uuid()::text,true);
select set_config('p116c2.contractkey2',gen_random_uuid()::text,true);
select set_config('p116c2.contractkey3',gen_random_uuid()::text,true);
select set_config('p116c2.to_review1',gen_random_uuid()::text,true);
select set_config('p116c2.to_review2',gen_random_uuid()::text,true);
select set_config('p116c2.to_review3',gen_random_uuid()::text,true);
select set_config('p116c2.req_approve',gen_random_uuid()::text,true);
select set_config('p116c2.req_reject',gen_random_uuid()::text,true);
select set_config('p116c2.req_revoked',gen_random_uuid()::text,true);
select set_config('p116c2.req_expired',gen_random_uuid()::text,true);
select set_config('p116c2.req_cross',gen_random_uuid()::text,true);
select set_config('p116c2.response_approve',gen_random_uuid()::text,true);
select set_config('p116c2.response_reject',gen_random_uuid()::text,true);
select set_config('p116c2.reconcile_approve',gen_random_uuid()::text,true);
select set_config('p116c2.reconcile_reject',gen_random_uuid()::text,true);
select set_config('p116c2.ref1','__P116C2_A_'||replace(left(gen_random_uuid()::text,13),'-',''),true);
select set_config('p116c2.ref2','__P116C2_R_'||replace(left(gen_random_uuid()::text,13),'-',''),true);
select set_config('p116c2.ref3','__P116C2_X_'||replace(left(gen_random_uuid()::text,13),'-',''),true);

savepoint p116c2_fixture;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116c2.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116c2.owner'),true);
set local role authenticated;

select private.enjaz_phase116c2_probe_assert(auth.uid()=current_setting('p116c2.owner')::uuid,'owner auth.uid mismatch');
select private.enjaz_phase116c2_probe_assert(
  not has_table_privilege('authenticated','private.contract_approval_bridge_bindings','SELECT')
  and not has_table_privilege('authenticated','private.contract_approval_bridge_bindings','INSERT')
  and not has_table_privilege('authenticated','private.contract_approval_bridge_bindings','UPDATE'),
  'private C2 bridge direct privilege leak'
);

with x as (
  select public.generate_document_draft_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.gen1')::uuid,current_setting('p116c2.tv')::uuid,
    '__ENJAZ_P116C2_DRAFT_APPROVE__',current_setting('p116c2.company')::uuid,current_setting('p116c2.tx')::uuid,null,null
  ) body
) select set_config('p116c2.draft1',body->>'draftId',true) from x;
with x as (
  select public.generate_document_draft_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.gen2')::uuid,current_setting('p116c2.tv')::uuid,
    '__ENJAZ_P116C2_DRAFT_REJECT__',current_setting('p116c2.company')::uuid,current_setting('p116c2.tx')::uuid,null,null
  ) body
) select set_config('p116c2.draft2',body->>'draftId',true) from x;
select private.enjaz_phase116c2_probe_assert(
  (select status='review_required' from public.document_drafts where id=current_setting('p116c2.draft1')::uuid)
  and (select status='review_required' from public.document_drafts where id=current_setting('p116c2.draft2')::uuid),
  'generated approval drafts not review_required'
);

with x as (
  select public.create_billing_engagement_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.company')::uuid,current_setting('p116c2.tx')::uuid,
    '__ENJAZ_P116C2_ENGAGEMENT_APPROVE__','contract','fixed',current_setting('p116c2.ref1'),
    current_date,current_date+30,current_setting('p116c2.engkey1')::uuid
  ) body
) select set_config('p116c2.eng1',body->>'engagementId',true) from x;
with x as (
  select public.create_billing_engagement_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.company')::uuid,current_setting('p116c2.tx')::uuid,
    '__ENJAZ_P116C2_ENGAGEMENT_REJECT__','contract','fixed',current_setting('p116c2.ref2'),
    current_date,current_date+30,current_setting('p116c2.engkey2')::uuid
  ) body
) select set_config('p116c2.eng2',body->>'engagementId',true) from x;
with x as (
  select public.create_billing_engagement_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.company')::uuid,current_setting('p116c2.tx')::uuid,
    '__ENJAZ_P116C2_ENGAGEMENT_CROSS__','contract','fixed',current_setting('p116c2.ref3'),
    current_date,current_date+30,current_setting('p116c2.engkey3')::uuid
  ) body
) select set_config('p116c2.eng3',body->>'engagementId',true) from x;

with x as (
  select public.create_engagement_contract_revision_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.eng1')::uuid,current_setting('p116c2.tv')::uuid,
    current_setting('p116c2.draft1')::uuid,'__ENJAZ_P116C2_REVISION_APPROVE__',current_setting('p116c2.contractkey1')::uuid
  ) body
) select set_config('p116c2.rev1',body->>'revisionId',true) from x;
with x as (
  select public.create_engagement_contract_revision_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.eng2')::uuid,current_setting('p116c2.tv')::uuid,
    current_setting('p116c2.draft2')::uuid,'__ENJAZ_P116C2_REVISION_REJECT__',current_setting('p116c2.contractkey2')::uuid
  ) body
) select set_config('p116c2.rev2',body->>'revisionId',true) from x;
with x as (
  select public.create_engagement_contract_revision_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.eng3')::uuid,current_setting('p116c2.tv')::uuid,
    current_setting('p116c2.draft1')::uuid,'__ENJAZ_P116C2_REVISION_CROSS__',current_setting('p116c2.contractkey3')::uuid
  ) body
) select set_config('p116c2.rev3',body->>'revisionId',true) from x;

select public.transition_engagement_contract_revision_v2(
  current_setting('p116c2.ws')::uuid,current_setting('p116c2.rev1')::uuid,current_setting('p116c2.to_review1')::uuid,1,'under_review'
);
select public.transition_engagement_contract_revision_v2(
  current_setting('p116c2.ws')::uuid,current_setting('p116c2.rev2')::uuid,current_setting('p116c2.to_review2')::uuid,1,'under_review'
);
select public.transition_engagement_contract_revision_v2(
  current_setting('p116c2.ws')::uuid,current_setting('p116c2.rev3')::uuid,current_setting('p116c2.to_review3')::uuid,1,'under_review'
);

with x as (
  select public.save_client_portal_principal_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.client')::uuid,null,'invited',null
  ) body
) select set_config('p116c2.principal',body->>'principalId',true) from x;
with x as (
  select public.save_client_portal_grant_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.principal')::uuid,null,null,
    'transaction',current_setting('p116c2.tx')::uuid,array['view','approve_document']::text[],null,null
  ) body
) select set_config('p116c2.grant',body->>'grantId',true) from x;
with x as (
  select public.save_client_portal_resource_share_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.principal')::uuid,null,null,
    'document',current_setting('p116c2.doc')::uuid,null,null
  ) body
) select set_config('p116c2.share',body->>'shareId',true) from x;

select public.save_client_portal_request_v1(
  current_setting('p116c2.ws')::uuid,current_setting('p116c2.principal')::uuid,current_setting('p116c2.req_approve')::uuid,null,
  current_setting('p116c2.tx')::uuid,'approval','__ENJAZ_P116C2_APPROVE__','Approve contract revision',null,null,null,current_setting('p116c2.share')::uuid
);
select public.save_client_portal_request_v1(
  current_setting('p116c2.ws')::uuid,current_setting('p116c2.principal')::uuid,current_setting('p116c2.req_reject')::uuid,null,
  current_setting('p116c2.tx')::uuid,'approval','__ENJAZ_P116C2_REJECT__','Reject contract revision',null,null,null,current_setting('p116c2.share')::uuid
);
select public.save_client_portal_request_v1(
  current_setting('p116c2.ws')::uuid,current_setting('p116c2.principal')::uuid,current_setting('p116c2.req_revoked')::uuid,null,
  current_setting('p116c2.tx')::uuid,'approval','__ENJAZ_P116C2_REVOKED__','Revoked approval request',null,null,null,current_setting('p116c2.share')::uuid
);
select public.save_client_portal_request_v1(
  current_setting('p116c2.ws')::uuid,current_setting('p116c2.principal')::uuid,current_setting('p116c2.req_expired')::uuid,null,
  current_setting('p116c2.tx')::uuid,'approval','__ENJAZ_P116C2_EXPIRED__','Expired approval request',null,null,null,current_setting('p116c2.share')::uuid
);
select public.save_client_portal_request_v1(
  current_setting('p116c2.ws')::uuid,current_setting('p116c2.principal')::uuid,current_setting('p116c2.req_cross')::uuid,null,
  current_setting('p116c2.tx')::uuid,'approval','__ENJAZ_P116C2_CROSS__','Unbound engagement request',null,null,null,current_setting('p116c2.share')::uuid
);

select public.bind_client_portal_approval_draft_v1(current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_approve')::uuid,current_setting('p116c2.draft1')::uuid);
select public.bind_client_portal_approval_draft_v1(current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_reject')::uuid,current_setting('p116c2.draft2')::uuid);
select public.bind_client_portal_approval_draft_v1(current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_revoked')::uuid,current_setting('p116c2.draft1')::uuid);
select public.bind_client_portal_approval_draft_v1(current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_expired')::uuid,current_setting('p116c2.draft1')::uuid);
select public.bind_client_portal_approval_draft_v1(current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_cross')::uuid,current_setting('p116c2.draft1')::uuid);

select private.enjaz_phase116c2_probe_assert(
  (public.bind_client_contract_approval_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_approve')::uuid,current_setting('p116c2.rev1')::uuid,2
  )->>'wasDuplicate')::boolean=false,
  'approve binding failed'
);
select private.enjaz_phase116c2_probe_assert(
  (public.bind_client_contract_approval_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_approve')::uuid,current_setting('p116c2.rev1')::uuid,2
  )->>'wasDuplicate')::boolean,
  'approve binding replay not idempotent'
);
select public.bind_client_contract_approval_v1(
  current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_reject')::uuid,current_setting('p116c2.rev2')::uuid,2
);

select public.revoke_client_portal_request_v1(
  current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_revoked')::uuid,1,'phase116c2_probe'
);

reset role;
update public.client_portal_requests
set valid_from=now()-interval '2 minutes',valid_until=now()-interval '1 minute'
where workspace_id=current_setting('p116c2.ws')::uuid and id=current_setting('p116c2.req_expired')::uuid;
delete from public.commercial_engagement_transactions
where workspace_id=current_setting('p116c2.ws')::uuid and engagement_id=current_setting('p116c2.eng3')::uuid;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116c2.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116c2.owner'),true);
set local role authenticated;

do $$
begin
  perform public.bind_client_contract_approval_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_revoked')::uuid,current_setting('p116c2.rev1')::uuid,2
  );
  raise exception 'P116C2_REVOKED_BIND_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_APPROVAL_REQUEST_NOT_ACTIVE%' then raise; end if;
end $$;
do $$
begin
  perform public.bind_client_contract_approval_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_expired')::uuid,current_setting('p116c2.rev1')::uuid,2
  );
  raise exception 'P116C2_EXPIRED_BIND_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_APPROVAL_REQUEST_NOT_ACTIVE%' then raise; end if;
end $$;
do $$
begin
  perform public.bind_client_contract_approval_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_cross')::uuid,current_setting('p116c2.rev3')::uuid,2
  );
  raise exception 'P116C2_UNBOUND_ENGAGEMENT_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_APPROVAL_ENGAGEMENT_TRANSACTION_MISMATCH%' then raise; end if;
end $$;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116c2.client'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116c2.client'),true);
select public.activate_client_portal_invitation_v1(current_setting('p116c2.ws')::uuid,1);

do $$
begin
  perform public.bind_client_contract_approval_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_approve')::uuid,current_setting('p116c2.rev1')::uuid,2
  );
  raise exception 'P116C2_CLIENT_BIND_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_PORTAL_OWNER_REQUIRED%' then raise; end if;
end $$;

select public.respond_client_portal_document_approval_v1(
  current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_approve')::uuid,
  current_setting('p116c2.response_approve')::uuid,'approved','phase116c2 approve'
);
select public.respond_client_portal_document_approval_v1(
  current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_reject')::uuid,
  current_setting('p116c2.response_reject')::uuid,'rejected','phase116c2 reject'
);

do $$
begin
  perform public.reconcile_client_contract_approval_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_approve')::uuid,
    current_setting('p116c2.response_approve')::uuid,current_setting('p116c2.reconcile_approve')::uuid,2
  );
  raise exception 'P116C2_CLIENT_RECONCILE_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_PORTAL_OWNER_REQUIRED%' then raise; end if;
end $$;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116c2.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116c2.owner'),true);

do $$
begin
  perform public.reconcile_client_contract_approval_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_approve')::uuid,
    current_setting('p116c2.response_approve')::uuid,gen_random_uuid(),1
  );
  raise exception 'P116C2_STALE_RECONCILE_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_APPROVAL_EXPECTED_VERSION_MISMATCH%' then raise; end if;
end $$;

select private.enjaz_phase116c2_probe_assert(
  (public.reconcile_client_contract_approval_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_approve')::uuid,
    current_setting('p116c2.response_approve')::uuid,current_setting('p116c2.reconcile_approve')::uuid,2
  )->>'wasDuplicate')::boolean=false,
  'approved decision reconciliation failed'
);
select private.enjaz_phase116c2_probe_assert(
  (select status='approved' and version=3 from public.engagement_contract_revisions where id=current_setting('p116c2.rev1')::uuid),
  'approved decision did not feed exact M16 transition'
);
select private.enjaz_phase116c2_probe_assert(
  (public.reconcile_client_contract_approval_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_approve')::uuid,
    current_setting('p116c2.response_approve')::uuid,current_setting('p116c2.reconcile_approve')::uuid,2
  )->>'wasDuplicate')::boolean,
  'approved reconcile replay not idempotent'
);

do $$
begin
  perform public.reconcile_client_contract_approval_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_reject')::uuid,
    current_setting('p116c2.response_reject')::uuid,current_setting('p116c2.reconcile_approve')::uuid,2
  );
  raise exception 'P116C2_OPERATION_CONFLICT_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_APPROVAL_OPERATION_CONFLICT%' then raise; end if;
end $$;

select private.enjaz_phase116c2_probe_assert(
  (public.reconcile_client_contract_approval_v1(
    current_setting('p116c2.ws')::uuid,current_setting('p116c2.req_reject')::uuid,
    current_setting('p116c2.response_reject')::uuid,current_setting('p116c2.reconcile_reject')::uuid,2
  )->>'status')='draft',
  'rejected decision reconciliation failed'
);
select private.enjaz_phase116c2_probe_assert(
  (select status='draft' and version=3 from public.engagement_contract_revisions where id=current_setting('p116c2.rev2')::uuid),
  'rejected decision did not return M16 revision to draft'
);

reset role;

select private.enjaz_phase116c2_probe_assert(
  (select count(*)=2 from private.contract_approval_bridge_bindings
   where workspace_id=current_setting('p116c2.ws')::uuid and reconciled_at is not null),
  'C2 reconciled bridge count invalid'
);
select private.enjaz_phase116c2_probe_assert(
  (select count(*)>=4 from public.audit_events
   where workspace_id=current_setting('p116c2.ws')::uuid
     and action in ('engagement.contract.client_approval.bound','engagement.contract.client_decision.reconciled')
     and details->>'requestId' in (current_setting('p116c2.req_approve'),current_setting('p116c2.req_reject'))),
  'C2 bridge audit evidence incomplete'
);

set local enable_seqscan=off;
select count(*) from private.contract_approval_bridge_bindings
where workspace_id=current_setting('p116c2.ws')::uuid and revision_id=current_setting('p116c2.rev1')::uuid;
select count(*) from private.contract_approval_bridge_bindings
where reconciled_response_id=current_setting('p116c2.response_approve')::uuid;
select count(*) from private.contract_approval_bridge_bindings
where workspace_id=current_setting('p116c2.ws')::uuid and reconcile_operation_id=current_setting('p116c2.reconcile_approve')::uuid;
set local enable_seqscan=on;

rollback to savepoint p116c2_fixture;
release savepoint p116c2_fixture;

select private.enjaz_phase116c2_probe_assert(
  not exists(select 1 from public.document_drafts where title in ('__ENJAZ_P116C2_DRAFT_APPROVE__','__ENJAZ_P116C2_DRAFT_REJECT__'))
  and not exists(select 1 from public.commercial_engagements where title in ('__ENJAZ_P116C2_ENGAGEMENT_APPROVE__','__ENJAZ_P116C2_ENGAGEMENT_REJECT__','__ENJAZ_P116C2_ENGAGEMENT_CROSS__'))
  and not exists(select 1 from public.engagement_contract_revisions where title in ('__ENJAZ_P116C2_REVISION_APPROVE__','__ENJAZ_P116C2_REVISION_REJECT__','__ENJAZ_P116C2_REVISION_CROSS__'))
  and not exists(select 1 from public.client_portal_requests where id in (
    current_setting('p116c2.req_approve')::uuid,current_setting('p116c2.req_reject')::uuid,
    current_setting('p116c2.req_revoked')::uuid,current_setting('p116c2.req_expired')::uuid,current_setting('p116c2.req_cross')::uuid
  ))
  and not exists(select 1 from private.contract_approval_bridge_bindings where request_id in (
    current_setting('p116c2.req_approve')::uuid,current_setting('p116c2.req_reject')::uuid,
    current_setting('p116c2.req_revoked')::uuid,current_setting('p116c2.req_expired')::uuid,current_setting('p116c2.req_cross')::uuid
  ))
  and not exists(select 1 from public.client_portal_principals where workspace_id=current_setting('p116c2.ws')::uuid and user_id=current_setting('p116c2.client')::uuid),
  'C2 SAVEPOINT rollback left residue'
);
select private.enjaz_phase116c2_probe_assert(
  not exists(
    select 1 from public.audit_events
    where workspace_id=current_setting('p116c2.ws')::uuid
      and action in ('engagement.contract.client_approval.bound','engagement.contract.client_decision.reconciled')
      and details->>'requestId' in (
        current_setting('p116c2.req_approve'),current_setting('p116c2.req_reject'),
        current_setting('p116c2.req_revoked'),current_setting('p116c2.req_expired'),current_setting('p116c2.req_cross')
      )
  ),
  'C2 audit residue remains after SAVEPOINT rollback'
);

drop function private.enjaz_phase116c2_probe_assert(boolean,text);
commit;
