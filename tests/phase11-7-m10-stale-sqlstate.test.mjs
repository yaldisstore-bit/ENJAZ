import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const sql=fs.readFileSync(new URL('database/migrations/phase_11_7_m10_stale_conflict_sqlstate_hardening.sql',root),'utf8');

const names=[
  'complete_renewal_occurrence_v1_impl',
  'materialize_renewal_occurrence_v1_impl',
  'mutate_calendar_event_state_v1_impl',
  'mutate_renewal_state_v1_impl',
  'record_calendar_event_attendance_v1_impl',
  'reschedule_calendar_event_v1_impl',
  'set_calendar_event_confirmation_v1_impl',
  'set_calendar_event_staff_v1_impl',
  'update_calendar_event_metadata_v1_impl',
];

test('11.7 hardens exactly the known M10 stale-conflict functions',()=>{
  for(const name of names)assert.match(sql,new RegExp(name));
  assert.equal(names.length,9);
  assert.match(sql,/v_old_compact constant text := 'raise serialization_failure using message=''ENJAZ_SCHEDULING_STALE_VERSION''';/);
  assert.match(sql,/v_old_spaced constant text := 'raise serialization_failure using message = ''ENJAZ_SCHEDULING_STALE_VERSION''';/);
  assert.match(sql,/v_new constant text := 'raise object_not_in_prerequisite_state using message=''ENJAZ_SCHEDULING_STALE_VERSION''';/);
  assert.match(sql,/ENJAZ_117_M10_RETRYABLE_STALE_REMAINS/);
});

test('11.7 migration preserves the business error while removing retryable SQLSTATE from active definitions',()=>{
  assert.match(sql,/replace\(replace\(v_def,v_old_compact,v_new\),v_old_spaced,v_new\)/);
  assert.ok(sql.includes("pg_get_functiondef(p.oid) ~ 'raise[[:space:]]+serialization_failure[[:space:]]+using[[:space:]]+message[[:space:]]*=[[:space:]]*''ENJAZ_SCHEDULING_STALE_VERSION'''"));
  assert.match(sql,/if v_remaining<>0 then/);
});
