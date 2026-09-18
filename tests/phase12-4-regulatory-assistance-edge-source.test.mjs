import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const edge=fs.readFileSync('supabase/functions/enjaz-regulatory-assistant/index.ts','utf8');

test('12.4 A2 Edge is caller-JWT-only with no service-role/admin authority',()=>{
  for(const marker of [
    "userClient.auth.getUser(token)",
    "userClient.rpc('search_regulatory_knowledge_v1'",
    "userClient.rpc('get_regulatory_knowledge_entry_v1'",
    "p_as_of:parsed.asOf",
    "official.versionId!==ref.versionId",
    "buildRegulatoryAssistanceResult(parsed,entries)",
  ]) assert.ok(edge.includes(marker),marker);
  assert.doesNotMatch(edge,/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|SUPABASE_SECRET_KEYS|serviceKey\(|\badmin\b/);
  assert.doesNotMatch(edge,/\.from\(/);
});

test('12.4 A2 Edge exposes no regulatory mutation/provider path',()=>{
  assert.doesNotMatch(edge,/save_regulatory|insert_regulatory|update_regulatory|delete_regulatory|ingest_regulatory|create_regulatory/i);
  assert.doesNotMatch(edge,/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/);
  assert.doesNotMatch(edge,/post_payment|reverse_payment|mutate_transaction|create_transaction|save_client_portal/i);
});

test('12.4 A2 search and entry retrieval remain explicit-asOf and exact-version bound',()=>{
  assert.match(edge,/search_regulatory_knowledge_v1/);
  assert.match(edge,/get_regulatory_knowledge_entry_v1/);
  assert.match(edge,/p_as_of:parsed\.asOf/g);
  assert.match(edge,/REGULATORY_VERSION_BINDING_CONFLICT/);
  assert.match(edge,/item\.authoritative!==true/);
});

test('12.4 A2 keeps authentication and workspace denial explicit',()=>{
  assert.match(edge,/AUTH_REQUIRED/);
  assert.match(edge,/AUTH_INVALID/);
  assert.match(edge,/ENJAZ_REGULATORY_WORKSPACE_ACCESS_DENIED/);
  assert.match(edge,/Authorization:'Bearer '\+token/);
});
