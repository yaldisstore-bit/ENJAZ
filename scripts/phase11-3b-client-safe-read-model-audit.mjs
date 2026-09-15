import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const sql=read('database/migrations/phase_11_3_client_safe_read_model.sql');
const hardening=read('database/migrations/phase_11_3_client_safe_read_model_hardening.sql');
const authority=read('src/features/client-portal/clientPortalAuthority.ts');
const state=json('docs/PHASE11_3_STATE.json');
const errors=[];
const req=(ok,msg)=>{if(!ok)errors.push(msg)};
const has=(s,m,msg=m)=>req(s.includes(m),`missing ${msg}`);

has(sql,'create table public.client_portal_resource_shares','resource publication table');
has(sql,'alter table public.client_portal_resource_shares enable row level security','resource share RLS');
has(sql,'revoke all on table public.client_portal_resource_shares from public,anon,authenticated','resource table browser revoke');
for(const marker of [
  'client_portal_resource_shares_principal_fk','client_portal_resource_shares_transaction_fk',
  'client_portal_resource_shares_document_fk','client_portal_resource_shares_payment_fk',
  'client_portal_resource_shares_shape_check','client_portal_resource_shares_validity_check',
  'client_portal_resource_shares_document_active_unique','client_portal_resource_shares_receipt_active_unique'
]) has(sql,marker);

has(sql,"resource_type in ('document','receipt')",'closed resource vocabulary');
has(sql,"ENJAZ_PORTAL_SHARE_STAFF_COLLISION",'share staff collision denial');
has(sql,"g.target_type='transaction'",'resource shares require exact transaction grant');
has(sql,"p_permission=any(g.permissions)",'resource share exact permission requirement');
has(sql,"v_permission:='view_finance'",'receipt finance permission requirement');
has(sql,"d.status='ready'",'only ready documents are publishable');
has(sql,"insert into public.audit_events",'share audit evidence');
has(sql,"'client_portal.resource.shared'",'share action audit');
has(sql,"'client_portal.resource.unshared'",'unshare action audit');

for(const helper of ['require_client_portal_shareable_principal_v1','client_portal_principal_has_grant_v1','record_client_portal_share_audit_v1']){
  const re=new RegExp(`revoke\\s+all\\s+on\\s+function\\s+private\\.${helper}[\\s\\S]{0,220}from\\s+public,anon,authenticated`,'i');
  req(re.test(sql),`${helper} must not be directly browser-callable`);
}

const readStart=sql.indexOf('create or replace function private.get_client_portal_read_model_v1_impl');
const readEnd=sql.indexOf('create or replace function public.get_client_portal_read_model_v1',readStart);
req(readStart>=0&&readEnd>readStart,'client read-model implementation block missing');
const model=readStart>=0&&readEnd>readStart?sql.slice(readStart,readEnd):'';
for(const marker of [
  "'companies'","'transactions'","'timeline'","'documents'","'receipts'","'requests'",
  "'legalName',c.legal_name","'displayName',c.display_name",
  "'type',t.type","'status',t.status","'completedAt',t.completed_at",
  "'title',d.title","'documentType',d.document_type","'mimeType',d.mime_type","'sizeBytes',d.size_bytes",
  "'receiptRef',p.receipt_ref","'amount',p.amount::text","'method',p.method","'paidAt',p.paid_at","'receiptVersion',p.receipt_version",
  "private.client_portal_grant_allows_v1(p_workspace_id,'transaction',s.transaction_id,'view')",
  "private.client_portal_grant_allows_v1(p_workspace_id,'transaction',s.transaction_id,'view_finance')",
  "'requestProjectionStatus','PENDING_GOVERNED_CLIENT_REQUEST_SOURCE'"
]) has(model,marker,`read model marker ${marker}`);

for(const forbidden of [
  'transaction_notes','transaction_routes','transaction_followups','transaction_blockers',
  'risk_signals','intelligence_snapshots','financial_ledger_entries','document_analysis',
  'storage_path','checksum','ocr_text','extracted_fields','cashbox_id','reversal_reason','deletion_reason','legacy_source'
]) req(!model.includes(forbidden),`read model leaks/internal-joins forbidden source: ${forbidden}`);
req(!model.includes("'priority'"),'read model must not project internal transaction priority');
req(!model.includes("'currentFee'"),'read model must not project transaction current fee through ordinary view permission');
req(!model.includes("'department'"),'read model must not project staff department');

for(const marker of [
  "'type',","'completedAt',","CLIENT_SAFE_DOCUMENT_FIELDS","CLIENT_SAFE_RECEIPT_FIELDS"
]) has(authority,marker,`canonical client projection contract ${marker}`);
req(!/CLIENT_SAFE_TRANSACTION_FIELDS[\s\S]{0,300}'title'/.test(authority),'transaction allowlist must not retain invented title');
req(!/CLIENT_SAFE_TRANSACTION_FIELDS[\s\S]{0,300}'referenceNumber'/.test(authority),'transaction allowlist must not retain invented referenceNumber');

has(hardening,'create or replace function private.client_portal_revoke_child_shares_on_grant_change_v1','grant-change child-share hardening');
has(hardening,"old.revoked_at is null and new.revoked_at is not null",'grant revocation child-share rule');
has(hardening,"not (new.permissions @> array['view_finance']::text[])",'finance permission removal child-share rule');
has(hardening,"'client_portal.resource.auto_unshared'",'automatic unshare audit');
has(hardening,'from public,anon,authenticated;','hardening trigger function non-callable');

req(state.phase==='11.3'&&state.status==='IN_PROGRESS'&&state.systemId==='M3','Phase 11.3 lifecycle must remain active');
req(state.clientSafeReadModelFoundationAdded===true,'state must record 11.3-B read-model foundation');
req(state.clientSafeReadModelAdded===false,'B may not claim completion while governed request source is pending');
req(state.governedClientRequestSourceAdded===false,'governed request source must remain pending');
req(state.databaseAuthorityExtensionApplied===false,'Real Cloud database apply remains pending');
req(state.realCloudAuthenticatedVerification==='PENDING','Real Cloud verification remains pending');
req(state.phase11_4Allowed===false&&state.successorStatus==='LOCKED','Phase 11.4 must remain locked');

if(errors.length){
  console.error(`ENJAZ PHASE 11.3-B CLIENT-SAFE READ MODEL AUDIT FAIL (${errors.length})`);
  errors.forEach((e)=>console.error(`- ${e}`));
  process.exitCode=1;
}else{
  console.log('ENJAZ PHASE 11.3-B CLIENT-SAFE READ MODEL AUDIT PASS — exact grants plus explicit child publication produce minimal Company/Transaction/Document/Receipt projections; internal domains remain excluded; governed request source is still fail-closed/pending.');
}
