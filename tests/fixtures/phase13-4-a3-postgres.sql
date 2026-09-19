-- Run after tests/fixtures/phase13-4-a2-postgres.sql, in the same
-- disposable CI database. No production credentials, schema or user data.
\set ON_ERROR_STOP on
reset role;

-- Fresh, exact Phase 13.3-style imported rows after the A2 destruction fixture.
insert into public.contacts(id,workspace_id,legacy_source,legacy_id,status,
  display_name,contact_type)
values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',
 'phase13.3','contact:a2','active','Test Contact','client');
insert into public.companies(id,workspace_id,legacy_source,legacy_id,status,
 legal_name,display_name,capital,primary_contact_id)
values('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111',
 'phase13.3','company:a2','active','Test Company','Company',120.50,
 '33333333-3333-4333-8333-333333333333');
insert into public.transactions(id,workspace_id,legacy_source,legacy_id,status,
 type,department,current_fee,company_id,primary_contact_id)
values('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111',
 'phase13.3','transaction:a2','active','test','qa',135.25,
 '44444444-4444-4444-8444-444444444444',
 '33333333-3333-4333-8333-333333333333');

-- Complete, valid-shaped original manifest with the exact values the Phase
-- 13.3 import writes. The ledger hash is recomputed ONLY for this fixture.
update fixture.original set doc=jsonb_build_object(
 'schema','enjaz.legacy.ordered-import.execution-manifest.v1',
 'snapshotId','a3-isolated-snapshot','mappingPlanId','a3-reviewed-plan',
 'workspaceId','11111111-1111-4111-8111-111111111111',
 'batchId','66666666-6666-4666-8666-666666666666',
 'idempotencyKey','a2-fixture-2026',
 'stageOrder',jsonb_build_array('contacts','companies','transactions'),
 'items',jsonb_build_array(
  jsonb_build_object('ordinal',1,'stage',1,'sourceKey','contact:a2',
    'targetTable','contacts','targetId','33333333-3333-4333-8333-333333333333',
    'normalizedFields',jsonb_build_object('display_name','Test Contact',
      'contact_type','client','phone',null,'email',null,'notes',null),
    'writeAllowed',false),
  jsonb_build_object('ordinal',2,'stage',2,'sourceKey','company:a2',
    'targetTable','companies','targetId','44444444-4444-4444-8444-444444444444',
    'normalizedFields',jsonb_build_object('legal_name','Test Company',
      'display_name','Company','capital',120.50,'address',null,'activities',null,
      'registration_number',null,'legal_status',null),'writeAllowed',false),
  jsonb_build_object('ordinal',3,'stage',3,'sourceKey','transaction:a2',
    'targetTable','transactions','targetId','55555555-5555-4555-8555-555555555555',
    'normalizedFields',jsonb_build_object('type','test','department','qa',
      'current_fee',135.25),'writeAllowed',false)
 ),
 'relationshipBindings',jsonb_build_array(
  jsonb_build_object('sourceKey','company:a2','targetKey','contact:a2',
   'targetField','primary_contact_id','sourceTargetId','44444444-4444-4444-8444-444444444444',
   'targetTargetId','33333333-3333-4333-8333-333333333333',
   'sourceTargetTable','companies','targetTargetTable','contacts',
   'assignmentPerformed',false,'writeAllowed',false),
  jsonb_build_object('sourceKey','transaction:a2','targetKey','company:a2',
   'targetField','company_id','sourceTargetId','55555555-5555-4555-8555-555555555555',
   'targetTargetId','44444444-4444-4444-8444-444444444444',
   'sourceTargetTable','transactions','targetTargetTable','companies',
   'assignmentPerformed',false,'writeAllowed',false),
  jsonb_build_object('sourceKey','transaction:a2','targetKey','contact:a2',
   'targetField','primary_contact_id','sourceTargetId','55555555-5555-4555-8555-555555555555',
   'targetTargetId','33333333-3333-4333-8333-333333333333',
   'sourceTargetTable','transactions','targetTargetTable','contacts',
   'assignmentPerformed',false,'writeAllowed',false)
 ),
 'deterministic',true,'workspacePermissionVerified',false,'idempotencyBound',true,
 'idempotencyEnforcementPerformed',false,'targetIdsGenerated',false,
 'foreignKeyBindingPerformed',true,'foreignKeyAssignmentPerformed',false,
 'persistencePerformed',false,'importExecutionAllowed',false,
 'targetMutationPerformed',false,'readyForA3ExecutionBoundary',true
);
update fixture.original set reconciliation =
  jsonb_set(jsonb_set(reconciliation,'{payloadHash}',
    to_jsonb(encode(extensions.digest(convert_to(doc::text,'UTF8'),'sha256'),'hex'))),
    '{result,payloadHash}',
    to_jsonb(encode(extensions.digest(convert_to(doc::text,'UTF8'),'sha256'),'hex')));
update public.import_jobs set counts=(select counts from fixture.original),
  reconciliation=(select reconciliation from fixture.original),status='succeeded',
  finished_at=now()
where id='66666666-6666-4666-8666-666666666666';

\i database/migrations/phase_13_4_a3_trusted_comparison.sql

create function fixture.a3_report() returns jsonb language sql stable
set search_path = ''
as $$ select public.compare_legacy_import_reconciliation_v1(
 '11111111-1111-4111-8111-111111111111',
 '66666666-6666-4666-8666-666666666666',
 'a2-fixture-2026', doc)
 from fixture.original $$;
grant execute on function fixture.a3_report() to authenticated;

do $$ begin
 if has_function_privilege('anon',
  'public.compare_legacy_import_reconciliation_v1(uuid,uuid,text,jsonb)','EXECUTE')
 then raise exception 'A3 FAILED: anonymous can execute'; end if;
end $$;

set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare r jsonb;
begin
 select fixture.a3_report() into r;
 if r is null or r->>'schema'<>'enjaz.legacy.reconciliation.comparison.v1'
 or r->>'rowCount'<>'3' or r->>'matchedCount'<>'3'
 or r->>'mismatchCount'<>'0' or r->>'allMatchedAtSnapshot'<>'true'
 or r->>'reconciled'<>'false' or r->>'closureAuthorized'<>'false'
 or r->>'mutated'<>'false'
 or exists(select 1 from jsonb_array_elements(r->'rows') e
   where e->'differenceCodes'<>'[]'::jsonb)
 then raise exception 'A3 FAILED: clean snapshot was not fully compared without closure'; end if;
 raise notice 'PASS A3 isolated owner exact fields/decimal/FK and no premature closure';
end $$;

set request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$
declare r jsonb;
begin
 select fixture.a3_report() into r;
 if r is not null then raise exception 'A3 FAILED: outsider got comparison'; end if;
 raise notice 'PASS A3 isolated outsider cannot compare';
end $$;

set request.jwt.claim.sub='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
do $$
declare r jsonb;
begin
 select fixture.a3_report() into r;
 if r is not null then raise exception 'A3 FAILED: workspace member got owner comparison'; end if;
 raise notice 'PASS A3 isolated non-owner workspace member cannot compare';
end $$;

reset role;
update public.contacts set notes='unexpected post-import value'
where id='33333333-3333-4333-8333-333333333333';
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare r jsonb;
begin
 select fixture.a3_report() into r;
 if r->>'allMatchedAtSnapshot'<>'false' or r->>'mismatchCount'<>'1'
 or not r->'rows'->0->'differenceCodes' ? 'FIELD_DRIFT'
 or r->>'closureAuthorized'<>'false'
 then raise exception 'A3 FAILED: changed field was not detected'; end if;
 raise notice 'PASS A3 isolated normalized field drift blocks snapshot equality';
end $$;

reset role;
update public.contacts set notes=null
where id='33333333-3333-4333-8333-333333333333';
update public.transactions set current_fee=140.25
where id='55555555-5555-4555-8555-555555555555';
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare r jsonb;
begin
 select fixture.a3_report() into r;
 if r->>'allMatchedAtSnapshot'<>'false' or r->>'mismatchCount'<>'1'
 or not r->'rows'->2->'differenceCodes' ? 'MONEY_DRIFT'
 then raise exception 'A3 FAILED: changed amount was not detected'; end if;
 raise notice 'PASS A3 isolated precise money drift blocks snapshot equality';
end $$;

reset role;
update public.transactions set current_fee=135.25
where id='55555555-5555-4555-8555-555555555555';
update public.companies set primary_contact_id=null
where id='44444444-4444-4444-8444-444444444444';
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare r jsonb;
begin
 select fixture.a3_report() into r;
 if r->>'allMatchedAtSnapshot'<>'false' or r->>'mismatchCount'<>'1'
 or not r->'rows'->1->'differenceCodes' ? 'RELATIONSHIP_DRIFT'
 then raise exception 'A3 FAILED: broken company relation was not detected'; end if;
 raise notice 'PASS A3 isolated relationship drift blocks snapshot equality';
end $$;

reset role;
update public.companies set primary_contact_id='33333333-3333-4333-8333-333333333333'
where id='44444444-4444-4444-8444-444444444444';
update public.contacts set legacy_id='contact:a2-tampered'
where id='33333333-3333-4333-8333-333333333333';
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare r jsonb;
begin
 select fixture.a3_report() into r;
 if r->>'allMatchedAtSnapshot'<>'false'
 or not r->'rows'->0->'differenceCodes' ? 'IDENTITY_DRIFT'
 then raise exception 'A3 FAILED: source lineage mismatch was not detected'; end if;
 raise notice 'PASS A3 isolated legacy source lineage drift visible';
end $$;

reset role;
update public.contacts set legacy_id='contact:a2',deleted_at=now()
where id='33333333-3333-4333-8333-333333333333';
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare r jsonb;
begin
 select fixture.a3_report() into r;
 if r->>'allMatchedAtSnapshot'<>'false'
 or not r->'rows'->0->'differenceCodes' ? 'LIFECYCLE_DRIFT'
 then raise exception 'A3 FAILED: deleted lifecycle was not detected'; end if;
 raise notice 'PASS A3 isolated deleted lifecycle drift visible';
end $$;

reset role;
update public.contacts set deleted_at=null
where id='33333333-3333-4333-8333-333333333333';
delete from public.transactions
where id='55555555-5555-4555-8555-555555555555';
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare r jsonb;
begin
 select fixture.a3_report() into r;
 if r->>'allMatchedAtSnapshot'<>'false' or r->>'mismatchCount'<>'1'
 or r->'rows'->2->'differenceCodes' <> '["MISSING_TARGET"]'::jsonb
 or r->>'reconciled'<>'false' or r->>'closureAuthorized'<>'false'
 then raise exception 'A3 FAILED: missing target hidden or premature authority granted'; end if;
 raise notice 'PASS A3 isolated missing target never produces closure authority';
end $;

-- A3 must also refuse a forged manifest, altered idempotency, or a ledger
-- whose counts are internally consistent but disagree with the original hash.
do $
declare r jsonb; doc jsonb;
begin
 select f.doc into doc from fixture.original f;
 r=public.compare_legacy_import_reconciliation_v1(
 '11111111-1111-4111-8111-111111111111',
 '66666666-6666-4666-8666-666666666666',
 'a2-fixture-2026',jsonb_set(doc,'{items,0,normalizedFields,notes}','"forged"'::jsonb));
 if r is not null then raise exception 'A3 FAILED: forged manifest produced comparison'; end if;
 r=public.compare_legacy_import_reconciliation_v1(
 '11111111-1111-4111-8111-111111111111',
 '66666666-6666-4666-8666-666666666666',
 'a2-fixture-wrong',doc);
 if r is not null then raise exception 'A3 FAILED: wrong idempotency produced comparison'; end if;
 raise notice 'PASS A3 isolated forged manifest and idempotency denied';
end $;

reset role;
update public.import_jobs
 set counts=jsonb_set(counts,'{total}','4'::jsonb),
 reconciliation=jsonb_set(reconciliation,'{result,counts,total}','4'::jsonb)
 where id='66666666-6666-4666-8666-666666666666';
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $
declare r jsonb;
begin
 select fixture.a3_report() into r;
 if r is not null then raise exception 'A3 FAILED: dual-corrupt counts yielded comparison'; end if;
 raise notice 'PASS A3 isolated mutually corrupt totals cannot compare';
end $;

reset role;
update public.import_jobs
 set counts=(select counts from fixture.original),
 reconciliation=(select reconciliation from fixture.original)
 where id='66666666-6666-4666-8666-666666666666';
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $
declare r jsonb;
begin
 select fixture.a3_report() into r;
 if r is null or r->>'mismatchCount'<>'1'
 or r->'rows'->2->'differenceCodes' <> '["MISSING_TARGET"]'::jsonb
 or r->>'closureAuthorized'<>'false'
 then raise exception 'A3 FAILED: restored ledger concealed missing transaction'; end if;
 raise notice 'PASS A3 isolated ledger restoration never repairs missing imported row';
end $;

-- 5000-item A3 comparison must inspect ALL manifest entries without pagination,
-- and 5001-item hash-bound requests must fail closed. These ledger/manifest
-- pairs were created by the preceding disposable A2 SQL fixture.
reset role;
grant select on fixture.large to authenticated;
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $
declare r jsonb; doc jsonb; batch uuid; invalid_result jsonb;
begin
 select l.doc,l.batch_id into doc,batch from fixture.large l
 where l.batch_id='88888888-8888-4888-8888-888888888888';
 r=public.compare_legacy_import_reconciliation_v1(
 '11111111-1111-4111-8111-111111111111',batch,
 'a2-large-'||batch::text,doc);
 if r is null or r->>'rowCount'<>'5000' or
   r->>'matchedCount'<>'0' or r->>'mismatchCount'<>'5000' or
   jsonb_array_length(r->'rows')<>5000 or
   r->'rows'->4999->>'ordinal'<>'5000' or
   r->'rows'->4999->'differenceCodes' <> '["MISSING_TARGET"]'::jsonb or
   r->>'allMatchedAtSnapshot'<>'false' or r->>'closureAuthorized'<>'false'
 then raise exception 'A3 FAILED: 5000 missing expected rows truncated or falsely matched'; end if;
 select l.doc,l.batch_id into doc,batch from fixture.large l
 where l.batch_id='99999999-9999-4999-8999-999999999999';
 invalid_result=public.compare_legacy_import_reconciliation_v1(
 '11111111-1111-4111-8111-111111111111',batch,
 'a2-large-'||batch::text,doc);
 if invalid_result is not null
 then raise exception 'A3 FAILED: 5001 item request returned comparison'; end if;
 raise notice 'PASS A3 isolated bulk 5000 complete comparison and hash-bound 5001 denial';
end $;

reset role;
set role anon;
do $
begin
 begin
 perform public.compare_legacy_import_reconciliation_v1(
  '11111111-1111-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666','a2-fixture-2026','{}'::jsonb);
 raise exception 'A3 FAILED: anon executed comparison';
 exception when insufficient_privilege then
 raise notice 'PASS A3 isolated anonymous execution forbidden';
 end;
end $$;
