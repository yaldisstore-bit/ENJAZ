import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const sql=fs.readFileSync(new URL('database/migrations/phase_11_6_contract_renewal_communication_evidence.sql',root),'utf8');
const gateway=fs.readFileSync(new URL('src/features/intake-contract-communication/contractRenewalCommunicationCommands.ts',root),'utf8');

function segment(source,start,end){
  const a=source.indexOf(start);
  if(a<0)return '';
  const b=end?source.indexOf(end,a+start.length):-1;
  return source.slice(a,b<0?source.length:b);
}
function violations(s=sql,g=gateway){
  const out=[]; const req=(ok,name)=>{if(!ok)out.push(name)};
  const bind=segment(s,'create or replace function private.bind_contract_renewal_provenance_v1_impl','create or replace function public.bind_contract_renewal_provenance_v1');
  const pubBind=segment(s,'create or replace function public.bind_contract_renewal_provenance_v1','create table private.contract_renewal_communication_evidence');
  const record=segment(s,'create or replace function private.record_contract_renewal_communication_evidence_v1_impl','create or replace function public.record_contract_renewal_communication_evidence_v1');
  const pubRecord=segment(s,'create or replace function public.record_contract_renewal_communication_evidence_v1','revoke all on function private.record_contract_renewal_communication_evidence_v1_impl');

  req(s.includes('alter table public.renewals\n  add column contract_revision_id uuid'),'canonical-renewal-provenance-column');
  req(s.includes('renewals_contract_revision_fk')&&s.includes('references public.engagement_contract_revisions(workspace_id,id)'),'renewal-revision-fk');
  req(s.includes('renewals_contract_revision_fk_idx'),'renewal-revision-index');
  req(!s.includes('create table public.contract_renewals'),'no-shadow-renewal');
  req(bind.includes("v_revision.status<>'effective'")&&bind.includes('v_revision.expires_on is null'),'effective-revision-required');
  req(bind.includes('v_revision.version<>p_expected_revision_version'),'revision-stale-guard');
  req(bind.includes('v_renewal.version<>p_expected_renewal_version'),'renewal-stale-guard');
  req(bind.includes("v_renewal.status<>'active'"),'active-renewal-required');
  req(bind.includes('v_renewal.company_id is distinct from v_engagement.company_id'),'renewal-company-binding');
  req(bind.includes('public.commercial_engagement_transactions'),'renewal-transaction-binding');
  req(bind.includes('due_date=v_revision.expires_on'),'expiry-derived-due-date');
  req(bind.includes('version=version+1'),'renewal-version-increment');
  req(bind.includes("v_receipt.command_type<>'contract_renewal_binding'")&&bind.includes('ENJAZ_CONTRACT_RENEWAL_IDEMPOTENCY_CONFLICT'),'renewal-idempotency');
  req(pubBind.includes('security invoker'),'renewal-public-invoker');

  req(s.includes('create table private.contract_renewal_communication_evidence'),'private-communication-evidence');
  req(!s.includes('create table public.contract_renewal_communication'),'no-shadow-communication');
  req(record.includes("v_renewal.contract_revision_id is distinct from p_contract_revision_id"),'communication-requires-renewal-provenance');
  req(record.includes("v_revision.status<>'effective'")&&record.includes('v_renewal.due_date<>v_revision.expires_on'),'communication-revision-drift-guard');
  req(record.includes("v_communication.direction<>'outgoing'"),'outgoing-required');
  req(record.includes("v_communication.link_status<>'linked'"),'linked-required');
  req(record.includes("v_communication.metadata->>'source'<>'governed_outbound'"),'m4-governed-source-required');
  req(record.includes('public.communication_outbound_commands'),'m4-command-required');
  req(record.includes('ENJAZ_CONTRACT_RENEWAL_M4_COMMAND_REQUIRED'),'m4-command-fail-closed');
  req(!/insert\s+into\s+public\.communications/i.test(record)&&!/update\s+public\.communications/i.test(record),'no-direct-communication-mutation');
  req(!/update\s+public\.renewals/i.test(record),'communication-cannot-mutate-renewal');
  req(pubRecord.includes('security invoker'),'communication-public-invoker');
  req(s.includes('revoke all on table private.contract_renewal_communication_evidence\n  from public,anon,authenticated,service_role'),'private-evidence-denied');

  req(g.includes("'bind_contract_renewal_provenance_v1'"),'gateway-renewal-rpc');
  req(g.includes("'record_contract_renewal_communication_evidence_v1'"),'gateway-communication-rpc');
  req(g.includes('p_expected_renewal_version:ver(input.expectedRenewalVersion)')&&g.includes('p_expected_revision_version:ver(input.expectedRevisionVersion)'),'gateway-both-versions');
  req(g.includes('p_communication_id:id(input.communicationId)'),'gateway-canonical-communication-id');
  return out;
}

test('11.6-C3 renewal provenance and M4 evidence preserve canonical owners',()=>assert.deepEqual(violations(),[]));
test('destruction: shadow renewal table is detected',()=>assert.ok(violations(sql.replace('create table private.contract_renewal_communication_evidence','create table public.contract_renewals')).includes('no-shadow-renewal')));
test('destruction: removing effective contract gate is detected',()=>assert.ok(violations(sql.replace("v_revision.status<>'effective'","false")).includes('effective-revision-required')));
test('destruction: removing renewal expected version is detected',()=>assert.ok(violations(sql.replace('v_renewal.version<>p_expected_renewal_version','false')).includes('renewal-stale-guard')));
test('destruction: decoupling due date from contract expiry is detected',()=>assert.ok(violations(sql.replace('due_date=v_revision.expires_on','due_date=v_renewal.due_date')).includes('expiry-derived-due-date')));
test('destruction: arbitrary communication source is detected',()=>assert.ok(violations(sql.replace("v_communication.metadata->>'source'<>'governed_outbound'","false")).includes('m4-governed-source-required')));
test('destruction: bypassing M4 command evidence is detected',()=>assert.ok(violations(sql.replace('public.communication_outbound_commands','public.communications')).includes('m4-command-required')));
test('destruction: direct communication insert is detected',()=>{
  const marker="select * into v_command\n  from public.communication_outbound_commands c";
  const mutated=sql.replace(marker,"insert into public.communications(workspace_id,channel,direction,summary,occurred_at) values(p_workspace_id,'message','outgoing','bad',now());\n\n  select * into v_command\n  from public.communication_outbound_commands c");
  assert.ok(violations(mutated).includes('no-direct-communication-mutation'));
});
test('destruction: gateway dropping expected revision version is detected',()=>assert.ok(violations(sql,gateway.replace('p_expected_revision_version:ver(input.expectedRevisionVersion),','')).includes('gateway-both-versions')));
