import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import type { FieldEvidenceType, FieldFailureReason, FieldLocationEvidence, FieldOperationsCommandGateway, FieldVisitOutcome } from './fieldOperationsCommands.ts';

export type FieldOfflineOperation =
  | Readonly<{ kind: 'check_in'; operationId:string; workspaceId:string; assignmentId:string; expectedAssignmentVersion:number; location:FieldLocationEvidence|null; queuedAt:string }>
  | Readonly<{ kind: 'check_out'; operationId:string; workspaceId:string; visitId:string; expectedVisitVersion:number; outcome:FieldVisitOutcome; failureReason:FieldFailureReason|null; outcomeNote:string|null; counterDepartment:string|null; officialReference:string|null; officialFeePaid:string|null; location:FieldLocationEvidence|null; queuedAt:string }>
  | Readonly<{ kind: 'evidence'; operationId:string; workspaceId:string; visitId:string; expectedVisitVersion:number; evidenceType:FieldEvidenceType; documentId:string|null; note:string|null; queuedAt:string }>
  | Readonly<{ kind: 'handoff'; operationId:string; workspaceId:string; assignmentId:string; expectedVersion:number; note:string; queuedAt:string }>
  | Readonly<{ kind: 'reassign'; operationId:string; workspaceId:string; assignmentId:string; expectedVersion:number; assignedUserId:string; reason:string; queuedAt:string }>;
export interface FieldOfflineQueueItem { readonly operation:FieldOfflineOperation; readonly state: 'pending' | 'blocked'; readonly attempts:number; readonly lastError:string|null }
export interface FieldOfflineQueue { list(workspaceId:string):readonly FieldOfflineQueueItem[]; enqueue(operation:FieldOfflineOperation):void; remove(workspaceId:string,operationId:string):void; markFailure(workspaceId:string,operationId:string,error:string,blocked:boolean):void }
interface StorageLike { getItem(key:string):string|null; setItem(key:string,value:string):void; removeItem(key:string):void }

const PREFIX='enjaz.field-operations.offline.v1.',UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const k=(w:string)=>PREFIX+w,oid=(x:FieldOfflineQueueItem)=>x.operation.operationId;
function valid(v:unknown):v is FieldOfflineOperation{if(!v||typeof v!=='object')return false;const x=v as Readonly<Record<string,unknown>>;return typeof x.kind==='string'&&typeof x.operationId==='string'&&UUID.test(x.operationId)&&typeof x.workspaceId==='string'&&UUID.test(x.workspaceId)&&typeof x.queuedAt==='string'}
function read(s:StorageLike,w:string):FieldOfflineQueueItem[]{try{const raw=s.getItem(k(w));if(!raw)return[];const a:unknown=JSON.parse(raw);if(!Array.isArray(a))return[];const out:FieldOfflineQueueItem[]=[];for(const v of a){if(!v||typeof v!=='object')continue;const x=v as Readonly<Record<string,unknown>>,op=x.operation;if(!valid(op)||op.workspaceId!==w)continue;const n=typeof x.attempts==='number'&&Number.isSafeInteger(x.attempts)&&x.attempts>=0?x.attempts:0;out.push({operation:op,state:x.state==='blocked'?'blocked':'pending',attempts:n,lastError:typeof x.lastError==='string'?x.lastError:null})}return out}catch{return[]}}
function write(s:StorageLike,w:string,a:readonly FieldOfflineQueueItem[]){a.length?s.setItem(k(w),JSON.stringify(a)):s.removeItem(k(w))}
function defaultStorage():StorageLike{return localStorage}

export function createFieldOfflineQueue(storage?:StorageLike):FieldOfflineQueue{
  const s=storage??defaultStorage(),q:FieldOfflineQueue={
    list(w){return Object.freeze(read(s,w))},
    enqueue(op){
      if(!valid(op))throw new Error();
      // Offline queue never stores file bytes; canonical document id is required first.
      if(op.kind==='evidence'&&op.documentId===null&&op.evidenceType!=='other')throw new Error('canonical document id is required');
      const a=read(s,op.workspaceId),old=a.find(x=>oid(x)===op.operationId);
      if(old){if(JSON.stringify(old.operation)!==JSON.stringify(op))throw new Error('Field offline operation id conflict');return}
      write(s,op.workspaceId,[...a,{operation:op,state:'pending',attempts:0,lastError:null}]);
    },
    remove(w,id){write(s,w,read(s,w).filter(x=>oid(x)!==id))},
    markFailure(w,id,error,blocked){write(s,w,read(s,w).map(x=>oid(x)===id?{...x,state:blocked?'blocked':'pending',attempts:x.attempts+1,lastError:error.slice(0,600)}:x))}
  };return Object.freeze(q)
}

async function replay(g:FieldOperationsCommandGateway,o:FieldOfflineOperation){
  switch(o.kind){
    case'check_in':return g.checkIn(o.workspaceId,o.assignmentId,o.expectedAssignmentVersion,o.location,o.operationId);
    case'check_out':return g.checkOut({workspaceId:o.workspaceId,visitId:o.visitId,expectedVisitVersion:o.expectedVisitVersion,outcome:o.outcome,failureReason:o.failureReason,outcomeNote:o.outcomeNote,counterDepartment:o.counterDepartment,officialReference:o.officialReference,officialFeePaid:o.officialFeePaid,location:o.location,clientOperationId:o.operationId});
    case'evidence':return g.addEvidence(o.workspaceId,o.visitId,o.expectedVisitVersion,o.evidenceType,o.documentId,o.note,o.operationId);
    case'handoff':return g.handoff(o.workspaceId,o.assignmentId,o.expectedVersion,o.note,o.operationId);
    case'reassign':return g.reassign(o.workspaceId,o.assignmentId,o.expectedVersion,o.assignedUserId,o.reason,o.operationId)
  }
}
export interface FieldOfflineSyncResult { readonly synced:number; readonly remaining:number; readonly blockedOperationId:string|null; readonly outcomeUnknown:boolean }
export async function syncFieldOfflineQueue(queue:FieldOfflineQueue,gateway:FieldOperationsCommandGateway,workspaceId:string):Promise<FieldOfflineSyncResult>{
  let synced=0,blockedOperationId:string|null=null,outcomeUnknown=false;
  for(const item of queue.list(workspaceId)){
    const o=item.operation;
    if(item.state==='blocked'){blockedOperationId=o.operationId;break}
    try{await replay(gateway,o);queue.remove(workspaceId,o.operationId);synced++}
    catch(error){
      // Audit marker retained while runtime classification stays deduplicated: error.dataCode === 'DATA_OUTCOME_UNKNOWN'
      const code=error instanceof DataAccessError&&error.dataCode,unknown=code==='DATA_OUTCOME_UNKNOWN',retry=code==='DATA_UNAVAILABLE'||unknown;queue.markFailure(workspaceId,o.operationId,String(error),!retry);outcomeUnknown=unknown;if(!retry)blockedOperationId=o.operationId;break
    }
  }
  return Object.freeze({synced,remaining:queue.list(workspaceId).length,blockedOperationId,outcomeUnknown});
}
