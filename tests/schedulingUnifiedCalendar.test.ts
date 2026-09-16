import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import type { EnjazDataLayerFactory } from '../src/data/createDataLayer.ts';
import { loadUnifiedCalendar, UnifiedCalendarError, UnifiedCalendarWorkspaceUnavailableError } from '../src/features/scheduling/unifiedCalendarService.ts';

const migration = fs.readFileSync(new URL('../database/migrations/phase_11_5_unified_calendar_read_model.sql',import.meta.url),'utf8');
const WORKSPACE='11111111-1111-4111-8111-111111111111';
const USER='22222222-2222-4222-8222-222222222222';
const EVENT='33333333-3333-4333-8333-333333333333';
const STAFF='44444444-4444-4444-8444-444444444444';
const COMPANY='55555555-5555-4555-8555-555555555555';
const TRANSACTION='66666666-6666-4666-8666-666666666666';
const START='2026-09-16T08:00:00.000Z';
const END='2026-09-16T09:00:00.000Z';

test('D read model composes canonical sources without creating shadow scheduling truth',()=>{
  for(const marker of [
    'private.get_scheduling_calendar_v1_impl',
    'public.get_scheduling_calendar_v1',
    "'sourceKind','appointment'",
    "'sourceKind','workflow_deadline'",
    "'sourceKind','renewal_occurrence'",
    'from public.calendar_events e',
    'from public.workflow_deadline_evidence d',
    'from public.renewal_occurrences o',
    'join public.renewals r',
    'private.calendar_staff_conflict_snapshot_v1',
    'public.calendar_event_reschedule_history',
    'public.deadline_miss_reviews',
    "'mode','outbound_projection_only'",
    "'externalStateCanonical',false",
    "'externalMutationAllowed',false",
  ]) assert.ok(migration.includes(marker),`missing unified-calendar authority marker: ${marker}`);
  assert.ok(!migration.includes('create table public.scheduling_calendar'));
  assert.ok(!migration.includes('create table public.calendar_items'));
  assert.ok(!migration.includes('create table public.external_calendar'));
});

test('D read boundary is authenticated, workspace scoped and public facade is SECURITY INVOKER',()=>{
  for(const marker of [
    'v_actor:=private.require_scheduling_workspace_member_v1(p_workspace_id)',
    "security definer set search_path=''",
    "language sql stable security invoker set search_path=''",
    'ENJAZ_SCHEDULING_CALENDAR_STAFF_OUT_OF_SCOPE',
    'ENJAZ_SCHEDULING_CALENDAR_COMPANY_OUT_OF_SCOPE',
    'ENJAZ_SCHEDULING_CALENDAR_TRANSACTION_OUT_OF_SCOPE',
    'ENJAZ_SCHEDULING_CALENDAR_FILTER_CONTEXT_MISMATCH',
    'grant execute on function public.get_scheduling_calendar_v1',
  ]) assert.ok(migration.includes(marker),`missing read-boundary marker: ${marker}`);
  assert.ok(migration.includes('revoke all on function public.get_scheduling_calendar_v1'));
});

test('staff filtering never infers workflow or renewal ownership into a specific employee',()=>{
  const occurrences=(migration.match(/and p_staff_member_id is null/g)??[]).length;
  assert.ok(occurrences>=2,'workflow deadlines and renewal occurrences must be excluded from explicit staff scope unless a future canonical assignment exists');
  assert.ok(migration.includes('public.calendar_event_staff_assignments sa'));
  assert.ok(!migration.includes('transaction_organization_ownership') || migration.includes('organizationScopeOwnershipMayInferSpecificStaffAssignment'));
});

test('calendar window and authority input fail closed in database contract',()=>{
  assert.ok(migration.includes("v_window_end-v_window_start>interval '370 days'"));
  assert.ok(migration.includes('ENJAZ_SCHEDULING_CALENDAR_WINDOW_INVALID'));
  assert.ok(migration.includes("v_authority not in ('appointment','workflow_deadline','renewal_occurrence')"));
  assert.ok(migration.includes('ENJAZ_SCHEDULING_CALENDAR_AUTHORITY_INVALID'));
});

function payload(overrides:Record<string,unknown>={}){
  return {
    schema:'enjaz.scheduling-calendar.v1', workspaceId:WORKSPACE, actorUserId:USER, timezone:'Asia/Baghdad',
    asOf:'2026-09-16T07:00:00.000Z', windowStart:'2026-09-01T00:00:00.000Z', windowEnd:'2026-10-01T00:00:00.000Z',
    filters:{staffMemberId:STAFF,companyId:COMPANY,transactionId:TRANSACTION,authority:'appointment'},
    summary:{totalCount:1,returnedCount:1,appointmentCount:1,workflowDeadlineCount:0,renewalOccurrenceCount:0,conflictCount:0,overdueCount:0,upcomingCount:1,pastUnresolvedAppointmentCount:0},
    items:[{
      id:EVENT,sourceKind:'appointment',canonicalId:EVENT,title:'مراجعة دائرة',eventType:'government_visit',startsAt:START,endsAt:END,allDay:false,localDate:'2026-09-16',
      status:'scheduled',temporalState:'upcoming',isUpcoming:true,isOverdue:false,transactionId:TRANSACTION,transactionLabel:'معاملة',companyId:COMPANY,companyLabel:'شركة اختبار',
      staffMemberIds:[STAFF],conflictState:'clear',isConflict:false,confirmationStatus:'confirmed',attendanceOutcome:null,version:2,workflowInstanceId:null,renewalId:null,
      occurrenceSequence:null,stagePosition:null,dueDate:null,cutoffAt:null,rescheduleCount:1,lastRescheduledAt:'2026-09-15T08:00:00.000Z',lastRescheduleReason:'تغيير الموعد',missReviewRecorded:false,
    }],
    exportBoundary:{mode:'outbound_projection_only',externalStateCanonical:false,externalMutationAllowed:false},
    ...overrides,
  };
}

function factoryFor(data:unknown,calls:Array<{name:string,args:Record<string,unknown>}>,workspace:string|null=WORKSPACE):EnjazDataLayerFactory{
  return {
    async resolveWorkspaceId(){return workspace;},
    async rpc<T>(name:string,args:Record<string,unknown>){calls.push({name,args});return {data:data as T,error:null};},
  } as unknown as EnjazDataLayerFactory;
}

test('runtime service sends exact scoped filters and strictly parses canonical calendar payload',async()=>{
  const calls:Array<{name:string,args:Record<string,unknown>}>=[];
  const result=await loadUnifiedCalendar(factoryFor(payload(),calls),USER,{
    windowStart:'2026-09-01T00:00:00.000Z',windowEnd:'2026-10-01T00:00:00.000Z',staffMemberId:STAFF,companyId:COMPANY,transactionId:TRANSACTION,authority:'appointment',limit:120,
  });
  assert.equal(result.timezone,'Asia/Baghdad');
  assert.equal(result.items[0]?.sourceKind,'appointment');
  assert.equal(result.items[0]?.attendanceOutcome,null);
  assert.equal(result.exportBoundary.externalMutationAllowed,false);
  assert.deepEqual(calls,[{name:'get_scheduling_calendar_v1',args:{
    p_workspace_id:WORKSPACE,p_window_start:'2026-09-01T00:00:00.000Z',p_window_end:'2026-10-01T00:00:00.000Z',p_staff_member_id:STAFF,p_company_id:COMPANY,p_transaction_id:TRANSACTION,p_authority:'appointment',p_limit:120,
  }}]);
});

test('runtime rejects shadow schema or external-calendar canonicalization',async()=>{
  await assert.rejects(
    ()=>loadUnifiedCalendar(factoryFor(payload({schema:'shadow.calendar.v1'}),[]),USER),
    (error:unknown)=>error instanceof UnifiedCalendarError&&error.code==='INVALID_CALENDAR_SCHEMA',
  );
  await assert.rejects(
    ()=>loadUnifiedCalendar(factoryFor(payload({exportBoundary:{mode:'outbound_projection_only',externalStateCanonical:true,externalMutationAllowed:false}}),[]),USER),
    (error:unknown)=>error instanceof UnifiedCalendarError&&error.code==='INVALID_CALENDAR_EXPORT_BOUNDARY',
  );
});

test('runtime validates ranges before RPC and fails explicitly when no workspace exists',async()=>{
  const calls:Array<{name:string,args:Record<string,unknown>}>=[];
  await assert.rejects(
    ()=>loadUnifiedCalendar(factoryFor(payload(),calls),USER,{windowStart:'2026-10-01T00:00:00.000Z',windowEnd:'2026-09-01T00:00:00.000Z'}),
    (error:unknown)=>error instanceof UnifiedCalendarError&&error.code==='INVALID_WINDOW_RANGE',
  );
  assert.equal(calls.length,0);
  await assert.rejects(
    ()=>loadUnifiedCalendar(factoryFor(payload(),[],null),USER),
    (error:unknown)=>error instanceof UnifiedCalendarWorkspaceUnavailableError,
  );
});
