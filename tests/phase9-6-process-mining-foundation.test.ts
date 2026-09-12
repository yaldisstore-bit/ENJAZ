import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
 ENJAZ_PROCESS_MINING_SCHEMA,PROCESS_MIN_DIRECTIONAL_CASES,
 ProcessCaseLineageError,ProcessDuplicateSourceEventError,ProcessMiningContractError,ProcessProvenanceRequiredError,ProcessTimeError,ProcessUnsafeIntegerError,ProcessWorkspaceLineageError,
 buildEmpiricalDelayPrediction,buildEmpiricalNextActivityPrediction,buildObservedProcessWaits,buildProcessEvent,buildProcessPath,classifyBottleneckCandidates,parseProcessEventProvenance,
 type ProcessEvent,type ProcessEventProvenance,type ProcessSourceDomain,
} from '../src/features/process-intelligence/processMiningContract.ts';

const AS_OF='2026-09-12T00:00:00.000Z';
const state=JSON.parse(fs.readFileSync(new URL('../docs/PHASE9_6_STATE.json',import.meta.url),'utf8'));
const prior=JSON.parse(fs.readFileSync(new URL('../docs/PHASE9_5_STATE.json',import.meta.url),'utf8'));
const registry=JSON.parse(fs.readFileSync(new URL('../docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json',import.meta.url),'utf8'));

function provenance(overrides:Partial<ProcessEventProvenance>={}):ProcessEventProvenance{return Object.freeze({schema:ENJAZ_PROCESS_MINING_SCHEMA,workspaceId:'workspace-a',caseId:'case-a',sourceDomain:'workflow' as ProcessSourceDomain,sourceEntity:'workflow_transition_events',sourceEventId:'event-a',sourceAsOf:AS_OF,basis:Object.freeze(['occurred_at','transition_key']),derivationVersion:'phase9.6-foundation-v1',...overrides})}
function event(caseId:string,activityKey:string,occurredAt:string,index:number,overrides:Partial<ProcessEventProvenance>={}):ProcessEvent{return buildProcessEvent({workspaceId:overrides.workspaceId??'workspace-a',caseId,activityKey,labelAr:`نشاط ${activityKey}`,occurredAt,provenance:provenance({caseId,sourceEventId:`${caseId}-${index}`,sourceAsOf:AS_OF,...overrides})})}
function path(caseId:string,next:string,index:number){return buildProcessPath([event(caseId,'review',`2026-09-0${index}T08:00:00.000Z`,1),event(caseId,next,`2026-09-0${index}T09:00:00.000Z`,2)])}
function delayPath(caseId:string,index:number,hours:number,workspaceId='workspace-a'){const start=new Date(Date.UTC(2026,8,index,8));const end=new Date(start.getTime()+hours*3_600_000);return buildProcessPath([event(caseId,'review',start.toISOString(),1,{workspaceId}),event(caseId,'approve',end.toISOString(),2,{workspaceId})])}

test('9.6 foundation 01 — Phase 9.5 is closed and formally authorizes only Phase 9.6',()=>{
 assert.equal(prior.status,'CLOSED');assert.equal(prior.exitGatePassed,true);assert.equal(prior.phase9_6Allowed,true);assert.equal(prior.nextPhase,'9.6');assert.equal(prior.successorStatus,'AUTHORIZED');
 assert.equal(state.baseCommit,'295ad9dd308e391e7d92b1e27de74c859b0a20b1');assert.equal(state.status,'IN_PROGRESS');assert.equal(state.phase9_7Allowed,false);assert.equal(state.successorStatus,'LOCKED');
});

test('9.6 foundation 02 — provenance parser rejects malformed or incomplete event lineage',()=>{
 assert.ok(parseProcessEventProvenance(provenance()));
 assert.equal(parseProcessEventProvenance({...provenance(),workspaceId:''}),null);
 assert.equal(parseProcessEventProvenance({...provenance(),caseId:''}),null);
 assert.equal(parseProcessEventProvenance({...provenance(),sourceDomain:'finance'}),null);
 assert.equal(parseProcessEventProvenance({...provenance(),sourceAsOf:'tomorrow'}),null);
 assert.equal(parseProcessEventProvenance({...provenance(),basis:[]}),null);
});

test('9.6 foundation 03 — normalized event without valid provenance fails closed',()=>{
 assert.throws(()=>buildProcessEvent({workspaceId:'workspace-a',caseId:'case-a',activityKey:'review',labelAr:'مراجعة',occurredAt:'2026-09-01T08:00:00.000Z',provenance:{...provenance(),schema:'wrong' as typeof ENJAZ_PROCESS_MINING_SCHEMA}}),ProcessProvenanceRequiredError);
});

test('9.6 foundation 04 — event lineage cannot drift across workspace or case',()=>{
 assert.throws(()=>buildProcessEvent({workspaceId:'workspace-b',caseId:'case-a',activityKey:'review',labelAr:'مراجعة',occurredAt:'2026-09-01T08:00:00.000Z',provenance:provenance()}),ProcessWorkspaceLineageError);
 assert.throws(()=>buildProcessEvent({workspaceId:'workspace-a',caseId:'case-b',activityKey:'review',labelAr:'مراجعة',occurredAt:'2026-09-01T08:00:00.000Z',provenance:provenance()}),ProcessCaseLineageError);
});

test('9.6 foundation 05 — fabricated future event time relative to source snapshot is rejected',()=>{
 assert.throws(()=>event('case-a','review','2026-09-13T00:00:00.000Z',1),ProcessTimeError);
});

test('9.6 foundation 06 — decreasing chronology cannot be normalized into a fake process path',()=>{
 const later=event('case-a','later','2026-09-02T10:00:00.000Z',1),earlier=event('case-a','earlier','2026-09-02T09:00:00.000Z',2);
 assert.throws(()=>buildProcessPath([later,earlier]),ProcessTimeError);
});

test('9.6 foundation 07 — equal timestamps remain explicitly partial, never a proven strict sequence',()=>{
 const a=event('case-a','review','2026-09-02T09:00:00.000Z',1),b=event('case-a','approval','2026-09-02T09:00:00.000Z',2),x=buildProcessPath([a,b]);
 assert.equal(x.ordering,'partial');assert.equal(x.authoritative,false);const waits=buildObservedProcessWaits(x);assert.equal(waits[0]!.durationMs,0);assert.equal(waits[0]!.strictOrderProven,false);
});

test('9.6 foundation 08 — duplicate source event identity is rejected even when activity labels differ',()=>{
 const p=provenance({caseId:'case-a',sourceEventId:'same'});const a=buildProcessEvent({workspaceId:'workspace-a',caseId:'case-a',activityKey:'review',labelAr:'مراجعة',occurredAt:'2026-09-02T09:00:00.000Z',provenance:p});const b=buildProcessEvent({workspaceId:'workspace-a',caseId:'case-a',activityKey:'approve',labelAr:'موافقة',occurredAt:'2026-09-02T10:00:00.000Z',provenance:p});
 assert.throws(()=>buildProcessPath([a,b]),ProcessDuplicateSourceEventError);
});

test('9.6 foundation 09 — rework is derived only from repeated observed activities',()=>{
 const x=buildProcessPath([event('case-a','review','2026-09-02T08:00:00.000Z',1),event('case-a','submit','2026-09-02T09:00:00.000Z',2),event('case-a','review','2026-09-02T10:00:00.000Z',3),event('case-a','review','2026-09-02T11:00:00.000Z',4)]);
 assert.equal(x.reworkCount,2);assert.deepEqual(x.repeatedActivities,['review']);
});

test('9.6 foundation 10 — bottleneck candidates require an explicit governed threshold',()=>{
 const x=buildProcessPath([event('case-a','review','2026-09-02T08:00:00.000Z',1),event('case-a','submit','2026-09-02T09:00:00.000Z',2),event('case-a','approve','2026-09-02T13:00:00.000Z',3)]);
 const waits=buildObservedProcessWaits(x);assert.deepEqual(waits.map(v=>v.durationMs),[3_600_000,14_400_000]);const bottlenecks=classifyBottleneckCandidates(x,7_200_000);assert.equal(bottlenecks.length,1);assert.equal(bottlenecks[0]!.fromActivityKey,'submit');assert.equal(bottlenecks[0]!.evidence,'governed_duration_threshold');
 assert.throws(()=>classifyBottleneckCandidates(x,0),ProcessUnsafeIntegerError);
});

test('9.6 foundation 11 — one observed event has unknown path duration, not fabricated zero duration',()=>{
 const x=buildProcessPath([event('case-a','review','2026-09-02T08:00:00.000Z',1)]);assert.equal(x.observedDurationMs,null);assert.deepEqual(buildObservedProcessWaits(x),[]);
});

test('9.6 foundation 12 — empirical next-activity prediction is exact, disclosed and non-authoritative',()=>{
 assert.equal(PROCESS_MIN_DIRECTIONAL_CASES,4);const paths=[path('case-1','approve',1),path('case-2','approve',2),path('case-3','approve',3),path('case-4','reject',4)];
 const x=buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:paths,asOf:AS_OF,assumptions:['استمرار نمط الحالات التاريخية المؤهلة دون اعتبار النتيجة حقيقة مستقبلية.']});
 assert.equal(x.authoritative,false);assert.equal(x.method,'empirical_next_activity_frequency');assert.equal(x.confidence,'directional');assert.equal(x.sampleCount,4);assert.equal(x.predictedActivityKey,'approve');assert.equal(x.probabilityBps,7500);assert.deepEqual(x.candidateCounts.map(v=>[v.activityKey,v.count]),[['approve',3],['reject',1]]);assert.ok(x.provenance.length>0);
});

test('9.6 foundation 13 — too few cases cannot impersonate a directional prediction',()=>{
 const x=buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[path('case-1','approve',1),path('case-2','approve',2),path('case-3','reject',3)],asOf:AS_OF,assumptions:['العينة غير كافية.']});
 assert.equal(x.confidence,'insufficient');assert.equal(x.predictedActivityKey,null);assert.equal(x.probabilityBps,null);assert.equal(x.sampleCount,3);
});

test('9.6 foundation 14 — a tied empirical cohort exposes uncertainty instead of inventing a winner',()=>{
 const x=buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[path('case-1','approve',1),path('case-2','approve',2),path('case-3','reject',3),path('case-4','reject',4)],asOf:AS_OF,assumptions:['التعادل لا يسمح بترقية الثقة.']});
 assert.equal(x.confidence,'insufficient');assert.equal(x.predictedActivityKey,null);assert.equal(x.probabilityBps,null);assert.deepEqual(x.candidateCounts.map(v=>v.count),[2,2]);
});

test('9.6 foundation 15 — prediction rejects cross-workspace, future evidence, missing eligible evidence and missing disclosure',()=>{
 const cross=buildProcessPath([event('case-b','review','2026-09-02T08:00:00.000Z',1,{workspaceId:'workspace-b'}),event('case-b','approve','2026-09-02T09:00:00.000Z',2,{workspaceId:'workspace-b'})]);
 assert.throws(()=>buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[cross],asOf:AS_OF,assumptions:['اختبار.']}),ProcessWorkspaceLineageError);
 const future=path('case-1','approve',1);assert.throws(()=>buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[future],asOf:'2026-09-01T08:30:00.000Z',assumptions:['اختبار.']}),ProcessTimeError);
 assert.throws(()=>buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'missing',historicalPaths:[future],asOf:AS_OF,assumptions:['اختبار.']}),ProcessProvenanceRequiredError);
 assert.throws(()=>buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[future],asOf:AS_OF,assumptions:[]}),ProcessMiningContractError);
});

test('9.6 foundation 16 — M18 is active but globally open, and Phase 9.7 stays locked',()=>{
 const m18=registry.systems.find((x:{id:string})=>x.id==='M18');assert.ok(m18);assert.equal(m18.status,'ACTIVE');assert.deepEqual(m18.anchors,['9','15']);assert.equal(m18.closureEvidence,null);
 assert.equal(state.majorSystem.id,'M18');assert.equal(state.majorSystem.status,'ACTIVE');assert.deepEqual(state.majorSystem.anchors,['9','15']);assert.equal(state.majorSystem.globalClosureAllowed,false);assert.equal(state.exitGatePassed,false);assert.equal(state.phase9_7Allowed,false);assert.equal(state.nextPhase,null);assert.equal(state.successorStatus,'LOCKED');
});

test('9.6 foundation 17 — empirical delay prediction is exact, disclosed and non-authoritative',()=>{
 const paths=[delayPath('delay-1',1,4),delayPath('delay-2',2,3),delayPath('delay-3',3,2),delayPath('delay-4',4,1)];
 const x=buildEmpiricalDelayPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:paths,thresholdMs:2*3_600_000,asOf:AS_OF,assumptions:['احتمال اتجاهي مبني فقط على مدد انتظار تاريخية ذات ترتيب مثبت.']});
 assert.equal(x.authoritative,false);assert.equal(x.target,'delay_threshold_exceedance');assert.equal(x.method,'empirical_wait_threshold_frequency');assert.equal(x.thresholdMs,7_200_000);assert.equal(x.sampleCount,4);assert.equal(x.delayedSampleCount,3);assert.equal(x.confidence,'directional');assert.equal(x.probabilityBps,7500);assert.ok(x.provenance.length===8);
});

test('9.6 foundation 18 — delay prediction below four proven waits stays insufficient with no probability',()=>{
 const x=buildEmpiricalDelayPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[delayPath('delay-1',1,4),delayPath('delay-2',2,3),delayPath('delay-3',3,1)],thresholdMs:7_200_000,asOf:AS_OF,assumptions:['العينة غير كافية للحكم الاتجاهي.']});
 assert.equal(x.sampleCount,3);assert.equal(x.delayedSampleCount,2);assert.equal(x.confidence,'insufficient');assert.equal(x.probabilityBps,null);
});

test('9.6 foundation 19 — equal-time evidence is excluded from delay samples instead of becoming a zero wait',()=>{
 const equal=delayPath('delay-equal',4,0);assert.equal(equal.ordering,'partial');assert.equal(buildObservedProcessWaits(equal)[0]!.strictOrderProven,false);
 const x=buildEmpiricalDelayPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[delayPath('delay-1',1,4),delayPath('delay-2',2,3),delayPath('delay-3',3,1),equal],thresholdMs:7_200_000,asOf:AS_OF,assumptions:['الترتيب المتساوي زمنيًا لا يدخل عينة التأخر.']});
 assert.equal(x.sampleCount,3);assert.equal(x.delayedSampleCount,2);assert.equal(x.confidence,'insufficient');assert.equal(x.probabilityBps,null);
});

test('9.6 foundation 20 — delay prediction fails closed on invalid threshold, lineage, future evidence and missing disclosure',()=>{
 const valid=delayPath('delay-1',1,4),cross=delayPath('delay-x',2,4,'workspace-b');
 assert.throws(()=>buildEmpiricalDelayPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[valid],thresholdMs:0,asOf:AS_OF,assumptions:['اختبار.']}),ProcessUnsafeIntegerError);
 assert.throws(()=>buildEmpiricalDelayPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[cross],thresholdMs:7_200_000,asOf:AS_OF,assumptions:['اختبار.']}),ProcessWorkspaceLineageError);
 assert.throws(()=>buildEmpiricalDelayPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[valid],thresholdMs:7_200_000,asOf:'2026-09-01T08:30:00.000Z',assumptions:['اختبار.']}),ProcessTimeError);
 assert.throws(()=>buildEmpiricalDelayPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[valid],thresholdMs:7_200_000,asOf:AS_OF,assumptions:[]}),ProcessMiningContractError);
 assert.throws(()=>buildEmpiricalDelayPrediction({workspaceId:'workspace-a',currentActivityKey:'missing',historicalPaths:[valid],thresholdMs:7_200_000,asOf:AS_OF,assumptions:['اختبار.']}),ProcessProvenanceRequiredError);
});
