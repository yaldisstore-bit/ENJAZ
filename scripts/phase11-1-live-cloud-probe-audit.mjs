import fs from 'node:fs';

const sql = fs.readFileSync('database/migrations/phase_11_1_live_authenticated_notification_probe.sql','utf8');
const failures=[];
const check=(name,condition)=>{ if(!condition) failures.push(name); };
const has=needle=>sql.includes(needle);

for (const marker of [
  'begin;',
  'private.enjaz_phase111_probe_assert',
  'private.enjaz_phase111_probe_expect',
  "p_case='stale_source'",
  'ENJAZ_NOTIFICATION_STALE_SOURCE_VERSION',
  "p_case='early_wake'",
  'ENJAZ_NOTIFICATION_NOT_READY_TO_WAKE',
  "p_case='cancelled_final'",
  'ENJAZ_NOTIFICATION_CANCELLED_FINAL',
  "p_case='foreign_mutation'",
  'ENJAZ_NOTIFICATION_WORKSPACE_FORBIDDEN',
  "set local role authenticated",
  "not has_table_privilege('authenticated','public.in_app_notifications','INSERT')",
  "not has_table_privilege('authenticated','public.in_app_notifications','UPDATE')",
  "not has_table_privilege('authenticated','public.in_app_notifications','DELETE')",
  "has_function_privilege('authenticated','public.mutate_in_app_notification_state_v1",
  "not has_function_privilege('authenticated','public.upsert_in_app_notification_v1",
  "'exact source replay did not dedupe'",
  "'canonical source revision projection failed'",
  "'cross-workspace RLS leak'",
  "delete from public.in_app_notifications",
  "'notification residue'",
  'drop function private.enjaz_phase111_probe_expect',
  'drop function private.enjaz_phase111_probe_assert',
  'commit;',
]) check(`probe:${marker}`,has(marker));

check('no_delivery_history_mutation', !has('alter table public.notification_deliveries'));
check('no_followup_shadow_store', !has('create table public.transaction_followups'));
check('probe_uses_unique_source', has("select set_config('p111.source',gen_random_uuid()::text,true)"));
check('probe_uses_real_membership', has('from public.workspace_memberships'));

if(failures.length){
  console.error(`ENJAZ PHASE 11.1 REAL CLOUD PROBE AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('ENJAZ PHASE 11.1 REAL CLOUD PROBE AUDIT PASS — authenticated self-state, authority-only upsert, dedupe/revision, cross-workspace denial and zero-residue cleanup are all represented.');
