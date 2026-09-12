import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
  OWNERSHIP_TOTAL_UNITS,
  assertNoConflictingOwnershipPeriods,
  buildOwnershipSnapshot,
  parseOwnershipStake,
} from '../src/features/governance/governanceOwnershipContract.ts';
import {
  ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,
  assertDeterministicRegulatoryLineage,
  buildRegulatoryCitation,
  parseDerivedKnowledgeArtifact,
  parseRegulatorySourceIdentity,
  parseRegulatorySourceVersion,
  resolveRegulatoryVersionAsOf,
  type RegulatorySourceVersion,
} from '../src/features/regulatory/regulatoryKnowledgeContract.ts';
import {
  ENJAZ_BI_SCHEMA,
  BIProvenanceRequiredError,
  BITimeWindowError,
  BIUnsupportedRunRateUnitError,
  buildObservedTrend,
  buildTrailingRunRateForecast,
  parseBIProvenance,
  type BIProvenance,
} from '../src/features/intelligence/businessIntelligenceContract.ts';
import {
  ENJAZ_PROCESS_MINING_SCHEMA,
  ProcessProvenanceRequiredError,
  ProcessTimeError,
  buildEmpiricalDelayPrediction,
  buildEmpiricalNextActivityPrediction,
  buildProcessEvent,
  buildProcessPath,
  parseProcessEventProvenance,
  type ProcessEvent,
  type ProcessPath,
} from '../src/features/process-intelligence/processMiningContract.ts';

const AS_OF='2026-09-12T12:00:00.000Z';

function ownershipStake(input:{holderId:string;percentage:string;from?:string;to?:string|null;companyId?:string}){
  const parsed=parseOwnershipStake({
    schema:ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA,
    companyId:input.companyId??'company-1',
    holder:{kind:'person',id:input.holderId},
    role:'shareholder',
    percentage:input.percentage,
    effectiveFrom:input.from??'2026-01-01',
    effectiveTo:input.to??null,
  });
  assert.ok(parsed);
  return parsed;
}

function dateOnly(base:string,offset:number){
  const value=new Date(`${base}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate()+offset);
  return value.toISOString().slice(0,10);
}

function regulatoryVersion(revision:number,total:number,sourceId='law-1'):RegulatorySourceVersion{
  const from=dateOnly('2024-01-01',revision-1);
  const to=revision===total?null:dateOnly('2024-01-01',revision);
  const parsed=parseRegulatorySourceVersion({
    schema:ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,
    sourceId,
    versionId:`${sourceId}-v${revision}`,
    revision,
    titleAr:`نسخة ${revision}`,
    publicationDate:from,
    effectiveFrom:from,
    effectiveTo:to,
    supersedesVersionId:revision===1?null:`${sourceId}-v${revision-1}`,
    sourceLocator:`official:${sourceId}:${revision}`,
    provenance:{
      publisher:'الجهة الرسمية',
      sourceUrl:`https://example.gov.iq/${sourceId}/${revision}`,
      retrievedOn:from,
      sourceHash:revision.toString(16).padStart(64,'0').slice(-64),
    },
    authoritative:true,
  });
  assert.ok(parsed);
  return parsed;
}

function biProv(input:Partial<{workspaceId:string;sourceAsOf:string;sampleCount:number;sourceDomain:'transactions'|'transaction-blockers'|'finance'|'field-operations'|'workflow';derivationVersion:string}>={}):BIProvenance{
  const parsed=parseBIProvenance({
    schema:ENJAZ_BI_SCHEMA,
    workspaceId:input.workspaceId??'workspace-a',
    sourceDomain:input.sourceDomain??'transactions',
    sourceAsOf:input.sourceAsOf??'2026-09-12T00:00:00.000Z',
    sampleCount:input.sampleCount??4,
    basis:['authoritative-id','occurred_at'],
    derivationVersion:input.derivationVersion??'v1',
  });
  assert.ok(parsed);
  return parsed;
}

function processEvent(caseId:string,activityKey:string,occurredAt:string,index:number,workspaceId='workspace-a'):ProcessEvent{
  const provenance=parseProcessEventProvenance({
    schema:ENJAZ_PROCESS_MINING_SCHEMA,
    workspaceId,
    caseId,
    sourceDomain:'transaction-lifecycle',
    sourceEntity:'transaction_activity',
    sourceEventId:`${caseId}-${index}`,
    sourceAsOf:occurredAt>AS_OF?occurredAt:AS_OF,
    basis:['transaction_id','activity_type','occurred_at'],
    derivationVersion:'v1',
  });
  assert.ok(provenance);
  return buildProcessEvent({workspaceId,caseId,activityKey,labelAr:activityKey,occurredAt,provenance});
}

function processPath(caseId:string,next:string,index:number,workspaceId='workspace-a'):ProcessPath{
  const day=String((index%9)+1).padStart(2,'0');
  return buildProcessPath([
    processEvent(caseId,'review',`2026-09-${day}T08:00:00.000Z`,1,workspaceId),
    processEvent(caseId,next,`2026-09-${day}T09:00:00.000Z`,2,workspaceId),
  ]);
}

// M2 — invalid ownership / stale conflicting history / scale.
test('9.7 M2 invalid ownership totals fail closed instead of selecting a convenient truth',()=>{
  const impossible=[ownershipStake({holderId:'owner-a',percentage:'100'}),ownershipStake({holderId:'owner-b',percentage:'0.000001'})];
  assert.throws(()=>buildOwnershipSnapshot(impossible,'company-1','2026-09-12'),/exceeds 100/i);
  assert.throws(()=>buildOwnershipSnapshot([],'company-1','2026-09-12'),/reconcile to 100/i);
});

test('9.7 M2 conflicting stale effective periods remain destructive evidence',()=>{
  const historical=ownershipStake({holderId:'owner-a',percentage:'100',from:'2026-01-01',to:'2026-08-01'});
  const staleOverlap=ownershipStake({holderId:'owner-a',percentage:'100',from:'2026-07-31'});
  assert.throws(()=>assertNoConflictingOwnershipPeriods([historical,staleOverlap]),/conflicting/i);
});

test('9.7 M2 high-volume exact ownership reconciles 5000 holders without floating drift',()=>{
  const stakes=Array.from({length:5000},(_,index)=>ownershipStake({holderId:`holder-${index}`,percentage:'0.02'}));
  const snapshot=buildOwnershipSnapshot(stakes,'company-1','2026-09-12');
  assert.equal(snapshot.stakes.length,5000);
  assert.equal(snapshot.totalPercentageUnits,OWNERSHIP_TOTAL_UNITS);
  assert.equal(snapshot.totalPercentage,'100');
  assert.equal(snapshot.reconciledTo100,true);
});

// M8 — deterministic official version lineage / provenance / no-data.
test('9.7 M8 regulatory fork and overlap conflicts fail closed',()=>{
  const a=regulatoryVersion(1,2);
  const b=regulatoryVersion(2,2);
  assert.doesNotThrow(()=>assertDeterministicRegulatoryLineage([a,b]));
  const fork=parseRegulatorySourceVersion({...b,versionId:'law-1-fork',supersedesVersionId:'wrong-parent'});
  assert.ok(fork);
  assert.throws(()=>assertDeterministicRegulatoryLineage([a,fork]),/broken|forked/i);
  const overlap=parseRegulatorySourceVersion({...b,versionId:'law-1-overlap',effectiveFrom:a.effectiveFrom,supersedesVersionId:a.versionId});
  assert.ok(overlap);
  assert.throws(()=>assertDeterministicRegulatoryLineage([a,overlap]),/overlap|duplicate|lineage/i);
});

test('9.7 M8 no-data resolution stays null and fabricated legal authority stays impossible',()=>{
  const versions=[regulatoryVersion(1,1)];
  assert.equal(resolveRegulatoryVersionAsOf(versions,'law-1','2023-01-01'),null);
  assert.equal(parseDerivedKnowledgeArtifact({
    schema:ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,
    artifactId:'ai-1',kind:'ai_summary',sourceId:'law-1',sourceVersionId:'law-1-v1',body:'ملخص مشتق',authoritative:true,
  }),null);
  const source=parseRegulatorySourceIdentity({
    schema:ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,sourceId:'law-other',scope:'official_global',workspaceId:null,kind:'law',jurisdiction:'العراق',issuer:'الجهة الرسمية',referenceCode:'X-1',
  });
  assert.ok(source);
  assert.throws(()=>buildRegulatoryCitation(source,versions[0]!),/matching authoritative source\/version/i);
});

test('9.7 M8 high-volume authoritative lineage remains deterministic across 730 versions',()=>{
  const versions=Array.from({length:730},(_,index)=>regulatoryVersion(index+1,730));
  assert.doesNotThrow(()=>assertDeterministicRegulatoryLineage(versions));
  const resolved=resolveRegulatoryVersionAsOf(versions,'law-1',dateOnly('2024-01-01',500));
  assert.equal(resolved?.revision,501);
});

// M13 — stale/no-data/model-shift/uncertainty/scale.
test('9.7 M13 future or stale evidence cannot be promoted into a forecast',()=>{
  const future=biProv({sourceAsOf:'2026-09-13T00:00:00.000Z'});
  assert.throws(()=>buildTrailingRunRateForecast({
    forecastId:'stale',domain:'operations',labelAr:'توقع',observedValue:{unit:'count',value:4},observedWindowStart:'2026-09-01T00:00:00.000Z',observedWindowEnd:'2026-09-12T00:00:00.000Z',horizonDays:7,sampleCount:4,assumptions:['مصدر حقيقي'],provenance:[future],
  }),BITimeWindowError);
});

test('9.7 M13 no provenance never fabricates a directional projection',()=>{
  assert.throws(()=>buildTrailingRunRateForecast({
    forecastId:'empty',domain:'operations',labelAr:'توقع',observedValue:{unit:'count',value:4},observedWindowStart:'2026-09-01T00:00:00.000Z',observedWindowEnd:'2026-09-12T00:00:00.000Z',horizonDays:7,sampleCount:4,assumptions:['مصدر مطلوب'],provenance:[],
  }),BIProvenanceRequiredError);
});

test('9.7 M13 prediction uncertainty stays explicit for insufficient samples and unsupported models',()=>{
  const provenance=[biProv({sampleCount:3})];
  const insufficient=buildTrailingRunRateForecast({
    forecastId:'low-sample',domain:'operations',labelAr:'توقع',observedValue:{unit:'count',value:3},observedWindowStart:'2026-09-01T00:00:00.000Z',observedWindowEnd:'2026-09-12T00:00:00.000Z',horizonDays:7,sampleCount:3,assumptions:['عينة محدودة'],provenance,
  });
  assert.equal(insufficient.confidence,'insufficient');
  assert.equal(insufficient.projectedValue,null);
  assert.throws(()=>buildTrailingRunRateForecast({
    forecastId:'ratio',domain:'operations',labelAr:'نسبة',observedValue:{unit:'basis_points',valueBps:5000},observedWindowStart:'2026-09-01T00:00:00.000Z',observedWindowEnd:'2026-09-12T00:00:00.000Z',horizonDays:7,sampleCount:4,assumptions:['لا خطية'],provenance:[biProv()],
  }),BIUnsupportedRunRateUnitError);
});

test('9.7 M13 model shift is recomputed from current evidence and never served as stale authority',()=>{
  const input={domain:'operations' as const,labelAr:'الحمل',observedWindowStart:'2026-08-13T00:00:00.000Z',observedWindowEnd:'2026-09-12T00:00:00.000Z',horizonDays:30,sampleCount:10,assumptions:['trailing evidence'],provenance:[biProv({sampleCount:10})]};
  const oldForecast=buildTrailingRunRateForecast({...input,forecastId:'before-shift',observedValue:{unit:'count' as const,value:100}});
  const shiftedForecast=buildTrailingRunRateForecast({...input,forecastId:'after-shift',observedValue:{unit:'count' as const,value:10}});
  assert.equal(oldForecast.authoritative,false);
  assert.equal(shiftedForecast.authoritative,false);
  assert.notDeepEqual(oldForecast.projectedValue,shiftedForecast.projectedValue);
  assert.deepEqual(shiftedForecast.projectedValue,{unit:'count',value:10});
});

test('9.7 M13 high-volume observed trend remains ordered and workspace-pure across 2048 points',()=>{
  const points=Array.from({length:2048},(_,index)=>{
    const start=new Date(Date.UTC(2020,0,1+index)).toISOString();
    const end=new Date(Date.UTC(2020,0,2+index)).toISOString();
    return {periodStart:start,periodEnd:end,value:{unit:'count' as const,value:index},provenance:[biProv({sourceAsOf:end,sampleCount:index+1})]};
  });
  const trend=buildObservedTrend({trendId:'dense',domain:'operations',labelAr:'اتجاه كثيف',points});
  assert.equal(trend.points.length,2048);
  assert.equal(trend.points.at(-1)?.value.unit,'count');
});

// M18 — stale/no-data/distribution shift/ties/scale/delay ambiguity.
test('9.7 M18 no-data and future process evidence fail closed',()=>{
  const unrelated=buildProcessPath([
    processEvent('case-empty','created','2026-09-01T08:00:00.000Z',1),
    processEvent('case-empty','done','2026-09-01T09:00:00.000Z',2),
  ]);
  assert.throws(()=>buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[unrelated],asOf:AS_OF,assumptions:['historical paths only']}),ProcessProvenanceRequiredError);
  const future=buildProcessPath([
    processEvent('case-future','review','2026-09-13T08:00:00.000Z',1),
    processEvent('case-future','done','2026-09-13T09:00:00.000Z',2),
  ]);
  assert.throws(()=>buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[future],asOf:AS_OF,assumptions:['no future evidence']}),ProcessTimeError);
});

test('9.7 M18 tied and insufficient samples expose uncertainty instead of a winner',()=>{
  const low=[processPath('low-1','approved',1),processPath('low-2','approved',2),processPath('low-3','approved',3)];
  const insufficient=buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:low,asOf:AS_OF,assumptions:['minimum four cases']});
  assert.equal(insufficient.confidence,'insufficient');
  assert.equal(insufficient.predictedActivityKey,null);
  assert.equal(insufficient.probabilityBps,null);

  const tied=[processPath('tie-1','approved',1),processPath('tie-2','approved',2),processPath('tie-3','rejected',3),processPath('tie-4','rejected',4)];
  const tie=buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:tied,asOf:AS_OF,assumptions:['ties have no winner']});
  assert.equal(tie.sampleCount,4);
  assert.equal(tie.confidence,'insufficient');
  assert.equal(tie.predictedActivityKey,null);
});

test('9.7 M18 model/distribution shift recomputes the empirical winner from supplied history',()=>{
  const old=[1,2,3,4].map(index=>processPath(`old-${index}`,'approved',index));
  const before=buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:old,asOf:AS_OF,assumptions:['empirical distribution']});
  assert.equal(before.predictedActivityKey,'approved');
  const recent=[1,2,3,4,5].map(index=>processPath(`recent-${index}`,'rejected',index+4));
  const after=buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:[...old,...recent],asOf:AS_OF,assumptions:['recomputed current history']});
  assert.equal(after.predictedActivityKey,'rejected');
  assert.equal(after.authoritative,false);
});

test('9.7 M18 high-volume process history stays deterministic across 2000 cases',()=>{
  const paths=Array.from({length:2000},(_,index)=>processPath(`dense-${index}`,index<1500?'approved':'rejected',index));
  const prediction=buildEmpiricalNextActivityPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:paths,asOf:AS_OF,assumptions:['bounded empirical history']});
  assert.equal(prediction.sampleCount,2000);
  assert.equal(prediction.predictedActivityKey,'approved');
  assert.equal(prediction.probabilityBps,7500);
});

test('9.7 M18 equal-time waits are not fabricated into delay evidence',()=>{
  const paths=Array.from({length:4},(_,index)=>{
    const timestamp=`2026-09-0${index+1}T08:00:00.000Z`;
    return buildProcessPath([
      processEvent(`zero-${index}`,'review',timestamp,1),
      processEvent(`zero-${index}`,'approved',timestamp,2),
    ]);
  });
  assert.throws(()=>buildEmpiricalDelayPrediction({workspaceId:'workspace-a',currentActivityKey:'review',historicalPaths:paths,thresholdMs:3_600_000,asOf:AS_OF,assumptions:['strict positive waits only']}),ProcessProvenanceRequiredError);
});
