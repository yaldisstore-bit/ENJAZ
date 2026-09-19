-- Phase 13.4 A3 SOURCE PROPOSAL ONLY: do not deploy before isolated Real Cloud A2 tests.
-- Single SECURITY INVOKER SQL statement; A2 is called INSIDE the database using
-- the real caller JWT. No caller-provided readback, verdict, repair, or write.
begin;

create or replace function public.compare_legacy_import_reconciliation_v1(
  p_workspace_id uuid, p_batch_id uuid, p_idempotency_key text, p_manifest jsonb
) returns jsonb
language sql stable security invoker set search_path = ''
as $function$
with secure_readback as materialized (
  select public.read_legacy_import_reconciliation_v1(
    p_workspace_id,p_batch_id,p_idempotency_key,p_manifest
  ) as evidence
), guarded as materialized (
  select evidence from secure_readback
  where evidence->>'schema'='enjaz.legacy.reconciliation.readback.v1'
    and evidence->>'workspaceId'=p_workspace_id::text
    and evidence->>'batchId'=p_batch_id::text
    and evidence->>'idempotencyKey'=p_idempotency_key
    and evidence->>'mutated'='false'
    and evidence->>'reconciled'='false'
    and jsonb_typeof(evidence->'observedRows')='array'
    and jsonb_array_length(evidence->'observedRows') =
        (evidence->>'expectedRowCount')::integer
), expected_items as materialized (
  select pos::integer as ordinal, item
  from guarded
  cross join lateral jsonb_array_elements(p_manifest->'items')
    with ordinality as e(item,pos)
), observed_items as materialized (
  select pos::integer as ordinal, observed
  from guarded
  cross join lateral jsonb_array_elements(evidence->'observedRows')
    with ordinality as o(observed,pos)
), expected as (
  select e.ordinal,e.item,o.observed
  from expected_items e
  join observed_items o using (ordinal)
), bindings as (
  select b->>'sourceKey' as source_key,
    jsonb_object_agg(b->>'targetField',b->>'targetTargetId') as expected_ids
  from guarded
  cross join lateral jsonb_array_elements(
    coalesce(p_manifest->'relationshipBindings','[]'::jsonb)
  ) as r(b)
  group by b->>'sourceKey'
), compared as (
  select x.ordinal, x.item->>'targetTable' as target_table,
         x.item->>'targetId' as target_id,
    case when x.observed->>'found' is distinct from 'true'
      or x.observed->'record' is null
      or x.observed->'record'='null'::jsonb
      then jsonb_build_array('MISSING_TARGET')
    else to_jsonb(array_remove(array[
      case when x.observed->>'ordinal' is distinct from x.ordinal::text
        or x.observed->>'targetTable' is distinct from x.item->>'targetTable'
        or x.observed->>'targetId' is distinct from x.item->>'targetId'
        or x.observed->>'sourceKey' is distinct from x.item->>'sourceKey'
        or x.observed#>>'{record,id}' is distinct from x.item->>'targetId'
        or x.observed#>>'{record,workspaceId}' is distinct from p_workspace_id::text
        or x.observed#>>'{record,legacySource}' is distinct from 'phase13.3'
        or x.observed#>>'{record,legacyId}' is distinct from x.item->>'sourceKey'
        then 'IDENTITY_DRIFT' end,
      case when x.observed#>>'{record,status}' is distinct from 'active'
        or x.observed#>>'{record,deletedAt}' is not null
        then 'LIFECYCLE_DRIFT' end,
      case when x.item->>'targetTable'='contacts'
        and x.observed#>'{record,fields}' is distinct from jsonb_build_object(
          'display_name',btrim(x.item#>>'{normalizedFields,display_name}'),
          'contact_type',x.item#>>'{normalizedFields,contact_type}',
          'phone',nullif(x.item#>>'{normalizedFields,phone}',''),
          'email',nullif(x.item#>>'{normalizedFields,email}',''),
          'notes',nullif(x.item#>>'{normalizedFields,notes}',''))
        then 'FIELD_DRIFT'
      when x.item->>'targetTable'='companies'
        and (x.observed#>'{record,fields}') - 'capitalDecimal'
            is distinct from jsonb_build_object(
          'legal_name',btrim(x.item#>>'{normalizedFields,legal_name}'),
          'display_name',nullif(x.item#>>'{normalizedFields,display_name}',''),
          'address',nullif(x.item#>>'{normalizedFields,address}',''),
          'activities',nullif(x.item#>>'{normalizedFields,activities}',''),
          'registration_number',nullif(x.item#>>'{normalizedFields,registration_number}',''),
          'legal_status',nullif(x.item#>>'{normalizedFields,legal_status}',''))
        then 'FIELD_DRIFT'
      when x.item->>'targetTable'='transactions'
        and (x.observed#>'{record,fields}') - 'current_fee_decimal'
            is distinct from jsonb_build_object(
          'type',btrim(x.item#>>'{normalizedFields,type}'),
          'department',nullif(x.item#>>'{normalizedFields,department}',''))
        then 'FIELD_DRIFT' end,
      case when x.item->>'targetTable'='companies'
        and (x.observed#>>'{record,fields,capitalDecimal}')::numeric
            is distinct from (x.item#>>'{normalizedFields,capital}')::numeric
        then 'MONEY_DRIFT'
      when x.item->>'targetTable'='transactions'
        and (x.observed#>>'{record,fields,current_fee_decimal}')::numeric
            is distinct from (x.item#>>'{normalizedFields,current_fee}')::numeric
        then 'MONEY_DRIFT' end,
      case when x.item->>'targetTable'='contacts'
        and x.observed#>'{record,relationshipIds}' is distinct from '{}'::jsonb
        then 'RELATIONSHIP_DRIFT'
      when x.item->>'targetTable'='companies'
        and x.observed#>'{record,relationshipIds}' is distinct from jsonb_build_object(
          'primary_contact_id', b.expected_ids->>'primary_contact_id')
        then 'RELATIONSHIP_DRIFT'
      when x.item->>'targetTable'='transactions'
        and x.observed#>'{record,relationshipIds}' is distinct from jsonb_build_object(
          'company_id',b.expected_ids->>'company_id',
          'primary_contact_id',b.expected_ids->>'primary_contact_id')
        then 'RELATIONSHIP_DRIFT' end
    ]::text[],null::text))
    end as difference_codes
  from expected x
  left join bindings b on b.source_key=x.item->>'sourceKey'
), report as (
  select count(*)::integer as total,
    count(*) filter (where difference_codes='[]'::jsonb)::integer as matched,
    jsonb_agg(jsonb_build_object(
      'ordinal',ordinal,'targetTable',target_table,'targetId',target_id,
      'differenceCodes',difference_codes
    ) order by ordinal) as rows
  from compared
)
select jsonb_build_object(
  'schema','enjaz.legacy.reconciliation.comparison.v1',
  'workspaceId',p_workspace_id,
  'batchId',p_batch_id,
  'mode','TRUSTED_DATABASE_SNAPSHOT_COMPARISON',
  'rowCount',r.total,'matchedCount',r.matched,
  'mismatchCount',r.total-r.matched,
  'allMatchedAtSnapshot',r.total>0 and r.total=r.matched,
  'rows',r.rows,
  'reconciled',false,
  'closureAuthorized',false,
  'mutated',false
)
from report r cross join guarded g
where r.total=(g.evidence->>'expectedRowCount')::integer;
$function$;

revoke all on function public.compare_legacy_import_reconciliation_v1(uuid,uuid,text,jsonb)
  from public,anon;
grant execute on function public.compare_legacy_import_reconciliation_v1(uuid,uuid,text,jsonb)
  to authenticated;
comment on function public.compare_legacy_import_reconciliation_v1(uuid,uuid,text,jsonb) is
  'A3 SOURCE ONLY: owner/RLS-bound A2 evidence and original hash-bound manifest compared inside one read-only statement; snapshot equality never authorizes closure or repair.';
commit;
