import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const edge=fs.readFileSync('supabase/functions/enjaz-copilot-agent/index.ts','utf8');

function violations(source=edge){
  const out=[];const req=(ok,name)=>{if(!ok)out.push(name)};
  req(source.includes("userClient.rpc('global_search_v1'"),'user-scoped-authoritative-read');
  req(source.includes("userClient.from('transaction_followups')"),'user-scoped-followup-read');
  req(source.includes("userClient.from('transactions')"),'user-scoped-transaction-read');
  req(source.includes("userClient.rpc('get_scheduling_deadline_snapshot_v1'"),'user-scoped-scheduling-read');
  req(source.includes("admin.rpc('copilot_begin_request_v7'"),'service-trace-boundary-v7');
  req(source.includes("admin.rpc('copilot_register_followup_snooze_proposal_v1'"),'snooze-proposal-evidence');
  req(source.includes("admin.rpc('copilot_register_followup_create_proposal_v1'"),'create-proposal-evidence');
  req(source.includes("admin.rpc('copilot_register_schedule_reminder_proposal_v1'"),'reminder-proposal-evidence');
  req(source.includes("admin.rpc('copilot_register_document_request_proposal_v1'"),'document-request-proposal-evidence');
  req(source.includes("userClient.rpc('copilot_execute_followup_snooze_v1'"),'authenticated-snooze-execution');
  req(source.includes("userClient.rpc('copilot_execute_followup_create_v1'"),'authenticated-create-execution');
  req(source.includes("userClient.rpc('copilot_execute_schedule_reminder_v1'"),'authenticated-reminder-execution');
  req(source.includes("userClient.rpc('get_client_portal_admin_authority_v1'"),'user-scoped-portal-admin-read');
  req(source.includes("userClient.rpc('copilot_execute_document_request_v1'"),'authenticated-document-request-execution');
  req(!/admin\.from\(/.test(source),'no-service-business-table-read');
  req(!/admin\.rpc\(['"](?:copilot_execute_(?:followup_(?:snooze|create)|schedule_reminder|document_request)_v1|post_payment|reverse_payment|mutate_transaction|create_|update_|delete_|archive_|send_|schedule_)/.test(source),'no-service-business-mutation-rpc');
  req(!/userClient\.rpc\(['"](?!global_search_v1|get_scheduling_deadline_snapshot_v1|get_client_portal_admin_authority_v1|copilot_execute_followup_snooze_v1|copilot_execute_followup_create_v1|copilot_execute_schedule_reminder_v1|copilot_execute_document_request_v1)[^'"]*(?:post_payment|reverse_payment|mutate_transaction|create_|update_|delete_|archive_|send_|schedule_)/.test(source),'only-four-allowlisted-user-mutation-rpcs');
  req(!/['"]execute['"]/.test(source),'no-generic-execute-operation');
  req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/.test(source),'no-provider-path');
  return out;
}
test('12.3 A3-D Edge has exactly four action-specific mutation paths',()=>assert.deepEqual(violations(),[]));
test('destruction: service business read detected',()=>assert.ok(violations(edge+"\nadmin.from('transactions').select('*');").includes('no-service-business-table-read')));
test('destruction: service create execution detected',()=>assert.ok(violations(edge+"\nadmin.rpc('copilot_execute_followup_create_v1',{});").includes('no-service-business-mutation-rpc')));
test('destruction: fifth user mutation RPC detected',()=>assert.ok(violations(edge+"\nuserClient.rpc('post_payment_v1',{});").includes('only-four-allowlisted-user-mutation-rpcs')));


test('12.3 A3-B validation errors remain first-class 400 codes',()=>{
  for(const marker of ["'TRANSACTION_ID_INVALID'","'ACTION_TITLE_INVALID'","'ACTION_DUE_AT_INVALID'"]){
    const count=edge.split(marker).length-1;
    assert.ok(count>=2,`${marker} must exist in validation and known-error sets`);
  }
});


test('12.3 A3-C Edge hard-locks self recipient and reminder mode',()=>{
  assert.match(edge,/recipientScope:'self'/);
  assert.match(edge,/actionKind:'reminder\.schedule'/);
  assert.doesNotMatch(edge,/p_recipient_user_id:/);
  assert.doesNotMatch(edge,/p_mode:/);
});


test('12.3 A3-C prepare fails closed for terminal or non-upcoming scheduling sources',()=>{
  for(const marker of [
    "sourceState==='completed_on_time'||sourceState==='completed_late'",
    "ENJAZ_SCHEDULING_ATTENTION_SOURCE_TERMINAL",
    "sourceState!=='upcoming'&&sourceState!=='due_today'",
    "ACTION_SCHEDULED_FOR_INVALID",
  ]) assert.ok(edge.includes(marker),marker);
});


test('12.3 A3-D Edge hard-locks document request creation semantics',()=>{
  for(const marker of [
    "actionKind:'document.request'","requestType:'document'",
    "userClient.rpc('get_client_portal_admin_authority_v1'",
    "userClient.rpc('copilot_execute_document_request_v1'",
    "admin.rpc('copilot_register_document_request_proposal_v1'",
  ]) assert.ok(edge.includes(marker),marker);
  assert.doesNotMatch(edge,/p_request_type:/);
  assert.doesNotMatch(edge,/p_resource_share_id:/);
  assert.doesNotMatch(edge,/p_expected_version:/);
});
