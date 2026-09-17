-- ENJAZ Phase 11.6-C3 — authenticated Real Cloud renewal provenance + M4 evidence probe
-- Proves canonical M16 -> M10 renewal provenance and governed M4 communication evidence.
-- All fixture rows are created inside a SAVEPOINT and rolled back before migration commit.

begin;

create or replace function private.enjaz_phase116c3_probe_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path=''
as $$ begin if not coalesce(p_condition,false) then raise exception 'P116C3_FAILED: %',p_message; end if; end $$;
revoke all on function private.enjaz_phase116c3_probe_assert(boolean,text) from public,anon;
grant execute on function private.enjaz_phase116c3_probe_assert(boolean,text) to authenticated;

select set_config('p116c3.draft',(
  select d.id::text from public.document_drafts d
  join public.workspaces w on w.id=d.workspace_id
  join public.workspace_memberships wm on wm.workspace_id=d.workspace_id and wm.user_id=w.owner_user_id
  where d.status='final' and d.company_id is not null and d.transaction_id is not null
    and d.template_version_id is not null and d.final_document_id is not null and d.final_document_version_id is not null
  order by d.created_at desc,d.id limit 1
),true);
select private.enjaz_phase116c3_probe_assert(nullif(current_setting('p116c3.draft',true),'') is not null,'no final factory artifact');

select set_config('p116c3.ws',(select workspace_id::text from public.document_drafts where id=current_setting('p116c3.draft')::uuid),true);
select set_config('p116c3.company',(select company_id::text from public.document_drafts where id=current_setting('p116c3.draft')::uuid),true);
select set_config('p116c3.tx',(select transaction_id::text from public.document_drafts where id=current_setting('p116c3.draft')::uuid),true);
select set_config('p116c3.tv',(select template_version_id::text from public.document_drafts where id=current_setting('p116c3.draft')::uuid),true);
select set_config('p116c3.doc',(select final_document_id::text from public.document_drafts where id=current_setting('p116c3.draft')::uuid),true);
select set_config('p116c3.dv',(select final_document_version_id::text from public.document_drafts where id=current_setting('p116c3.draft')::uuid),true);
select set_config('p116c3.owner',(select owner_user_id::text from public.workspaces where id=current_setting('p116c3.ws')::uuid),true);
select set_config('p116c3.outsider',(
  select wm.user_id::text from public.workspace_memberships wm
  where wm.workspace_id<>current_setting('p116c3.ws')::uuid and wm.user_id<>current_setting('p116c3.owner')::uuid
  order by wm.created_at,wm.workspace_id limit 1
),true);
select private.enjaz_phase116c3_probe_assert(nullif(current_setting('p116c3.outsider',true),'') is not null,'no outsider identity');

select set_config('p116c3.engkey',gen_random_uuid()::text,true);
select set_config('p116c3.contractkey',gen_random_uuid()::text,true);
select set_config('p116c3.t1',gen_random_uuid()::text,true);
select set_config('p116c3.t2',gen_random_uuid()::text,true);
select set_config('p116c3.t3',gen_random_uuid()::text,true);
select set_config('p116c3.t4',gen_random_uuid()::text,true);
select set_config('p116c3.t5',gen_random_uuid()::text,true);
select set_config('p116c3.renewal',gen_random_uuid()::text,true);
select set_config('p116c3.renewal_bad_company',gen_random_uuid()::text,true);
select set_config('p116c3.bind_op',gen_random_uuid()::text,true);
select set_config('p116c3.stale_op',gen_random_uuid()::text,true);
select set_config('p116c3.bad_company_op',gen_random_uuid()::text,true);
select set_config('p116c3.contact',gen_random_uuid()::text,true);
select set_config('p116c3.provider',gen_random_uuid()::text,true);
select set_config('p116c3.consent',gen_random_uuid()::text,true);
select set_config('p116c3.bad_comm',gen_random_uuid()::text,true);
select set_config('p116c3.manual_comm',gen_random_uuid()::text,true);
select set_config('p116c3.evidence_op',gen_random_uuid()::text,true);
select set_config('p116c3.missing_command_op',gen_random_uuid()::text,true);
select set_config('p116c3.manual_source_op',gen_random_uuid()::text,true);
select set_config('p116c3.ref','__P116C3_'||replace(left(gen_random_uuid()::text,13),'-',''),true);
select set_config('p116c3.endpoint',repeat('a',64),true);
select set_config('p116c3.idem','p116c3-'||replace(gen_random_uuid()::text,'-',''),true);

savepoint p116c3_fixture;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116c3.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116c3.owner'),true);
set local role authenticated;

select private.enjaz_phase116c3_probe_assert(auth.uid()=current_setting('p116c3.owner')::uuid,'owner auth.uid mismatch');
select private.enjaz_phase116c3_probe_assert(
  has_function_privilege('authenticated','public.bind_contract_renewal_provenance_v1(uuid,uuid,uuid,uuid,integer,integer)','EXECUTE')
  and not has_function_privilege('anon','public.bind_contract_renewal_provenance_v1(uuid,uuid,uuid,uuid,integer,integer)','EXECUTE'),
  'renewal provenance RPC privilege matrix invalid'
);
select private.enjaz_phase116c3_probe_assert(
  has_function_privilege('authenticated','public.record_contract_renewal_communication_evidence_v1(uuid,uuid,uuid,uuid,uuid)','EXECUTE')
  and not has_function_privilege('anon','public.record_contract_renewal_communication_evidence_v1(uuid,uuid,uuid,uuid,uuid)','EXECUTE'),
  'communication evidence RPC privilege matrix invalid'
);
select private.enjaz_phase116c3_probe_assert(
  not has_table_privilege('authenticated','private.contract_renewal_communication_evidence','SELECT')
  and not has_table_privilege('authenticated','private.contract_renewal_communication_evidence','INSERT')
  and not has_table_privilege('authenticated','private.contract_renewal_communication_evidence','UPDATE'),
  'private C3 evidence direct privilege leak'
);
select private.enjaz_phase116c3_probe_assert(
  not has_table_privilege('authenticated','public.renewals','INSERT')
  and not has_table_privilege('authenticated','public.renewals','UPDATE'),
  'canonical renewal direct write lockdown drifted'
);

with x as (
  select public.create_billing_engagement_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.company')::uuid,current_setting('p116c3.tx')::uuid,
    '__ENJAZ_P116C3_ENGAGEMENT__','contract','fixed',current_setting('p116c3.ref'),
    current_date,current_date+30,current_setting('p116c3.engkey')::uuid
  ) body
) select set_config('p116c3.engagement',body->>'engagementId',true) from x;

with x as (
  select public.create_engagement_contract_revision_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.engagement')::uuid,current_setting('p116c3.tv')::uuid,
    current_setting('p116c3.draft')::uuid,'__ENJAZ_P116C3_REVISION__',current_setting('p116c3.contractkey')::uuid
  ) body
) select set_config('p116c3.revision',body->>'revisionId',true) from x;

select public.transition_engagement_contract_revision_v2(
  current_setting('p116c3.ws')::uuid,current_setting('p116c3.revision')::uuid,current_setting('p116c3.t1')::uuid,1,'under_review'
);
select public.transition_engagement_contract_revision_v2(
  current_setting('p116c3.ws')::uuid,current_setting('p116c3.revision')::uuid,current_setting('p116c3.t2')::uuid,2,'approved'
);
select public.transition_engagement_contract_revision_v2(
  current_setting('p116c3.ws')::uuid,current_setting('p116c3.revision')::uuid,current_setting('p116c3.t3')::uuid,3,'signature_pending',
  current_setting('p116c3.doc')::uuid,current_setting('p116c3.dv')::uuid
);
select public.transition_engagement_contract_revision_v2(
  current_setting('p116c3.ws')::uuid,current_setting('p116c3.revision')::uuid,current_setting('p116c3.t4')::uuid,4,'signed',
  null,null,null,null,
  jsonb_build_object('method','phase116c3_real_cloud_probe','signerUserId',current_setting('p116c3.owner'),'documentVersionId',current_setting('p116c3.dv')),
  'Phase 11.6-C3 probe signature'
);
select public.transition_engagement_contract_revision_v2(
  current_setting('p116c3.ws')::uuid,current_setting('p116c3.revision')::uuid,current_setting('p116c3.t5')::uuid,5,'effective',
  null,null,current_date,current_date+30
);
select private.enjaz_phase116c3_probe_assert(
  (select status='effective' and version=6 and expires_on=current_date+30
   from public.engagement_contract_revisions where id=current_setting('p116c3.revision')::uuid),
  'governed M16 effective revision fixture invalid'
);

reset role;

insert into public.renewals(id,workspace_id,company_id,transaction_id,title,due_date,status)
values(
  current_setting('p116c3.renewal')::uuid,current_setting('p116c3.ws')::uuid,
  current_setting('p116c3.company')::uuid,current_setting('p116c3.tx')::uuid,
  '__ENJAZ_P116C3_RENEWAL__',current_date+7,'active'
);
insert into public.renewals(id,workspace_id,company_id,transaction_id,title,due_date,status)
values(
  current_setting('p116c3.renewal_bad_company')::uuid,current_setting('p116c3.ws')::uuid,
  null,current_setting('p116c3.tx')::uuid,'__ENJAZ_P116C3_BAD_COMPANY__',current_date+7,'active'
);

insert into public.contacts(id,workspace_id,display_name,contact_type,status)
values(current_setting('p116c3.contact')::uuid,current_setting('p116c3.ws')::uuid,'__ENJAZ_P116C3_CONTACT__','client','active');
insert into public.communication_provider_accounts(
  id,workspace_id,channel,provider,external_account_ref,display_name,capabilities,enabled,created_by
) values(
  current_setting('p116c3.provider')::uuid,current_setting('p116c3.ws')::uuid,'email','phase116c3_probe',
  '__P116C3_ACCOUNT__','__ENJAZ_P116C3_PROVIDER__',array['send']::text[],true,current_setting('p116c3.owner')::uuid
);
insert into public.communication_channel_consents(
  id,workspace_id,contact_id,channel,endpoint_fingerprint,status,source,effective_at,updated_by
) values(
  current_setting('p116c3.consent')::uuid,current_setting('p116c3.ws')::uuid,current_setting('p116c3.contact')::uuid,
  'email',current_setting('p116c3.endpoint'),'granted','phase116c3_probe',now()-interval '1 minute',current_setting('p116c3.owner')::uuid
);

insert into public.communications(
  id,workspace_id,company_id,contact_id,transaction_id,channel,direction,summary,occurred_at,metadata,link_status
) values(
  current_setting('p116c3.bad_comm')::uuid,current_setting('p116c3.ws')::uuid,current_setting('p116c3.company')::uuid,
  current_setting('p116c3.contact')::uuid,current_setting('p116c3.tx')::uuid,'email','outgoing',
  '__ENJAZ_P116C3_NO_COMMAND__',now(),jsonb_build_object('source','governed_outbound'),'linked'
);
insert into public.communications(
  id,workspace_id,company_id,contact_id,transaction_id,channel,direction,summary,occurred_at,metadata,link_status
) values(
  current_setting('p116c3.manual_comm')::uuid,current_setting('p116c3.ws')::uuid,current_setting('p116c3.company')::uuid,
  current_setting('p116c3.contact')::uuid,current_setting('p116c3.tx')::uuid,'email','outgoing',
  '__ENJAZ_P116C3_MANUAL_SOURCE__',now(),jsonb_build_object('source','manual_probe'),'linked'
);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116c3.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116c3.owner'),true);
set local role authenticated;

select private.enjaz_phase116c3_probe_assert(
  (public.bind_contract_renewal_provenance_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.renewal')::uuid,current_setting('p116c3.revision')::uuid,
    current_setting('p116c3.bind_op')::uuid,1,6
  )->>'wasDuplicate')::boolean=false,
  'canonical renewal provenance bind failed'
);
select private.enjaz_phase116c3_probe_assert(
  (select contract_revision_id=current_setting('p116c3.revision')::uuid
      and due_date=current_date+30 and version=2
   from public.renewals where id=current_setting('p116c3.renewal')::uuid),
  'canonical renewal provenance did not persist exact state'
);
select private.enjaz_phase116c3_probe_assert(
  (public.bind_contract_renewal_provenance_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.renewal')::uuid,current_setting('p116c3.revision')::uuid,
    current_setting('p116c3.bind_op')::uuid,1,6
  )->>'wasDuplicate')::boolean,
  'renewal provenance exact replay not idempotent'
);

do $$
begin
  perform public.bind_contract_renewal_provenance_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.renewal')::uuid,current_setting('p116c3.revision')::uuid,
    current_setting('p116c3.stale_op')::uuid,1,6
  );
  raise exception 'P116C3_STALE_RENEWAL_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_RENEWAL_STALE%' then raise; end if;
end $$;

do $$
begin
  perform public.bind_contract_renewal_provenance_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.renewal')::uuid,current_setting('p116c3.revision')::uuid,
    current_setting('p116c3.bind_op')::uuid,2,6
  );
  raise exception 'P116C3_BIND_REPLAY_CONFLICT_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_RENEWAL_IDEMPOTENCY_CONFLICT%' then raise; end if;
end $$;

do $$
begin
  perform public.bind_contract_renewal_provenance_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.renewal_bad_company')::uuid,current_setting('p116c3.revision')::uuid,
    current_setting('p116c3.bad_company_op')::uuid,1,6
  );
  raise exception 'P116C3_COMPANY_MISMATCH_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_RENEWAL_COMPANY_MISMATCH%' then raise; end if;
end $$;

with x as (
  select public.prepare_communication_outbound_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.provider')::uuid,current_setting('p116c3.idem'),
    current_setting('p116c3.endpoint'),current_setting('p116c3.contact')::uuid,current_setting('p116c3.tx')::uuid,
    null,null,null,'Phase 11.6-C3 renewal notice','Governed renewal communication evidence probe',
    '__ENJAZ_P116C3_GOVERNED_OUTBOUND__','{}'::uuid[]
  ) body
) select
  set_config('p116c3.valid_comm',body->>'communicationId',true),
  set_config('p116c3.valid_command',body->>'commandId',true)
from x;

select private.enjaz_phase116c3_probe_assert(
  (select direction='outgoing' and link_status='linked' and metadata->>'source'='governed_outbound'
   from public.communications where id=current_setting('p116c3.valid_comm')::uuid)
  and exists(
    select 1 from public.communication_outbound_commands
    where workspace_id=current_setting('p116c3.ws')::uuid
      and id=current_setting('p116c3.valid_command')::uuid
      and communication_id=current_setting('p116c3.valid_comm')::uuid
  ),
  'M4 governed outbound evidence fixture invalid'
);

do $$
begin
  perform public.record_contract_renewal_communication_evidence_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.missing_command_op')::uuid,
    current_setting('p116c3.renewal')::uuid,current_setting('p116c3.revision')::uuid,current_setting('p116c3.bad_comm')::uuid
  );
  raise exception 'P116C3_MISSING_M4_COMMAND_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_RENEWAL_M4_COMMAND_REQUIRED%' then raise; end if;
end $$;

do $$
begin
  perform public.record_contract_renewal_communication_evidence_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.manual_source_op')::uuid,
    current_setting('p116c3.renewal')::uuid,current_setting('p116c3.revision')::uuid,current_setting('p116c3.manual_comm')::uuid
  );
  raise exception 'P116C3_UNGOVERNED_SOURCE_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_RENEWAL_COMMUNICATION_SCOPE_INVALID%' then raise; end if;
end $$;

select private.enjaz_phase116c3_probe_assert(
  (public.record_contract_renewal_communication_evidence_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.evidence_op')::uuid,
    current_setting('p116c3.renewal')::uuid,current_setting('p116c3.revision')::uuid,current_setting('p116c3.valid_comm')::uuid
  )->>'wasDuplicate')::boolean=false,
  'governed M4 evidence recording failed'
);
select private.enjaz_phase116c3_probe_assert(
  (public.record_contract_renewal_communication_evidence_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.evidence_op')::uuid,
    current_setting('p116c3.renewal')::uuid,current_setting('p116c3.revision')::uuid,current_setting('p116c3.valid_comm')::uuid
  )->>'wasDuplicate')::boolean,
  'M4 evidence exact replay not idempotent'
);

do $$
begin
  perform public.record_contract_renewal_communication_evidence_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.evidence_op')::uuid,
    current_setting('p116c3.renewal')::uuid,current_setting('p116c3.revision')::uuid,current_setting('p116c3.bad_comm')::uuid
  );
  raise exception 'P116C3_EVIDENCE_REPLAY_CONFLICT_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_CONTRACT_RENEWAL_COMMUNICATION_IDEMPOTENCY_CONFLICT%' then raise; end if;
end $$;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116c3.outsider'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116c3.outsider'),true);
select private.enjaz_phase116c3_probe_assert(auth.uid()=current_setting('p116c3.outsider')::uuid,'outsider auth.uid mismatch');

do $$
begin
  perform public.bind_contract_renewal_provenance_v1(
    current_setting('p116c3.ws')::uuid,current_setting('p116c3.renewal_bad_company')::uuid,current_setting('p116c3.revision')::uuid,
    gen_random_uuid(),1,6
  );
  raise exception 'P116C3_OUTSIDER_BIND_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_SCHEDULING_WORKSPACE_FORBIDDEN%' then raise; end if;
end $$;

do $$
begin
  perform public.record_contract_renewal_communication_evidence_v1(
    current_setting('p116c3.ws')::uuid,gen_random_uuid(),current_setting('p116c3.renewal')::uuid,
    current_setting('p116c3.revision')::uuid,current_setting('p116c3.valid_comm')::uuid
  );
  raise exception 'P116C3_OUTSIDER_EVIDENCE_ACCEPTED';
exception when others then
  if sqlerrm not like '%ENJAZ_COMMUNICATION_OWNER_REQUIRED%' then raise; end if;
end $$;

reset role;

select private.enjaz_phase116c3_probe_assert(
  exists(
    select 1 from private.scheduling_command_receipts
    where workspace_id=current_setting('p116c3.ws')::uuid
      and operation_id=current_setting('p116c3.bind_op')::uuid
      and command_type='contract_renewal_binding'
      and entity_id=current_setting('p116c3.renewal')::uuid
  ),
  'renewal provenance receipt missing'
);
select private.enjaz_phase116c3_probe_assert(
  exists(
    select 1 from private.contract_renewal_communication_evidence
    where workspace_id=current_setting('p116c3.ws')::uuid
      and operation_id=current_setting('p116c3.evidence_op')::uuid
      and renewal_id=current_setting('p116c3.renewal')::uuid
      and communication_id=current_setting('p116c3.valid_comm')::uuid
      and outbound_command_id=current_setting('p116c3.valid_command')::uuid
  ),
  'C3 private communication evidence missing'
);
select private.enjaz_phase116c3_probe_assert(
  exists(
    select 1 from public.audit_events
    where workspace_id=current_setting('p116c3.ws')::uuid
      and entity_id=current_setting('p116c3.renewal')::uuid
      and action='scheduling.renewal.contract_provenance.bound'
  )
  and exists(
    select 1 from public.audit_events
    where workspace_id=current_setting('p116c3.ws')::uuid
      and entity_id=current_setting('p116c3.renewal')::uuid
      and action='scheduling.renewal.communication_evidence.recorded'
      and details->>'communicationId'=current_setting('p116c3.valid_comm')
  ),
  'C3 attributable audit reconciliation incomplete'
);

set local enable_seqscan=off;
select count(*) from public.renewals
where workspace_id=current_setting('p116c3.ws')::uuid and contract_revision_id=current_setting('p116c3.revision')::uuid;
select count(*) from private.contract_renewal_communication_evidence
where workspace_id=current_setting('p116c3.ws')::uuid and renewal_id=current_setting('p116c3.renewal')::uuid;
select count(*) from private.contract_renewal_communication_evidence
where workspace_id=current_setting('p116c3.ws')::uuid and contract_revision_id=current_setting('p116c3.revision')::uuid;
select count(*) from private.contract_renewal_communication_evidence
where workspace_id=current_setting('p116c3.ws')::uuid and outbound_command_id=current_setting('p116c3.valid_command')::uuid;
select count(*) from private.contract_renewal_communication_evidence
where actor_user_id=current_setting('p116c3.owner')::uuid;
set local enable_seqscan=on;

rollback to savepoint p116c3_fixture;
release savepoint p116c3_fixture;

select private.enjaz_phase116c3_probe_assert(
  not exists(select 1 from public.renewals where id in (
    current_setting('p116c3.renewal')::uuid,current_setting('p116c3.renewal_bad_company')::uuid
  ))
  and not exists(select 1 from public.contacts where id=current_setting('p116c3.contact')::uuid)
  and not exists(select 1 from public.communication_provider_accounts where id=current_setting('p116c3.provider')::uuid)
  and not exists(select 1 from public.communication_channel_consents where id=current_setting('p116c3.consent')::uuid)
  and not exists(select 1 from public.communications where id in (
    current_setting('p116c3.bad_comm')::uuid,current_setting('p116c3.manual_comm')::uuid
  ))
  and not exists(select 1 from public.commercial_engagements where title='__ENJAZ_P116C3_ENGAGEMENT__')
  and not exists(select 1 from public.engagement_contract_revisions where title='__ENJAZ_P116C3_REVISION__')
  and not exists(select 1 from private.contract_renewal_communication_evidence where operation_id=current_setting('p116c3.evidence_op')::uuid)
  and not exists(select 1 from private.scheduling_command_receipts where operation_id=current_setting('p116c3.bind_op')::uuid),
  'C3 SAVEPOINT rollback left residue'
);
select private.enjaz_phase116c3_probe_assert(
  not exists(
    select 1 from public.audit_events
    where action in ('scheduling.renewal.contract_provenance.bound','scheduling.renewal.communication_evidence.recorded')
      and details->>'operationId' in (current_setting('p116c3.bind_op'),current_setting('p116c3.evidence_op'))
  ),
  'C3 audit residue remains after SAVEPOINT rollback'
);

drop function private.enjaz_phase116c3_probe_assert(boolean,text);
commit;
