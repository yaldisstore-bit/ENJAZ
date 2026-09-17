import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { EnjazDataLayerFactory } from '../data/createDataLayer.ts';
import { DataLayerProvider } from '../data/react/DataLayerContext.tsx';
import { LiveUnifiedCalendarExperience } from './calendar/LiveUnifiedCalendarExperience.tsx';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './core-work/core-work.css';

const WORKSPACE='11111111-1111-4111-8111-111111111111';
const STAFF_A='22222222-2222-4222-8222-222222222222';
const STAFF_B='33333333-3333-4333-8333-333333333333';
const COMPANY_A='44444444-4444-4444-8444-444444444444';
const COMPANY_B='55555555-5555-4555-8555-555555555555';
const TX_A='66666666-6666-4666-8666-666666666666';
const TX_B='77777777-7777-4777-8777-777777777777';

const sourceItems=[
  {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',source:'appointment',authority:'calendar_events',title:'موعد مراجعة دائرة الشركات',startsAt:'2026-09-17T07:30:00.000Z',endsAt:'2026-09-17T08:30:00.000Z',dueDate:'2026-09-17',status:'scheduled',attentionState:'due_today',transactionId:TX_A,companyId:COMPANY_A,companyLabel:'شركة الرافدين',staffMemberIds:[STAFF_A],confirmationStatus:'confirmed',attendanceOutcome:null},
  {id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',source:'appointment',authority:'calendar_events',title:'موعد توقيع المستندات',startsAt:'2026-09-18T09:00:00.000Z',endsAt:'2026-09-18T10:00:00.000Z',dueDate:'2026-09-18',status:'scheduled',attentionState:'upcoming',transactionId:TX_B,companyId:COMPANY_B,companyLabel:'شركة دجلة',staffMemberIds:[STAFF_B],confirmationStatus:'pending',attendanceOutcome:null},
  {id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',source:'renewal',authority:'renewals',title:'تجديد إجازة الشركة',startsAt:null,endsAt:null,dueDate:'2026-09-16',status:'open',attentionState:'overdue',transactionId:TX_A,companyId:COMPANY_A,companyLabel:'شركة الرافدين',staffMemberIds:[],confirmationStatus:null,attendanceOutcome:null},
  {id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',source:'workflow_deadline',authority:'workflow_deadline_evidence',title:'آخر موعد لتقديم متطلب الإجراء',startsAt:null,endsAt:null,dueDate:'2026-09-19',status:'pending',attentionState:'upcoming',transactionId:TX_B,companyId:COMPANY_B,companyLabel:'شركة دجلة',staffMemberIds:[],confirmationStatus:null,attendanceOutcome:null},
] as const;

function snapshot(args:Record<string,unknown>){
  const view=typeof args.p_view==='string'?args.p_view:'month';
  const authority=typeof args.p_authority==='string'?args.p_authority:'all';
  const staff=typeof args.p_staff_member_id==='string'?args.p_staff_member_id:null;
  const company=typeof args.p_company_id==='string'?args.p_company_id:null;
  const transaction=typeof args.p_transaction_id==='string'?args.p_transaction_id:null;
  const anchor=typeof args.p_anchor_date==='string'?args.p_anchor_date:'2026-09-17';
  const items=sourceItems.filter(item=>(authority==='all'||item.source===authority)&&(!staff||item.staffMemberIds.includes(staff as never))&&(!company||item.companyId===company)&&(!transaction||item.transactionId===transaction));
  return {schema:'enjaz.unified-calendar.v2',workspaceTimezone:'Asia/Baghdad',view,anchorDate:anchor,businessToday:'2026-09-17',businessStartDate:view==='day'?anchor:'2026-09-15',businessEndDate:view==='day'?anchor:'2026-10-14',generatedAt:'2026-09-17T12:00:00.000Z',items};
}

const factory=Object.freeze({
  async resolveWorkspaceId(){return WORKSPACE;},
  forWorkspace(){throw new Error('Phase 11.5-D browser certificate must use the governed calendar projection RPC');},
  async rpc(functionName:string,args:Record<string,unknown>={}){
    if(functionName!=='list_unified_calendar_v2')return {data:null,error:{message:`Unexpected RPC ${functionName}`}};
    if(args.p_workspace_id!==WORKSPACE)return {data:null,error:{message:'ENJAZ_CALENDAR_WORKSPACE_FORBIDDEN'}};
    return {data:snapshot(args),error:null};
  },
}) as unknown as EnjazDataLayerFactory;

const root=document.getElementById('phase11-5-calendar-root');
if(!root)throw new Error('Phase 11.5-D calendar browser root missing');
createRoot(root).render(
  <StrictMode>
    <DataLayerProvider factory={factory}>
      <main className="ez-r2-root r2-shell__main" dir="rtl"><LiveUnifiedCalendarExperience workspace={Promise.resolve(WORKSPACE)}/></main>
    </DataLayerProvider>
  </StrictMode>,
);
