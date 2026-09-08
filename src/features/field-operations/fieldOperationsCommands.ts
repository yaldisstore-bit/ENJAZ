import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export type FieldLocationPolicy = 'disabled' | 'optional' | 'required';
export type FieldPriority = 'low' | 'normal' | 'high' | 'urgent';
export type FieldAssignmentStatus = 'queued' | 'in_progress' | 'visit_complete' | 'handoff_complete' | 'cancelled';
export type FieldVisitStatus = 'checked_in' | 'completed' | 'could_not_complete';
export type FieldVisitOutcome = 'completed' | 'could_not_complete';
export type FieldFailureReason = 'office_closed' | 'missing_requirement' | 'payment_issue' | 'authority_delay' | 'rejected' | 'technical_issue' | 'other';
export type FieldEvidenceType = 'photo' | 'document' | 'receipt' | 'other';

export interface FieldLocationEvidence { readonly lat:number; readonly lng:number; readonly accuracyMeters?:number }
export interface FieldMemberSummary { readonly userId:string; readonly displayName:string }
export interface FieldAssignmentSummary {
  readonly id:string; readonly transactionId:string; readonly transactionType:string; readonly transactionStatus:string; readonly companyName:string;
  readonly assignedUserId:string; readonly assignedUserName:string; readonly scheduledFor:string; readonly destinationLabel:string; readonly department:string|null;
  readonly priority:FieldPriority; readonly status:FieldAssignmentStatus; readonly version:number; readonly openBlockers:number; readonly nextRequiredAction:string;
}
export interface FieldVisitSummary {
  readonly id:string; readonly assignmentId:string; readonly transactionId:string; readonly assignedUserId:string; readonly status:FieldVisitStatus; readonly version:number;
  readonly checkInAt:string; readonly checkOutAt:string|null; readonly counterDepartment:string|null; readonly officialReference:string|null; readonly officialFeePaid:string|null;
  readonly failureReason:FieldFailureReason|null; readonly outcomeNote:string|null; readonly checkInLocationRecorded:boolean; readonly checkOutLocationRecorded:boolean; readonly evidenceCount:number;
}
export interface FieldOperationsMetrics { readonly activeTransactions:number; readonly stalledTransactions:number; readonly highCriticalBlockers:number; readonly pendingAutomationApprovals:number; readonly queuedAssignments:number; readonly activeVisits:number }
export interface FieldOperationsContext {
  readonly authority:'field_assignments_visits_evidence_receipts';
  readonly transactionWriteAuthority:'none';
  readonly workflowWriteAuthority:'existing_workflow_rpc_only';
  readonly automationWriteAuthority:'existing_automation_rpc_only';
  readonly financeWriteAuthority:'none';
  readonly locationPolicy:FieldLocationPolicy; readonly metrics:FieldOperationsMetrics; readonly members:readonly FieldMemberSummary[]; readonly assignments:readonly FieldAssignmentSummary[]; readonly visits:readonly FieldVisitSummary[];
}
export interface UpsertFieldAssignmentInput { readonly workspaceId:string; readonly assignmentId:string|null; readonly expectedVersion:number|null; readonly transactionId:string; readonly assignedUserId:string; readonly scheduledFor:string; readonly destinationLabel:string; readonly department:string|null; readonly priority:FieldPriority }
export interface FinishFieldVisitInput { readonly workspaceId:string; readonly visitId:string; readonly expectedVisitVersion:number; readonly outcome:FieldVisitOutcome; readonly failureReason:FieldFailureReason|null; readonly outcomeNote:string|null; readonly counterDepartment:string|null; readonly officialReference:string|null; readonly officialFeePaid:string|null; readonly location:FieldLocationEvidence|null; readonly clientOperationId:string }
export interface FieldMutationResult { readonly wasDuplicate:boolean; readonly [key:string]:unknown }
export interface FieldOperationsCommandGateway {
  loadContext(workspaceId:string):Promise<FieldOperationsContext>;
  setLocationPolicy(workspaceId:string,policy:FieldLocationPolicy):Promise<{readonly locationEvidence:FieldLocationPolicy}>;
  upsertAssignment(input:UpsertFieldAssignmentInput):Promise<FieldMutationResult>;
  reassign(workspaceId:string,assignmentId:string,expectedVersion:number,assignedUserId:string,reason:string,clientOperationId:string):Promise<FieldMutationResult>;
  checkIn(workspaceId:string,assignmentId:string,expectedAssignmentVersion:number,location:FieldLocationEvidence|null,clientOperationId:string):Promise<FieldMutationResult>;
  checkOut(input:FinishFieldVisitInput):Promise<FieldMutationResult>;
  addEvidence(workspaceId:string,visitId:string,expectedVisitVersion:number,evidenceType:FieldEvidenceType,documentId:string|null,note:string|null,clientOperationId:string):Promise<FieldMutationResult>;
  handoff(workspaceId:string,assignmentId:string,expectedVersion:number,note:string,clientOperationId:string):Promise<FieldMutationResult>;
}

interface RpcResponse { readonly data:unknown; readonly error:DataFailureLike|null }
interface RpcClientLike { rpc(name:string,args:Readonly<Record<string,unknown>>):PromiseLike<RpcResponse> }
const TIMEOUT=15000,U=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,D=/^\d{4}-\d{2}-\d{2}$/,M=/^\d{1,16}(?:\.\d{1,2})?$/;
const POL=['disabled','optional','required'] as const,PRI=['low','normal','high','urgent'] as const,AS=['queued','in_progress','visit_complete','handoff_complete','cancelled'] as const,VS=['checked_in','completed','could_not_complete'] as const,FR=['office_closed','missing_requirement','payment_issue','authority_delay','rejected','technical_issue','other'] as const,EV=['photo','document','receipt','other'] as const;
function bad(validation=false):never{throw new DataAccessError('Invalid field data',validation?'DATA_VALIDATION_FAILED':'DATA_OPERATION_FAILED')}
function rec(v:unknown):Readonly<Record<string,unknown>>{if(!v||typeof v!=='object'||Array.isArray(v))bad();return v as Readonly<Record<string,unknown>>}
function arr(v:unknown):readonly unknown[]{if(!Array.isArray(v))bad();return v}
function str(v:unknown,max=1200){if(typeof v!=='string'||!v.trim()||v.length>max)bad();return v.trim()}
function opt(v:unknown,max=1200){return v===null||v===undefined||v===''?null:str(v,max)}
function id(v:unknown){const s=str(v,64);if(!U.test(s))bad(true);return s}
function uint(v:unknown){if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0)bad();return v}
function count(v:unknown){const n=typeof v==='number'?v:typeof v==='string'?Number(v):NaN;if(!Number.isSafeInteger(n)||n<0)bad();return n}
function one<T extends string>(v:unknown,a:readonly T[]):T{if(!a.includes(v as T))bad();return v as T}
const policy=(v:unknown)=>one(v,POL),priority=(v:unknown)=>one(v,PRI),assignmentStatus=(v:unknown)=>one(v,AS),visitStatus=(v:unknown)=>one(v,VS);
function failureReason(v:unknown):FieldFailureReason|null{return v===null||v===undefined||v===''?null:one(v,FR)}
function validateLocation(v:FieldLocationEvidence|null):FieldLocationEvidence|null{if(v===null)return null;if(!Number.isFinite(v.lat)||v.lat< -90||v.lat>90||!Number.isFinite(v.lng)||v.lng< -180||v.lng>180||v.accuracyMeters!==undefined&&(!Number.isFinite(v.accuracyMeters)||v.accuracyMeters<0||v.accuracyMeters>10000))bad(true);return v}
function parseMember(v:unknown):FieldMemberSummary{const r=rec(v);return Object.freeze({userId:id(r.userId),displayName:str(r.displayName,160)})}
function parseAssignment(v:unknown):FieldAssignmentSummary{const r=rec(v),scheduledFor=str(r.scheduledFor,16);if(!D.test(scheduledFor))bad();return Object.freeze({id:id(r.id),transactionId:id(r.transactionId),transactionType:str(r.transactionType,180),transactionStatus:str(r.transactionStatus,40),companyName:str(r.companyName,400),assignedUserId:id(r.assignedUserId),assignedUserName:str(r.assignedUserName,160),scheduledFor,destinationLabel:str(r.destinationLabel,320),department:opt(r.department,240),priority:priority(r.priority),status:assignmentStatus(r.status),version:uint(r.version),openBlockers:count(r.openBlockers),nextRequiredAction:str(r.nextRequiredAction,800)})}
function parseVisit(v:unknown):FieldVisitSummary{const r=rec(v),fee=r.officialFeePaid==null?null:String(r.officialFeePaid);if(fee!==null&&!M.test(fee))bad();return Object.freeze({id:id(r.id),assignmentId:id(r.assignmentId),transactionId:id(r.transactionId),assignedUserId:id(r.assignedUserId),status:visitStatus(r.status),version:uint(r.version),checkInAt:str(r.checkInAt,64),checkOutAt:opt(r.checkOutAt,64),counterDepartment:opt(r.counterDepartment,320),officialReference:opt(r.officialReference,320),officialFeePaid:fee,failureReason:failureReason(r.failureReason),outcomeNote:opt(r.outcomeNote,1600),checkInLocationRecorded:r.checkInLocationRecorded===true,checkOutLocationRecorded:r.checkOutLocationRecorded===true,evidenceCount:count(r.evidenceCount)})}
function parseMetrics(v:unknown):FieldOperationsMetrics{const r=rec(v);return Object.freeze({activeTransactions:count(r.activeTransactions),stalledTransactions:count(r.stalledTransactions),highCriticalBlockers:count(r.highCriticalBlockers),pendingAutomationApprovals:count(r.pendingAutomationApprovals),queuedAssignments:count(r.queuedAssignments),activeVisits:count(r.activeVisits)})}
function parseContext(v:unknown):FieldOperationsContext{const r=rec(v);if(r.authority!=='field_assignments_visits_evidence_receipts'||r.transactionWriteAuthority!=='none'||r.workflowWriteAuthority!=='existing_workflow_rpc_only'||r.automationWriteAuthority!=='existing_automation_rpc_only'||r.financeWriteAuthority!=='none')bad();return Object.freeze({authority:r.authority,transactionWriteAuthority:r.transactionWriteAuthority,workflowWriteAuthority:r.workflowWriteAuthority,automationWriteAuthority:r.automationWriteAuthority,financeWriteAuthority:r.financeWriteAuthority,locationPolicy:policy(r.locationPolicy),metrics:parseMetrics(r.metrics),members:Object.freeze(arr(r.members).map(parseMember)),assignments:Object.freeze(arr(r.assignments).map(parseAssignment)),visits:Object.freeze(arr(r.visits).map(parseVisit))})}
function mutation(v:unknown):FieldMutationResult{const r=rec(v);return Object.freeze({...r,wasDuplicate:r.wasDuplicate===true})}
function version(v:number){if(!Number.isSafeInteger(v)||v<1)bad(true);return v}
function date(v:string){if(!D.test(v)||!Number.isFinite(Date.parse(`${v}T00:00:00Z`)))bad(true);return v}
function fee(v:string|null){if(v===null||v==='')return null;if(!M.test(v)||Number(v)<=0)bad(true);return v}
async function settle<T>(p:PromiseLike<T>,write:boolean,t:number):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new DataAccessError('Field request timeout',write?'DATA_OUTCOME_UNKNOWN':'DATA_UNAVAILABLE')),t)});try{return await Promise.race([Promise.resolve(p),deadline])}catch(e){throw normalizeThrownDataFailure(e,write?'write':'read')}finally{if(timer!==undefined)clearTimeout(timer)}}
async function rpc(c:RpcClientLike,n:string,a:Readonly<Record<string,unknown>>,write:boolean,t:number){const r=await settle(c.rpc(n,a),write,t);if(r.error)throw normalizeDataFailure(r.error);return r.data}

export function createFieldOperationsCommandGateway(client:EnjazSupabaseClient,timeoutMs=TIMEOUT):FieldOperationsCommandGateway{
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw new Error('Invalid field timeout');
  const c=client as unknown as RpcClientLike;
  const gateway:FieldOperationsCommandGateway={
    async loadContext(workspaceId){return parseContext(await rpc(c,'get_field_operations_context_v1',{p_workspace_id:id(workspaceId)},false,timeoutMs))},
    async setLocationPolicy(workspaceId,nextPolicy){const r=rec(await rpc(c,'set_field_location_policy_v1',{p_workspace_id:id(workspaceId),p_policy:policy(nextPolicy)},true,timeoutMs));return Object.freeze({locationEvidence:policy(r.locationEvidence)})},
    async upsertAssignment(x){if(x.assignmentId===null?x.expectedVersion!==null:x.expectedVersion===null)bad(true);if(!x.destinationLabel.trim()||x.destinationLabel.length>320)bad(true);return mutation(await rpc(c,'upsert_field_assignment_v1',{p_workspace_id:id(x.workspaceId),p_assignment_id:x.assignmentId===null?null:id(x.assignmentId),p_expected_version:x.expectedVersion===null?null:version(x.expectedVersion),p_transaction_id:id(x.transactionId),p_assigned_user_id:id(x.assignedUserId),p_scheduled_for:date(x.scheduledFor),p_destination_label:x.destinationLabel.trim(),p_department:x.department?.trim()||null,p_priority:priority(x.priority)},true,timeoutMs))},
    async reassign(workspaceId,assignmentId,expectedVersion,assignedUserId,reason,clientOperationId){if(reason.trim().length<3||reason.length>1200)bad(true);return mutation(await rpc(c,'reassign_field_assignment_v1',{p_workspace_id:id(workspaceId),p_assignment_id:id(assignmentId),p_expected_version:version(expectedVersion),p_assigned_user_id:id(assignedUserId),p_reason:reason.trim(),p_client_operation_id:id(clientOperationId)},true,timeoutMs))},
    async checkIn(workspaceId,assignmentId,expectedAssignmentVersion,location,clientOperationId){return mutation(await rpc(c,'start_field_visit_v1',{p_workspace_id:id(workspaceId),p_assignment_id:id(assignmentId),p_expected_assignment_version:version(expectedAssignmentVersion),p_location:validateLocation(location),p_client_operation_id:id(clientOperationId)},true,timeoutMs))},
    async checkOut(x){if(x.outcome==='could_not_complete'?x.failureReason===null:x.failureReason!==null)bad(true);return mutation(await rpc(c,'finish_field_visit_v1',{p_workspace_id:id(x.workspaceId),p_visit_id:id(x.visitId),p_expected_visit_version:version(x.expectedVisitVersion),p_outcome:x.outcome,p_failure_reason:x.failureReason,p_outcome_note:x.outcomeNote?.trim()||null,p_counter_department:x.counterDepartment?.trim()||null,p_official_reference:x.officialReference?.trim()||null,p_official_fee_paid:fee(x.officialFeePaid),p_location:validateLocation(x.location),p_client_operation_id:id(x.clientOperationId)},true,timeoutMs))},
    async addEvidence(workspaceId,visitId,expectedVisitVersion,evidenceType,documentId,note,clientOperationId){one(evidenceType,EV);if(evidenceType!=='other'&&documentId===null)bad(true);return mutation(await rpc(c,'add_field_visit_evidence_v1',{p_workspace_id:id(workspaceId),p_visit_id:id(visitId),p_expected_visit_version:version(expectedVisitVersion),p_evidence_type:evidenceType,p_document_id:documentId===null?null:id(documentId),p_note:note?.trim()||null,p_client_operation_id:id(clientOperationId)},true,timeoutMs))},
    async handoff(workspaceId,assignmentId,expectedVersion,note,clientOperationId){if(note.trim().length<3||note.length>1200)bad(true);return mutation(await rpc(c,'handoff_field_assignment_v1',{p_workspace_id:id(workspaceId),p_assignment_id:id(assignmentId),p_expected_version:version(expectedVersion),p_note:note.trim(),p_client_operation_id:id(clientOperationId)},true,timeoutMs))}
  };
  return Object.freeze(gateway);
}
