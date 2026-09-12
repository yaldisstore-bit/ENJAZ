import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
 BIContractError,BIProvenanceRequiredError,BIUnsafeIntegerError,BIWorkspaceLineageError,BITimeWindowError,
 ENJAZ_BI_SCHEMA,assertBIProvenance,buildDerivedKpi,buildObservedTrend,buildTrailingRunRateForecast,exactChangeBps,parseBIProvenance,projectRunRateValue,
 type BIProvenance,
} from '../src/features/intelligence/businessIntelligenceContract.ts';

const P='2026-09-01T00:00:00.000Z';
function provenance(overrides:Partial<BIProvenance>={}):BIProvenance{return Object.freeze({schema:ENJAZ_BI_SCHEMA,workspaceId:'workspace-a',sourceDomain:'transactions',sourceAsOf:P,sampleCount:12,basis:Object.freeze(['status','created_at']),derivationVersion:'phase9.5-foundation-v1',...overrides})}
const state=JSON.parse(fs.readFileSync(new URL('../docs/PHASE9_5_STATE.json',import.meta.url),'utf8'));
const prior=JSON.parse(fs.readFileSync(new URL('../docs/PHASE9_4_STATE.json',import.meta.url),'utf8'));

test('9.5 foundation 01 — predecessor is formally closed and authorizes only 9.5',()=>{
 assert.equal(prior.status,'CLOSED');assert.equal(prior.exitGatePassed,true);assert.equal(prior.phase9_5Allowed,true);assert.equal(prior.nextPhase,'9.5');assert.equal(prior.successorStatus,'AUTHORIZED');assert.equal(state.baseCommit,'799873b5c7778c7665c934931af9dd3338bcef47');
});

test('9.5 foundation 02 — provenance parser rejects missing lineage and malformed snapshots',()=>{
 assert.ok(parseBIProvenance(provenance()));
 assert.equal(parseBIProvenance({...provenance(),workspaceId:''}),null);
 assert.equal(parseBIProvenance({...provenance(),sourceAsOf:'tomorrow'}),null);
 assert.equal(parseBIProvenance({...provenance(),sampleCount:-1}),null);
 assert.equal(parseBIProvenance({...provenance(),basis:[]}),null);
});

test('9.5 foundation 03 — KPI without provenance fails closed',()=>{
 assert.throws(()=>buildDerivedKpi({kpiId:'active',domain:'operations',labelAr:'المعاملات الفعالة',value:{unit:'count',value:3},asOf:P,provenance:[]}),BIProvenanceRequiredError);
});

test('9.5 foundation 04 — cross-workspace provenance fails closed',()=>{
 assert.throws(()=>assertBIProvenance([provenance(),provenance({workspaceId:'workspace-b'})]),BIWorkspaceLineageError);
});

test('9.5 foundation 05 — future source observations cannot be backfilled into an older KPI',()=>{
 assert.throws(()=>buildDerivedKpi({kpiId:'active',domain:'operations',labelAr:'المعاملات الفعالة',value:{unit:'count',value:3},asOf:P,provenance:[provenance({sourceAsOf:'2026-09-02T00:00:00.000Z'})]}),BITimeWindowError);
});

test('9.5 foundation 06 — exact money stays bigint and KPI is permanently derived',()=>{
 const kpi=buildDerivedKpi({kpiId:'outstanding',domain:'finance',labelAr:'الرصيد المفتوح',value:{unit:'cents',valueCents:999999999999999999n},asOf:P,provenance:[provenance({sourceDomain:'finance',basis:['ledger','payments']})]});
 assert.equal(kpi.authoritative,false);assert.equal(kpi.value.unit,'cents');if(kpi.value.unit==='cents')assert.equal(kpi.value.valueCents,999999999999999999n);
});

test('9.5 foundation 07 — observed trend rejects overlap and fabricated future provenance',()=>{
 const a={periodStart:'2026-07-01T00:00:00.000Z',periodEnd:'2026-08-01T00:00:00.000Z',value:{unit:'count' as const,value:4},provenance:[provenance({sourceAsOf:'2026-08-01T00:00:00.000Z'})]};
 const overlap={...a,periodStart:'2026-07-15T00:00:00.000Z',periodEnd:'2026-08-15T00:00:00.000Z'};
 assert.throws(()=>buildObservedTrend({trendId:'throughput',domain:'operations',labelAr:'اتجاه الإنجاز',points:[a,overlap]}),BITimeWindowError);
 const future={...a,provenance:[provenance({sourceAsOf:'2026-08-02T00:00:00.000Z'})]};assert.throws(()=>buildObservedTrend({trendId:'throughput',domain:'operations',labelAr:'اتجاه الإنجاز',points:[future]}),BITimeWindowError);
});

test('9.5 foundation 08 — observed trend cannot combine workspace histories',()=>{
 const p1={periodStart:'2026-07-01T00:00:00.000Z',periodEnd:'2026-08-01T00:00:00.000Z',value:{unit:'count' as const,value:4},provenance:[provenance({sourceAsOf:'2026-08-01T00:00:00.000Z'})]};
 const p2={periodStart:'2026-08-01T00:00:00.000Z',periodEnd:'2026-09-01T00:00:00.000Z',value:{unit:'count' as const,value:5},provenance:[provenance({workspaceId:'workspace-b'})]};
 assert.throws(()=>buildObservedTrend({trendId:'throughput',domain:'operations',labelAr:'اتجاه الإنجاز',points:[p1,p2]}),BIWorkspaceLineageError);
});

test('9.5 foundation 09 — directional forecast is deterministic, disclosed and never authoritative',()=>{
 const input={forecastId:'collections-30d',domain:'finance' as const,labelAr:'اتجاه التحصيل القادم',observedValue:{unit:'cents' as const,valueCents:30003n},observedWindowStart:'2026-08-02T00:00:00.000Z',observedWindowEnd:P,horizonDays:30,sampleCount:8,assumptions:['استمرار معدل التحصيل المرصود دون تغيير.'],provenance:[provenance({sourceDomain:'finance',basis:['posted_payments']})]};
 const a=buildTrailingRunRateForecast(input),b=buildTrailingRunRateForecast(input);assert.deepEqual(a,b);assert.equal(a.authoritative,false);assert.equal(a.confidence,'directional');assert.equal(a.method,'trailing_run_rate');assert.ok(a.projectedValue);if(a.projectedValue?.unit==='cents')assert.equal(a.projectedValue.valueCents,30003n);
});

test('9.5 foundation 10 — insufficient samples cannot impersonate a directional forecast',()=>{
 const x=buildTrailingRunRateForecast({forecastId:'capacity',domain:'capacity',labelAr:'اتجاه السعة',observedValue:{unit:'count',value:7},observedWindowStart:'2026-08-02T00:00:00.000Z',observedWindowEnd:P,horizonDays:30,sampleCount:3,assumptions:['البيانات قليلة ويجب جمع عينات إضافية.'],provenance:[provenance({sourceDomain:'field-operations',basis:['active_assignments']})]});
 assert.equal(x.confidence,'insufficient');assert.equal(x.projectedValue,null);assert.equal(x.authoritative,false);
});

test('9.5 foundation 11 — invalid windows and horizons fail closed',()=>{
 const base={forecastId:'x',domain:'operations' as const,labelAr:'اختبار',observedValue:{unit:'count' as const,value:4},observedWindowStart:P,observedWindowEnd:P,horizonDays:30,sampleCount:4,assumptions:['اختبار.'],provenance:[provenance()]};
 assert.throws(()=>buildTrailingRunRateForecast(base),BITimeWindowError);assert.throws(()=>buildTrailingRunRateForecast({...base,observedWindowStart:'2026-08-01T00:00:00.000Z',horizonDays:366}),BITimeWindowError);
});

test('9.5 foundation 12 — exact run-rate math and zero denominator behavior are explicit',()=>{
 const x=projectRunRateValue({unit:'cents',valueCents:10001n},30,60);assert.equal(x.unit,'cents');if(x.unit==='cents')assert.equal(x.valueCents,20002n);
 assert.equal(exactChangeBps(120n,100n),2000);assert.equal(exactChangeBps(120n,0n),null);
});

test('9.5 foundation 13 — unsafe count math and missing disclosure are rejected',()=>{
 assert.throws(()=>projectRunRateValue({unit:'count',value:Number.MAX_SAFE_INTEGER},1,365),BIUnsafeIntegerError);
 assert.throws(()=>buildTrailingRunRateForecast({forecastId:'x',domain:'operations',labelAr:'اختبار',observedValue:{unit:'count',value:4},observedWindowStart:'2026-08-01T00:00:00.000Z',observedWindowEnd:P,horizonDays:30,sampleCount:4,assumptions:[],provenance:[provenance()]}),BIContractError);
});

test('9.5 foundation 14 — M13 is active but globally open and Phase 9.6 stays locked',()=>{
 assert.equal(state.status,'IN_PROGRESS');assert.equal(state.majorSystem.id,'M13');assert.equal(state.majorSystem.status,'ACTIVE');assert.deepEqual(state.majorSystem.anchors,['9','15']);assert.equal(state.majorSystem.globalClosureAllowed,false);assert.equal(state.phase9_6Allowed,false);assert.equal(state.exitGatePassed,false);assert.equal(state.successorStatus,'LOCKED');
});
