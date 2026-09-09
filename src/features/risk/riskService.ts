import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { IdWorkspaceTableName, ListRequest, RowOf } from '../../data/contracts/dataTypes.ts';
import type { ReadRepository } from '../../data/repositories/createEntityRepository.ts';
import type { FieldOperationsCommandGateway, FieldOperationsContext } from '../field-operations/fieldOperationsCommands.ts';
import { buildFinancialIntelligenceSnapshot, type FinanceIntelligenceSnapshot } from '../finance/financeIntelligence.ts';
import { loadFinanceSource } from '../finance/financeService.ts';
import type { RiskSeverity, RiskSignal, RiskUrgency } from './riskEngine.ts';

const PAGE=100;
export const RISK_SOURCE_LIMIT=10_000;
export class RiskWorkspaceUnavailableError extends Error{constructor(){super('No ENJAZ workspace is available for Smart Risk');this.name='RiskWorkspaceUnavailableError'}}
export class RiskSourceCapacityError extends Error{readonly sourceName:string;constructor(sourceName:string){super(`Smart Risk source capacity exceeded: ${sourceName}`);this.name='RiskSourceCapacityError';this.sourceName=sourceName}}
export class RiskSourcePageStalledError extends Error{readonly sourceName:string;constructor(sourceName:string){super(`Smart Risk source page stalled: ${sourceName}`);this.name='RiskSourcePageStalledError';this.sourceName=sourceName}}
export class RiskAuthorityDriftError extends Error{constructor(message:string){super(message);this.name='RiskAuthorityDriftError'}}

type FinanceRiskSnapshot=Pick<FinanceIntelligenceSnapshot,'asOf'|'signals'>;
export type FinanceRiskLoader=(factory:EnjazDataLayerFactory,userId:string,now:Date)=>Promise<Readonly<{workspaceId:string;snapshot:FinanceRiskSnapshot}>>;
export interface SmartRiskDependencies{readonly dataFactory:EnjazDataLayerFactory;readonly fieldOperations:Pick<FieldOperationsCommandGateway,'loadContext'>;readonly financeRiskLoader?:FinanceRiskLoader}
export interface SmartRiskLiveResult{readonly workspaceId:string;readonly evaluatedAt:string;readonly authority:'read_only_derived_intelligence';readonly signals:readonly RiskSignal[];readonly sourceCounts:Readonly<{transactions:number;blockers:number;financeAnomalies:number;workloadOwners:number}>}

async function all<T extends IdWorkspaceTableName>(name:string,repo:ReadRepository<T>,request:Omit<ListRequest<T>,'offset'|'limit'>={}):Promise<readonly RowOf<T>[]>{
 const rows:RowOf<T>[]=[];let offset=0;
 for(;;){const p=await repo.list({...request,offset,limit:PAGE});rows.push(...p.items);if(rows.length>RISK_SOURCE_LIMIT)throw new RiskSourceCapacityError(name);if(!p.hasMore)return rows;if(!p.items.length)throw new RiskSourcePageStalledError(name);offset+=p.items.length}
}
async function finance(factory:EnjazDataLayerFactory,userId:string,now:Date){const x=await loadFinanceSource(factory,userId);return {workspaceId:x.workspaceId,snapshot:buildFinancialIntelligenceSnapshot(x.source,now)}}
function fieldOk(x:FieldOperationsContext){if(x.authority!=='field_assignments_visits_evidence_receipts'||x.transactionWriteAuthority!=='none'||x.workflowWriteAuthority!=='existing_workflow_rpc_only'||x.automationWriteAuthority!=='existing_automation_rpc_only'||x.financeWriteAuthority!=='none')throw new RiskAuthorityDriftError('Smart Risk refused Field Operations authority drift')}
const rank:Record<RiskSeverity,number>={low:1,medium:2,high:3,critical:4},urg:Record<RiskUrgency,number>={monitor:1,soon:2,now:3};

export async function loadSmartRisk(d:SmartRiskDependencies,userId:string,now:Date=new Date()):Promise<SmartRiskLiveResult>{
 if(!Number.isFinite(now.getTime()))throw new Error('Smart Risk requires a valid evaluation time');
 const workspaceId=await d.dataFactory.resolveWorkspaceId(userId);if(!workspaceId)throw new RiskWorkspaceUnavailableError();
 const l:EnjazWorkspaceDataLayer=d.dataFactory.forWorkspace(workspaceId),financeLoader=d.financeRiskLoader??finance;
 const [transactions,blockers,f,field]=await Promise.all([
  all('transactions',l.transactions,{filters:[{column:'archived_at',operator:'is',value:null},{column:'deleted_at',operator:'is',value:null},{column:'status',operator:'neq',value:'completed'}],orderBy:[{column:'last_activity_at',ascending:false}]}),
  all('transaction_blockers',l.blockers,{filters:[{column:'status',operator:'eq',value:'open'}],orderBy:[{column:'opened_at',ascending:false}]}),
  financeLoader(d.dataFactory,userId,now),d.fieldOperations.loadContext(workspaceId)
 ]);
 if(f.workspaceId!==workspaceId)throw new RiskAuthorityDriftError('Smart Risk refused cross-workspace finance composition');fieldOk(field);
 const evaluatedAt=now.toISOString(),nowMs=now.getTime(),signals:RiskSignal[]=[],active=transactions.filter(x=>x.deleted_at===null&&x.archived_at===null&&x.status!=='completed'),activeById=new Map(active.map(x=>[x.id,x]));
 const push=(code:RiskSignal['code'],severity:RiskSeverity,urgency:RiskUrgency,entity:RiskSignal['entity'],component:RiskSignal['components'][number],evidence:RiskSignal['evidence'],explanation:string,destination:RiskSignal['recommendation']['destination'])=>signals.push({code,severity,urgency,entity,components:[component],evidence,explanation,evaluatedAt,recommendation:{destination,label:'مراجعة المصدر المعتمد',mutates:false}});
 for(const x of active){
  const label=x.legacy_id?.trim()?`معاملة ${x.legacy_id!.trim()}`:x.type.trim()||undefined,entity=label?{type:'transaction' as const,id:x.id,label}:{type:'transaction' as const,id:x.id};
  if(x.status==='stalled'){const critical=x.priority==='urgent';push('transaction_stalled',critical?'critical':'high','now',entity,{code:'status_stalled',explanation:'المعاملة متوقفة.'},[{sourceDomain:'transactions',sourceObjectId:x.id,field:'status',observedValue:x.status,observedAt:evaluatedAt}],critical?'معاملة عاجلة متوقفة.':'معاملة متوقفة تحتاج مراجعة.','/app/transactions')}
  const last=x.last_activity_at?Date.parse(x.last_activity_at):NaN,h=(nowMs-last)/3_600_000;if(Number.isFinite(last)&&last<=nowMs&&h>=48)push('transaction_inactive',h>=96?'high':'medium',h>=96?'now':'soon',entity,{code:'inactivity_window',explanation:`لا حركة منذ ${Math.floor(h)} ساعة.`},[{sourceDomain:'transactions',sourceObjectId:x.id,field:'last_activity_at',observedValue:x.last_activity_at!,observedAt:evaluatedAt}],`آخر حركة أقدم من 48 ساعة.`,'/app/transactions');
 }
 const openBlockers=blockers.filter(x=>x.status==='open');
 for(const b of openBlockers){if(b.severity!=='high'&&b.severity!=='critical')continue;const x=activeById.get(b.transaction_id);if(!x)continue;const label=x.legacy_id?.trim()?`معاملة ${x.legacy_id!.trim()}`:x.type.trim()||undefined,entity=label?{type:'transaction' as const,id:x.id,label}:{type:'transaction' as const,id:x.id};push('open_critical_blocker',b.severity,'now',entity,{code:`blocker_${b.severity}`,explanation:'حاجز مفتوح عالي الأثر.'},[{sourceDomain:'transactions',sourceObjectId:b.id,field:'status',observedValue:b.status,observedAt:b.opened_at},{sourceDomain:'transactions',sourceObjectId:b.id,field:'severity',observedValue:b.severity,observedAt:b.opened_at}],'حاجز عالي/حرج مفتوح.','/app/transactions')}
 const financeSignals=f.snapshot.signals.filter(x=>x.severity!=='info');
 for(const x of financeSignals){const severity:RiskSeverity=x.severity==='high'?'high':'medium';push('finance_anomaly',severity,severity==='high'?'now':'soon',{type:'finance',id:x.id,label:x.title},{code:`finance_7_3:${x.id}`,explanation:x.explanation},[{sourceDomain:'finance',sourceObjectId:x.id,field:'anomaly_kind',observedValue:`finance_7_3:${x.id}`,observedAt:f.snapshot.asOf}],x.explanation,'/app/finance')}
 const grouped=new Map<string,{label:string;active:number;urgent:number}>();for(const a of field.assignments){if(a.status!=='queued'&&a.status!=='in_progress')continue;const x=grouped.get(a.assignedUserId)??{label:a.assignedUserName,active:0,urgent:0};x.active++;if(a.priority==='urgent')x.urgent++;grouped.set(a.assignedUserId,x)}
 for(const [id,x] of grouped){if(x.active<8&&x.urgent<3)continue;const high=x.urgent>=3;push('workload_concentration',high?'high':'medium',high?'now':'soon',{type:'workload',id,label:x.label},{code:'workload_count',explanation:`${x.active} فعّال · ${x.urgent} عاجل.`},[{sourceDomain:'field-operations',sourceObjectId:id,field:'active_count',observedValue:x.active,observedAt:evaluatedAt},{sourceDomain:'field-operations',sourceObjectId:id,field:'urgent_count',observedValue:x.urgent,observedAt:evaluatedAt}],'تركيز عبء العمل تجاوز الحد.','/app/operations')}
 signals.sort((a,b)=>rank[b.severity]-rank[a.severity]||urg[b.urgency]-urg[a.urgency]||`${a.code}:${a.entity.id}`.localeCompare(`${b.code}:${b.entity.id}`));
 return Object.freeze({workspaceId,evaluatedAt,authority:'read_only_derived_intelligence',signals:Object.freeze(signals),sourceCounts:Object.freeze({transactions:active.length,blockers:openBlockers.length,financeAnomalies:financeSignals.length,workloadOwners:grouped.size})});
}
