import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('database/migrations/phase_12_3_agentic_action_document_draft.sql','utf8');

test('12.3 A3-E stores exact draft semantics and recomputes digest',()=>{
  for(const marker of ['action_template_version_id uuid null','action_company_id uuid null',"action_kind='document.draft'",'private.copilot_document_draft_hash_v1','extensions.digest(','|prepare_document_draft','ENJAZ_COPILOT_ACTION_HASH_CONFLICT'])assert.ok(sql.includes(marker),marker);
});

test('12.3 A3-E execution stops at review_required through M7 generation authority',()=>{
  for(const marker of ['private.copilot_execute_document_draft_v1_impl','public.generate_document_draft_v1(','v_row.action_company_id,v_row.action_transaction_id,null,null',"'draftStatus','review_required'","set status='consumed'","'consumed',p_execution_key"])assert.ok(sql.includes(marker),marker);
  assert.doesNotMatch(sql,/\b(review_document_draft_v1|request_document_render_v1|finalize_document_draft_v1|submit_document_draft_for_review_v1|update_document_draft_content_v1)\b/);
});

test('12.3 A3-E execution is authenticated-only and registration is service-only',()=>{
  assert.match(sql,/revoke all on function public\.copilot_execute_document_draft_v1\(uuid,uuid,text,uuid\) from public,anon,service_role/);
  assert.match(sql,/grant execute on function public\.copilot_execute_document_draft_v1\(uuid,uuid,text,uuid\) to authenticated/);
  assert.match(sql,/revoke all on function public\.copilot_register_document_draft_proposal_v1[\s\S]*from public,anon,authenticated/);
});

test('12.3 A3-E cannot expose contact OCR or unrelated mutation authorities',()=>{
  const domain=sql.match(/v_domain:=public\.generate_document_draft_v1\([\s\S]*?\);/)?.[0]??'';
  assert.match(domain,/v_row\.action_company_id,v_row\.action_transaction_id,null,null/);
  assert.doesNotMatch(sql,/\b(post_payment_v1|reverse_payment_v1|send_client_portal_message_v1|mutate_transaction_workflow)\b/);
});
