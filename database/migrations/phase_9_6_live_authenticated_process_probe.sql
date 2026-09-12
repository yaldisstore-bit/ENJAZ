-- ENJAZ Phase 9.6 / M18 — Real Cloud authenticated process-history certification probe.
-- Creates fixed temporary fixtures, exercises authenticated RLS over process source histories,
-- verifies actor-scoped sync receipts remain integrity-only, verifies outsider isolation,
-- then deletes every fixture before the migration commits.

select set_config('p96.owner',(select w.owner_user_id::text from public.workspaces w join public.workspace_memberships wm on wm.workspace_id=w.id and wm.user_id=w.owner_user_id and wm.role='owner' order by w.created_at limit 1),true);

do $$ begin
  if nullif(current_setting('p96.owner',true),'') is null then raise exception 'ENJAZ_P96_PROBE: owner missing'; end if;
  if exists(select 1 from public.workspaces where id='96f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.transactions where id='96f00000-0000-4000-8000-000000000020')
     or exists(select 1 from public.transaction_activity where id='96f00000-0000-4000-8000-000000000030')
     or exists(select 1 from public.workflow_instances where id='96f00000-0000-4000-8000-000000000040')
     or exists(select 1 from public.workflow_transition_events where id='96f00000-0000-4000-8000-000000000041')
     or exists(select 1 from public.field_assignments where id='96f00000-0000-4000-8000-000000000050')
     or exists(select 1 from public.field_visits where id='96f00000-0000-4000-8000-000000000060')
     or exists(select 1 from public.field_visit_evidence where id='96f00000-0000-4000-8000-000000000070')
     or exists(select 1 from public.field_sync_receipts where id='96f00000-0000-4000-8000-000000000080') then raise exception 'ENJAZ_P96_PROBE: pre-existing residue'; end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m') and c.relname ~ '^(process_mining|process_intelligence|predictive_operations|process_event)') then raise exception 'ENJAZ_P96_PROBE: shadow process persistence detected'; end if;
  if has_table_privilege('anon','public.workflow_transition_events','SELECT')
     or has_table_privilege('anon','public.field_assignments','SELECT')
     or has_table_privilege('anon','public.field_visits','SELECT')
     or has_table_privilege('anon','public.field_visit_evidence','SELECT')
     or has_table_privilege('anon','public.field_sync_receipts','SELECT') then raise exception 'ENJAZ_P96_PROBE: anon process-source privilege'; end if;
  if has_table_privilege('authenticated','public.workflow_transition_events','INSERT')
     or has_table_privilege('authenticated','public.workflow_instances','INSERT')
     or has_table_privilege('authenticated','public.workflow_instances','UPDATE')
     or has_table_privilege('authenticated','public.workflow_instances','DELETE')
     or has_table_privilege('authenticated','public.field_assignments','INSERT')
     or has_table_privilege('authenticated','public.field_assignments','UPDATE')
     or has_table_privilege('authenticated','public.field_assignments','DELETE')
     or has_table_privilege('authenticated','public.field_visits','INSERT')
     or has_table_privilege('authenticated','public.field_visit_evidence','INSERT')
     or has_table_privilege('authenticated','public.field_sync_receipts','INSERT') then raise exception 'ENJAZ_P96_PROBE: browser mutation privilege on process source'; end if;
  if not exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename='field_sync_receipts' and p.policyname='field_sync_receipts_select_own' and p.cmd='SELECT' and p.qual ilike '%created_by%' and p.qual ilike '%auth.uid%') then raise exception 'ENJAZ_P96_PROBE: sync receipt actor-scope policy missing'; end if;
end $$;

insert into public.workspaces(id,owner_user_id,name) values('96f00000-0000-4000-8000-000000000001',current_setting('p96.owner')::uuid,'__P96_PROCESS_PROBE__');
insert into public.workspace_memberships(workspace_id,user_id,role) values('96f00000-0000-4000-8000-000000000001',current_setting('p96.owner')::uuid,'owner');
insert into public.companies(id,workspace_id,legal_name,status) values('96f00000-0000-4000-8000-000000000010','96f00000-0000-4000-8000-000000000001','__P96 Probe Company__','active');
insert into public.transactions(id,workspace_id,company_id,type,status,priority,current_fee,created_at,updated_at,last_activity_at) values('96f00000-0000-4000-8000-000000000020','96f00000-0000-4000-8000-000000000001','96f00000-0000-4000-8000-000000000010','معاملة اختبار 9.6','active','high',1000.00,timestamptz '2026-09-01 08:00:00+03',timestamptz '2026-09-12 08:00:00+03',timestamptz '2026-09-12 08:00:00+03');
insert into public.transaction_activity(id,workspace_id,transaction_id,event_type,summary,occurred_at,actor_user_id,metadata) values('96f00000-0000-4000-8000-000000000030','96f00000-0000-4000-8000-000000000001','96f00000-0000-4000-8000-000000000020','transaction_created','Phase 9.6 source event',timestamptz '2026-09-01 08:05:00+03',current_setting('p96.owner')::uuid,'{"probe":"p96"}'::jsonb);
insert into public.workflow_instances(id,workspace_id,transaction_id,workflow_template_id,status,current_stage_position,started_at,template_snapshot) values('96f00000-0000-4000-8000-000000000040','96f00000-0000-4000-8000-000000000001','96f00000-0000-4000-8000-000000000020',null,'active',2,timestamptz '2026-09-01 09:00:00+03','{"probe":"p96"}'::jsonb);
insert into public.workflow_transition_events(id,workspace_id,workflow_instance_id,idempotency_key,transition_key,event_kind,from_stage_position,to_stage_position,occurred_at,actor_user_id,snapshot) values('96f00000-0000-4000-8000-000000000041','96f00000-0000-4000-8000-000000000001','96f00000-0000-4000-8000-000000000040','96f00000-0000-4000-8000-000000000401','advance_review','advance',1,2,timestamptz '2026-09-01 10:00:00+03',current_setting('p96.owner')::uuid,'{"probe":"p96"}'::jsonb);
insert into public.field_assignments(id,workspace_id,transaction_id,assigned_user_id,scheduled_for,destination_label,priority,status,created_by,created_at,updated_at) values('96f00000-0000-4000-8000-000000000050','96f00000-0000-4000-8000-000000000001','96f00000-0000-4000-8000-000000000020',current_setting('p96.owner')::uuid,date '2026-09-12','دائرة اختبار Phase 9.6','high','in_progress',current_setting('p96.owner')::uuid,timestamptz '2026-09-01 11:00:00+03',timestamptz '2026-09-01 11:00:00+03');
insert into public.field_visits(id,workspace_id,assignment_id,transaction_id,assigned_user_id,status,check_in_at,started_by,created_at,updated_at) values('96f00000-0000-4000-8000-000000000060','96f00000-0000-4000-8000-000000000001','96f00000-0000-4000-8000-000000000050','96f00000-0000-4000-8000-000000000020',current_setting('p96.owner')::uuid,'checked_in',timestamptz '2026-09-01 12:00:00+03',current_setting('p96.owner')::uuid,timestamptz '2026-09-01 12:00:00+03',timestamptz '2026-09-01 12:00:00+03');
insert into public.field_visit_evidence(id,workspace_id,visit_id,transaction_id,document_id,evidence_type,note,captured_by,captured_at) values('96f00000-0000-4000-8000-000000000070','96f00000-0000-4000-8000-000000000001','96f00000-0000-4000-8000-000000000060','96f00000-0000-4000-8000-000000000020',null,'other','Phase 9.6 evidence',current_setting('p96.owner')::uuid,timestamptz '2026-09-01 12:15:00+03');
insert into public.field_sync_receipts(id,workspace_id,client_operation_id,operation_type,target_id,payload_fingerprint,result,created_by,created_at) values('96f00000-0000-4000-8000-000000000080','96f00000-0000-4000-8000-000000000001','96f00000-0000-4000-8000-000000000801','check_in','96f00000-0000-4000-8000-000000000060','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','{"probe":"p96"}'::jsonb,current_setting('p96.owner')::uuid,timestamptz '2026-09-01 12:00:01+03');

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p96.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p96.owner'),true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.transaction_activity where workspace_id='96f00000-0000-4000-8000-000000000001')<>1 then raise exception 'ENJAZ_P96_PROBE: owner transaction history read'; end if;
  if (select count(*) from public.workflow_instances where workspace_id='96f00000-0000-4000-8000-000000000001')<>1 then raise exception 'ENJAZ_P96_PROBE: owner workflow instance read'; end if;
  if (select count(*) from public.workflow_transition_events where workspace_id='96f00000-0000-4000-8000-000000000001')<>1 then raise exception 'ENJAZ_P96_PROBE: owner workflow transition read'; end if;
  if (select count(*) from public.field_assignments where workspace_id='96f00000-0000-4000-8000-000000000001')<>1 then raise exception 'ENJAZ_P96_PROBE: owner assignment read'; end if;
  if (select count(*) from public.field_visits where workspace_id='96f00000-0000-4000-8000-000000000001')<>1 then raise exception 'ENJAZ_P96_PROBE: owner visit read'; end if;
  if (select count(*) from public.field_visit_evidence where workspace_id='96f00000-0000-4000-8000-000000000001')<>1 then raise exception 'ENJAZ_P96_PROBE: owner field evidence read'; end if;
  if (select count(*) from public.field_sync_receipts where workspace_id='96f00000-0000-4000-8000-000000000001')<>1 then raise exception 'ENJAZ_P96_PROBE: owner own sync receipt read'; end if;
end $$;
reset role;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub','96f00000-0000-4000-8000-000000000099')::text,true);
select set_config('request.jwt.claim.sub','96f00000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.transaction_activity where workspace_id='96f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.workflow_instances where workspace_id='96f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.workflow_transition_events where workspace_id='96f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.field_assignments where workspace_id='96f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.field_visits where workspace_id='96f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.field_visit_evidence where workspace_id='96f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.field_sync_receipts where workspace_id='96f00000-0000-4000-8000-000000000001') then raise exception 'ENJAZ_P96_PROBE: outsider RLS leak'; end if;
end $$;
reset role;

delete from public.field_sync_receipts where id='96f00000-0000-4000-8000-000000000080';
delete from public.field_visit_evidence where id='96f00000-0000-4000-8000-000000000070';
delete from public.field_visits where id='96f00000-0000-4000-8000-000000000060';
delete from public.field_assignments where id='96f00000-0000-4000-8000-000000000050';
delete from public.workflow_transition_events where id='96f00000-0000-4000-8000-000000000041';
delete from public.workflow_instances where id='96f00000-0000-4000-8000-000000000040';
delete from public.transaction_activity where id='96f00000-0000-4000-8000-000000000030';
delete from public.transactions where id='96f00000-0000-4000-8000-000000000020';
delete from public.companies where id='96f00000-0000-4000-8000-000000000010';
delete from public.workspace_memberships where workspace_id='96f00000-0000-4000-8000-000000000001';
delete from public.workspaces where id='96f00000-0000-4000-8000-000000000001';

do $$ begin
  if exists(select 1 from public.workspaces where id='96f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.companies where id='96f00000-0000-4000-8000-000000000010')
     or exists(select 1 from public.transactions where id='96f00000-0000-4000-8000-000000000020')
     or exists(select 1 from public.transaction_activity where id='96f00000-0000-4000-8000-000000000030')
     or exists(select 1 from public.workflow_instances where id='96f00000-0000-4000-8000-000000000040')
     or exists(select 1 from public.workflow_transition_events where id='96f00000-0000-4000-8000-000000000041')
     or exists(select 1 from public.field_assignments where id='96f00000-0000-4000-8000-000000000050')
     or exists(select 1 from public.field_visits where id='96f00000-0000-4000-8000-000000000060')
     or exists(select 1 from public.field_visit_evidence where id='96f00000-0000-4000-8000-000000000070')
     or exists(select 1 from public.field_sync_receipts where id='96f00000-0000-4000-8000-000000000080') then raise exception 'ENJAZ_P96_PROBE: cleanup residue'; end if;
end $$;
