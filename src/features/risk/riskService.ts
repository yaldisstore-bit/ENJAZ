import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { IdWorkspaceTableName, ListRequest, RowOf } from '../../data/contracts/dataTypes.ts';
import type { ReadRepository } from '../../data/repositories/createEntityRepository.ts';
import type { FieldOperationsCommandGateway, FieldOperationsContext } from '../field-operations/fieldOperationsCommands.ts';
import { buildFinancialIntelligenceSnapshot, type FinanceIntelligenceSnapshot } from '../finance/financeIntelligence.ts';
import { loadFinanceSource } from '../finance/financeService.ts';
import { evaluateOperationalRiskSnapshot } from './riskOperationalEngine.ts';
import type { RiskFinanceAnomalyFact, RiskTransactionFact, RiskWorkloadFact, RiskSignal } from './riskEngine.ts';

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
  for(;;){const p=await repo.list({...request,offset,limit:PAGE});rows.push(...p.items);if(rows.length>RISK_SOURCE_LIMIT)throw new RiskSourceCapacityError(name);if(!p.hasMore)return Object.freeze(rows);if(!p.items.length)throw new RiskSourcePageStalledError(name);offset+=p.items.length}
}
async function finance(factory:EnjazDataLayerFactory,userId:string,now:Date){const x=await loadFinanceSource(factory,userId);return Object.freeze({workspaceId:x.workspaceId,snapshot:buildFinancialIntelligenceSnapshot(x.source,now)})}
function fieldOk(x:FieldOperationsContext){if(x.authority!=='field_assignments_visits_evidence_receipts'||x.transactionWriteAuthority!=='none'||x.workflowWriteAuthority!=='existing_workflow_rpc_only'||x.automationWriteAuthority!=='existing_automation_rpc_only'||x.financeWriteAuthority!=='none')throw new RiskAuthorityDriftError('Smart Risk refused Field Operations authority drift')}
const active=(x:RowOf<'transactions'>)=>x.deleted_at===null&&x.archived_at===null&&x.status!=='completed';

export async function loadSmartRisk(d:SmartRiskDependencies,userId:string,now:Date=new Date()):Promise<SmartRiskLiveResult>{
  if(!Number.isFinite(now.getTime()))throw new Error('Smart Risk requires a valid evaluation time');
  const workspaceId=await d.dataFactory.resolveWorkspaceId(userId);if(!workspaceId)throw new RiskWorkspaceUnavailableError();
  const l:EnjazWorkspaceDataLayer=d.dataFactory.forWorkspace(workspaceId),financeLoader=d.financeRiskLoader??finance;
  const [transactions,companies,blockers,f,field]=await Promise.all([
    all('transactions',l.transactions,{filters:[{column:'archived_at',operator:'is',value:null},{column:'deleted_at',operator:'is',value:null},{column:'status',operator:'neq',value:'completed'}],orderBy:[{column:'last_activity_at',ascending:false}]}),
    all('companies',l.companies,{filters:[{column:'deleted_at',operator:'is',value:null}],orderBy:[{column:'updated_at',ascending:false}]}),
    all('transaction_blockers',l.blockers,{filters:[{column:'status',operator:'eq',value:'open'}],orderBy:[{column:'opened_at',ascending:false}]}),
    financeLoader(d.dataFactory,userId,now),d.fieldOperations.loadContext(workspaceId)
  ]);
  if(f.workspaceId!==workspaceId)throw new RiskAuthorityDriftError('Smart Risk refused cross-workspace finance composition');fieldOk(field);
  const evaluatedAt=now.toISOString(),companyById=new Map(companies.filter(x=>x.deleted_at===null).map(x=>[x.id,x]));
  const openBlockers=blockers.filter(x=>x.status==='open'),byTx=new Map<string,RowOf<'transaction_blockers'>[]>();
  for(const b of openBlockers){const a=byTx.get(b.transaction_id)??[];a.push(b);byTx.set(b.transaction_id,a)}
  const tx:RiskTransactionFact[]=transactions.filter(active).map(x=>{const c=companyById.get(x.company_id),company=c&&(c.display_name?.trim()||c.legal_name.trim()),legacy=x.legacy_id?.trim(),own=legacy?`معاملة ${legacy}`:x.type.trim()||`معاملة ${x.id.slice(0,8)}`,label=[company,own].filter(Boolean).join(' · ');return Object.freeze({id:x.id,...(label?{label}:{}),status:x.status,...(x.priority===null?{}:{priority:x.priority}),...(x.last_activity_at===null?{}:{lastActivityAt:x.last_activity_at}),blockers:Object.freeze((byTx.get(x.id)??[]).map(b=>Object.freeze({id:b.id,severity:b.severity,status:b.status,...(b.opened_at?{openedAt:b.opened_at}:{})})))})});
  const financeAnomalies:RiskFinanceAnomalyFact[]=f.snapshot.signals.flatMap(x=>x.severity==='info'?[]:[{id:x.id,label:x.title,kind:`finance_7_3:${x.id}`,severity:x.severity==='high'?'high':'medium',explanation:x.explanation,observedAt:f.snapshot.asOf}]);
  const grouped=new Map<string,{ownerLabel:string;activeCount:number;urgentCount:number}>();
  for(const a of field.assignments){if(a.status!=='queued'&&a.status!=='in_progress')continue;const x=grouped.get(a.assignedUserId)??{ownerLabel:a.assignedUserName,activeCount:0,urgentCount:0};x.activeCount++;if(a.priority==='urgent')x.urgentCount++;grouped.set(a.assignedUserId,x)}
  const workloads:RiskWorkloadFact[]=[...grouped].map(([ownerId,x])=>Object.freeze({ownerId,...x,observedAt:evaluatedAt}));
  const signals=evaluateOperationalRiskSnapshot(Object.freeze({evaluatedAt,transactions:Object.freeze(tx),financeAnomalies:Object.freeze(financeAnomalies),workloads:Object.freeze(workloads)}));
  return Object.freeze({workspaceId,evaluatedAt,authority:'read_only_derived_intelligence',signals,sourceCounts:Object.freeze({transactions:tx.length,blockers:openBlockers.length,financeAnomalies:financeAnomalies.length,workloadOwners:workloads.length})});
}
