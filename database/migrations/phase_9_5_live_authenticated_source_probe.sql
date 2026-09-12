-- Phase 9.5 / M13 — Real Cloud authenticated source-composition certification probe.
-- Creates only fixed temporary fixtures, exercises authenticated RLS + Field Operations RPC,
-- verifies outsider isolation, then removes every fixture before the migration commits.

select set_config(
  'p95.owner',
  (
    select w.owner_user_id::text
    from public.workspaces w
    join public.workspace_memberships wm
      on wm.workspace_id=w.id and wm.user_id=w.owner_user_id and wm.role='owner'
    order by w.created_at
    limit 1
  ),
  true
);

do $$
begin
  if nullif(current_setting('p95.owner',true),'') is null then
    raise exception 'ENJAZ_P95_PROBE: owner missing';
  end if;

  if exists(select 1 from public.workspaces where id='95f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.companies where id='95f00000-0000-4000-8000-000000000010')
     or exists(select 1 from public.cashbox_accounts where id='95f00000-0000-4000-8000-000000000030')
     or exists(select 1 from public.transactions where id in ('95f00000-0000-4000-8000-000000000020','95f00000-0000-4000-8000-000000000021','95f00000-0000-4000-8000-000000000022'))
     or exists(select 1 from public.payments where id in ('95f00000-0000-4000-8000-000000000040','95f00000-0000-4000-8000-000000000041') or receipt_serial in (959500000001,959500000002))
     or exists(select 1 from public.payment_reversals where id='95f00000-0000-4000-8000-000000000050' or reversal_serial=959500000003)
     or exists(select 1 from public.financial_ledger_entries where id='95f00000-0000-4000-8000-000000000060')
     or exists(select 1 from public.field_assignments where id='95f00000-0000-4000-8000-000000000070')
     or exists(select 1 from public.field_visits where id='95f00000-0000-4000-8000-000000000080') then
    raise exception 'ENJAZ_P95_PROBE: pre-existing residue';
  end if;

  if exists(
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','v','m')
      and (c.relname like 'bi\_%' escape '\\' or c.relname like 'business_intelligence%' or c.relname like 'forecast%')
  ) then
    raise exception 'ENJAZ_P95_PROBE: shadow BI persistence detected';
  end if;
end $$;

insert into public.workspaces(id,owner_user_id,name)
values('95f00000-0000-4000-8000-000000000001',current_setting('p95.owner')::uuid,'__P95_BI_PROBE__');
insert into public.workspace_memberships(workspace_id,user_id,role)
values('95f00000-0000-4000-8000-000000000001',current_setting('p95.owner')::uuid,'owner');
insert into public.companies(id,workspace_id,legal_name,status)
values('95f00000-0000-4000-8000-000000000010','95f00000-0000-4000-8000-000000000001','__P95 Probe Company__','active');
insert into public.cashbox_accounts(id,workspace_id,name,opening_balance,opened_at,active)
values('95f00000-0000-4000-8000-000000000030','95f00000-0000-4000-8000-000000000001','__P95 Probe Cashbox__',125.50,timestamptz '2026-08-01 08:00:00+03',true);

insert into public.transactions(id,workspace_id,company_id,type,status,priority,current_fee,created_at,updated_at,last_activity_at,completed_at)
values
 ('95f00000-0000-4000-8000-000000000020','95f00000-0000-4000-8000-000000000001','95f00000-0000-4000-8000-000000000010','معاملة اختبار 9.5','active','high',1000.00,timestamptz '2026-08-01 09:00:00+03',timestamptz '2026-09-11 09:00:00+03',timestamptz '2026-09-11 09:00:00+03',null),
 ('95f00000-0000-4000-8000-000000000021','95f00000-0000-4000-8000-000000000001','95f00000-0000-4000-8000-000000000010','معاملة متوقفة 9.5','stalled','urgent',2000.00,timestamptz '2026-08-05 09:00:00+03',timestamptz '2026-09-10 09:00:00+03',timestamptz '2026-09-10 09:00:00+03',null),
 ('95f00000-0000-4000-8000-000000000022','95f00000-0000-4000-8000-000000000001','95f00000-0000-4000-8000-000000000010','معاملة منجزة 9.5','completed','normal',3000.00,timestamptz '2026-08-10 09:00:00+03',timestamptz '2026-09-08 09:00:00+03',timestamptz '2026-09-08 09:00:00+03',timestamptz '2026-09-08 09:00:00+03');

insert into public.payments(id,workspace_id,transaction_id,company_id,amount,method,paid_at,status,receipt_ref,idempotency_key,created_by,receipt_serial,receipt_token,receipt_snapshot)
values
 ('95f00000-0000-4000-8000-000000000040','95f00000-0000-4000-8000-000000000001','95f00000-0000-4000-8000-000000000020','95f00000-0000-4000-8000-000000000010',500.00,'cash',timestamptz '2026-09-05 10:00:00+03','posted','P95-R-001','95f00000-0000-4000-8000-000000000401',current_setting('p95.owner')::uuid,959500000001,'95f00000-0000-4000-8000-000000000402','{"probe":"p95","status":"posted"}'::jsonb),
 ('95f00000-0000-4000-8000-000000000041','95f00000-0000-4000-8000-000000000001','95f00000-0000-4000-8000-000000000021','95f00000-0000-4000-8000-000000000010',250.00,'transfer',timestamptz '2026-09-06 10:00:00+03','reversed','P95-R-002','95f00000-0000-4000-8000-000000000403',current_setting('p95.owner')::uuid,959500000002,'95f00000-0000-4000-8000-000000000404','{"probe":"p95","status":"reversed"}'::jsonb);

insert into public.payment_reversals(id,workspace_id,payment_id,reversed_at,reason,actor_user_id,idempotency_key,reversal_serial,reversal_ref,reversal_snapshot)
values('95f00000-0000-4000-8000-000000000050','95f00000-0000-4000-8000-000000000001','95f00000-0000-4000-8000-000000000041',timestamptz '2026-09-07 10:00:00+03','Phase 9.5 probe reversal',current_setting('p95.owner')::uuid,'95f00000-0000-4000-8000-000000000405',959500000003,'P95-X-001','{"probe":"p95"}'::jsonb);

insert into public.financial_ledger_entries(id,workspace_id,transaction_id,company_id,entry_type,direction,amount,category,source,occurred_at,status,metadata)
values('95f00000-0000-4000-8000-000000000060','95f00000-0000-4000-8000-000000000001','95f00000-0000-4000-8000-000000000020','95f00000-0000-4000-8000-000000000010','expense','out',75.25,'probe','phase9.5',timestamptz '2026-09-04 12:00:00+03','posted','{"probe":"p95"}'::jsonb);

insert into public.field_assignments(id,workspace_id,transaction_id,assigned_user_id,scheduled_for,destination_label,priority,status,created_by)
values('95f00000-0000-4000-8000-000000000070','95f00000-0000-4000-8000-000000000001','95f00000-0000-4000-8000-000000000020',current_setting('p95.owner')::uuid,date '2026-09-12','دائرة اختبار Phase 9.5','high','queued',current_setting('p95.owner')::uuid);
insert into public.field_visits(id,workspace_id,assignment_id,transaction_id,assigned_user_id,status,check_in_at,started_by)
values('95f00000-0000-4000-8000-000000000080','95f00000-0000-4000-8000-000000000001','95f00000-0000-4000-8000-000000000070','95f00000-0000-4000-8000-000000000020',current_setting('p95.owner')::uuid,'checked_in',timestamptz '2026-09-12 08:30:00+03',current_setting('p95.owner')::uuid);

-- Owner-authenticated RLS journey.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p95.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p95.owner'),true);
set local role authenticated;
do $$
declare v_ctx jsonb;
begin
  if (select count(*) from public.workspace_memberships where workspace_id='95f00000-0000-4000-8000-000000000001' and user_id=auth.uid())<>1 then raise exception 'ENJAZ_P95_PROBE: owner membership read'; end if;
  if (select count(*) from public.companies where workspace_id='95f00000-0000-4000-8000-000000000001')<>1 then raise exception 'ENJAZ_P95_PROBE: company read'; end if;
  if (select count(*) from public.cashbox_accounts where workspace_id='95f00000-0000-4000-8000-000000000001')<>1 then raise exception 'ENJAZ_P95_PROBE: cashbox read'; end if;
  if (select count(*) from public.transactions where workspace_id='95f00000-0000-4000-8000-000000000001')<>3 then raise exception 'ENJAZ_P95_PROBE: transaction read'; end if;
  if (select count(*) from public.payments where workspace_id='95f00000-0000-4000-8000-000000000001')<>2 then raise exception 'ENJAZ_P95_PROBE: payment read'; end if;
  if (select count(*) from public.payment_reversals where workspace_id='95f00000-0000-4000-8000-000000000001')<>1 then raise exception 'ENJAZ_P95_PROBE: reversal read'; end if;
  if (select count(*) from public.financial_ledger_entries where workspace_id='95f00000-0000-4000-8000-000000000001')<>1 then raise exception 'ENJAZ_P95_PROBE: ledger read'; end if;
  if (select count(*) from public.field_assignments where workspace_id='95f00000-0000-4000-8000-000000000001')<>1 then raise exception 'ENJAZ_P95_PROBE: assignment read'; end if;
  if (select count(*) from public.field_visits where workspace_id='95f00000-0000-4000-8000-000000000001')<>1 then raise exception 'ENJAZ_P95_PROBE: visit read'; end if;
  if (select sum(amount) from public.payments where workspace_id='95f00000-0000-4000-8000-000000000001' and status='posted')<>500.00::numeric then raise exception 'ENJAZ_P95_PROBE: exact posted money'; end if;

  v_ctx:=public.get_field_operations_context_v1('95f00000-0000-4000-8000-000000000001');
  if v_ctx->>'authority'<>'field_assignments_visits_evidence_receipts'
     or v_ctx->>'transactionWriteAuthority'<>'none'
     or v_ctx->>'financeWriteAuthority'<>'none'
     or jsonb_array_length(v_ctx->'assignments')<>1
     or jsonb_array_length(v_ctx->'visits')<>1
     or (v_ctx#>>'{metrics,queuedAssignments}')::int<>1
     or (v_ctx#>>'{metrics,activeVisits}')::int<>1 then
    raise exception 'ENJAZ_P95_PROBE: field authority/context';
  end if;
end $$;
reset role;

-- Outsider identity must see none of the workspace-owned facts and the Field RPC must reject access.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub','95f00000-0000-4000-8000-000000000099')::text,true);
select set_config('request.jwt.claim.sub','95f00000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $$
begin
  if exists(select 1 from public.workspace_memberships where workspace_id='95f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.companies where workspace_id='95f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.cashbox_accounts where workspace_id='95f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.transactions where workspace_id='95f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.payments where workspace_id='95f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.payment_reversals where workspace_id='95f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.financial_ledger_entries where workspace_id='95f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.field_assignments where workspace_id='95f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.field_visits where workspace_id='95f00000-0000-4000-8000-000000000001') then
    raise exception 'ENJAZ_P95_PROBE: outsider RLS leak';
  end if;
  begin
    perform public.get_field_operations_context_v1('95f00000-0000-4000-8000-000000000001');
    raise exception 'ENJAZ_P95_PROBE: outsider field RPC accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'ENJAZ_FIELD_WORKSPACE_FORBIDDEN' then raise; end if;
  end;
end $$;
reset role;

-- Remove every fixture while privileged. Any earlier failure aborts the migration transaction automatically.
delete from public.field_visits where id='95f00000-0000-4000-8000-000000000080';
delete from public.field_assignments where id='95f00000-0000-4000-8000-000000000070';
delete from public.payment_reversals where id='95f00000-0000-4000-8000-000000000050';
delete from public.payments where id in ('95f00000-0000-4000-8000-000000000040','95f00000-0000-4000-8000-000000000041');
delete from public.financial_ledger_entries where id='95f00000-0000-4000-8000-000000000060';
delete from public.transactions where id in ('95f00000-0000-4000-8000-000000000020','95f00000-0000-4000-8000-000000000021','95f00000-0000-4000-8000-000000000022');
delete from public.cashbox_accounts where id='95f00000-0000-4000-8000-000000000030';
delete from public.companies where id='95f00000-0000-4000-8000-000000000010';
delete from public.workspace_memberships where workspace_id='95f00000-0000-4000-8000-000000000001';
delete from public.workspaces where id='95f00000-0000-4000-8000-000000000001';

do $$
begin
  if exists(select 1 from public.workspaces where id='95f00000-0000-4000-8000-000000000001')
     or exists(select 1 from public.companies where id='95f00000-0000-4000-8000-000000000010')
     or exists(select 1 from public.cashbox_accounts where id='95f00000-0000-4000-8000-000000000030')
     or exists(select 1 from public.transactions where id in ('95f00000-0000-4000-8000-000000000020','95f00000-0000-4000-8000-000000000021','95f00000-0000-4000-8000-000000000022'))
     or exists(select 1 from public.payments where id in ('95f00000-0000-4000-8000-000000000040','95f00000-0000-4000-8000-000000000041'))
     or exists(select 1 from public.payment_reversals where id='95f00000-0000-4000-8000-000000000050')
     or exists(select 1 from public.financial_ledger_entries where id='95f00000-0000-4000-8000-000000000060')
     or exists(select 1 from public.field_assignments where id='95f00000-0000-4000-8000-000000000070')
     or exists(select 1 from public.field_visits where id='95f00000-0000-4000-8000-000000000080') then
    raise exception 'ENJAZ_P95_PROBE: cleanup residue';
  end if;
end $$;
