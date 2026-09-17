import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const sql=fs.readFileSync(new URL('database/migrations/phase_11_6_contract_transition_concurrency_hardening.sql',root),'utf8');
const gateway=fs.readFileSync(new URL('src/features/engagements/engagementContractCommands.ts',root),'utf8');
const panel=fs.readFileSync(new URL('src/ui-r2/documents/EngagementContractPanel.tsx',root),'utf8');

function violations(s=sql,g=gateway,p=panel){
  const out=[]; const req=(ok,name)=>{if(!ok)out.push(name)};
  req(s.includes('add column version integer not null default 1 check (version > 0)'),'revision-version');
  req(s.includes('create table private.engagement_contract_transition_receipts'),'private-transition-receipts');
  req(s.includes('primary key(workspace_id,operation_id)'),'operation-idempotency-key');
  req(s.includes('new.version:=old.version+1'),'monotonic-version-trigger');
  req(s.includes("create or replace function public.transition_engagement_contract_revision_v2(\n  p_workspace_id uuid,\n  p_revision_id uuid,\n  p_operation_id uuid,\n  p_expected_version integer,"),'v2-operation-version-input');
  req(s.includes("ENJAZ_CONTRACT_TRANSITION_STALE"),'stale-fail-closed');
  req(s.includes("ENJAZ_CONTRACT_TRANSITION_IDEMPOTENCY_CONFLICT"),'idempotency-conflict');
  req(s.includes('v_receipt.response_payload')&&s.includes("'wasDuplicate',true"),'idempotent-replay');
  req(s.includes('public.transition_engagement_contract_revision_v1('),'canonical-v1-owner-reused');
  req(/create or replace function public\.transition_engagement_contract_revision_v2\([\s\S]*?security invoker/i.test(s),'public-v2-invoker');
  req(s.includes('revoke all on function public.transition_engagement_contract_revision_v1(')
    &&s.includes('from public,anon,authenticated,service_role'),'legacy-v1-browser-revoked');
  req(!/update\s+public\.engagement_contract_revisions[\s\S]*?set\s+status/i.test(s.split('create or replace function private.transition_engagement_contract_revision_v2_impl')[1]??''),'v2-no-shadow-direct-status-write');
  req(g.includes("transition_engagement_contract_revision_v2"),'gateway-v2-rpc');
  req(g.includes('operationId: string;')&&g.includes('expectedVersion: number;'),'gateway-operation-version-contract');
  req(g.includes("p_operation_id: operationId")&&g.includes("p_expected_version: expectedVersion"),'gateway-v2-args');
  req(g.includes("version: positiveInteger(row.version, 'contract revision version')"),'gateway-version-read');
  req(p.includes('operationId:crypto.randomUUID()')&&p.includes('expectedVersion:r.version'),'panel-versioned-transition');
  return out;
}

test('11.6-C1 versioned M16 transition source contract is clean',()=>assert.deepEqual(violations(),[]));
test('destruction: removing operation id is detected',()=>assert.ok(violations(sql.replace("create or replace function public.transition_engagement_contract_revision_v2(\n  p_workspace_id uuid,\n  p_revision_id uuid,\n  p_operation_id uuid,","create or replace function public.transition_engagement_contract_revision_v2(\n  p_workspace_id uuid,\n  p_revision_id uuid,\n  uuid,")).includes('v2-operation-version-input')));
test('destruction: removing expected version is detected',()=>assert.ok(violations(sql.replace("  p_operation_id uuid,\n  p_expected_version integer,\n  p_to_status text,","  p_operation_id uuid,\n  integer,\n  p_to_status text,")).includes('v2-operation-version-input')));
test('destruction: stale guard removal is detected',()=>assert.ok(violations(sql.replace('ENJAZ_CONTRACT_TRANSITION_STALE','BROKEN_STALE')).includes('stale-fail-closed')));
test('destruction: idempotency conflict removal is detected',()=>assert.ok(violations(sql.replace('ENJAZ_CONTRACT_TRANSITION_IDEMPOTENCY_CONFLICT','BROKEN_IDEMPOTENCY')).includes('idempotency-conflict')));
test('destruction: legacy v1 browser grant is detected',()=>assert.ok(violations(sql.replace("revoke all on function public.transition_engagement_contract_revision_v1(\n  uuid,uuid,text,uuid,uuid,date,date,jsonb,text\n) from public,anon,authenticated,service_role;","revoke all on function public.transition_engagement_contract_revision_v1(\n  uuid,uuid,text,uuid,uuid,date,date,jsonb,text\n) from public,anon,service_role;")).includes('legacy-v1-browser-revoked')));
test('destruction: public v2 SECURITY DEFINER is detected',()=>assert.ok(violations(sql.replace('language sql\nvolatile\nsecurity invoker','language sql\nvolatile\nsecurity definer')).includes('public-v2-invoker')));
test('destruction: gateway fallback to v1 is detected',()=>assert.ok(violations(sql,gateway.replace('transition_engagement_contract_revision_v2','transition_engagement_contract_revision_v1')).includes('gateway-v2-rpc')));
test('destruction: UI drops expected version is detected',()=>assert.ok(violations(sql,gateway,panel.replace('expectedVersion:r.version,','')).includes('panel-versioned-transition')));
