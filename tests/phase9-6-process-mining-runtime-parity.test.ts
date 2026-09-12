import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory,EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import type { ReadRepository } from '../src/data/repositories/createEntityRepository.ts';
import { ENJAZ_PROCESS_MINING_SCHEMA,buildEmpiricalDelayPrediction,buildEmpiricalNextActivityPrediction,buildProcessEvent,buildProcessPath,classifyBottleneckCandidates as canonicalBottlenecks,type ProcessEventProvenance,type ProcessPath } from '../src/features/process-intelligence/processMiningContract.ts';
import { createProcessRuntimeGateway } from '../src/features/process-intelligence/processMiningRuntime.ts';

const W='11111111-1111-4111-8111-111111111111',USER='22222222-2222-4222-8222-222222222222',AS_OF=new Date('2026-09-12T12:00:00.000Z');
const TX=['33333333-3333-4333-8333-333333333331','33333333-3333-4333-8333-333333333332','33333333-3333-4333-8333-333333333333','33333333-3333-4333-8333-333333333334'] as const;
const UUID=(n:number)=>`44444444-4444-4444-8444-${String(n).padStart(12,'0')}`;
function activity(id:number,tx:string,eventType:string,time:string):RowOf<'transaction_activity'>{return {id:UUID(id),workspace_id:W,transaction_id:tx,event_type:eventType,summary:eventType,occurred_at:time,source_entity_type:null,source_entity_id:null,metadata:{},actor_user_id:null,legacy_id:null,legacy_source:null} as RowOf<'transaction_activity'>}
function repo(rows:readonly RowOf<'transaction_activity'>[]):ReadRepository<'transaction_activity'>{return {async list(request){const offset=request?.offset??0,limit=request?.limit??100,items=rows.slice(offset,offset+limit);return {items,offset,limit,total:rows.length,hasMore:offset+items.length<rows.length}},async getById(id){return rows.find(x=>x.id===id)??null}}}
function factory(rows:readonly RowOf<'transaction_activity'>[]):EnjazDataLayerFactory{return {async resolveWorkspaceId(){return W},forWorkspace(id){return {scope:{workspaceId:id},transactionActivity:repo(rows)} as unknown as EnjazWorkspaceDataLayer}}}
function client(calls:string[]){return {from(table:string){calls.push(table);const b={select(){return b},eq(){return b},lte(){return b},order(){return b},range(){return Promise.resolve({data:[],error:null})}};return b}}}
const provenance=(caseId:string,id:string):ProcessEventProvenance=>({schema:ENJAZ_PROCESS_MINING_SCHEMA,workspaceId:W,caseId,sourceDomain:'transaction-lifecycle',sourceEntity:'transaction_activity',sourceEventId:id,sourceAsOf:AS_OF.toISOString(),basis:['id','transaction_id','event_type','occurred_at'],derivationVersion:'phase9.6-runtime-parity-v1'});
function canonicalPath(caseId:string,next:string,day:number,hours:number):ProcessPath{const start=new Date(Date.UTC(2026,8,day,8)),end=new Date(start.getTime()+hours*3_600_000);return buildProcessPath([buildProcessEvent({workspaceId:W,caseId,activityKey:'transaction:review',labelAr:'نشاط: review',occurredAt:start.toISOString(),provenance:provenance(caseId,`${caseId}-a`)}),buildProcessEvent({workspaceId:W,caseId,activityKey:`transaction:${next}`,labelAr:`نشاط: ${next}`,occurredAt:end.toISOString(),provenance:provenance(caseId,`${caseId}-b`)})])}
function rows(nexts:readonly string[],hours:readonly number[]){return TX.flatMap((tx,i)=>{const start=new Date(Date.UTC(2026,8,i+1,8)),end=new Date(start.getTime()+hours[i]!*3_600_000);return [activity(10+i*2,tx,'review',start.toISOString()),activity(11+i*2,tx,nexts[i]!,end.toISOString())]})}

async function runtime(nexts:readonly string[],hours:readonly number[]){const calls:string[]=[],r=createProcessRuntimeGateway(client(calls) as never,factory(rows(nexts,hours))),s=await r.load(USER,AS_OF);return {r,s,calls}}

test('9.6 runtime parity 01 — compact browser paths and bottlenecks preserve canonical ordering/duration semantics and never read sync receipts',async()=>{
 const {r,s,calls}=await runtime(['approve','approve','approve','reject'],[4,3,2,1]),canonical=TX.map((tx,i)=>canonicalPath(tx,i===3?'reject':'approve',i+1,[4,3,2,1][i]!));
 assert.equal(s.c.length,4);for(let i=0;i<s.c.length;i++){assert.equal(s.c[i]![1],canonical[i]!.ordering==='partial');assert.equal(s.c[i]![2],canonical[i]!.observedDurationMs);assert.equal(s.c[i]![3],canonical[i]!.reworkCount)}
 const actual=r.bottlenecks(s,7_200_000),expected=canonical.flatMap(p=>canonicalBottlenecks(p,7_200_000).map(x=>[p.caseId,x.fromActivityKey,x.toActivityKey,x.durationMs] as const)).sort((a,b)=>b[3]-a[3]||a[0].localeCompare(b[0])).slice(0,8);assert.deepEqual(actual,expected);
 assert.deepEqual(calls.sort(),['field_assignments','field_visit_evidence','field_visits','workflow_instances','workflow_transition_events'].sort());assert.ok(!calls.includes('field_sync_receipts'));
});

test('9.6 runtime parity 02 — compact next-activity prediction preserves canonical winner, confidence, integer probability and evidence count',async()=>{
 const {r,s}=await runtime(['approve','approve','approve','reject'],[1,1,1,1]),canonical=TX.map((tx,i)=>canonicalPath(tx,i===3?'reject':'approve',i+1,1)),p=buildEmpiricalNextActivityPrediction({workspaceId:W,currentActivityKey:'transaction:review',historicalPaths:canonical,asOf:AS_OF.toISOString(),assumptions:['runtime parity']});
 const x=r.next(s,'transaction:review');assert.ok(x);assert.deepEqual(x,[p.confidence==='directional',p.predictedActivityKey,p.probabilityBps,p.sampleCount,p.provenance.length]);
});

test('9.6 runtime parity 03 — compact delay prediction preserves canonical strict-positive waits and governed threshold probability',async()=>{
 const {r,s}=await runtime(['approve','approve','approve','approve'],[4,3,2,1]),canonical=TX.map((tx,i)=>canonicalPath(tx,'approve',i+1,[4,3,2,1][i]!)),p=buildEmpiricalDelayPrediction({workspaceId:W,currentActivityKey:'transaction:review',historicalPaths:canonical,thresholdMs:7_200_000,asOf:AS_OF.toISOString(),assumptions:['runtime parity']});
 const x=r.delay(s,'transaction:review',7_200_000);assert.ok(x);assert.deepEqual(x,[p.confidence==='directional',p.probabilityBps,p.sampleCount,p.delayedSampleCount,p.provenance.length]);
});
