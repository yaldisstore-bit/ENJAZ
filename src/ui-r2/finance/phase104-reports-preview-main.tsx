import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { FinanceSource } from '../../features/finance/financeModel.ts';
import type { FinancialReportPdfRenderInput, FinancialReportRenderGateway } from '../../features/reports/financialReportRenderCommands.ts';
import { FinancialReportsPanel } from './Phase74FinancialReportsExperience.tsx';
import '../runtime/shell-base.css';
import '../runtime/shell.css';
import '../runtime/accessibility-hardening.css';
import './finance.css';
import './phase74.css';

const W='11111111-1111-4111-8111-111111111111',C1='22222222-2222-4222-8222-222222222221',C2='22222222-2222-4222-8222-222222222222',T1='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',T2='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',B1='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const company=(id:string,name:string):RowOf<'companies'>=>({id,workspace_id:W,legal_name:name,display_name:name,capital:null,address:null,activities:null,registration_number:null,legal_status:null,primary_contact_id:null,status:'active',merged_into_id:null,legacy_id:null,legacy_source:null,created_at:'2026-01-01T00:00:00.000Z',updated_at:'2026-09-07T00:00:00.000Z',deleted_at:null});
const transaction=(id:string,companyId:string,fee:number,legacy:string):RowOf<'transactions'>=>({id,workspace_id:W,company_id:companyId,primary_contact_id:null,type:'معاملة شركات',department:'مسجل الشركات',status:'active',priority:'normal',current_fee:fee,created_at:'2026-01-15T00:00:00.000Z',updated_at:'2026-09-07T00:00:00.000Z',last_activity_at:'2026-09-07T00:00:00.000Z',completed_at:null,archived_at:null,deleted_at:null,deleted_by:null,deletion_reason:null,legacy_id:legacy,legacy_source:null});
const payment=(id:string,transactionId:string,companyId:string,amount:number,paidAt:string,status='posted'):RowOf<'payments'>=>({id,workspace_id:W,transaction_id:transactionId,company_id:companyId,amount,method:'cash',paid_at:paidAt,status,receipt_ref:`ENJ-R-${id}`,note:null,legacy_id:null,legacy_source:null,created_at:paidAt});
const ledger=(id:string,direction:'in'|'out',amount:number,occurredAt:string,companyId:string|null,transactionId:string|null):RowOf<'financial_ledger_entries'>=>({id,workspace_id:W,transaction_id:transactionId,company_id:companyId,entry_type:direction==='out'?'expense':'adjustment',direction,amount,method:null,category:direction==='out'?'تشغيل':'تسوية',source:'phase10-4-browser',occurred_at:occurredAt,status:'posted',note:null,reversal_reason:null,reversed_at:null,metadata:{},created_at:occurredAt});

const source:FinanceSource=Object.freeze({
 companies:Object.freeze([company(C1,'قمر السلطان'),company(C2,'اسراء الخير')]),
 transactions:Object.freeze([transaction(T1,C1,2_500_000,'1056'),transaction(T2,C2,4_000_000,'1057')]),
 payments:Object.freeze([payment('P001',T1,C1,1_250_000,'2026-09-02T09:00:00.000Z'),payment('P002',T2,C2,1_500_000,'2026-09-03T09:00:00.000Z'),payment('P003',T1,C1,250_000,'2026-09-04T09:00:00.000Z','reversed')]),
 paymentReversals:Object.freeze([{id:'44444444-4444-4444-8444-444444444441',workspace_id:W,payment_id:'P003',reversed_at:'2026-09-05T09:00:00.000Z',reason:'تصحيح',actor_user_id:null}]),
 ledger:Object.freeze([ledger('L001','out',350_000,'2026-09-03T12:00:00.000Z',C1,T1),ledger('L002','in',100_000,'2026-09-04T12:00:00.000Z',C2,T2)]),
 cashboxes:Object.freeze([{id:B1,workspace_id:W,name:'الصندوق الرئيسي',opening_balance:2_000_000,opened_at:'2026-01-01T00:00:00.000Z',active:true,created_at:'2026-01-01T00:00:00.000Z',updated_at:'2026-09-07T00:00:00.000Z'}]),
});

const browserRenderer:FinancialReportRenderGateway=Object.freeze({
 async renderPdf(input:FinancialReportPdfRenderInput){
  return Object.freeze({
   file:new Blob([`ENJAZ Phase 10.4 browser journey certificate: ${input.expectedFingerprint}`],{type:'application/pdf'}),
   filename:`enjaz-finance-${input.expectedFingerprint}.pdf`,
   fingerprint:input.expectedFingerprint,
   identity:`ENJAZ:REPORT:v1:${input.workspaceId}:browser-certificate:${input.expectedFingerprint}`,
   pageCount:3,
  });
 },
});

function App(){return <div className="r2-shell" data-r2-runtime-mode="preview" data-destination="finance" dir="rtl"><main id="r2-main" className="r2-main"><div className="r2-screen r2-finance-phase74" data-finance-stage="10.4" data-finance-mode="browser-certificate" data-finance-report-authority="canonical" data-phase10-4-browser-certificate="enabled"><FinancialReportsPanel source={source} workspaceId={W} renderGateway={browserRenderer}/></div></main></div>}
const root=document.getElementById('phase104-reports-root');if(!root)throw new Error('Phase 10.4 reports browser root missing');createRoot(root).render(<StrictMode><App/></StrictMode>);
