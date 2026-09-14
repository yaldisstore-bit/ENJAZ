import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import { buildFinancialReport, type FinancialReportQuery } from '../src/features/finance/financeReports.ts';
import type { FinanceSource } from '../src/features/finance/financeModel.ts';
import { buildServerFinancialReport, type Query as ServerQuery, type Source as ServerSource } from '../supabase/functions/enjaz-financial-report-render/finance-core.ts';

const W='11111111-1111-4111-8111-111111111111',C1='22222222-2222-4222-8222-222222222221',C2='22222222-2222-4222-8222-222222222222',T1='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',T2='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',B1='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',GENERATED='2026-09-14T10:30:00.000Z';
function company(id:string,name:string):RowOf<'companies'>{return{id,workspace_id:W,legal_name:name,display_name:name,capital:null,address:null,activities:null,registration_number:null,legal_status:null,primary_contact_id:null,status:'active',merged_into_id:null,legacy_id:null,legacy_source:null,created_at:'2026-01-01T00:00:00.000Z',updated_at:GENERATED,deleted_at:null}}
function transaction(id:string,companyId:string,fee:number,legacy:string):RowOf<'transactions'>{return{id,workspace_id:W,company_id:companyId,primary_contact_id:null,type:'تأسيس',department:null,status:'active',priority:'normal',current_fee:fee,created_at:'2026-01-01T00:00:00.000Z',updated_at:GENERATED,last_activity_at:GENERATED,completed_at:null,archived_at:null,deleted_at:null,deleted_by:null,deletion_reason:null,legacy_id:legacy,legacy_source:null}}
function payment(id:string,tid:string,cid:string,amount:number,date:string,status='posted'):RowOf<'payments'>{return{id,workspace_id:W,transaction_id:tid,company_id:cid,amount,method:'cash',paid_at:date,status,receipt_ref:`R-${id}`,note:null,legacy_id:null,legacy_source:null,created_at:date}}
function ledger(id:string,direction:'in'|'out',amount:number,date:string,cid:string|null=null,tid:string|null=null,status='posted'):RowOf<'financial_ledger_entries'>{return{id,workspace_id:W,transaction_id:tid,company_id:cid,entry_type:direction==='out'?'expense':'adjustment',direction,amount,method:null,category:'اختبار',source:'parity',occurred_at:date,status,note:null,reversal_reason:null,reversed_at:status==='reversed'?date:null,metadata:{},created_at:date}}
function cashbox():RowOf<'cashbox_accounts'>{return{id:B1,workspace_id:W,name:'الصندوق الرئيسي',opening_balance:500,opened_at:'2026-01-01T00:00:00.000Z',active:true,created_at:'2026-01-01T00:00:00.000Z',updated_at:GENERATED}}
const clientSource:FinanceSource={companies:[company(C1,'شركة ألف'),company(C2,'شركة باء')],transactions:[transaction(T1,C1,1000,'1001'),transaction(T2,C2,2000,'1002')],payments:[payment('p1',T1,C1,400,'2026-09-02T10:00:00.000Z'),payment('p2',T1,C1,300,'2026-09-03T10:00:00.000Z','reversed'),payment('p3',T2,C2,700,'2026-09-04T10:00:00.000Z')],paymentReversals:[{id:'r1',workspace_id:W,payment_id:'p2',reversed_at:'2026-09-04T10:00:00.000Z',reason:'تصحيح',actor_user_id:null}],ledger:[ledger('l1','in',50,'2026-09-04T10:00:00.000Z',C1,T1),ledger('l2','out',100,'2026-09-05T10:00:00.000Z'),ledger('l3','in',25,'2026-09-06T10:00:00.000Z',C2,T2)],cashboxes:[cashbox()]};
const serverSource:ServerSource={
 companies:clientSource.companies.map(x=>({id:x.id,workspace_id:x.workspace_id,legal_name:x.legal_name,display_name:x.display_name})),
 transactions:clientSource.transactions.map(x=>({id:x.id,workspace_id:x.workspace_id,company_id:x.company_id,type:x.type,current_fee:x.current_fee,deleted_at:x.deleted_at,legacy_id:x.legacy_id})),
 payments:clientSource.payments.map(x=>({id:x.id,workspace_id:x.workspace_id,transaction_id:x.transaction_id,company_id:x.company_id,amount:x.amount,paid_at:x.paid_at,status:x.status,receipt_ref:x.receipt_ref,cashbox_id:null})),
 paymentReversals:clientSource.paymentReversals.map(x=>({id:x.id,workspace_id:x.workspace_id,payment_id:x.payment_id})),
 ledger:clientSource.ledger.map(x=>({id:x.id,workspace_id:x.workspace_id,transaction_id:x.transaction_id,company_id:x.company_id,entry_type:x.entry_type,direction:x.direction,amount:x.amount,category:x.category,occurred_at:x.occurred_at,status:x.status})),
 cashboxes:clientSource.cashboxes.map(x=>({id:x.id,workspace_id:x.workspace_id,name:x.name,opening_balance:x.opening_balance,active:x.active})),
};
const scalar=(value:unknown):unknown=>typeof value==='bigint'?value.toString():Array.isArray(value)?value.map(scalar):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,scalar(v)])):value;
for(const query of [
 {kind:'period',from:'2026-09-01',to:'2026-09-30'},
 {kind:'company',companyId:C1,from:'2026-09-01',to:'2026-09-30'},
 {kind:'transaction',transactionId:T1,from:'2026-09-01',to:'2026-09-30'},
 {kind:'cashbox',cashboxId:B1,from:'2026-09-01',to:'2026-09-30'},
] as const){test(`server financial renderer core stays bit-semantic with client report: ${query.kind}`,()=>{const client=buildFinancialReport(clientSource,query as FinancialReportQuery,GENERATED),server=buildServerFinancialReport(serverSource,query as ServerQuery,GENERATED);assert.equal(server.fingerprint,client.fingerprint);assert.deepEqual(scalar(server.scope),scalar(client.scope));assert.deepEqual(scalar(server.totals),scalar(client.totals));assert.deepEqual(scalar(server.movements),scalar(client.movements));assert.deepEqual(scalar(server.receivables),scalar(client.receivables));assert.deepEqual(server.disclosures,client.disclosures)})}
