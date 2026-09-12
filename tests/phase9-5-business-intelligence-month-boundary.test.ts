import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory } from '../src/data/createDataLayer.ts';
import type { FieldOperationsContext } from '../src/features/field-operations/fieldOperationsCommands.ts';
import { loadBusinessIntelligence,type FinanceBiSnapshot } from '../src/features/intelligence/businessIntelligenceService.ts';

const W='11111111-1111-4111-8111-111111111111',U='22222222-2222-4222-8222-222222222222',AT=new Date('2026-09-01T00:00:00.000Z');
const dataFactory={async resolveWorkspaceId(){return W},forWorkspace(){return {transactions:{async list(){return {items:[],hasMore:false,total:0}}}} as any}} as EnjazDataLayerFactory;
const field:FieldOperationsContext={authority:'field_assignments_visits_evidence_receipts',transactionWriteAuthority:'none',workflowWriteAuthority:'existing_workflow_rpc_only',automationWriteAuthority:'existing_automation_rpc_only',financeWriteAuthority:'none',locationPolicy:'disabled',metrics:{activeTransactions:0,stalledTransactions:0,highCriticalBlockers:0,pendingAutomationApprovals:0,queuedAssignments:0,activeVisits:0},members:[],assignments:[],visits:[]};
const zero=(monthKey:string)=>({monthKey,monthLabel:monthKey,collectedCents:0n,paymentCount:0,ledgerInCents:0n,ledgerOutCents:0n,netCashCents:0n});
const finance:FinanceBiSnapshot={asOf:AT.toISOString(),totalOutstandingCents:0n,trends:['2026-04','2026-05','2026-06','2026-07','2026-08','2026-09'].map(zero),runRate:{recent30CollectedCents:0n,previous30CollectedCents:0n,changeBps:null,averageDailyCollectionCents:0n,projectedNext30AtSameRunRateCents:0n,samplePaymentCount:0,confidence:'insufficient'},signals:[]};

test('9.5 trend boundary — first instant of a month creates no zero-duration point and requires no invented seventh month',async()=>{
 const snapshot=await loadBusinessIntelligence({dataFactory,fieldOperations:{async loadContext(){return field}},financeLoader:async()=>({workspaceId:W,snapshot:finance})},U,AT);
 assert.equal(snapshot.trends.length,2);
 for(const trend of snapshot.trends){assert.equal(trend.points.length,5);assert.equal(trend.points.at(-1)?.periodEnd,'2026-09-01T00:00:00.000Z');assert.ok(trend.points.every(point=>Date.parse(point.periodStart)<Date.parse(point.periodEnd)))}
});
