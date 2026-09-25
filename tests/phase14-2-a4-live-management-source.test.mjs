import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('database/migrations/phase_14_2_integration_live_management.sql','utf8');
const gateway=fs.readFileSync('src/features/integrations/integrationManagementGateway.ts','utf8');
const ui=fs.readFileSync('src/ui-r2/integrations/IntegrationManagementExperience.tsx','utf8');
const live=fs.readFileSync('src/ui-r2/runtime/UiR2LiveRoot.tsx','utf8');
const production=fs.readFileSync('src/ui-r2/runtime/UiR2ProductionRoot.tsx','utf8');

test('A4 owner bridge derives authority from auth.uid and is authenticated-only',()=>{
  assert.match(migration,/auth\.uid\(\)/);
  assert.match(migration,/integration_assert_owner_v1\(p_workspace_id,v_user_id\)/);
  for(const fn of ['integration_management_snapshot_v1','integration_issue_credential_owner_v1','integration_revoke_service_account_owner_v1','integration_register_webhook_owner_v1','integration_disable_webhook_owner_v1']){
    assert.ok(migration.includes('revoke all on function public.'+fn));
    assert.ok(migration.includes('grant execute on function public.'+fn));
  }
  assert.doesNotMatch(migration,/grant execute[^;]+to anon/i);
});

test('A4 owner bridge creates one-time secrets server-side without returning stored secret material in snapshot',()=>{
  assert.match(migration,/gen_random_bytes\(32\)/);
  assert.match(migration,/'rawToken',v_raw_token/);
  assert.match(migration,/'signingSecret',v_secret/);
  const snapshot=migration.split('integration_management_snapshot_v1')[1]?.split('integration_issue_credential_owner_v1')[0]??'';
  assert.doesNotMatch(snapshot,/decrypted_secret|token_hash|signing_secret_id/i);
});

test('A4 browser gateway uses user RPCs and contains no service role material',()=>{
  for(const rpc of ['integration_management_snapshot_v1','integration_issue_credential_owner_v1','integration_revoke_service_account_owner_v1','integration_register_webhook_owner_v1','integration_disable_webhook_owner_v1'])assert.ok(gateway.includes(rpc));
  assert.doesNotMatch(gateway,/service[_-]?role|SUPABASE_SECRET/i);
});

test('A4 live runtime wires authoritative management instead of deferred shell',()=>{
  assert.match(ui,/IntegrationManagementGateway/);
  assert.match(ui,/gateway\.snapshot/);
  assert.match(ui,/issueCredential/);
  assert.match(ui,/registerWebhook/);
  assert.match(live,/IntegrationManagementExperience/);
  assert.match(production,/createIntegrationManagementGateway/);
});
