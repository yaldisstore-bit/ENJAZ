import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory } from '../src/data/createDataLayer.ts';
import { buildUnifiedCalendarIcs, loadUnifiedCalendar, parseUnifiedCalendarSnapshot, shiftUnifiedCalendarAnchor } from '../src/features/scheduling/unifiedCalendar.ts';

const WORKSPACE='11111111-1111-4111-8111-111111111111';
const EVENT='22222222-2222-4222-8222-222222222222';
const STAFF='33333333-3333-4333-8333-333333333333';
const COMPANY='44444444-4444-4444-8444-444444444444';
const TX='55555555-5555-4555-8555-555555555555';

const payload={
  schema:'enjaz.unified-calendar.v2',workspaceId:WORKSPACE,workspaceTimezone:'Asia/Baghdad',view:'month',anchorDate:'2026-09-17',businessToday:'2026-09-17',
  businessStartDate:'2026-09-01',businessEndDate:'2026-10-01',generatedAt:'2026-09-17T05:30:00Z',authority:'all',staffMemberId:null,companyId:null,transactionId:null,
  items:[{
    id:EVENT,source:'appointment',authority:'calendar_events',title:'موعد اختبار',eventType:'meeting',startsAt:'2026-09-17T08:00:00Z',endsAt:'2026-09-17T09:00:00Z',dueDate:null,
    status:'scheduled',attentionState:'due_today',transactionId:TX,companyId:COMPANY,companyLabel:'شركة اختبار',workflowInstanceId:null,staffMemberIds:[STAFF],confirmationStatus:'confirmed',attendanceOutcome:null,
    version:3,recurrenceRule:null,deadlineStageName:null,deadlineSourceFingerprint:null,
  }],
};

test('loads v2 through governed RPC and preserves filter arguments',async()=>{
  let seenName='';let seenArgs:Record<string,unknown>|undefined;
  const factory={rpc:async(name:string,args?:Record<string,unknown>)=>{seenName=name;seenArgs=args;return{data:payload,error:null}}} as unknown as EnjazDataLayerFactory;
  const result=await loadUnifiedCalendar(factory,{workspaceId:WORKSPACE,view:'month',anchorDate:'2026-09-17',authority:'appointment',staffMemberId:STAFF,companyId:COMPANY,transactionId:TX});
  assert.equal(seenName,'list_unified_calendar_v2');
  assert.equal(seenArgs?.p_workspace_id,WORKSPACE);
  assert.equal(seenArgs?.p_staff_member_id,STAFF);
  assert.equal(seenArgs?.p_company_id,COMPANY);
  assert.equal(seenArgs?.p_transaction_id,TX);
  assert.equal(result.workspaceTimezone,'Asia/Baghdad');
  assert.equal(result.items[0]?.version,3);
});

test('rejects malformed or downgraded calendar schemas',()=>{
  assert.throws(()=>parseUnifiedCalendarSnapshot({...payload,schema:'enjaz.unified-calendar.v1'}));
  assert.throws(()=>parseUnifiedCalendarSnapshot({...payload,items:[{...payload.items[0],staffMemberIds:'not-an-array'}]}));
});

test('date navigation is date-only and independent of device timezone',()=>{
  assert.equal(shiftUnifiedCalendarAnchor('2026-09-17','day',1),'2026-09-18');
  assert.equal(shiftUnifiedCalendarAnchor('2026-09-17','week',-1),'2026-09-10');
  assert.equal(shiftUnifiedCalendarAnchor('2026-09-17','month',1),'2026-10-01');
  assert.equal(shiftUnifiedCalendarAnchor('2026-09-17','agenda',1),'2026-12-16');
});

test('calendar export is one-way ICS evidence and never becomes scheduling authority',()=>{
  const snapshot=parseUnifiedCalendarSnapshot(payload);
  const ics=buildUnifiedCalendarIcs(snapshot);
  assert.match(ics,/PRODID:-\/\/ENJAZ\/\/Unified Calendar Export\/\/AR/);
  assert.match(ics,/METHOD:PUBLISH/);
  assert.match(ics,/X-ENJAZ-AUTHORITY:calendar_events/);
  assert.match(ics,/UID:appointment-22222222-2222-4222-8222-222222222222@enjaz\.local/);
  assert.doesNotMatch(ics,/METHOD:REQUEST|METHOD:REPLY|BEGIN:VTODO/);
});
