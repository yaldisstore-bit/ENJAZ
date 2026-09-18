import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('database/migrations/phase_13_3_ordered_import_execution.sql','utf8');
const has=(m)=>assert.ok(sql.includes(m),m);
const no=(re,label)=>assert.equal(re.test(sql),false,label);

test('A3 DB source uses existing import_jobs ledger and creates no table',()=>{
  has('public.import_jobs');no(/create\s+table/i,'no new table');
  has("'contract','phase13.3'");has("'idempotencyKey',p_idempotency_key");has("'payloadHash',v_payload_hash");
});
test('A3 DB source is owner-authenticated and does not expose service role',()=>{
  has("v_actor uuid:=(select auth.uid())");has('private.is_workspace_owner(p_workspace_id)');
  has('ENJAZ_LEGACY_IMPORT_AUTH_REQUIRED');has('ENJAZ_LEGACY_IMPORT_WORKSPACE_FORBIDDEN');no(/service_role/i,'no service role');
});
test('A3 DB source binds manifest to workspace batch idempotency and exact schema',()=>{
  has("p_manifest->>'workspaceId'<>p_workspace_id::text");has("p_manifest->>'batchId'<>p_batch_id::text");
  has("p_manifest->>'idempotencyKey'<>p_idempotency_key");has("'enjaz.legacy.ordered-import.execution-manifest.v1'");
  has('ENJAZ_LEGACY_IMPORT_MANIFEST_FIELD_FORBIDDEN');
});
test('A3 DB source rejects client permission/write preclaims',()=>{
  for(const marker of ["workspacePermissionVerified'<>'false'","idempotencyEnforcementPerformed'<>'false'","foreignKeyAssignmentPerformed'<>'false'","persistencePerformed'<>'false'","importExecutionAllowed'<>'false'","targetMutationPerformed'<>'false'"])has(marker);
});
test('A3 DB source rejects duplicate IDs existing targets and relation drift',()=>{
  has('ENJAZ_LEGACY_IMPORT_SOURCE_KEY_DUPLICATE');has('ENJAZ_LEGACY_IMPORT_TARGET_ID_DUPLICATE');has('ENJAZ_LEGACY_IMPORT_TARGET_ALREADY_EXISTS');
  has('ENJAZ_LEGACY_IMPORT_SOURCE_ALREADY_IMPORTED');
  has('ENJAZ_LEGACY_IMPORT_RELATION_ENDPOINT_INVALID');has('ENJAZ_LEGACY_IMPORT_RELATION_AUTHORITY_INVALID');has('ENJAZ_LEGACY_IMPORT_TRANSACTION_COMPANY_REQUIRED');
});
test('A3 DB source uses transaction-scoped advisory idempotency with changed-payload conflict',()=>{
  has('pg_advisory_xact_lock');has("extensions.digest(convert_to(p_manifest::text,'UTF8'),'sha256')");
  has('ENJAZ_LEGACY_IMPORT_IDEMPOTENCY_CONFLICT');has("'wasDuplicate',true");no(/on\s+conflict/i,'no upsert');
});
test('A3 DB source imports only contacts then companies then transactions',()=>{
  const c=sql.indexOf("where value->>'targetTable'='contacts' order by value->>'sourceKey'");
  const co=sql.indexOf("where value->>'targetTable'='companies' order by value->>'sourceKey'");
  const t=sql.indexOf("where value->>'targetTable'='transactions' order by value->>'sourceKey'");
  assert.ok(c>=0&&co>c&&t>co);has("legacy_source");has("'phase13.3'");
});
test('A3 DB source assigns only certified relationships after dependencies exist',()=>{
  has("targetField'='primary_contact_id'");has("targetField'='company_id'");
  has("insert into public.companies");has("insert into public.transactions");
});
test('A3 DB source is atomic by one RPC and never updates existing target rows',()=>{
  has('private.execute_legacy_ordered_import_v1_impl');has('public.execute_legacy_ordered_import_v1');
  no(/update\s+public\.(contacts|companies|transactions)/i,'no target update');no(/delete\s+from\s+public\.(contacts|companies|transactions)/i,'no target delete');
});
test('A3 DB source grants only authenticated execution and keeps public/anon revoked',()=>{
  has('revoke all on function public.execute_legacy_ordered_import_v1(uuid,uuid,text,jsonb) from public,anon');
  has('grant execute on function public.execute_legacy_ordered_import_v1(uuid,uuid,text,jsonb) to authenticated');
});

test('A3 DB source enforces JSON field types instead of implicit scalar-to-text coercion',()=>{
  has("jsonb_typeof(v_fields->'display_name')<>'string'");
  has("jsonb_typeof(v_fields->'legal_name')<>'string'");
  has("jsonb_typeof(v_fields->'type')<>'string'");
  has("jsonb_typeof(v_fields->'current_fee')<>'number'");
});

test('A3 replay hardening resolves idempotency before target/source collision checks',()=>{
  const hash=sql.indexOf("v_payload_hash:=encode");
  const existing=sql.indexOf("select j.* into v_existing");
  const duplicateReturn=sql.indexOf("'wasDuplicate',true");
  const targetCollision=sql.indexOf("ENJAZ_LEGACY_IMPORT_TARGET_ALREADY_EXISTS");
  const sourceCollision=sql.indexOf("ENJAZ_LEGACY_IMPORT_SOURCE_ALREADY_IMPORTED");
  assert.ok(hash>=0&&existing>hash&&duplicateReturn>existing);
  assert.ok(targetCollision>duplicateReturn,'target collision must run only after exact replay lookup');
  assert.ok(sourceCollision>duplicateReturn,'source collision must run only after exact replay lookup');
});
