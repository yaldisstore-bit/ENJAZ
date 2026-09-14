import {DataAccessError} from '../../data/contracts/DataAccessError.ts';
import type {DocumentUploadInput} from './documentVaultContract.ts';
import type {DocumentVaultGateway} from './documentVaultCommands.ts';

export type DocumentUploadRetryDisposition='retry_same_operation'|'reconcile_same_operation'|'stop';
export interface DocumentUploadRetryTicket{readonly operationId:string;readonly input:DocumentUploadInput;readonly attempts:number}
export type DocumentUploadRetryOutcome=
  | {readonly status:'uploaded';readonly operationId:string;readonly attempts:number;readonly documentId:string;readonly versionNumber:number}
  | {readonly status:'deferred_offline';readonly ticket:DocumentUploadRetryTicket}
  | {readonly status:'failed';readonly ticket:DocumentUploadRetryTicket;readonly error:DataAccessError};
export interface DocumentUploadRetryOptions{readonly maxAttempts?:number;readonly isOnline?:()=>boolean;readonly delay?:(attempt:number)=>Promise<void>}

export function classifyDocumentUploadRetry(error:unknown):DocumentUploadRetryDisposition{
  if(!(error instanceof DataAccessError))return 'stop';
  if(error.dataCode==='DATA_OUTCOME_UNKNOWN')return 'reconcile_same_operation';
  if(error.dataCode==='DATA_UNAVAILABLE'||error.dataCode==='DATA_OPERATION_FAILED')return 'retry_same_operation';
  return 'stop';
}

export function createDocumentUploadRetryTicket(input:DocumentUploadInput):DocumentUploadRetryTicket{
  const operationId=input.operationId??crypto.randomUUID();
  return Object.freeze({operationId,input:Object.freeze({...input,operationId}),attempts:0});
}

export async function executeDocumentUploadRetry(gateway:DocumentVaultGateway,ticket:DocumentUploadRetryTicket,options:DocumentUploadRetryOptions={}):Promise<DocumentUploadRetryOutcome>{
  const maxAttempts=options.maxAttempts??3;
  if(!Number.isSafeInteger(maxAttempts)||maxAttempts<1||maxAttempts>5)throw new DataAccessError('Invalid document upload retry policy','DATA_VALIDATION_FAILED');
  const online=options.isOnline??(()=>typeof navigator==='undefined'||(navigator as unknown as {onLine?:boolean}).onLine!==false);
  const delay=options.delay??(attempt=>new Promise(resolve=>setTimeout(resolve,Math.min(250*2**Math.max(0,attempt-1),2000))));
  let attempts=ticket.attempts;
  if(!online())return{status:'deferred_offline',ticket:Object.freeze({...ticket,attempts})};
  while(attempts<maxAttempts){
    attempts++;
    try{
      const result=await gateway.upload({...ticket.input,operationId:ticket.operationId});
      return{status:'uploaded',operationId:ticket.operationId,attempts,...result};
    }catch(error){
      const normalized=error instanceof DataAccessError?error:new DataAccessError('Document upload failed','DATA_OPERATION_FAILED',error);
      const disposition=classifyDocumentUploadRetry(normalized),nextTicket=Object.freeze({...ticket,attempts});
      if(disposition==='stop'||attempts>=maxAttempts)return{status:'failed',ticket:nextTicket,error:normalized};
      if(!online())return{status:'deferred_offline',ticket:nextTicket};
      await delay(attempts);
    }
  }
  return{status:'failed',ticket:Object.freeze({...ticket,attempts}),error:new DataAccessError('Document upload retries exhausted','DATA_OPERATION_FAILED')};
}
