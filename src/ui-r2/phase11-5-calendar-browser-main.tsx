import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { EnjazDataLayerFactory } from '../data/createDataLayer.ts';
import { UnifiedCalendarExperience } from './scheduling/LiveSchedulingCalendarPortal.tsx';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './core-work/core-work.css';

const WORKSPACE='11111111-1111-4111-8111-111111111111',USER='22222222-2222-4222-8222-222222222222';
const base={endsAt:null,allDay:true,status:'pending',isUpcoming:false,isOverdue:false,transactionId:'33333333-3333-4333-8333-333333333333',transactionLabel:'تأسيس شركة',companyId:'44444444-4444-4444-8444-444444444444',companyLabel:'شركة الرافدين',staffMemberIds:[],conflictState:'not_applicable',isConflict:false,confirmationStatus:null,attendanceOutcome:null,version:null,workflowInstanceId:null,renewalId:null,occurrenceSequence:null,stagePosition:null,dueDate:null,cutoffAt:null,rescheduleCount:0,lastRescheduledAt:null,lastRescheduleReason:null,missReviewRecorded:false};
const items=[
  {...base,id:'55555555-5555-4555-8555-555555555555',canonicalId:'55555555-5555-4555-8555-555555555555',sourceKind:'appointment',title:'مراجعة دائرة التسجيل',eventType:'government_visit',startsAt:'2026-09-17T07:30:00.000Z',endsAt:'2026-09-17T08:30:00.000Z',allDay:false,localDate:'2026-09-17',status:'scheduled',temporalState:'upcoming',isUpcoming:true,staffMemberIds:['66666666-6666-4666-8666-666666666666'],conflictState:'conflict',isConflict:true,confirmationStatus:'confirmed',version:3,rescheduleCount:1,lastRescheduledAt:'2026-09-16T08:00:00.000Z',lastRescheduleReason:'تغيير موعد الدائرة'},
  {...base,id:'77777777-7777-4777-8777-777777777777',canonicalId:'77777777-7777-4777-8777-777777777777',sourceKind:'workflow_deadline',title:'إيداع المستندات',eventType:'workflow_deadline',startsAt:'2026-09-16T21:00:00.000Z',endsAt:'2026-09-17T20:59:59.000Z',localDate:'2026-09-17',status:'overdue',temporalState:'overdue',isOverdue:true,workflowInstanceId:'88888888-8888-4888-8888-888888888888',stagePosition:2,dueDate:'2026-09-17',cutoffAt:'2026-09-17T20:59:59.000Z'},
  {...base,id:'99999999-9999-4999-8999-999999999999',canonicalId:'99999999-9999-4999-8999-999999999999',sourceKind:'renewal_occurrence',title:'تجديد إجازة الشركة',eventType:'renewal_occurrence',startsAt:'2026-09-29T21:00:00.000Z',endsAt:'2026-09-30T20:59:59.000Z',localDate:'2026-09-30',status:'upcoming',temporalState:'upcoming',isUpcoming:true,renewalId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',occurrenceSequence:4,dueDate:'2026-09-30',cutoffAt:'2026-09-30T20:59:59.000Z'},
] as const;

function snapshot(authority:string|null){
  const filtered=authority?items.filter(item=>item.sourceKind===authority):items;
  return {schema:'enjaz.scheduling-calendar.v1',workspaceId:WORKSPACE,actorUserId:USER,timezone:'Asia/Baghdad',asOf:'2026-09-17T02:40:00.000Z',windowStart:'2026-08-17T21:00:00.000Z',windowEnd:'2026-11-18T21:00:00.000Z',filters:{staffMemberId:null,companyId:null,transactionId:null,authority},summary:{totalCount:filtered.length,returnedCount:filtered.length,appointmentCount:filtered.filter(x=>x.sourceKind==='appointment').length,workflowDeadlineCount:filtered.filter(x=>x.sourceKind==='workflow_deadline').length,renewalOccurrenceCount:filtered.filter(x=>x.sourceKind==='renewal_occurrence').length,conflictCount:filtered.filter(x=>x.isConflict).length,overdueCount:filtered.filter(x=>x.isOverdue).length,upcomingCount:filtered.filter(x=>x.isUpcoming).length,pastUnresolvedAppointmentCount:0},items:filtered,exportBoundary:{mode:'outbound_projection_only',externalStateCanonical:false,externalMutationAllowed:false}};
}

const factory=Object.freeze({
  async resolveWorkspaceId(userId:string){if(userId!==USER)throw new Error('Unexpected browser user');return WORKSPACE;},
  async rpc(functionName:string,args:Record<string,unknown>={}){if(functionName!=='get_scheduling_calendar_v1')return {data:null,error:{message:`Unexpected RPC ${functionName}`}};if(args.p_workspace_id!==WORKSPACE)return {data:null,error:{message:'ENJAZ_SCHEDULING_WORKSPACE_FORBIDDEN'}};return {data:snapshot(typeof args.p_authority==='string'?args.p_authority:null),error:null};},
}) as unknown as EnjazDataLayerFactory;

const root=document.getElementById('phase11-5-calendar-root');
if(!root)throw new Error('Phase 11.5-D calendar browser root missing');
createRoot(root).render(<StrictMode><main className="ez-r2-root r2-shell__main" dir="rtl"><UnifiedCalendarExperience factory={factory} userId={USER}/></main></StrictMode>);
