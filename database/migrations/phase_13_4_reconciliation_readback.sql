-- Phase 13.4 A2 SOURCE PROPOSAL ONLY. Do not deploy until the authenticated
-- Real Cloud permission/consistency suite and the A1 exact-main gate pass.
-- The single SQL statement uses one MVCC statement snapshot. It reads only
-- existing RLS-protected tables and never repairs or marks a row reconciled.
begin;

create or replace function public.read_legacy_import_reconciliation_v1(
  p_workspace_id uuid,
  p_batch_id uuid,
  p_idempotency_key text,
  p_manifest jsonb
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with bound_job as materialized (
    select j.id, j.workspace_id, j.status, j.counts, j.reconciliation,
           j.started_at, j.finished_at
    from public.import_jobs j
    where (select auth.uid()) is not null
      and private.is_workspace_owner(p_workspace_id)
      and j.workspace_id = p_workspace_id
      and j.id = p_batch_id
      and j.status = 'succeeded'
      and j.counts->>'contract' = 'phase13.3'
      -- A completed job must still have the exact certified Phase 13.3
      -- result envelope and coherent durable per-table counts.
      and j.reconciliation->'result'->>'schema' =
        'enjaz.legacy.ordered-import.execution-result.v1'
      and j.reconciliation->'result'->>'atomic' = 'true'
      and j.reconciliation->'result'->>'persistencePerformed' = 'true'
      and j.reconciliation->'result'->'counts' = (j.counts - 'contract')
      -- Two mutually agreeing ledger objects could both have been corrupted.
      -- Require their counts to also agree with the original hash-bound manifest.
      and j.counts = (
        select jsonb_build_object(
          'contract', 'phase13.3',
          'total', count(*)::integer,
          'contacts', count(*) filter (where item->>'targetTable' = 'contacts')::integer,
          'companies', count(*) filter (where item->>'targetTable' = 'companies')::integer,
          'transactions', count(*) filter (where item->>'targetTable' = 'transactions')::integer
        )
        from jsonb_array_elements(p_manifest->'items') as original(item)
      )
      and j.finished_at is not null
      and j.started_at is not null
      and j.finished_at >= j.started_at
      and j.reconciliation->>'idempotencyKey' = p_idempotency_key
      and j.reconciliation->>'payloadHash' =
        encode(extensions.digest(convert_to(p_manifest::text, 'UTF8'), 'sha256'), 'hex')
      and j.reconciliation->'result'->>'batchId' = p_batch_id::text
      and j.reconciliation->'result'->>'workspaceId' = p_workspace_id::text
      and j.reconciliation->'result'->>'idempotencyKey' = p_idempotency_key
      and j.reconciliation->'result'->>'payloadHash' =
        j.reconciliation->>'payloadHash'
      and jsonb_typeof(p_manifest->'items') = 'array'
      and jsonb_array_length(p_manifest->'items') between 1 and 5000
      and octet_length(convert_to(p_manifest::text, 'UTF8')) <= 8388608
  ), expected_items as (
    select ordinality::integer as ordinal, value->>'targetTable' as target_table,
           (value->>'targetId')::uuid as target_id, value->>'sourceKey' as source_key
    from bound_job
    cross join lateral jsonb_array_elements(p_manifest->'items')
      with ordinality as raw(value, ordinality)
  ), observed as (
    select e.ordinal, e.target_table, e.target_id, e.source_key,
           case
             when e.target_table = 'contacts' and c.id is not null then
               jsonb_build_object(
                 'id', c.id, 'workspaceId', c.workspace_id,
                 'legacySource', c.legacy_source, 'legacyId', c.legacy_id,
                 'status', c.status, 'deletedAt', c.deleted_at,
                 'fields', jsonb_build_object(
                   'display_name', c.display_name, 'contact_type', c.contact_type,
                   'phone', c.phone, 'email', c.email, 'notes', c.notes),
                 'relationshipIds', '{}'::jsonb)
             when e.target_table = 'companies' and co.id is not null then
               jsonb_build_object(
                 'id', co.id, 'workspaceId', co.workspace_id,
                 'legacySource', co.legacy_source, 'legacyId', co.legacy_id,
                 'status', co.status, 'deletedAt', co.deleted_at,
                 'fields', jsonb_build_object(
                   'legal_name', co.legal_name, 'display_name', co.display_name,
                   'capitalDecimal', co.capital::text, 'address', co.address,
                   'activities', co.activities, 'registration_number', co.registration_number,
                   'legal_status', co.legal_status),
                 'relationshipIds', jsonb_build_object('primary_contact_id', co.primary_contact_id))
             when e.target_table = 'transactions' and t.id is not null then
               jsonb_build_object(
                 'id', t.id, 'workspaceId', t.workspace_id,
                 'legacySource', t.legacy_source, 'legacyId', t.legacy_id,
                 'status', t.status, 'deletedAt', t.deleted_at,
                 'fields', jsonb_build_object(
                   'type', t.type, 'department', t.department,
                   'current_fee_decimal', t.current_fee::text),
                 'relationshipIds', jsonb_build_object(
                   'company_id', t.company_id, 'primary_contact_id', t.primary_contact_id))
             else null
           end as actual_record
    from expected_items e
    left join public.contacts c on e.target_table = 'contacts'
      and c.id = e.target_id and c.workspace_id = p_workspace_id
    left join public.companies co on e.target_table = 'companies'
      and co.id = e.target_id and co.workspace_id = p_workspace_id
    left join public.transactions t on e.target_table = 'transactions'
      and t.id = e.target_id and t.workspace_id = p_workspace_id
  )
  select jsonb_build_object(
    'schema', 'enjaz.legacy.reconciliation.readback.v1',
    'workspaceId', j.workspace_id,
    'batchId', j.id,
    'idempotencyKey', p_idempotency_key,
    'job', jsonb_build_object(
      'id', j.id, 'status', j.status, 'counts', j.counts,
      'payloadHash', j.reconciliation->>'payloadHash',
      'startedAt', j.started_at, 'finishedAt', j.finished_at),
    'expectedRowCount', jsonb_array_length(p_manifest->'items'),
    'observedRows', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'ordinal', o.ordinal, 'targetTable', o.target_table,
          'targetId', o.target_id, 'sourceKey', o.source_key,
          'found', o.actual_record is not null, 'record', o.actual_record)
        order by o.ordinal)
      from observed o
    ), '[]'::jsonb),
    'mode', 'AUTHENTICATED_READ_ONLY_EVIDENCE',
    'reconciled', false,
    'mutated', false
  )
  from bound_job j;
$function$;

revoke all on function public.read_legacy_import_reconciliation_v1(uuid,uuid,text,jsonb)
  from public, anon;
grant execute on function public.read_legacy_import_reconciliation_v1(uuid,uuid,text,jsonb)
  to authenticated;

comment on function public.read_legacy_import_reconciliation_v1(uuid,uuid,text,jsonb) is
  'Phase 13.4 A2: RLS/owner-scoped one-statement readback bound to Phase 13.3 import_jobs payload hash. NULL means no authorized matching ledger; never attests reconciliation or repairs records.';

commit;
