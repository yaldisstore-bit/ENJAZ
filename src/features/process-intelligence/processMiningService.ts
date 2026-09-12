import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { ReadRepository } from '../../data/repositories/createEntityRepository.ts';
import {
 ENJAZ_PROCESS_MINING_SCHEMA,buildEmpiricalNextActivityPrediction,buildProcessEvent,buildProcessPath,
 type DirectionalProcessPrediction,type ProcessEvent,type ProcessEventProvenance,type ProcessPath,type ProcessSourceDomain,
} from './processMiningContract.ts';
import type {
 FieldAssignmentSourceRow,FieldEvidenceSourceRow,FieldVisitSourceRow,ProcessMiningHistoryGateway,ProcessMiningHistorySnapshot,WorkflowTransitionSourceRow,
} from './processMiningSources.ts';

const PAGE=100;
export const PROCESS_COMPOSITION_SOURCE_LIMIT=10_000;

export class ProcessWorkspaceUnavailableError extends Error{constructor(){super('Process mining workspace unavailable');this.name='ProcessWorkspaceUnavailableError'}}
export class ProcessCompositionCapacityError extends Error{readonly sourceName:string;constructor(sourceName:string){super(`Process composition source limit: ${sourceName}`);this.name='ProcessCompositionCapacityError';this.sourceName=sourceName}}
export class ProcessCompositionPageStalledError extends Error{readonly sourceName:string;constructor(sourceName:string){super(`Process composition source stalled: ${sourceName}`);this.name='ProcessCompositionPageStalledError';this.sourceName=sourceName}}
export class ProcessCompositionAuthorityError extends Error{constructor(message:string){super(message);this.name='ProcessCompositionAuthorityError'}}
export class ProcessCompositionOrphanError extends Error{readonly sourceName:string;readonly sourceId:string;constructor(sourceName:string,sourceId:string){super(`Process source orphan: ${sourceName}:${sourceId}`);this.name='ProcessCompositionOrphanError';this.sourceName=sourceName;this.sourceId=sourceId}}

export interface ProcessMiningDependencies{
 readonly dataFactory:EnjazDataLayerFactory;
 readonly historyGateway:ProcessMiningHistoryGateway;
}
export interface ProcessMiningSourceCounts{
 readonly transactionActivity:number;
 readonly workflowInstances:number;
 readonly workflowTransitions:number;
 readonly fieldAssignments:number;
 readonly fieldVisits:number;
 readonly fieldEvidence:number;
}
export interface ProcessMiningSnapshot{
 readonly schema:typeof ENJAZ_PROCESS_MINING_SCHEMA;
 readonly workspaceId:string;
 readonly generatedAt:string;
 readonly authority:'read_only_derived_process_intelligence';
 readonly cases:readonly ProcessPath[];
 readonly sourceCounts:ProcessMiningSourceCounts;
 readonly syncReceiptPolicy:'actor_scoped_integrity_evidence_not_path_input';
}

async function allTransactionActivity(repo:ReadRepository<'transaction_activity'>,asOf:string):Promise<readonly RowOf<'transaction_activity'>[]>{
 const rows:RowOf<'transaction_activity'>[]=[];let offset=0;
 for(;;){
  const page=await repo.list({filters:[{column:'occurred_at',operator:'lte',value:asOf}],orderBy:[{column:'occurred_at',ascending:true},{column:'id',ascending:true}],offset,limit:PAGE});
  rows.push(...page.items);if(rows.length>PROCESS_COMPOSITION_SOURCE_LIMIT)throw new ProcessCompositionCapacityError('transaction_activity');
  if(!page.hasMore)return Object.freeze(rows);if(!page.items.length)throw new ProcessCompositionPageStalledError('transaction_activity');offset+=page.items.length;
 }
}
function provenance(workspaceId:string,caseId:string,sourceDomain:ProcessSourceDomain,sourceEntity:string,sourceEventId:string,sourceAsOf:string,basis:readonly string[]):ProcessEventProvenance{
 return Object.freeze({schema:ENJAZ_PROCESS_MINING_SCHEMA,workspaceId,caseId,sourceDomain,sourceEntity,sourceEventId,sourceAsOf,basis:Object.freeze([...basis]),derivationVersion:'phase9.6-source-composition-v1'});
}
function txLabel(row:RowOf<'transaction_activity'>):string{
 const labels:Readonly<Record<string,string>>={transaction_created:'إنشاء المعاملة',transaction_archived:'أرشفة المعاملة',transaction_restored:'استعادة المعاملة',transaction_completed:'إكمال المعاملة',transaction_reactivated:'إعادة تفعيل المعاملة',payment_posted:'تسجيل دفعة',payment_reversed:'عكس دفعة'};
 return labels[row.event_type]??`نشاط المعاملة: ${row.event_type}`;
}
function workflowLabel(row:WorkflowTransitionSourceRow):string{
 const labels={start:'بدء مسار الإجراء',advance:'انتقال إلى مرحلة لاحقة',complete:'إكمال مسار الإجراء',reopen:'إعادة فتح مرحلة'} as const;
 return `${labels[row.eventKind]} — ${row.transitionKey}`;
}
function fieldAssignmentEvents(row:FieldAssignmentSourceRow,asOf:string):readonly ProcessEvent[]{
 const events:ProcessEvent[]=[buildProcessEvent({workspaceId:row.workspaceId,caseId:row.transactionId,activityKey:'field:assignment_created',labelAr:'إنشاء تكليف ميداني',occurredAt:row.createdAt,provenance:provenance(row.workspaceId,row.transactionId,'field-operations','field_assignments',`${row.id}:created`,asOf,['id','transaction_id','created_at','status'])})];
 if(row.handoffAt!==null)events.push(buildProcessEvent({workspaceId:row.workspaceId,caseId:row.transactionId,activityKey:'field:handoff',labelAr:'تسليم العمل الميداني',occurredAt:row.handoffAt,provenance:provenance(row.workspaceId,row.transactionId,'field-operations','field_assignments',`${row.id}:handoff`,asOf,['id','transaction_id','handoff_at','status'])}));
 return Object.freeze(events);
}
function fieldVisitEvents(row:FieldVisitSourceRow,asOf:string):readonly ProcessEvent[]{
 const events:ProcessEvent[]=[buildProcessEvent({workspaceId:row.workspaceId,caseId:row.transactionId,activityKey:'field:visit_check_in',labelAr:'بدء زيارة ميدانية',occurredAt:row.checkInAt,provenance:provenance(row.workspaceId,row.transactionId,'field-operations','field_visits',`${row.id}:check_in`,asOf,['id','assignment_id','transaction_id','check_in_at','status'])})];
 if(row.checkOutAt!==null){const failed=row.status==='could_not_complete';events.push(buildProcessEvent({workspaceId:row.workspaceId,caseId:row.transactionId,activityKey:failed?'field:visit_failed':'field:visit_completed',labelAr:failed?'تعذر إكمال الزيارة الميدانية':'إكمال الزيارة الميدانية',occurredAt:row.checkOutAt,provenance:provenance(row.workspaceId,row.transactionId,'field-operations','field_visits',`${row.id}:check_out`,asOf,['id','assignment_id','transaction_id','check_out_at','status'])}))}
 return Object.freeze(events);
}
function fieldEvidenceEvent(row:FieldEvidenceSourceRow,asOf:string):ProcessEvent{
 const labels={photo:'التقاط دليل ميداني مصور',document:'إرفاق مستند ميداني',receipt:'إرفاق إيصال ميداني',other:'إضافة دليل ميداني'} as const;
 return buildProcessEvent({workspaceId:row.workspaceId,caseId:row.transactionId,activityKey:`field:evidence:${row.evidenceType}`,labelAr:labels[row.evidenceType],occurredAt:row.capturedAt,provenance:provenance(row.workspaceId,row.transactionId,'field-operations','field_visit_evidence',row.id,asOf,['id','visit_id','transaction_id','evidence_type','captured_at'])});
}
function assertHistory(history:ProcessMiningHistorySnapshot,workspaceId:string,generatedAt:string):void{
 if(history.authority!=='source_owned_process_histories'||history.workspaceId!==workspaceId||history.asOf!==generatedAt||history.syncReceiptPolicy!=='actor_scoped_integrity_evidence_not_path_input')throw new ProcessCompositionAuthorityError('Process history authority drift');
}
function add(grouped:Map<string,ProcessEvent[]>,event:ProcessEvent):void{const list=grouped.get(event.caseId);if(list)list.push(event);else grouped.set(event.caseId,[event])}
function stableSort(events:readonly ProcessEvent[]):readonly ProcessEvent[]{return Object.freeze([...events].sort((a,b)=>Date.parse(a.occurredAt)-Date.parse(b.occurredAt)||a.provenance.sourceDomain.localeCompare(b.provenance.sourceDomain)||a.provenance.sourceEntity.localeCompare(b.provenance.sourceEntity)||a.provenance.sourceEventId.localeCompare(b.provenance.sourceEventId)))}

export async function loadProcessMiningSnapshot(d:ProcessMiningDependencies,userId:string,now:Date=new Date()):Promise<ProcessMiningSnapshot>{
 if(!Number.isFinite(now.getTime()))throw new Error('Invalid process mining evaluation time');
 const workspaceId=await d.dataFactory.resolveWorkspaceId(userId);if(!workspaceId)throw new ProcessWorkspaceUnavailableError();
 const generatedAt=now.toISOString(),layer=d.dataFactory.forWorkspace(workspaceId);
 const [activity,history]=await Promise.all([allTransactionActivity(layer.transactionActivity,generatedAt),d.historyGateway.loadWorkspaceHistory(workspaceId,now)]);assertHistory(history,workspaceId,generatedAt);
 const grouped=new Map<string,ProcessEvent[]>();
 for(const row of activity){if(row.workspace_id!==workspaceId)throw new ProcessCompositionAuthorityError('Transaction activity workspace drift');add(grouped,buildProcessEvent({workspaceId,caseId:row.transaction_id,activityKey:`transaction:${row.event_type}`,labelAr:txLabel(row),occurredAt:row.occurred_at,provenance:provenance(workspaceId,row.transaction_id,'transaction-lifecycle','transaction_activity',row.id,generatedAt,['id','transaction_id','event_type','occurred_at','source_entity_type','source_entity_id'])}))}
 const workflowInstances=new Map<string,string>();for(const row of history.workflowInstances){const existing=workflowInstances.get(row.id);if(existing&&existing!==row.transactionId)throw new ProcessCompositionAuthorityError('Workflow instance transaction drift');workflowInstances.set(row.id,row.transactionId)}
 for(const row of history.workflowTransitions){const transactionId=workflowInstances.get(row.workflowInstanceId);if(!transactionId)throw new ProcessCompositionOrphanError('workflow_transition_events',row.id);add(grouped,buildProcessEvent({workspaceId,caseId:transactionId,activityKey:`workflow:${row.eventKind}:${row.transitionKey}`,labelAr:workflowLabel(row),occurredAt:row.occurredAt,provenance:provenance(workspaceId,transactionId,'workflow','workflow_transition_events',row.id,generatedAt,['id','workflow_instance_id','transition_key','event_kind','from_stage_position','to_stage_position','occurred_at'])}))}
 const assignments=new Map<string,FieldAssignmentSourceRow>();for(const row of history.fieldAssignments){assignments.set(row.id,row);for(const event of fieldAssignmentEvents(row,generatedAt))add(grouped,event)}
 const visits=new Map<string,FieldVisitSourceRow>();for(const row of history.fieldVisits){const assignment=assignments.get(row.assignmentId);if(!assignment)throw new ProcessCompositionOrphanError('field_visits',row.id);if(assignment.transactionId!==row.transactionId)throw new ProcessCompositionAuthorityError('Field visit transaction drift');if(Date.parse(row.checkInAt)<Date.parse(assignment.createdAt))throw new ProcessCompositionAuthorityError('Field visit precedes assignment');visits.set(row.id,row);for(const event of fieldVisitEvents(row,generatedAt))add(grouped,event)}
 for(const row of history.fieldEvidence){const visit=visits.get(row.visitId);if(!visit)throw new ProcessCompositionOrphanError('field_visit_evidence',row.id);if(visit.transactionId!==row.transactionId)throw new ProcessCompositionAuthorityError('Field evidence transaction drift');if(Date.parse(row.capturedAt)<Date.parse(visit.checkInAt))throw new ProcessCompositionAuthorityError('Field evidence precedes visit');add(grouped,fieldEvidenceEvent(row,generatedAt))}
 const cases=Object.freeze([...grouped.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,events])=>buildProcessPath(stableSort(events))));
 return Object.freeze({schema:ENJAZ_PROCESS_MINING_SCHEMA,workspaceId,generatedAt,authority:'read_only_derived_process_intelligence',cases,sourceCounts:Object.freeze({transactionActivity:activity.length,workflowInstances:history.workflowInstances.length,workflowTransitions:history.workflowTransitions.length,fieldAssignments:history.fieldAssignments.length,fieldVisits:history.fieldVisits.length,fieldEvidence:history.fieldEvidence.length}),syncReceiptPolicy:history.syncReceiptPolicy});
}

export function predictNextActivity(snapshot:ProcessMiningSnapshot,currentActivityKey:string,assumptions:readonly string[]=['توقع اتجاهي مشتق من المسارات التاريخية المرصودة فقط ولا يمثل حقيقة تشغيلية مستقبلية.']):DirectionalProcessPrediction{
 if(snapshot.authority!=='read_only_derived_process_intelligence')throw new ProcessCompositionAuthorityError('Process snapshot authority drift');
 return buildEmpiricalNextActivityPrediction({workspaceId:snapshot.workspaceId,currentActivityKey,historicalPaths:snapshot.cases,asOf:snapshot.generatedAt,assumptions});
}
