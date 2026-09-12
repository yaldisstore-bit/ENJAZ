import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export const PROCESS_SOURCE_PAGE_SIZE = 100;
export const PROCESS_SOURCE_LIMIT = 10_000;

export type WorkflowEventKind = 'start' | 'advance' | 'complete' | 'reopen';
export type FieldAssignmentSourceStatus = 'queued' | 'in_progress' | 'visit_complete' | 'handoff_complete' | 'cancelled';
export type FieldVisitSourceStatus = 'checked_in' | 'completed' | 'could_not_complete';
export type FieldEvidenceSourceType = 'photo' | 'document' | 'receipt' | 'other';

export interface WorkflowInstanceSourceRow {
  readonly id:string;
  readonly workspaceId:string;
  readonly transactionId:string;
  readonly startedAt:string;
}
export interface WorkflowTransitionSourceRow {
  readonly id:string;
  readonly workspaceId:string;
  readonly workflowInstanceId:string;
  readonly transitionKey:string;
  readonly eventKind:WorkflowEventKind;
  readonly fromStagePosition:number|null;
  readonly toStagePosition:number|null;
  readonly occurredAt:string;
}
export interface FieldAssignmentSourceRow {
  readonly id:string;
  readonly workspaceId:string;
  readonly transactionId:string;
  readonly status:FieldAssignmentSourceStatus;
  readonly createdAt:string;
  readonly handoffAt:string|null;
}
export interface FieldVisitSourceRow {
  readonly id:string;
  readonly workspaceId:string;
  readonly assignmentId:string;
  readonly transactionId:string;
  readonly status:FieldVisitSourceStatus;
  readonly checkInAt:string;
  readonly checkOutAt:string|null;
}
export interface FieldEvidenceSourceRow {
  readonly id:string;
  readonly workspaceId:string;
  readonly visitId:string;
  readonly transactionId:string;
  readonly evidenceType:FieldEvidenceSourceType;
  readonly capturedAt:string;
}
export interface ProcessMiningHistorySnapshot {
  readonly authority:'source_owned_process_histories';
  readonly workspaceId:string;
  readonly asOf:string;
  readonly workflowInstances:readonly WorkflowInstanceSourceRow[];
  readonly workflowTransitions:readonly WorkflowTransitionSourceRow[];
  readonly fieldAssignments:readonly FieldAssignmentSourceRow[];
  readonly fieldVisits:readonly FieldVisitSourceRow[];
  readonly fieldEvidence:readonly FieldEvidenceSourceRow[];
  readonly syncReceiptPolicy:'actor_scoped_integrity_evidence_not_path_input';
}
export interface ProcessMiningHistoryGateway {
  loadWorkspaceHistory(workspaceId:string,asOf:Date):Promise<ProcessMiningHistorySnapshot>;
}

export class ProcessSourceCapacityError extends Error { readonly sourceName:string; constructor(sourceName:string){super(`Process source limit: ${sourceName}`);this.name='ProcessSourceCapacityError';this.sourceName=sourceName} }
export class ProcessSourcePageStalledError extends Error { readonly sourceName:string; constructor(sourceName:string){super(`Process source stalled: ${sourceName}`);this.name='ProcessSourcePageStalledError';this.sourceName=sourceName} }
export class ProcessSourceShapeError extends Error { readonly sourceName:string; constructor(sourceName:string){super(`Process source shape invalid: ${sourceName}`);this.name='ProcessSourceShapeError';this.sourceName=sourceName} }
export class ProcessSourceTimeError extends Error { readonly sourceName:string; constructor(sourceName:string){super(`Process source time invalid: ${sourceName}`);this.name='ProcessSourceTimeError';this.sourceName=sourceName} }

interface QueryResponse { readonly data:unknown; readonly error:DataFailureLike|null }
interface QueryLike { then<TResult1 = QueryResponse, TResult2 = never>(onfulfilled?:((value:QueryResponse)=>TResult1|PromiseLike<TResult1>)|null,onrejected?:((reason:unknown)=>TResult2|PromiseLike<TResult2>)|null):PromiseLike<TResult1|TResult2> }
interface SelectBuilderLike {
  eq(column:string,value:unknown):SelectBuilderLike;
  lte(column:string,value:unknown):SelectBuilderLike;
  order(column:string,options?:Readonly<{ascending?:boolean}>):SelectBuilderLike;
  range(from:number,to:number):QueryLike;
}
interface TableLike { select(columns:string):SelectBuilderLike }
interface ReadClientLike { from(table:string):TableLike }

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WORKFLOW_KINDS=['start','advance','complete','reopen'] as const;
const ASSIGNMENT_STATUSES=['queued','in_progress','visit_complete','handoff_complete','cancelled'] as const;
const VISIT_STATUSES=['checked_in','completed','could_not_complete'] as const;
const EVIDENCE_TYPES=['photo','document','receipt','other'] as const;

function rec(value:unknown,source:string):Readonly<Record<string,unknown>>{if(!value||typeof value!=='object'||Array.isArray(value))throw new ProcessSourceShapeError(source);return value as Readonly<Record<string,unknown>>}
function uuid(value:unknown,source:string):string{if(typeof value!=='string'||!UUID.test(value.trim()))throw new ProcessSourceShapeError(source);return value.trim()}
function text(value:unknown,source:string,max=320):string{if(typeof value!=='string'||!value.trim()||value.length>max)throw new ProcessSourceShapeError(source);return value.trim()}
function iso(value:unknown,source:string):string{if(typeof value!=='string')throw new ProcessSourceTimeError(source);const ms=Date.parse(value);if(!Number.isFinite(ms))throw new ProcessSourceTimeError(source);return new Date(ms).toISOString()}
function nullableIso(value:unknown,source:string):string|null{if(value===null||value===undefined||value==='')return null;return iso(value,source)}
function nullablePositiveInt(value:unknown,source:string):number|null{if(value===null||value===undefined)return null;const n=typeof value==='number'?value:typeof value==='string'&&/^\d+$/.test(value)?Number(value):NaN;if(!Number.isSafeInteger(n)||n<1)throw new ProcessSourceShapeError(source);return n}
function one<T extends string>(value:unknown,allowed:readonly T[],source:string):T{if(!allowed.includes(value as T))throw new ProcessSourceShapeError(source);return value as T}
function assertWorkspace(value:unknown,workspaceId:string,source:string):string{const x=uuid(value,source);if(x!==workspaceId)throw new ProcessSourceShapeError(source);return x}
function assertNotFuture(value:string,asOfMs:number,source:string):void{if(Date.parse(value)>asOfMs)throw new ProcessSourceTimeError(source)}

function parseWorkflowInstance(value:unknown,workspaceId:string,asOfMs:number):WorkflowInstanceSourceRow{
 const r=rec(value,'workflow_instances'),startedAt=iso(r.started_at,'workflow_instances');assertNotFuture(startedAt,asOfMs,'workflow_instances');
 return Object.freeze({id:uuid(r.id,'workflow_instances'),workspaceId:assertWorkspace(r.workspace_id,workspaceId,'workflow_instances'),transactionId:uuid(r.transaction_id,'workflow_instances'),startedAt});
}
function parseWorkflowTransition(value:unknown,workspaceId:string,asOfMs:number):WorkflowTransitionSourceRow{
 const r=rec(value,'workflow_transition_events'),occurredAt=iso(r.occurred_at,'workflow_transition_events');assertNotFuture(occurredAt,asOfMs,'workflow_transition_events');
 return Object.freeze({id:uuid(r.id,'workflow_transition_events'),workspaceId:assertWorkspace(r.workspace_id,workspaceId,'workflow_transition_events'),workflowInstanceId:uuid(r.workflow_instance_id,'workflow_transition_events'),transitionKey:text(r.transition_key,'workflow_transition_events',80),eventKind:one(r.event_kind,WORKFLOW_KINDS,'workflow_transition_events'),fromStagePosition:nullablePositiveInt(r.from_stage_position,'workflow_transition_events'),toStagePosition:nullablePositiveInt(r.to_stage_position,'workflow_transition_events'),occurredAt});
}
function parseFieldAssignment(value:unknown,workspaceId:string,asOfMs:number):FieldAssignmentSourceRow{
 const r=rec(value,'field_assignments'),createdAt=iso(r.created_at,'field_assignments'),handoffAt=nullableIso(r.handoff_at,'field_assignments');assertNotFuture(createdAt,asOfMs,'field_assignments');if(handoffAt!==null){assertNotFuture(handoffAt,asOfMs,'field_assignments');if(Date.parse(handoffAt)<Date.parse(createdAt))throw new ProcessSourceTimeError('field_assignments')}
 return Object.freeze({id:uuid(r.id,'field_assignments'),workspaceId:assertWorkspace(r.workspace_id,workspaceId,'field_assignments'),transactionId:uuid(r.transaction_id,'field_assignments'),status:one(r.status,ASSIGNMENT_STATUSES,'field_assignments'),createdAt,handoffAt});
}
function parseFieldVisit(value:unknown,workspaceId:string,asOfMs:number):FieldVisitSourceRow{
 const r=rec(value,'field_visits'),checkInAt=iso(r.check_in_at,'field_visits'),checkOutAt=nullableIso(r.check_out_at,'field_visits');assertNotFuture(checkInAt,asOfMs,'field_visits');if(checkOutAt!==null){assertNotFuture(checkOutAt,asOfMs,'field_visits');if(Date.parse(checkOutAt)<Date.parse(checkInAt))throw new ProcessSourceTimeError('field_visits')}
 return Object.freeze({id:uuid(r.id,'field_visits'),workspaceId:assertWorkspace(r.workspace_id,workspaceId,'field_visits'),assignmentId:uuid(r.assignment_id,'field_visits'),transactionId:uuid(r.transaction_id,'field_visits'),status:one(r.status,VISIT_STATUSES,'field_visits'),checkInAt,checkOutAt});
}
function parseFieldEvidence(value:unknown,workspaceId:string,asOfMs:number):FieldEvidenceSourceRow{
 const r=rec(value,'field_visit_evidence'),capturedAt=iso(r.captured_at,'field_visit_evidence');assertNotFuture(capturedAt,asOfMs,'field_visit_evidence');
 return Object.freeze({id:uuid(r.id,'field_visit_evidence'),workspaceId:assertWorkspace(r.workspace_id,workspaceId,'field_visit_evidence'),visitId:uuid(r.visit_id,'field_visit_evidence'),transactionId:uuid(r.transaction_id,'field_visit_evidence'),evidenceType:one(r.evidence_type,EVIDENCE_TYPES,'field_visit_evidence'),capturedAt});
}

async function page(client:ReadClientLike,source:string,columns:string,workspaceId:string,timeColumn:string,asOf:string,offset:number):Promise<readonly unknown[]>{
 try{
  const response=await Promise.resolve(client.from(source).select(columns).eq('workspace_id',workspaceId).lte(timeColumn,asOf).order(timeColumn,{ascending:true}).order('id',{ascending:true}).range(offset,offset+PROCESS_SOURCE_PAGE_SIZE-1));
  if(response.error)throw normalizeDataFailure(response.error);if(!Array.isArray(response.data))throw new ProcessSourceShapeError(source);return response.data;
 }catch(error){if(error instanceof ProcessSourceShapeError||error instanceof ProcessSourceTimeError||error instanceof ProcessSourceCapacityError||error instanceof ProcessSourcePageStalledError)throw error;throw normalizeThrownDataFailure(error,'read')}
}
async function all<T>(client:ReadClientLike,source:string,columns:string,workspaceId:string,timeColumn:string,asOf:string,parse:(value:unknown)=>T):Promise<readonly T[]>{
 const rows:T[]=[];let offset=0;
 for(;;){const items=await page(client,source,columns,workspaceId,timeColumn,asOf,offset);for(const item of items){rows.push(parse(item));if(rows.length>PROCESS_SOURCE_LIMIT)throw new ProcessSourceCapacityError(source)}if(items.length<PROCESS_SOURCE_PAGE_SIZE)return Object.freeze(rows);if(items.length===0)throw new ProcessSourcePageStalledError(source);offset+=items.length}
}

export function createProcessMiningHistoryGateway(client:EnjazSupabaseClient):ProcessMiningHistoryGateway{
 const read=client as unknown as ReadClientLike;
 return Object.freeze({
  async loadWorkspaceHistory(workspaceId:string,asOf:Date){
   const workspace=uuid(workspaceId,'workspace'),asOfMs=asOf.getTime();if(!Number.isFinite(asOfMs))throw new ProcessSourceTimeError('snapshot');const asOfIso=asOf.toISOString();
   const [workflowInstances,workflowTransitions,fieldAssignments,fieldVisits,fieldEvidence]=await Promise.all([
    all(read,'workflow_instances','id,workspace_id,transaction_id,started_at',workspace,'started_at',asOfIso,(value)=>parseWorkflowInstance(value,workspace,asOfMs)),
    all(read,'workflow_transition_events','id,workspace_id,workflow_instance_id,transition_key,event_kind,from_stage_position,to_stage_position,occurred_at',workspace,'occurred_at',asOfIso,(value)=>parseWorkflowTransition(value,workspace,asOfMs)),
    all(read,'field_assignments','id,workspace_id,transaction_id,status,created_at,handoff_at',workspace,'created_at',asOfIso,(value)=>parseFieldAssignment(value,workspace,asOfMs)),
    all(read,'field_visits','id,workspace_id,assignment_id,transaction_id,status,check_in_at,check_out_at',workspace,'check_in_at',asOfIso,(value)=>parseFieldVisit(value,workspace,asOfMs)),
    all(read,'field_visit_evidence','id,workspace_id,visit_id,transaction_id,evidence_type,captured_at',workspace,'captured_at',asOfIso,(value)=>parseFieldEvidence(value,workspace,asOfMs)),
   ]);
   return Object.freeze({authority:'source_owned_process_histories' as const,workspaceId:workspace,asOf:asOfIso,workflowInstances,workflowTransitions,fieldAssignments,fieldVisits,fieldEvidence,syncReceiptPolicy:'actor_scoped_integrity_evidence_not_path_input' as const});
  },
 });
}
