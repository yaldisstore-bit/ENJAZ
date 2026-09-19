-- Supabase migration version: 20260919000205
-- Phase 13.3 A3: PostgREST-safe intentional conflict SQLSTATE hardening.
-- SQLSTATE 40001 is forbidden for application-level idempotency conflicts because PostgREST may retry it.
-- Phase 13.3 A3 idempotency fast-path hardening.
-- Existing exact/changed replays are resolved before the first-execution advisory lock.
-- New identities still acquire the transaction lock and then re-check the durable ledger.
-- Phase 13.3 A3 replay hardening.
-- Recreates the ordered-import execution boundary so exact idempotent replay is resolved
-- before target/source collision checks. Changed-payload replay remains fail-closed.
begin;

create or replace function private.execute_legacy_ordered_import_v1_impl(
  p_workspace_id uuid,
  p_batch_id uuid,
  p_idempotency_key text,
  p_manifest jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid:=(select auth.uid());
  v_payload_hash text;
  v_existing public.import_jobs%rowtype;
  v_item jsonb;
  v_rel jsonb;
  v_fields jsonb;
  v_source_key text;
  v_target_id uuid;
  v_target_table text;
  v_contact_id uuid;
  v_company_id uuid;
  v_contacts integer:=0;
  v_companies integer:=0;
  v_transactions integer:=0;
  v_total integer:=0;
  v_result jsonb;
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_LEGACY_IMPORT_AUTH_REQUIRED'; end if;
  if not private.is_workspace_owner(p_workspace_id) then raise insufficient_privilege using message='ENJAZ_LEGACY_IMPORT_WORKSPACE_FORBIDDEN'; end if;
  if p_batch_id is null then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_BATCH_ID_REQUIRED'; end if;
  if p_idempotency_key is null or p_idempotency_key!~'^[A-Za-z0-9:_-]{8,128}$' then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_IDEMPOTENCY_KEY_INVALID'; end if;
  if jsonb_typeof(p_manifest)<>'object' then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_MANIFEST_INVALID'; end if;

  if exists(
    select 1 from jsonb_object_keys(p_manifest) k
    where k not in (
      'schema','snapshotId','mappingPlanId','workspaceId','batchId','idempotencyKey','stageOrder','items','relationshipBindings',
      'deterministic','workspacePermissionVerified','idempotencyBound','idempotencyEnforcementPerformed','targetIdsGenerated',
      'foreignKeyBindingPerformed','foreignKeyAssignmentPerformed','persistencePerformed','importExecutionAllowed',
      'targetMutationPerformed','readyForA3ExecutionBoundary'
    )
  ) then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_MANIFEST_FIELD_FORBIDDEN'; end if;

  if p_manifest->>'schema'<>'enjaz.legacy.ordered-import.execution-manifest.v1'
     or p_manifest->>'workspaceId'<>p_workspace_id::text
     or p_manifest->>'batchId'<>p_batch_id::text
     or p_manifest->>'idempotencyKey'<>p_idempotency_key
     or p_manifest->'stageOrder'<>jsonb_build_array('contacts','companies','transactions')
  then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_MANIFEST_BINDING_INVALID'; end if;

  if p_manifest->'deterministic'<>'true'::jsonb
     or p_manifest->'workspacePermissionVerified'<>'false'::jsonb
     or p_manifest->'idempotencyBound'<>'true'::jsonb
     or p_manifest->'idempotencyEnforcementPerformed'<>'false'::jsonb
     or p_manifest->'targetIdsGenerated'<>'false'::jsonb
     or p_manifest->'foreignKeyBindingPerformed'<>'true'::jsonb
     or p_manifest->'foreignKeyAssignmentPerformed'<>'false'::jsonb
     or p_manifest->'persistencePerformed'<>'false'::jsonb
     or p_manifest->'importExecutionAllowed'<>'false'::jsonb
     or p_manifest->'targetMutationPerformed'<>'false'::jsonb
     or p_manifest->'readyForA3ExecutionBoundary'<>'true'::jsonb
  then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_MANIFEST_AUTHORITY_INVALID'; end if;

  if jsonb_typeof(p_manifest->'items')<>'array'
     or jsonb_array_length(p_manifest->'items') not between 1 and 5000
     or jsonb_typeof(p_manifest->'relationshipBindings')<>'array'
     or jsonb_array_length(p_manifest->'relationshipBindings')>10000
  then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_MANIFEST_COLLECTION_INVALID'; end if;

  if exists(
    select 1 from jsonb_array_elements(p_manifest->'items') x
    group by x->>'sourceKey' having count(*)>1
  ) then raise unique_violation using message='ENJAZ_LEGACY_IMPORT_SOURCE_KEY_DUPLICATE'; end if;
  if exists(
    select 1 from jsonb_array_elements(p_manifest->'items') x
    group by x->>'targetId' having count(*)>1
  ) then raise unique_violation using message='ENJAZ_LEGACY_IMPORT_TARGET_ID_DUPLICATE'; end if;

  for v_item in select value from jsonb_array_elements(p_manifest->'items') loop
    if jsonb_typeof(v_item)<>'object' or exists(
      select 1 from jsonb_object_keys(v_item) k
      where k not in ('ordinal','stage','sourceKey','targetTable','targetId','normalizedFields','writeAllowed')
    ) then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_ITEM_FIELD_FORBIDDEN'; end if;

    v_source_key:=v_item->>'sourceKey';
    v_target_table:=v_item->>'targetTable';
    if v_source_key is null or char_length(v_source_key) not between 1 and 512
       or v_target_table not in ('contacts','companies','transactions')
       or coalesce(v_item->'writeAllowed','true'::jsonb)<>'false'::jsonb
       or jsonb_typeof(v_item->'normalizedFields')<>'object'
       or coalesce(v_item->>'targetId','')!~'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_ITEM_INVALID'; end if;
    v_target_id:=(v_item->>'targetId')::uuid;
    v_fields:=v_item->'normalizedFields';

    if v_target_table='contacts' then
      if (v_item->>'stage')::integer<>1 or exists(select 1 from jsonb_object_keys(v_fields) k where k not in ('display_name','contact_type','phone','email','notes'))
         or jsonb_typeof(v_fields->'display_name')<>'string' or jsonb_typeof(v_fields->'contact_type')<>'string'
         or (v_fields?'phone' and jsonb_typeof(v_fields->'phone') not in ('string','null'))
         or (v_fields?'email' and jsonb_typeof(v_fields->'email') not in ('string','null'))
         or (v_fields?'notes' and jsonb_typeof(v_fields->'notes') not in ('string','null'))
         or char_length(btrim(coalesce(v_fields->>'display_name',''))) not between 1 and 240
         or coalesce(v_fields->>'contact_type','') not in ('lawyer','client','representative','other')
      then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_CONTACT_INVALID'; end if;
    elsif v_target_table='companies' then
      if (v_item->>'stage')::integer<>2 or exists(select 1 from jsonb_object_keys(v_fields) k where k not in ('legal_name','display_name','capital','address','activities','registration_number','legal_status'))
         or jsonb_typeof(v_fields->'legal_name')<>'string'
         or (v_fields?'display_name' and jsonb_typeof(v_fields->'display_name') not in ('string','null'))
         or (v_fields?'address' and jsonb_typeof(v_fields->'address') not in ('string','null'))
         or (v_fields?'activities' and jsonb_typeof(v_fields->'activities') not in ('string','null'))
         or (v_fields?'registration_number' and jsonb_typeof(v_fields->'registration_number') not in ('string','null'))
         or (v_fields?'legal_status' and jsonb_typeof(v_fields->'legal_status') not in ('string','null'))
         or char_length(btrim(coalesce(v_fields->>'legal_name',''))) not between 1 and 400
      then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_COMPANY_INVALID'; end if;
      if v_fields?'capital' and (jsonb_typeof(v_fields->'capital')<>'number' or (v_fields->>'capital')::numeric<0 or v_fields->>'capital'!~'^\d+(?:\.\d{1,2})?$')
      then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_COMPANY_CAPITAL_INVALID'; end if;
    else
      if (v_item->>'stage')::integer<>3 or exists(select 1 from jsonb_object_keys(v_fields) k where k not in ('type','department','current_fee'))
         or jsonb_typeof(v_fields->'type')<>'string'
         or (v_fields?'department' and jsonb_typeof(v_fields->'department') not in ('string','null'))
         or char_length(btrim(coalesce(v_fields->>'type',''))) not between 1 and 180
         or not (v_fields?'current_fee') or jsonb_typeof(v_fields->'current_fee')<>'number'
         or (v_fields->>'current_fee')::numeric<=0 or v_fields->>'current_fee'!~'^\d+(?:\.\d{1,2})?$'
      then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_TRANSACTION_INVALID'; end if;
    end if;
  end loop;

  if exists(
    select 1
    from jsonb_array_elements(p_manifest->'items') with ordinality q(x,n)
    where (x->>'ordinal')::bigint<>n
       or (x->>'stage')::integer<>case x->>'targetTable' when 'contacts' then 1 when 'companies' then 2 when 'transactions' then 3 else 0 end
  ) then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_ITEM_ORDER_INVALID'; end if;

  if exists(
    select 1
    from jsonb_array_elements(p_manifest->'items') with ordinality a(x,n)
    join jsonb_array_elements(p_manifest->'items') with ordinality b(y,m) on m=n+1
    where (a.x->>'stage')::integer>(b.y->>'stage')::integer
       or ((a.x->>'stage')::integer=(b.y->>'stage')::integer and (a.x->>'sourceKey')>(b.y->>'sourceKey'))
  ) then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_ITEM_SORT_INVALID'; end if;

  if exists(
    select 1 from jsonb_array_elements(p_manifest->'relationshipBindings') r
    group by r->>'sourceKey',r->>'targetField' having count(*)>1
  ) then raise unique_violation using message='ENJAZ_LEGACY_IMPORT_RELATION_DUPLICATE'; end if;

  for v_rel in select value from jsonb_array_elements(p_manifest->'relationshipBindings') loop
    if jsonb_typeof(v_rel)<>'object' or exists(
      select 1 from jsonb_object_keys(v_rel) k
      where k not in ('sourceKey','targetKey','targetField','sourceTargetId','targetTargetId','sourceTargetTable','targetTargetTable','assignmentPerformed','writeAllowed')
    ) or coalesce(v_rel->'assignmentPerformed','true'::jsonb)<>'false'::jsonb
       or coalesce(v_rel->'writeAllowed','true'::jsonb)<>'false'::jsonb
    then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_RELATION_INVALID'; end if;

    if not exists(
      select 1 from jsonb_array_elements(p_manifest->'items') s
      where s->>'sourceKey'=v_rel->>'sourceKey' and s->>'targetId'=v_rel->>'sourceTargetId' and s->>'targetTable'=v_rel->>'sourceTargetTable'
    ) or not exists(
      select 1 from jsonb_array_elements(p_manifest->'items') t
      where t->>'sourceKey'=v_rel->>'targetKey' and t->>'targetId'=v_rel->>'targetTargetId' and t->>'targetTable'=v_rel->>'targetTargetTable'
    ) then raise foreign_key_violation using message='ENJAZ_LEGACY_IMPORT_RELATION_ENDPOINT_INVALID'; end if;

    if not (
      (v_rel->>'sourceTargetTable'='companies' and v_rel->>'targetTargetTable'='contacts' and v_rel->>'targetField'='primary_contact_id')
      or (v_rel->>'sourceTargetTable'='transactions' and v_rel->>'targetTargetTable'='companies' and v_rel->>'targetField'='company_id')
      or (v_rel->>'sourceTargetTable'='transactions' and v_rel->>'targetTargetTable'='contacts' and v_rel->>'targetField'='primary_contact_id')
    ) then raise invalid_parameter_value using message='ENJAZ_LEGACY_IMPORT_RELATION_AUTHORITY_INVALID'; end if;
  end loop;

  if exists(
    select 1 from jsonb_array_elements(p_manifest->'items') i
    where i->>'targetTable'='transactions'
      and not exists(
        select 1 from jsonb_array_elements(p_manifest->'relationshipBindings') r
        where r->>'sourceKey'=i->>'sourceKey' and r->>'targetField'='company_id'
      )
  ) then raise foreign_key_violation using message='ENJAZ_LEGACY_IMPORT_TRANSACTION_COMPANY_REQUIRED'; end if;

  v_payload_hash:=encode(extensions.digest(convert_to(p_manifest::text,'UTF8'),'sha256'),'hex');

  -- Fast-path existing replays without taking the first-execution serialization lock.
  select j.* into v_existing
  from public.import_jobs j
  where j.workspace_id=p_workspace_id
    and j.counts->>'contract'='phase13.3'
    and j.reconciliation->>'idempotencyKey'=p_idempotency_key
  order by j.started_at desc limit 1;

  if found then
    if v_existing.id<>p_batch_id or v_existing.reconciliation->>'payloadHash'<>v_payload_hash then
      raise unique_violation using message='ENJAZ_LEGACY_IMPORT_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.status<>'succeeded' then raise object_not_in_prerequisite_state using message='ENJAZ_LEGACY_IMPORT_EXISTING_NOT_FINAL'; end if;
    return coalesce(v_existing.reconciliation->'result','{}'::jsonb)||jsonb_build_object('wasDuplicate',true);
  end if;


  -- Serialize only a potentially new idempotency identity, then re-check after the lock
  -- so concurrent first executions collapse into the same durable result.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(p_workspace_id::text)||chr(31)||p_idempotency_key,0));

  select j.* into v_existing
  from public.import_jobs j
  where j.workspace_id=p_workspace_id
    and j.counts->>'contract'='phase13.3'
    and j.reconciliation->>'idempotencyKey'=p_idempotency_key
  order by j.started_at desc limit 1;

  if found then
    if v_existing.id<>p_batch_id or v_existing.reconciliation->>'payloadHash'<>v_payload_hash then
      raise unique_violation using message='ENJAZ_LEGACY_IMPORT_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.status<>'succeeded' then raise object_not_in_prerequisite_state using message='ENJAZ_LEGACY_IMPORT_EXISTING_NOT_FINAL'; end if;
    return coalesce(v_existing.reconciliation->'result','{}'::jsonb)||jsonb_build_object('wasDuplicate',true);
  end if;

  if exists(select 1 from public.import_jobs j where j.id=p_batch_id) then
    raise unique_violation using message='ENJAZ_LEGACY_IMPORT_BATCH_ID_CONFLICT';
  end if;

  if exists(
    select 1 from jsonb_array_elements(p_manifest->'items') x
    where exists(select 1 from public.contacts c where c.id=(x->>'targetId')::uuid)
       or exists(select 1 from public.companies c where c.id=(x->>'targetId')::uuid)
       or exists(select 1 from public.transactions t where t.id=(x->>'targetId')::uuid)
  ) then raise unique_violation using message='ENJAZ_LEGACY_IMPORT_TARGET_ALREADY_EXISTS'; end if;

  if exists(
    select 1 from jsonb_array_elements(p_manifest->'items') x
    where exists(select 1 from public.contacts c where c.workspace_id=p_workspace_id and c.legacy_source='phase13.3' and c.legacy_id=x->>'sourceKey')
       or exists(select 1 from public.companies c where c.workspace_id=p_workspace_id and c.legacy_source='phase13.3' and c.legacy_id=x->>'sourceKey')
       or exists(select 1 from public.transactions t where t.workspace_id=p_workspace_id and t.legacy_source='phase13.3' and t.legacy_id=x->>'sourceKey')
  ) then raise unique_violation using message='ENJAZ_LEGACY_IMPORT_SOURCE_ALREADY_IMPORTED'; end if;

  v_total:=jsonb_array_length(p_manifest->'items');
  insert into public.import_jobs(id,workspace_id,source,status,counts,reconciliation)
  values(
    p_batch_id,p_workspace_id,'other','importing',
    jsonb_build_object('contract','phase13.3','total',v_total,'contacts',0,'companies',0,'transactions',0),
    jsonb_build_object('schema','enjaz.legacy.ordered-import.execution-result.v1','idempotencyKey',p_idempotency_key,'payloadHash',v_payload_hash,'actorUserId',v_actor,'snapshotId',p_manifest->>'snapshotId','mappingPlanId',p_manifest->>'mappingPlanId')
  );

  for v_item in select value from jsonb_array_elements(p_manifest->'items') where value->>'targetTable'='contacts' order by value->>'sourceKey' loop
    v_fields:=v_item->'normalizedFields';v_source_key:=v_item->>'sourceKey';v_target_id:=(v_item->>'targetId')::uuid;
    insert into public.contacts(id,workspace_id,display_name,contact_type,phone,email,notes,status,legacy_id,legacy_source)
    values(v_target_id,p_workspace_id,btrim(v_fields->>'display_name'),v_fields->>'contact_type',nullif(v_fields->>'phone',''),nullif(v_fields->>'email',''),nullif(v_fields->>'notes',''),'active',v_source_key,'phase13.3');
    v_contacts:=v_contacts+1;
  end loop;

  for v_item in select value from jsonb_array_elements(p_manifest->'items') where value->>'targetTable'='companies' order by value->>'sourceKey' loop
    v_fields:=v_item->'normalizedFields';v_source_key:=v_item->>'sourceKey';v_target_id:=(v_item->>'targetId')::uuid;v_contact_id:=null;
    select (r->>'targetTargetId')::uuid into v_contact_id
    from jsonb_array_elements(p_manifest->'relationshipBindings') r
    where r->>'sourceKey'=v_source_key and r->>'targetField'='primary_contact_id' limit 1;
    insert into public.companies(id,workspace_id,legal_name,display_name,capital,address,activities,registration_number,legal_status,primary_contact_id,status,legacy_id,legacy_source)
    values(v_target_id,p_workspace_id,btrim(v_fields->>'legal_name'),nullif(v_fields->>'display_name',''),case when v_fields?'capital' then (v_fields->>'capital')::numeric else null end,nullif(v_fields->>'address',''),nullif(v_fields->>'activities',''),nullif(v_fields->>'registration_number',''),nullif(v_fields->>'legal_status',''),v_contact_id,'active',v_source_key,'phase13.3');
    v_companies:=v_companies+1;
  end loop;

  for v_item in select value from jsonb_array_elements(p_manifest->'items') where value->>'targetTable'='transactions' order by value->>'sourceKey' loop
    v_fields:=v_item->'normalizedFields';v_source_key:=v_item->>'sourceKey';v_target_id:=(v_item->>'targetId')::uuid;v_company_id:=null;v_contact_id:=null;
    select (r->>'targetTargetId')::uuid into v_company_id
    from jsonb_array_elements(p_manifest->'relationshipBindings') r
    where r->>'sourceKey'=v_source_key and r->>'targetField'='company_id' limit 1;
    select (r->>'targetTargetId')::uuid into v_contact_id
    from jsonb_array_elements(p_manifest->'relationshipBindings') r
    where r->>'sourceKey'=v_source_key and r->>'targetField'='primary_contact_id' limit 1;
    insert into public.transactions(id,workspace_id,company_id,primary_contact_id,type,department,status,priority,current_fee,legacy_id,legacy_source)
    values(v_target_id,p_workspace_id,v_company_id,v_contact_id,btrim(v_fields->>'type'),nullif(v_fields->>'department',''),'active','normal',(v_fields->>'current_fee')::numeric,v_source_key,'phase13.3');
    v_transactions:=v_transactions+1;
  end loop;

  v_result:=jsonb_build_object(
    'schema','enjaz.legacy.ordered-import.execution-result.v1',
    'workspaceId',p_workspace_id,'batchId',p_batch_id,'idempotencyKey',p_idempotency_key,'payloadHash',v_payload_hash,
    'counts',jsonb_build_object('total',v_total,'contacts',v_contacts,'companies',v_companies,'transactions',v_transactions),
    'workspacePermissionVerified',true,'serverIdempotencyEnforced',true,'targetIdsGenerated',false,'foreignKeyAssignmentPerformed',true,
    'persistencePerformed',true,'importExecutionAllowed',true,'targetMutationPerformed',true,'atomic',true,'wasDuplicate',false
  );

  update public.import_jobs
  set status='succeeded',finished_at=now(),
      counts=jsonb_build_object('contract','phase13.3','total',v_total,'contacts',v_contacts,'companies',v_companies,'transactions',v_transactions),
      reconciliation=reconciliation||jsonb_build_object('result',v_result)
  where id=p_batch_id and workspace_id=p_workspace_id;

  return v_result;
end;
$$;

create or replace function public.execute_legacy_ordered_import_v1(
  p_workspace_id uuid,
  p_batch_id uuid,
  p_idempotency_key text,
  p_manifest jsonb
)
returns jsonb
language sql
volatile
security invoker
set search_path=''
as $$
  select private.execute_legacy_ordered_import_v1_impl(p_workspace_id,p_batch_id,p_idempotency_key,p_manifest);
$$;

revoke all on function private.execute_legacy_ordered_import_v1_impl(uuid,uuid,text,jsonb) from public,anon;
revoke all on function public.execute_legacy_ordered_import_v1(uuid,uuid,text,jsonb) from public,anon;
grant execute on function private.execute_legacy_ordered_import_v1_impl(uuid,uuid,text,jsonb) to authenticated;
grant execute on function public.execute_legacy_ordered_import_v1(uuid,uuid,text,jsonb) to authenticated;

comment on function public.execute_legacy_ordered_import_v1(uuid,uuid,text,jsonb) is
  'Phase 13.3 A3: owner-authenticated atomic legacy import. Caller-supplied IDs only; import_jobs ledger enforces exact replay/conflict; no upsert/overwrite.';

commit;
