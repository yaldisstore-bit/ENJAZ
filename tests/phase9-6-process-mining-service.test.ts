import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { DataPage, RowOf } from '../src/data/contracts/dataTypes.ts';
import type { ReadRepository } from '../src/data/repositories/createEntityRepository.ts';
import { predictDelayRisk, predictNextActivity, loadProcessMiningSnapshot, ProcessCompositionAuthorityError, ProcessCompositionOrphanError, ProcessCompositionPageStalledError } from '../src/features/process-intelligence/processMiningService.ts';
import { createProcessMiningHistoryGateway, ProcessSourceShapeError, ProcessSourceTimeError, type ProcessMiningHistoryGateway, type ProcessMiningHistorySnapshot } from '../src/features/process-intelligence/processMiningSources.ts';

const W='11111111-1111-4111-8111-111111111111';
const USER='22222222-2222-4222-8222-222222222222';
const TX1='33333333-3333-4333-8333-333333333331';
const TX2='33333333-3333-4333-8333-333333333332';
const TX3='33333333-3333-4333-8333-333333333333';
const TX4='33333333-3333-4333-8333-333333333334';
const AS_OF=new Date('2026-09-12T12:00:00.000Z');
const UUID=(n:number)=>`44444444-4444-4444-8444-${String(n).padStart(12,'0')}`;

function activity(id:number,transactionId:string,eventType:string,occurredAt:string):RowOf<'transaction_activity'>{return {id:UUID(id),workspace_id:W,transaction_id:transactionId,event_type:eventType,summary:eventType,occurred_at:occurredAt,source_entity_type:null,source_entity_id:null,metadata:{},actor_user_id:null,legacy_id:null,legacy_source:null} as RowOf<'transaction_activity'>}
function repo(rows:readonly RowOf<'transaction_activity'>[],stalled=false):ReadRepository<'transaction_activity'>{return {async list(request){if(stalled)return {items:[],offset:request?.offset??0,limit:request?.limit??100,total:null,hasMore:true};const offset=request?.offset??0,limit=request?.limit??100,items=rows.slice(offset,offset+limit);return {items,offset,limit,total:rows.length,hasMore:offset+items.length<rows.length}},async getById(id){return rows.find(x=>x.id===id)??null}}}
function dataFactory(rows:readonly RowOf<'transaction_activity'>[],options:Readonly<{workspaceId?:string|null;stalled?:boolean}>={}):EnjazDataLayerFactory{
 const workspaceId=options.workspaceId===undefined?W:options.workspaceId;
 return {async resolveWorkspaceId(){return workspaceId},forWorkspace(id){return {scope:{workspaceId:id},transactionActivity:repo(rows,options.stalled===true)} as unknown as EnjazWorkspaceDataLayer}};
}
function history(overrides:Partial<ProcessMiningHistorySnapshot>={}):ProcessMiningHistorySnapshot{
 const base:ProcessMiningHistorySnapshot=Object.freeze({
  authority:'source_owned_process_histories',workspaceId:W,asOf:AS_OF.toISOString(),
  workflowInstances:Object.freeze([{id:UUID(100),workspaceId:W,transactionId:TX1,startedAt:'2026-09-01T08:00:00.000Z'}]),
  workflowTransitions:Object.freeze([{id:UUID(101),workspaceId:W,workflowInstanceId:UUID(100),transitionKey:'advance_review',eventKind:'advance' as const,fromStagePosition:1,toStagePosition:2,occurredAt:'2026-09-01T09:00:00.000Z'}]),
  fieldAssignments:Object.freeze([{id:UUID(200),workspaceId:W,transactionId:TX1,status:'handoff_complete' as const,createdAt:'2026-09-01T10:00:00.000Z',handoffAt:'2026-09-01T14:00:00.000Z'}]),
  fieldVisits:Object.freeze([{id:UUID(201),workspaceId:W,assignmentId:UUID(200),transactionId:TX1,status:'completed' as const,checkInAt:'2026-09-01T11:00:00.000Z',checkOutAt:'2026-09-01T12:00:00.000Z'}]),
  fieldEvidence:Object.freeze([{id:UUID(202),workspaceId:W,visitId:UUID(201),transactionId:TX1,evidenceType:'receipt' as const,capturedAt:'2026-09-01T11:30:00.000Z'}]),
  syncReceiptPolicy:'actor_scoped_integrity_evidence_not_path_input',
 });
 return Object.freeze({...base,...overrides});
}
function historyGateway(snapshot:ProcessMiningHistorySnapshot):ProcessMiningHistoryGateway{return {async loadWorkspaceHistory(){return snapshot}}}

async function snapshot(rows:readonly RowOf<'transaction_activity'>[],h=history()){return loadProcessMiningSnapshot({dataFactory:dataFactory(rows),historyGateway:historyGateway(h)},USER,AS_OF)}

test('9.6 service 01 — composes transaction, workflow and field source histories into one transaction case',async()=>{
 const s=await snapshot([activity(1,TX1,'transaction_created','2026-09-01T07:00:00.000Z')]);
 assert.equal(s.authority,'read_only_derived_process_intelligence');assert.equal(s.cases.length,1);assert.equal(s.cases[0]!.caseId,TX1);assert.equal(s.cases[0]!.events.length,7);
 assert.deepEqual(s.cases[0]!.events.map(x=>x.activityKey),['transaction:transaction_created','workflow:advance:advance_review','field:assignment_created','field:visit_check_in','field:evidence:receipt','field:visit_completed','field:handoff']);
 assert.deepEqual(s.sourceCounts,{transactionActivity:1,workflowInstances:1,workflowTransitions:1,fieldAssignments:1,fieldVisits:1,fieldEvidence:1});assert.equal(s.syncReceiptPolicy,'actor_scoped_integrity_evidence_not_path_input');
});

test('9.6 service 02 — equal-time cross-source events stay partial instead of becoming a fake strict sequence',async()=>{
 const h=history({workflowTransitions:Object.freeze([{id:UUID(101),workspaceId:W,workflowInstanceId:UUID(100),transitionKey:'advance_review',eventKind:'advance' as const,fromStagePosition:1,toStagePosition:2,occurredAt:'2026-09-01T07:00:00.000Z'}])});const s=await snapshot([activity(1,TX1,'transaction_created','2026-09-01T07:00:00.000Z')],h);assert.equal(s.cases[0]!.ordering,'partial');
});

test('9.6 service 03 — orphan workflow transition fails closed',async()=>{
 const h=history({workflowInstances:Object.freeze([])});await assert.rejects(()=>snapshot([],h),ProcessCompositionOrphanError);
});

test('9.6 service 04 — field visit must resolve its authoritative assignment and transaction',async()=>{
 const orphan=history({fieldAssignments:Object.freeze([]),fieldEvidence:Object.freeze([])});await assert.rejects(()=>snapshot([],orphan),ProcessCompositionOrphanError);
 const drift=history({fieldAssignments:Object.freeze([{id:UUID(200),workspaceId:W,transactionId:TX2,status:'queued',createdAt:'2026-09-01T10:00:00.000Z',handoffAt:null}]),fieldEvidence:Object.freeze([])});await assert.rejects(()=>snapshot([],drift),ProcessCompositionAuthorityError);
});

test('9.6 service 05 — evidence must resolve its visit, share transaction, and not predate check-in',async()=>{
 const orphan=history({fieldEvidence:Object.freeze([{id:UUID(202),workspaceId:W,visitId:UUID(999),transactionId:TX1,evidenceType:'receipt',capturedAt:'2026-09-01T11:30:00.000Z'}])});await assert.rejects(()=>snapshot([],orphan),ProcessCompositionOrphanError);
 const early=history({fieldEvidence:Object.freeze([{id:UUID(202),workspaceId:W,visitId:UUID(201),transactionId:TX1,evidenceType:'receipt',capturedAt:'2026-09-01T10:30:00.000Z'}])});await assert.rejects(()=>snapshot([],early),ProcessCompositionAuthorityError);
});

test('9.6 service 06 — history authority/workspace/as-of/sync policy drift is rejected',async()=>{
 await assert.rejects(()=>snapshot([],history({workspaceId:TX2})),ProcessCompositionAuthorityError);
 await assert.rejects(()=>snapshot([],history({asOf:'2026-09-12T11:59:59.000Z'})),ProcessCompositionAuthorityError);
 await assert.rejects(()=>snapshot([],history({syncReceiptPolicy:'wrong' as ProcessMiningHistorySnapshot['syncReceiptPolicy']})),ProcessCompositionAuthorityError);
});

test('9.6 service 07 — transaction activity workspace drift fails rather than leaking another workspace into a case',async()=>{
 const row={...activity(1,TX1,'transaction_created','2026-09-01T07:00:00.000Z'),workspace_id:TX2} as RowOf<'transaction_activity'>;await assert.rejects(()=>snapshot([row]),ProcessCompositionAuthorityError);
});

test('9.6 service 08 — stalled transaction paging fails closed',async()=>{
 await assert.rejects(()=>loadProcessMiningSnapshot({dataFactory:dataFactory([],{stalled:true}),historyGateway:historyGateway(history({workflowInstances:Object.freeze([]),workflowTransitions:Object.freeze([]),fieldAssignments:Object.freeze([]),fieldVisits:Object.freeze([]),fieldEvidence:Object.freeze([])}))},USER,AS_OF),ProcessCompositionPageStalledError);
});

test('9.6 service 09 — empirical prediction consumes composed cases and keeps insufficient/tie semantics from the contract',async()=>{
 const emptyHistory=history({workflowInstances:Object.freeze([]),workflowTransitions:Object.freeze([]),fieldAssignments:Object.freeze([]),fieldVisits:Object.freeze([]),fieldEvidence:Object.freeze([])});
 const rows=[TX1,TX2,TX3,TX4].flatMap((tx,i)=>[activity(10+i*2,tx,'review',`2026-09-0${i+1}T08:00:00.000Z`),activity(11+i*2,tx,i===3?'reject':'approve',`2026-09-0${i+1}T09:00:00.000Z`)]);
 const s=await snapshot(rows,emptyHistory),p=predictNextActivity(s,'transaction:review');assert.equal(p.confidence,'directional');assert.equal(p.predictedActivityKey,'transaction:approve');assert.equal(p.probabilityBps,7500);assert.equal(p.authoritative,false);
});

test('9.6 source 10 — read gateway queries source-owned tables only and never reads actor-scoped sync receipts into process paths',async()=>{
 const calls:string[]=[];const tables:Record<string,readonly Record<string,unknown>[]>={
  workflow_instances:[{id:UUID(100),workspace_id:W,transaction_id:TX1,started_at:'2026-09-01T08:00:00.000Z'}],
  workflow_transition_events:[{id:UUID(101),workspace_id:W,workflow_instance_id:UUID(100),transition_key:'advance_review',event_kind:'advance',from_stage_position:1,to_stage_position:2,occurred_at:'2026-09-01T09:00:00.000Z'}],
  field_assignments:[{id:UUID(200),workspace_id:W,transaction_id:TX1,status:'queued',created_at:'2026-09-01T10:00:00.000Z',handoff_at:null}],
  field_visits:[{id:UUID(201),workspace_id:W,assignment_id:UUID(200),transaction_id:TX1,status:'checked_in',check_in_at:'2026-09-01T11:00:00.000Z',check_out_at:null}],
  field_visit_evidence:[{id:UUID(202),workspace_id:W,visit_id:UUID(201),transaction_id:TX1,evidence_type:'other',captured_at:'2026-09-01T11:30:00.000Z'}],
  field_sync_receipts:[{id:UUID(999)}],
 };
 const client={from(table:string){calls.push(table);let rows=tables[table]??[];const b={select(){return b},eq(column:string,value:unknown){rows=rows.filter(r=>r[column]===value);return b},lte(column:string,value:unknown){rows=rows.filter(r=>Date.parse(String(r[column]))<=Date.parse(String(value)));return b},order(){return b},range(from:number,to:number){return Promise.resolve({data:rows.slice(from,to+1),error:null})}};return b}};
 const h=await createProcessMiningHistoryGateway(client as never).loadWorkspaceHistory(W,AS_OF);assert.equal(h.workflowTransitions.length,1);assert.equal(h.fieldEvidence.length,1);assert.equal(h.syncReceiptPolicy,'actor_scoped_integrity_evidence_not_path_input');assert.deepEqual(calls.sort(),['field_assignments','field_visit_evidence','field_visits','workflow_instances','workflow_transition_events'].sort());assert.ok(!calls.includes('field_sync_receipts'));
});

test('9.6 source 11 — gateway rejects workspace drift and future source timestamps even if a backend response is malformed',async()=>{
 function clientFor(row:Record<string,unknown>){return {from(table:string){let rows=table==='workflow_instances'?[row]:[];const b={select(){return b},eq(){return b},lte(){return b},order(){return b},range(from:number,to:number){return Promise.resolve({data:rows.slice(from,to+1),error:null})}};return b}}}
 await assert.rejects(()=>createProcessMiningHistoryGateway(clientFor({id:UUID(100),workspace_id:TX2,transaction_id:TX1,started_at:'2026-09-01T08:00:00.000Z'}) as never).loadWorkspaceHistory(W,AS_OF),ProcessSourceShapeError);
 await assert.rejects(()=>createProcessMiningHistoryGateway(clientFor({id:UUID(100),workspace_id:W,transaction_id:TX1,started_at:'2026-09-13T08:00:00.000Z'}) as never).loadWorkspaceHistory(W,AS_OF),ProcessSourceTimeError);
});

test('9.6 service 12 — delay risk wrapper uses composed paths, preserves evidence semantics and rejects authority drift',async()=>{
 const emptyHistory=history({workflowInstances:Object.freeze([]),workflowTransitions:Object.freeze([]),fieldAssignments:Object.freeze([]),fieldVisits:Object.freeze([]),fieldEvidence:Object.freeze([])});
 const hours=[4,3,2,1],txs=[TX1,TX2,TX3,TX4];const rows=txs.flatMap((tx,i)=>{const day=i+1,start=new Date(Date.UTC(2026,8,day,8)),end=new Date(start.getTime()+hours[i]!*3_600_000);return [activity(30+i*2,tx,'review',start.toISOString()),activity(31+i*2,tx,'approve',end.toISOString())]});
 const s=await snapshot(rows,emptyHistory),p=predictDelayRisk(s,'transaction:review',7_200_000);assert.equal(p.authoritative,false);assert.equal(p.method,'empirical_wait_threshold_frequency');assert.equal(p.confidence,'directional');assert.equal(p.sampleCount,4);assert.equal(p.delayedSampleCount,3);assert.equal(p.probabilityBps,7500);assert.ok(p.provenance.length===8);
 const drift={...s,authority:'wrong'};assert.throws(()=>predictDelayRisk(drift as never,'transaction:review',7_200_000),ProcessCompositionAuthorityError);
});
