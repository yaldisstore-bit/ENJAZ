-- Disposable PostgreSQL 17 fixture for Phase 13.4 A2 only.
-- Run only in the CI-provided, empty enjaz_a2_test database. Never against Supabase.
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

create table public.workspaces(id uuid primary key, owner_user_id uuid not null);
create table public.workspace_memberships(workspace_id uuid not null, user_id uuid not null);
create table public.import_jobs(
  id uuid primary key, workspace_id uuid not null, status text not null,
  counts jsonb not null, reconciliation jsonb not null,
  started_at timestamptz default now(), finished_at timestamptz
);
create table public.contacts(
  id uuid primary key, workspace_id uuid not null,
  legacy_source text, legacy_id text, status text, deleted_at timestamptz,
  display_name text, contact_type text, phone text, email text, notes text
);
create table public.companies(
  id uuid primary key, workspace_id uuid not null,
  legacy_source text, legacy_id text, status text, deleted_at timestamptz,
  legal_name text, display_name text, capital numeric(18,2), address text,
  activities text, registration_number text, legal_status text, primary_contact_id uuid
);
create table public.transactions(
  id uuid primary key, workspace_id uuid not null,
  legacy_source text, legacy_id text, status text, deleted_at timestamptz,
  type text, department text, current_fee numeric(18,2),
  company_id uuid, primary_contact_id uuid
);
create table fixture.original(doc jsonb not null, counts jsonb not null, reconciliation jsonb);

insert into public.workspaces values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.workspace_memberships values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('11111111-1111-4111-8111-111111111111','cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.contacts(id,workspace_id,legacy_source,legacy_id,status,display_name,contact_type) values
 ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','phase13.3','contact:a2','active','Test Contact','client');
insert into public.companies(id,workspace_id,legacy_source,legacy_id,status,legal_name,display_name,capital,primary_contact_id) values
 ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','phase13.3','company:a2','active','Test Company','Company',120.50,'33333333-3333-4333-8333-333333333333');
insert into public.transactions(id,workspace_id,legacy_source,legacy_id,status,type,department,current_fee,company_id,primary_contact_id) values
 ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','phase13.3','transaction:a2','active','test','qa',135.25,'44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333');

insert into fixture.original(doc,counts) values (
 jsonb_build_object('items',jsonb_build_array(
  jsonb_build_object('sourceKey','contact:a2','targetId','33333333-3333-4333-8333-333333333333','targetTable','contacts'),
  jsonb_build_object('sourceKey','company:a2','targetId','44444444-4444-4444-8444-444444444444','targetTable','companies'),
  jsonb_build_object('sourceKey','transaction:a2','targetId','55555555-5555-4555-8555-555555555555','targetTable','transactions')
 )),
 '{"contract":"phase13.3","total":3,"contacts":1,"companies":1,"transactions":1}'::jsonb
);
update fixture.original set reconciliation=jsonb_build_object(
 'idempotencyKey','a2-fixture-2026',
 'payloadHash',encode(extensions.digest(convert_to(doc::text,'UTF8'),'sha256'),'hex'),
 'result',jsonb_build_object(
   'schema','enjaz.legacy.ordered-import.execution-result.v1',
   'workspaceId','11111111-1111-4111-8111-111111111111',
   'batchId','66666666-6666-4666-8666-666666666666',
   'idempotencyKey','a2-fixture-2026',
   'payloadHash',encode(extensions.digest(convert_to(doc::text,'UTF8'),'sha256'),'hex'),
   'atomic',true,'persistencePerformed',true,
   'counts',counts - 'contract'
 ));
insert into public.import_jobs(id,workspace_id,status,counts,reconciliation,finished_at)
 select '66666666-6666-4666-8666-666666666666',
 '11111111-1111-4111-8111-111111111111','succeeded',counts,reconciliation,now()
 from fixture.original;

create function private.is_workspace_owner(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select (select auth.uid()) is not null
  and exists(select 1 from public.workspaces w
    where w.id=p_workspace_id and w.owner_user_id=(select auth.uid())) $$;
revoke all on function private.is_workspace_owner(uuid) from public,anon;
grant usage on schema auth,private,extensions,fixture to authenticated;
grant execute on function auth.uid(),private.is_workspace_owner(uuid) to authenticated;
grant select on public.workspaces,public.workspace_memberships,public.import_jobs,
  public.contacts,public.companies,public.transactions,fixture.original to authenticated;
alter table public.import_jobs enable row level security;
alter table public.contacts enable row level security;
alter table public.companies enable row level security;
alter table public.transactions enable row level security;
create policy owner_read on public.import_jobs for select to authenticated using (
 workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy owner_read on public.contacts for select to authenticated using (
 workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy owner_read on public.companies for select to authenticated using (
 workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy owner_read on public.transactions for select to authenticated using (
 workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));

-- Compile the actual, unmodified A2 migration in a fresh PostgreSQL instance.
\i database/migrations/phase_13_4_reconciliation_readback.sql

do $$ begin
 if has_function_privilege('anon',
   'public.read_legacy_import_reconciliation_v1(uuid,uuid,text,jsonb)','EXECUTE')
 then raise exception 'A2 FAILURE: anonymous execute unexpectedly granted'; end if;
 if not has_function_privilege('authenticated',
   'public.read_legacy_import_reconciliation_v1(uuid,uuid,text,jsonb)','EXECUTE')
 then raise exception 'A2 FAILURE: authenticated execute missing'; end if;
end $$;

set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare r jsonb;
begin
 select public.read_legacy_import_reconciliation_v1(
 '11111111-1111-4111-8111-111111111111',
 '66666666-6666-4666-8666-666666666666',
 'a2-fixture-2026',doc) into r from fixture.original;
 if r is null or r->>'schema'<>'enjaz.legacy.reconciliation.readback.v1'
   or (r->>'expectedRowCount')::int<>3
   or jsonb_array_length(r->'observedRows')<>3
   or r->'observedRows'->0->>'found'<>'true'
   or r->'observedRows'->1->'record'->'fields'->>'capitalDecimal'<>'120.50'
   or r->'observedRows'->2->'record'->'fields'->>'current_fee_decimal'<>'135.25'
   or r->'observedRows'->2->'record'->'relationshipIds'->>'company_id'
       <>'44444444-4444-4444-8444-444444444444'
   or r->>'reconciled'<>'false' or r->>'mutated'<>'false'
 then raise exception 'A2 FAILURE: owner readback, complete rows, money or FK'; end if;
 raise notice 'PASS A2 ephemeral PostgreSQL owner, rows, exact money and FK';
end $$;

set request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$
declare r jsonb;
begin
 select public.read_legacy_import_reconciliation_v1(
 '11111111-1111-4111-8111-111111111111',
 '66666666-6666-4666-8666-666666666666',
 'a2-fixture-2026',doc) into r from fixture.original;
 if r is not null then raise exception 'A2 FAILURE: outsider readback visible'; end if;
 raise notice 'PASS A2 ephemeral PostgreSQL outsider denied';
end $$;

set request.jwt.claim.sub = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
do $$
declare r jsonb; accessible integer;
begin
 select count(*) into accessible from public.import_jobs
 where workspace_id='11111111-1111-4111-8111-111111111111';
 if accessible<>1 then raise exception 'A2 FAILURE: non-owner test member lacks baseline RLS access'; end if;
 select public.read_legacy_import_reconciliation_v1(
 '11111111-1111-4111-8111-111111111111',
 '66666666-6666-4666-8666-666666666666',
 'a2-fixture-2026',doc) into r from fixture.original;
 if r is not null then raise exception 'A2 FAILURE: same-workspace non-owner readback visible'; end if;
 raise notice 'PASS A2 ephemeral PostgreSQL workspace member cannot bypass owner-only readback';
end $$;

reset role;
set role anon;
do $$ begin
 begin
  perform public.read_legacy_import_reconciliation_v1(
  '11111111-1111-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666','a2-fixture-2026','{}'::jsonb);
  raise exception 'A2 FAILURE: anonymous executed RPC';
 exception when insufficient_privilege then
  raise notice 'PASS A2 ephemeral PostgreSQL anonymous execute denied';
 end;
end $$;

reset role;
update public.import_jobs set counts=counts||'{"total":4}'::jsonb
where id='66666666-6666-4666-8666-666666666666';
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare r jsonb;
begin
 select public.read_legacy_import_reconciliation_v1(
 '11111111-1111-4111-8111-111111111111',
 '66666666-6666-4666-8666-666666666666',
 'a2-fixture-2026',doc) into r from fixture.original;
 if r is not null then raise exception 'A2 FAILURE: count-corrupt ledger accepted'; end if;
 raise notice 'PASS A2 ephemeral PostgreSQL corrupted counts denied';
end $$;

reset role;
update public.import_jobs set counts=(select counts from fixture.original),
 reconciliation=jsonb_set(reconciliation,'{result,atomic}','false'::jsonb)
where id='66666666-6666-4666-8666-666666666666';
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare r jsonb;
begin
 select public.read_legacy_import_reconciliation_v1(
 '11111111-1111-4111-8111-111111111111',
 '66666666-6666-4666-8666-666666666666',
 'a2-fixture-2026',doc) into r from fixture.original;
 if r is not null then raise exception 'A2 FAILURE: non-atomic ledger accepted'; end if;
 raise notice 'PASS A2 ephemeral PostgreSQL non-atomic ledger denied';
end $$;

reset role;
update public.import_jobs set reconciliation=(select reconciliation from fixture.original)
where id='66666666-6666-4666-8666-666666666666';
delete from public.transactions where id='55555555-5555-4555-8555-555555555555';
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
declare r jsonb;
begin
 select public.read_legacy_import_reconciliation_v1(
 '11111111-1111-4111-8111-111111111111',
 '66666666-6666-4666-8666-666666666666',
 'a2-fixture-2026',doc) into r from fixture.original;
 if r is null or jsonb_array_length(r->'observedRows')<>3
   or r->'observedRows'->2->>'found'<>'false'
   or r->'observedRows'->2->'record'<>'null'::jsonb
   or r->>'reconciled'<>'false'
 then raise exception 'A2 FAILURE: missing record was concealed or repaired'; end if;
 raise notice 'PASS A2 ephemeral PostgreSQL missing target remains visible';
end $$;
