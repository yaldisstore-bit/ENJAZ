-- Phase 13.5 A2 disposable PostgreSQL 17 destruction fixture.
-- Synthetic-only. Never run against Supabase or production.
\set ON_ERROR_STOP on

create schema auth;
create schema private;
create schema extensions;
create schema fixture;
create extension if not exists pgcrypto with schema extensions;
create role authenticated;
create role anon;

create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table public.workspaces(
  id uuid primary key,
  owner_user_id uuid not null,
  name text
);
create table public.workspace_memberships(
  workspace_id uuid not null,
  user_id uuid not null,
  role text
);
create table public.import_jobs(
  id uuid primary key,
  workspace_id uuid not null,
  source text not null default 'other',
  status text not null,
  counts jsonb not null,
  reconciliation jsonb not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create table public.contacts(
  id uuid primary key,
  workspace_id uuid not null,
  display_name text,
  contact_type text,
  phone text,
  email text,
  notes text,
  status text,
  legacy_id text,
  legacy_source text,
  deleted_at timestamptz
);
create table public.companies(
  id uuid primary key,
  workspace_id uuid not null,
  legal_name text,
  display_name text,
  capital numeric(18,2),
  address text,
  activities text,
  registration_number text,
  legal_status text,
  primary_contact_id uuid,
  status text,
  legacy_id text,
  legacy_source text,
  deleted_at timestamptz
);
create table public.transactions(
  id uuid primary key,
  workspace_id uuid not null,
  company_id uuid,
  primary_contact_id uuid,
  type text,
  department text,
  status text,
  priority text,
  current_fee numeric(18,2),
  legacy_id text,
  legacy_source text,
  deleted_at timestamptz
);

create function private.is_workspace_owner(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path=''
as $$ select (select auth.uid()) is not null and exists(
  select 1 from public.workspaces w
  where w.id=p_workspace_id and w.owner_user_id=(select auth.uid())
) $$;
revoke all on function private.is_workspace_owner(uuid) from public,anon;
grant usage on schema auth,private,extensions,fixture to authenticated;
grant execute on function auth.uid(),private.is_workspace_owner(uuid) to authenticated;
grant select on public.workspaces,public.workspace_memberships,public.import_jobs,
  public.contacts,public.companies,public.transactions to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.import_jobs enable row level security;
alter table public.contacts enable row level security;
alter table public.companies enable row level security;
alter table public.transactions enable row level security;

create policy workspaces_select_member on public.workspaces for select to authenticated using (
  owner_user_id=(select auth.uid()) or id in (
    select wm.workspace_id from public.workspace_memberships wm
    where wm.user_id=(select auth.uid())
  )
);
create policy memberships_select_self on public.workspace_memberships for select to authenticated using (
  user_id=(select auth.uid())
);
create policy import_jobs_read on public.import_jobs for select to authenticated using (
  workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid()))
);
create policy contacts_read on public.contacts for select to authenticated using (
  workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid()))
);
create policy companies_read on public.companies for select to authenticated using (
  workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid()))
);
create policy transactions_read on public.transactions for select to authenticated using (
  workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid()))
);

insert into public.workspaces(id,owner_user_id,name) values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Phase13.5 Owner'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Phase13.5 Outsider');
insert into public.workspace_memberships(workspace_id,user_id,role) values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','owner'),
 ('11111111-1111-4111-8111-111111111111','cccccccc-cccc-4ccc-8ccc-cccccccccccc','member'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','owner');

-- Compile the exact certified Phase 13.3 execution authority and hardening.
\i database/migrations/phase_13_3_ordered_import_execution.sql
\i database/migrations/phase_13_3_ordered_import_idempotency_fastpath.sql
\i database/migrations/phase_13_3_ordered_import_replay_hardening.sql
\i database/migrations/20260919000205_phase_13_3_ordered_import_conflict_sqlstate_hardening.sql

-- Compile exact certified Phase 13.4 read-only reconciliation.
\i database/migrations/phase_13_4_reconciliation_readback.sql
\i database/migrations/phase_13_4_a3_trusted_comparison.sql

create table fixture.manifests(name text primary key, doc jsonb not null);
insert into fixture.manifests values ('clean',jsonb_build_object(
  'schema','enjaz.legacy.ordered-import.execution-manifest.v1',
  'snapshotId','phase13-5-a2-snapshot',
  'mappingPlanId','phase13-5-a2-plan',
  'workspaceId','11111111-1111-4111-8111-111111111111',
  'batchId','66666666-6666-4666-8666-666666666666',
  'idempotencyKey','phase13_5_a2_clean',
  'stageOrder',jsonb_build_array('contacts','companies','transactions'),
  'items',jsonb_build_array(
    jsonb_build_object('ordinal',1,'stage',1,'sourceKey','contact:phase135','targetTable','contacts',
      'targetId','33333333-3333-4333-8333-333333333333',
      'normalizedFields',jsonb_build_object('display_name','Phase 13.5 Contact','contact_type','client',
        'phone',null,'email',null,'notes','destruction fixture'),'writeAllowed',false),
    jsonb_build_object('ordinal',2,'stage',2,'sourceKey','company:phase135','targetTable','companies',
      'targetId','44444444-4444-4444-8444-444444444444',
      'normalizedFields',jsonb_build_object('legal_name','Phase 13.5 Company','display_name','P13.5',
        'capital',120.50,'address','Baghdad','activities','destruction',
        'registration_number',null,'legal_status',null),'writeAllowed',false),
    jsonb_build_object('ordinal',3,'stage',3,'sourceKey','transaction:phase135','targetTable','transactions',
      'targetId','55555555-5555-4555-8555-555555555555',
      'normalizedFields',jsonb_build_object('type','phase13_5_test','department','qa',
        'current_fee',135.25),'writeAllowed',false)
  ),
  'relationshipBindings',jsonb_build_array(
    jsonb_build_object('sourceKey','company:phase135','targetKey','contact:phase135',
      'targetField','primary_contact_id',
      'sourceTargetId','44444444-4444-4444-8444-444444444444',
      'targetTargetId','33333333-3333-4333-8333-333333333333',
      'sourceTargetTable','companies','targetTargetTable','contacts',
      'assignmentPerformed',false,'writeAllowed',false),
    jsonb_build_object('sourceKey','transaction:phase135','targetKey','company:phase135',
      'targetField','company_id',
      'sourceTargetId','55555555-5555-4555-8555-555555555555',
      'targetTargetId','44444444-4444-4444-8444-444444444444',
      'sourceTargetTable','transactions','targetTargetTable','companies',
      'assignmentPerformed',false,'writeAllowed',false),
    jsonb_build_object('sourceKey','transaction:phase135','targetKey','contact:phase135',
      'targetField','primary_contact_id',
      'sourceTargetId','55555555-5555-4555-8555-555555555555',
      'targetTargetId','33333333-3333-4333-8333-333333333333',
      'sourceTargetTable','transactions','targetTargetTable','contacts',
      'assignmentPerformed',false,'writeAllowed',false)
  ),
  'deterministic',true,'workspacePermissionVerified',false,'idempotencyBound',true,
  'idempotencyEnforcementPerformed',false,'targetIdsGenerated',false,
  'foreignKeyBindingPerformed',true,'foreignKeyAssignmentPerformed',false,
  'persistencePerformed',false,'importExecutionAllowed',false,
  'targetMutationPerformed',false,'readyForA3ExecutionBoundary',true
));
grant select on fixture.manifests to authenticated;

-- D18: anonymous cannot invoke write or reconciliation authority.
set role anon;
do $$ begin
  begin
    perform public.execute_legacy_ordered_import_v1(
      '11111111-1111-4111-8111-111111111111',
      '66666666-6666-4666-8666-666666666666','phase13_5_a2_clean','{}'::jsonb);
    raise exception '13.5 FAILURE: anonymous import executed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.read_legacy_import_reconciliation_v1(
      '11111111-1111-4111-8111-111111111111',
      '66666666-6666-4666-8666-666666666666','phase13_5_a2_clean','{}'::jsonb);
    raise exception '13.5 FAILURE: anonymous A2 executed';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS 13.5 A2 anonymous import/reconciliation denied';
end $$;

-- D18: same-workspace member can read membership-scoped base data later, but cannot import.
reset role;
set role authenticated;
set request.jwt.claim.sub='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
do $$
declare m jsonb;
begin
  select doc into m from fixture.manifests where name='clean';
  begin
    perform public.execute_legacy_ordered_import_v1(
      '11111111-1111-4111-8111-111111111111',
      '66666666-6666-4666-8666-666666666666','phase13_5_a2_clean',m);
    raise exception '13.5 FAILURE: non-owner import executed';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS 13.5 A2 same-workspace non-owner import denied';
end $$;

-- D18: outsider cannot import into owner workspace.
set request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$
declare m jsonb;
begin
  select doc into m from fixture.manifests where name='clean';
  begin
    perform public.execute_legacy_ordered_import_v1(
      '11111111-1111-4111-8111-111111111111',
      '66666666-6666-4666-8666-666666666666','phase13_5_a2_clean',m);
    raise exception '13.5 FAILURE: outsider import executed';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS 13.5 A2 cross-workspace outsider import denied';
end $$;

-- Clean owner import through the real Phase 13.3 RPC.
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare m jsonb; r jsonb;
begin
  select doc into m from fixture.manifests where name='clean';
  select public.execute_legacy_ordered_import_v1(
    '11111111-1111-4111-8111-111111111111',
    '66666666-6666-4666-8666-666666666666','phase13_5_a2_clean',m) into r;
  if r is null or r->>'atomic'<>'true' or r->>'wasDuplicate'<>'false'
    or r->'counts'->>'total'<>'3' or r->'counts'->>'contacts'<>'1'
    or r->'counts'->>'companies'<>'1' or r->'counts'->>'transactions'<>'1'
  then raise exception '13.5 FAILURE: clean import result invalid %',r; end if;
  raise notice 'PASS 13.5 A2 real ordered import writes exact 1/1/1 atomically';
end $$;

-- Exact money + FK + lineage persisted.
do $$
declare n integer;
begin
  select count(*) into n from public.contacts
   where id='33333333-3333-4333-8333-333333333333'
     and workspace_id='11111111-1111-4111-8111-111111111111'
     and legacy_source='phase13.3' and legacy_id='contact:phase135';
  if n<>1 then raise exception '13.5 FAILURE: contact lineage missing'; end if;
  select count(*) into n from public.companies
   where id='44444444-4444-4444-8444-444444444444'
     and capital=120.50
     and primary_contact_id='33333333-3333-4333-8333-333333333333';
  if n<>1 then raise exception '13.5 FAILURE: company money/FK mismatch'; end if;
  select count(*) into n from public.transactions
   where id='55555555-5555-4555-8555-555555555555'
     and current_fee=135.25
     and company_id='44444444-4444-4444-8444-444444444444'
     and primary_contact_id='33333333-3333-4333-8333-333333333333';
  if n<>1 then raise exception '13.5 FAILURE: transaction money/FK mismatch'; end if;
  raise notice 'PASS 13.5 A2 exact decimal, lineage and relationship persistence';
end $$;

-- D17: exact replay returns the durable result without duplicate rows.
do $$
declare m jsonb; r jsonb; n integer;
begin
  select doc into m from fixture.manifests where name='clean';
  select public.execute_legacy_ordered_import_v1(
    '11111111-1111-4111-8111-111111111111',
    '66666666-6666-4666-8666-666666666666','phase13_5_a2_clean',m) into r;
  if r is null or r->>'wasDuplicate'<>'true' then
    raise exception '13.5 FAILURE: exact replay not idempotent %',r; end if;
  select (select count(*) from public.contacts where workspace_id='11111111-1111-4111-8111-111111111111')
       + (select count(*) from public.companies where workspace_id='11111111-1111-4111-8111-111111111111')
       + (select count(*) from public.transactions where workspace_id='11111111-1111-4111-8111-111111111111')
    into n;
  if n<>3 then raise exception '13.5 FAILURE: replay duplicated rows %',n; end if;
  raise notice 'PASS 13.5 A2 exact replay is idempotent with no duplicate truth';
end $$;

-- D17: changed replay with same identity conflicts and leaves durable rows untouched.
do $$
declare m jsonb; changed jsonb; n integer; caught boolean:=false;
begin
  select doc into m from fixture.manifests where name='clean';
  changed:=jsonb_set(m,'{items,0,normalizedFields,notes}','"changed replay"'::jsonb);
  begin
    perform public.execute_legacy_ordered_import_v1(
      '11111111-1111-4111-8111-111111111111',
      '66666666-6666-4666-8666-666666666666','phase13_5_a2_clean',changed);
  exception when unique_violation then caught:=true; end;
  if not caught then raise exception '13.5 FAILURE: changed replay did not conflict'; end if;
  select count(*) into n from public.contacts
   where id='33333333-3333-4333-8333-333333333333' and notes='destruction fixture';
  if n<>1 then raise exception '13.5 FAILURE: changed replay mutated contact'; end if;
  raise notice 'PASS 13.5 A2 changed replay conflicts without mutation';
end $$;

-- Phase 13.4 A2/A3 must agree on the exact successful import without granting closure.
do $$
declare m jsonb; a2 jsonb; a3 jsonb;
begin
  select doc into m from fixture.manifests where name='clean';
  select public.read_legacy_import_reconciliation_v1(
    '11111111-1111-4111-8111-111111111111',
    '66666666-6666-4666-8666-666666666666','phase13_5_a2_clean',m) into a2;
  if a2 is null or a2->>'expectedRowCount'<>'3'
    or a2->'observedRows'->1->'record'->'fields'->>'capitalDecimal'<>'120.50'
    or a2->'observedRows'->2->'record'->'fields'->>'current_fee_decimal'<>'135.25'
    or a2->>'reconciled'<>'false' or a2->>'mutated'<>'false'
  then raise exception '13.5 FAILURE: A2 exact readback failed %',a2; end if;
  select public.compare_legacy_import_reconciliation_v1(
    '11111111-1111-4111-8111-111111111111',
    '66666666-6666-4666-8666-666666666666','phase13_5_a2_clean',m) into a3;
  if a3 is null or a3->>'matchedCount'<>'3' or a3->>'mismatchCount'<>'0'
    or a3->>'allMatchedAtSnapshot'<>'true'
    or a3->>'closureAuthorized'<>'false' or a3->>'mutated'<>'false'
  then raise exception '13.5 FAILURE: A3 clean comparison failed %',a3; end if;
  raise notice 'PASS 13.5 A2 clean reconciliation equality grants no closure or repair';
end $$;

-- D20: lifecycle + missing target are explicit and never repaired.
reset role;
update public.contacts set deleted_at=now()
 where id='33333333-3333-4333-8333-333333333333';
delete from public.transactions where id='55555555-5555-4555-8555-555555555555';
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare m jsonb; r jsonb;
begin
  select doc into m from fixture.manifests where name='clean';
  select public.compare_legacy_import_reconciliation_v1(
    '11111111-1111-4111-8111-111111111111',
    '66666666-6666-4666-8666-666666666666','phase13_5_a2_clean',m) into r;
  if r is null or r->>'allMatchedAtSnapshot'<>'false'
    or not (r->'rows'->0->'differenceCodes' ? 'LIFECYCLE_DRIFT')
    or r->'rows'->2->'differenceCodes'<>'["MISSING_TARGET"]'::jsonb
    or r->>'closureAuthorized'<>'false' or r->>'mutated'<>'false'
  then raise exception '13.5 FAILURE: lifecycle/missing target not preserved %',r; end if;
  raise notice 'PASS 13.5 A2 lifecycle and missing-target drift stay explicit without repair';
end $$;

-- Restore synthetic rows for later tests.
reset role;
update public.contacts set deleted_at=null
 where id='33333333-3333-4333-8333-333333333333';
insert into public.transactions(id,workspace_id,company_id,primary_contact_id,type,department,status,priority,current_fee,legacy_id,legacy_source)
values('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111',
 '44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333',
 'phase13_5_test','qa','active','normal',135.25,'transaction:phase135','phase13.3');

-- D15/D16: forged manifest and wrong durable identity fail closed.
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare m jsonb; r jsonb;
begin
  select doc into m from fixture.manifests where name='clean';
  select public.read_legacy_import_reconciliation_v1(
    '11111111-1111-4111-8111-111111111111',
    '66666666-6666-4666-8666-666666666666','phase13_5_a2_clean',
    jsonb_set(m,'{items,0,normalizedFields,notes}','"forged"'::jsonb)) into r;
  if r is not null then raise exception '13.5 FAILURE: forged manifest got A2 evidence'; end if;
  select public.compare_legacy_import_reconciliation_v1(
    '11111111-1111-4111-8111-111111111111',
    '66666666-6666-4666-8666-666666666666','wrong-idempotency',m) into r;
  if r is not null then raise exception '13.5 FAILURE: wrong idempotency got A3 comparison'; end if;
  raise notice 'PASS 13.5 A2 forged manifest and wrong ledger identity fail closed';
end $$;

-- D19: late transaction insert failure rolls back job/contact/company partial writes.
reset role;
create function fixture.fail_late_transaction() returns trigger language plpgsql as $$
begin
  if new.id='99999999-9999-4999-8999-999999999997' then
    raise exception 'PHASE13_5_FORCED_LATE_WRITE_FAILURE';
  end if;
  return new;
end $$;
create trigger phase135_fail_late before insert on public.transactions
for each row execute function fixture.fail_late_transaction();

insert into fixture.manifests values ('late',jsonb_build_object(
  'schema','enjaz.legacy.ordered-import.execution-manifest.v1',
  'snapshotId','phase13-5-late','mappingPlanId','phase13-5-late',
  'workspaceId','11111111-1111-4111-8111-111111111111',
  'batchId','99999999-9999-4999-8999-999999999994',
  'idempotencyKey','phase13_5_late_failure',
  'stageOrder',jsonb_build_array('contacts','companies','transactions'),
  'items',jsonb_build_array(
    jsonb_build_object('ordinal',1,'stage',1,'sourceKey','contact:late','targetTable','contacts',
      'targetId','99999999-9999-4999-8999-999999999995',
      'normalizedFields',jsonb_build_object('display_name','Late Contact','contact_type','client'),'writeAllowed',false),
    jsonb_build_object('ordinal',2,'stage',2,'sourceKey','company:late','targetTable','companies',
      'targetId','99999999-9999-4999-8999-999999999996',
      'normalizedFields',jsonb_build_object('legal_name','Late Company','capital',1.00),'writeAllowed',false),
    jsonb_build_object('ordinal',3,'stage',3,'sourceKey','transaction:late','targetTable','transactions',
      'targetId','99999999-9999-4999-8999-999999999997',
      'normalizedFields',jsonb_build_object('type','late_failure','current_fee',1.00),'writeAllowed',false)
  ),
  'relationshipBindings',jsonb_build_array(
    jsonb_build_object('sourceKey','company:late','targetKey','contact:late','targetField','primary_contact_id',
      'sourceTargetId','99999999-9999-4999-8999-999999999996','targetTargetId','99999999-9999-4999-8999-999999999995',
      'sourceTargetTable','companies','targetTargetTable','contacts','assignmentPerformed',false,'writeAllowed',false),
    jsonb_build_object('sourceKey','transaction:late','targetKey','company:late','targetField','company_id',
      'sourceTargetId','99999999-9999-4999-8999-999999999997','targetTargetId','99999999-9999-4999-8999-999999999996',
      'sourceTargetTable','transactions','targetTargetTable','companies','assignmentPerformed',false,'writeAllowed',false)
  ),
  'deterministic',true,'workspacePermissionVerified',false,'idempotencyBound',true,
  'idempotencyEnforcementPerformed',false,'targetIdsGenerated',false,'foreignKeyBindingPerformed',true,
  'foreignKeyAssignmentPerformed',false,'persistencePerformed',false,'importExecutionAllowed',false,
  'targetMutationPerformed',false,'readyForA3ExecutionBoundary',true
));
grant select on fixture.manifests to authenticated;

set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare m jsonb; caught boolean:=false; n integer;
begin
  select doc into m from fixture.manifests where name='late';
  begin
    perform public.execute_legacy_ordered_import_v1(
      '11111111-1111-4111-8111-111111111111',
      '99999999-9999-4999-8999-999999999994','phase13_5_late_failure',m);
  exception when others then
    if position('PHASE13_5_FORCED_LATE_WRITE_FAILURE' in sqlerrm)>0 then caught:=true; else raise; end if;
  end;
  if not caught then raise exception '13.5 FAILURE: forced late failure did not fire'; end if;
  select
    (select count(*) from public.import_jobs where id='99999999-9999-4999-8999-999999999994')+
    (select count(*) from public.contacts where id='99999999-9999-4999-8999-999999999995')+
    (select count(*) from public.companies where id='99999999-9999-4999-8999-999999999996')+
    (select count(*) from public.transactions where id='99999999-9999-4999-8999-999999999997')
  into n;
  if n<>0 then raise exception '13.5 FAILURE: late failure left partial rows %',n; end if;
  raise notice 'PASS 13.5 A2 late write failure rolls back job/contact/company/transaction';
end $$;

-- D23: client/generated-ID authority preclaim is denied before any write.
do $$
declare m jsonb; caught boolean:=false; before_count integer; after_count integer;
begin
  select doc into m from fixture.manifests where name='late';
  select count(*) into before_count from public.import_jobs;
  m:=jsonb_set(m,'{targetIdsGenerated}','true'::jsonb);
  begin
    perform public.execute_legacy_ordered_import_v1(
      '11111111-1111-4111-8111-111111111111',
      '99999999-9999-4999-8999-999999999994','phase13_5_late_failure',m);
  exception when invalid_parameter_value then caught:=true; end;
  if not caught then raise exception '13.5 FAILURE: generated ID preclaim accepted'; end if;
  select count(*) into after_count from public.import_jobs;
  if after_count<>before_count then raise exception '13.5 FAILURE: authority preclaim wrote ledger'; end if;
  raise notice 'PASS 13.5 A2 generated-ID/write preclaim fails before persistence';
end $$;

-- D22: 5001 items fail before durable persistence.
reset role;
create table fixture.large(doc jsonb not null);
insert into fixture.large(doc)
select jsonb_build_object(
  'schema','enjaz.legacy.ordered-import.execution-manifest.v1',
  'snapshotId','phase13-5-5001','mappingPlanId','phase13-5-5001',
  'workspaceId','11111111-1111-4111-8111-111111111111',
  'batchId','88888888-8888-4888-8888-888888888888',
  'idempotencyKey','phase13_5_overlimit',
  'stageOrder',jsonb_build_array('contacts','companies','transactions'),
  'items',jsonb_agg(jsonb_build_object(
    'ordinal',g,'stage',1,'sourceKey','bulk:'||lpad(g::text,4,'0'),
    'targetTable','contacts',
    'targetId','00000000-0000-4000-8000-'||lpad(g::text,12,'0'),
    'normalizedFields',jsonb_build_object('display_name','Bulk '||g::text,'contact_type','client'),
    'writeAllowed',false
  ) order by g),
  'relationshipBindings','[]'::jsonb,
  'deterministic',true,'workspacePermissionVerified',false,'idempotencyBound',true,
  'idempotencyEnforcementPerformed',false,'targetIdsGenerated',false,'foreignKeyBindingPerformed',true,
  'foreignKeyAssignmentPerformed',false,'persistencePerformed',false,'importExecutionAllowed',false,
  'targetMutationPerformed',false,'readyForA3ExecutionBoundary',true
) from generate_series(1,5001) g;
grant select on fixture.large to authenticated;
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare m jsonb; caught boolean:=false; n integer;
begin
  select doc into m from fixture.large;
  begin
    perform public.execute_legacy_ordered_import_v1(
      '11111111-1111-4111-8111-111111111111',
      '88888888-8888-4888-8888-888888888888','phase13_5_overlimit',m);
  exception when invalid_parameter_value then caught:=true; end;
  if not caught then raise exception '13.5 FAILURE: 5001 import accepted'; end if;
  select count(*) into n from public.import_jobs where id='88888888-8888-4888-8888-888888888888';
  if n<>0 then raise exception '13.5 FAILURE: 5001 created durable job'; end if;
  raise notice 'PASS 13.5 A2 5001 import fails closed before durable persistence';
end $$;

-- Cleanup proof: synthetic business rows/jobs are removed; workspace fixtures remain only until the final assertion.
reset role;
drop trigger phase135_fail_late on public.transactions;
drop function fixture.fail_late_transaction();
delete from public.transactions where workspace_id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
delete from public.companies where workspace_id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
delete from public.contacts where workspace_id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
delete from public.import_jobs where workspace_id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
delete from public.workspace_memberships where workspace_id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
delete from public.workspaces where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');

do $$
declare n integer;
begin
  select
    (select count(*) from public.workspaces)+
    (select count(*) from public.workspace_memberships)+
    (select count(*) from public.import_jobs)+
    (select count(*) from public.contacts)+
    (select count(*) from public.companies)+
    (select count(*) from public.transactions)
  into n;
  if n<>0 then raise exception '13.5 FAILURE: fixture residue %',n; end if;
  raise notice 'PASS 13.5 A2 zero synthetic database residue';
end $$;
