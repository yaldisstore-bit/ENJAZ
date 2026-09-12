import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { ReadRepository } from '../../data/repositories/createEntityRepository.ts';
import type { FieldOperationsCommandGateway, FieldOperationsContext } from '../field-operations/fieldOperationsCommands.ts';
import { buildFinancialIntelligenceSnapshot, type FinanceIntelligenceSnapshot } from '../finance/financeIntelligence.ts';
import { loadFinanceSource } from '../finance/financeService.ts';
import {
 ENJAZ_BI_SCHEMA,buildDerivedKpi,buildTrailingRunRateForecast,
 type BIProvenance,type DerivedKpi,type DirectionalForecast,
} from './businessIntelligenceContract.ts';

const PAGE=100,DAY=86_400_000;
export const BI_SOURCE_LIMIT=10_000;

export class BIWorkspaceUnavailableError extends Error{constructor(){super('BI workspace unavailable');this.name='BIWorkspaceUnavailableError'}}
export class BISourceCapacityError extends Error{readonly sourceName:string;constructor(sourceName:string){super(`BI source limit: ${sourceName}`);this.name='BISourceCapacityError';this.sourceName=sourceName}}
export class BISourcePageStalledError extends Error{readonly sourceName:string;constructor(sourceName:string){super(`BI source stalled: ${sourceName}`);this.name='BISourcePageStalledError';this.sourceName=sourceName}}
export class BIAuthorityDriftError extends Error{constructor(message:string){super(message);this.name='BIAuthorityDriftError'}}

export type FinanceBiSnapshot=Pick<FinanceIntelligenceSnapshot,'asOf'|'totalOutstandingCents'|'runRate'|'signals'>;
export type FinanceBiLoader=(factory:EnjazDataLayerFactory,userId:string,now:Date)=>Promise<Readonly<{workspaceId:string;snapshot:FinanceBiSnapshot}>>;
export interface BusinessIntelligenceDependencies{
 readonly dataFactory:EnjazDataLayerFactory;
 readonly fieldOperations:Pick<FieldOperationsCommandGateway,'loadContext'>;
 readonly financeLoader?:FinanceBiLoader;
}
export interface BusinessIntelligenceSnapshot{
 readonly schema:typeof ENJAZ_BI_SCHEMA;
 readonly workspaceId:string;
 readonly generatedAt:string;
 readonly authority:'read_only_derived_intelligence';
 readonly kpis:readonly DerivedKpi[];
 readonly forecasts:readonly DirectionalForecast[];
 readonly sourceCounts:Readonly<{transactions:number;activeTransactions:number;completedLast30:number;fieldAssignments:number;fieldVisits:number;financeSignals:number}>;
}

async function all<T extends 'transactions'>(name:string,repo:ReadRepository<T>):Promise<readonly RowOf<T>[]>{
 const rows:RowOf<T>[]=[];let offset=0;
 for(;;){const page=await repo.list({orderBy:[{column:'created_at',ascending:false}],offset,limit:PAGE});rows.push(...page.items);if(rows.length>BI_SOURCE_LIMIT)throw new BISourceCapacityError(name);if(!page.hasMore)return Object.freeze(rows);if(!page.items.length)throw new BISourcePageStalledError(name);offset+=page.items.length}
}
async function finance(factory:EnjazDataLayerFactory,userId:string,now:Date){const x=await loadFinanceSource(factory,userId);return Object.freeze({workspaceId:x.workspaceId,snapshot:buildFinancialIntelligenceSnapshot(x.source,now)})}
function fieldOk(x:FieldOperationsContext){if(x.authority!=='field_assignments_visits_evidence_receipts'||x.transactionWriteAuthority!=='none'||x.workflowWriteAuthority!=='existing_workflow_rpc_only'||x.automationWriteAuthority!=='existing_automation_rpc_only'||x.financeWriteAuthority!=='none')throw new BIAuthorityDriftError('Field authority drift')}
function prov(workspaceId:string,sourceDomain:BIProvenance['sourceDomain'],sourceAsOf:string,sampleCount:number,basis:readonly string[]):BIProvenance{return Object.freeze({schema:ENJAZ_BI_SCHEMA,workspaceId,sourceDomain,sourceAsOf,sampleCount,basis:Object.freeze([...basis]),derivationVersion:'phase9.5-source-composition-v1'})}
function isoMinusDays(iso:string,days:number){return new Date(Date.parse(iso)-days*DAY).toISOString()}

export async function loadBusinessIntelligence(d:BusinessIntelligenceDependencies,userId:string,now:Date=new Date()):Promise<BusinessIntelligenceSnapshot>{
 if(!Number.isFinite(now.getTime()))throw new Error('Invalid BI evaluation time');
 const workspaceId=await d.dataFactory.resolveWorkspaceId(userId);if(!workspaceId)throw new BIWorkspaceUnavailableError();
 const layer:EnjazWorkspaceDataLayer=d.dataFactory.forWorkspace(workspaceId),financeLoader=d.financeLoader??finance;
 const [transactions,field,f]=await Promise.all([all('transactions',layer.transactions),d.fieldOperations.loadContext(workspaceId),financeLoader(d.dataFactory,userId,now)]);
 if(f.workspaceId!==workspaceId)throw new BIAuthorityDriftError('Finance workspace drift');fieldOk(field);
 const generatedAt=now.toISOString(),nowMs=now.getTime(),windowStart=nowMs-30*DAY;
 const live=transactions.filter(x=>x.deleted_at===null&&x.archived_at===null),active=live.filter(x=>x.status!=='completed'),stalled=active.filter(x=>x.status==='stalled');
 const completedLast30=live.filter(x=>x.completed_at!==null&&Number.isFinite(Date.parse(x.completed_at))&&Date.parse(x.completed_at!)>=windowStart&&Date.parse(x.completed_at!)<=nowMs);
 const activeAssignments=field.assignments.filter(x=>x.status==='queued'||x.status==='in_progress'),activeVisits=field.visits.filter(x=>x.status==='checked_in');
 const txProvenance=prov(workspaceId,'transactions',generatedAt,transactions.length,['status','completed_at','archived_at','deleted_at']);
 const fieldProvenance=prov(workspaceId,'field-operations',generatedAt,field.assignments.length+field.visits.length,['assignment.status','visit.status']);
 const financeProvenance=prov(workspaceId,'finance',f.snapshot.asOf,f.snapshot.runRate.samplePaymentCount,['phase7.3','posted_payments','payment_reversals','paid_at']);
 const kpis:DerivedKpi[]=[
  buildDerivedKpi({kpiId:'operations.active_transactions',domain:'operations',labelAr:'المعاملات الفعالة',value:{unit:'count',value:active.length},asOf:generatedAt,provenance:[txProvenance]}),
  buildDerivedKpi({kpiId:'operations.stalled_transactions',domain:'operations',labelAr:'المعاملات المتوقفة',value:{unit:'count',value:stalled.length},asOf:generatedAt,provenance:[txProvenance]}),
  buildDerivedKpi({kpiId:'operations.completed_last_30d',domain:'operations',labelAr:'المنجز خلال 30 يوماً',value:{unit:'count',value:completedLast30.length},asOf:generatedAt,provenance:[txProvenance]}),
  buildDerivedKpi({kpiId:'capacity.active_assignments',domain:'capacity',labelAr:'التكليفات الميدانية الفعالة',value:{unit:'count',value:activeAssignments.length},asOf:generatedAt,provenance:[fieldProvenance]}),
  buildDerivedKpi({kpiId:'capacity.active_visits',domain:'capacity',labelAr:'الزيارات الميدانية الجارية',value:{unit:'count',value:activeVisits.length},asOf:generatedAt,provenance:[fieldProvenance]}),
  buildDerivedKpi({kpiId:'finance.total_outstanding',domain:'finance',labelAr:'إجمالي الرصيد المفتوح',value:{unit:'cents',valueCents:f.snapshot.totalOutstandingCents},asOf:generatedAt,provenance:[financeProvenance]}),
  buildDerivedKpi({kpiId:'finance.collected_last_30d',domain:'finance',labelAr:'التحصيل خلال 30 يوماً',value:{unit:'cents',valueCents:f.snapshot.runRate.recent30CollectedCents},asOf:generatedAt,provenance:[financeProvenance]}),
 ];
 if(f.snapshot.runRate.changeBps!==null)kpis.push(buildDerivedKpi({kpiId:'finance.collection_change',domain:'finance',labelAr:'تغير التحصيل مقابل الثلاثين يوماً السابقة',value:{unit:'basis_points',valueBps:f.snapshot.runRate.changeBps},asOf:generatedAt,provenance:[financeProvenance]}));
 const forecasts:DirectionalForecast[]=[
  buildTrailingRunRateForecast({forecastId:'operations.completed_next_30d',domain:'operations',labelAr:'اتجاه الإنجاز للثلاثين يوماً القادمة',observedValue:{unit:'count',value:completedLast30.length},observedWindowStart:new Date(windowStart).toISOString(),observedWindowEnd:generatedAt,horizonDays:30,sampleCount:completedLast30.length,assumptions:['إسقاط اتجاهي فقط يفترض استمرار عدد المعاملات المنجزة المرصود خلال الثلاثين يوماً السابقة دون تغيير.'],provenance:[txProvenance]}),
  buildTrailingRunRateForecast({forecastId:'finance.collections_next_30d',domain:'finance',labelAr:'اتجاه التحصيل للثلاثين يوماً القادمة',observedValue:{unit:'cents',valueCents:f.snapshot.runRate.recent30CollectedCents},observedWindowStart:isoMinusDays(f.snapshot.asOf,30),observedWindowEnd:f.snapshot.asOf,horizonDays:30,sampleCount:f.snapshot.runRate.samplePaymentCount,assumptions:['إسقاط اتجاهي فقط يعيد استخدام معدل التحصيل المرصود في مرساة Phase 7.3 ولا يمثل التزاماً أو حقيقة مالية مستقبلية.'],provenance:[financeProvenance]}),
 ];
 return Object.freeze({schema:ENJAZ_BI_SCHEMA,workspaceId,generatedAt,authority:'read_only_derived_intelligence',kpis:Object.freeze(kpis),forecasts:Object.freeze(forecasts),sourceCounts:Object.freeze({transactions:transactions.length,activeTransactions:active.length,completedLast30:completedLast30.length,fieldAssignments:field.assignments.length,fieldVisits:field.visits.length,financeSignals:f.snapshot.signals.length})});
}
