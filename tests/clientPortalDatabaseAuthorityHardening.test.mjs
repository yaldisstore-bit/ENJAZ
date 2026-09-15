import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../database/migrations/phase_11_3_client_portal_authority_hardening.sql',import.meta.url),'utf8');

test('later same-workspace owner/workforce trust makes the portal principal fail closed',()=>{
  assert.match(sql,/create\s+or\s+replace\s+function\s+private\.current_client_portal_principal_id_v1[\s\S]*?not\s+exists\s*\([\s\S]*?public\.workspace_memberships[\s\S]*?wm\.workspace_id=p\.workspace_id\s+and\s+wm\.user_id=p\.user_id[\s\S]*?\)[\s\S]*?not\s+exists\s*\([\s\S]*?public\.organization_members[\s\S]*?om\.workspace_id=p\.workspace_id\s+and\s+om\.user_id=p\.user_id/i);
});

test('workspace discovery also hides a principal after staff/workforce collision',()=>{
  assert.match(sql,/create\s+or\s+replace\s+function\s+private\.list_client_portal_workspaces_v1_impl[\s\S]*?public\.workspace_memberships[\s\S]*?public\.organization_members/i);
});

test('hardening does not mutate either staff trust table',()=>{
  assert.doesNotMatch(sql,/insert\s+into\s+public\.(workspace_memberships|organization_members)/i);
  assert.doesNotMatch(sql,/update\s+public\.(workspace_memberships|organization_members)/i);
  assert.doesNotMatch(sql,/delete\s+from\s+public\.(workspace_memberships|organization_members)/i);
});

test('internal authority-event writer remains non-callable from authenticated',()=>{
  assert.match(sql,/revoke\s+all\s+on\s+function\s+private\.record_client_portal_authority_event_v1\(uuid,uuid,uuid,uuid,text,text,jsonb\)[\s\S]*?from\s+authenticated;/i);
});
