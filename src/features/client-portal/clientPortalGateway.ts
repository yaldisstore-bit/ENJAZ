import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { inspectDocumentBinary } from '../documents/documentBinarySafety.ts';
import {
  assertClientPortalApprovalComment,
  assertClientPortalAppointmentDecision,
  assertClientPortalDocumentApprovalDecision,
  assertClientPortalMessageBody,
  assertClientPortalRequestedDocumentUpload,
} from './clientPortalActions.ts';
import type { ClientPortalPermission } from './clientPortalAuthority.ts';

export interface ClientPortalWorkspace {
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly principalId: string;
  readonly status: 'active';
}

export interface ClientPortalInvitation {
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly principalId: string;
  readonly status: 'invited';
  readonly version: number;
}

export interface ClientPortalAuthorityGrant {
  readonly id: string;
  readonly targetType: 'company' | 'transaction';
  readonly targetId: string;
  readonly permissions: readonly ClientPortalPermission[];
  readonly validFrom: string | null;
  readonly validUntil: string | null;
  readonly version: number;
}

export interface ClientPortalAuthorityContext {
  readonly workspaceId: string;
  readonly principalId: string;
  readonly grants: readonly ClientPortalAuthorityGrant[];
}

export interface ClientPortalCompanyView {
  readonly id: string;
  readonly legalName: string;
  readonly displayName: string | null;
  readonly status: string;
}

export interface ClientPortalTransactionView {
  readonly id: string;
  readonly companyId: string;
  readonly type: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
}

export interface ClientPortalRequestView {
  readonly id: string;
  readonly transactionId: string;
  readonly requestType: 'document' | 'approval' | 'information' | 'appointment' | 'payment';
  readonly title: string;
  readonly instructions: string | null;
  readonly dueAt: string | null;
  readonly status: string;
  readonly resourceShareId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ClientPortalDocumentView {
  readonly id: string;
  readonly transactionId: string;
  readonly companyId: string;
  readonly title: string;
  readonly documentType: string | null;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly status: string;
  readonly capturedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ClientPortalReceiptView {
  readonly paymentId: string;
  readonly transactionId: string;
  readonly companyId: string;
  readonly receiptRef: string | null;
  readonly amount: string;
  readonly method: string;
  readonly paidAt: string;
  readonly status: string;
  readonly receiptVersion: number;
}

export interface ClientPortalReadModel {
  readonly companies: readonly ClientPortalCompanyView[];
  readonly transactions: readonly ClientPortalTransactionView[];
  readonly timeline: readonly Readonly<Record<string, unknown>>[];
  readonly documents: readonly ClientPortalDocumentView[];
  readonly receipts: readonly ClientPortalReceiptView[];
  readonly requests: readonly ClientPortalRequestView[];
  readonly messages: readonly Readonly<Record<string, unknown>>[];
  readonly appointmentResponses: readonly Readonly<Record<string, unknown>>[];
  readonly readReceipts: readonly Readonly<Record<string, unknown>>[];
  readonly documentUploads: readonly Readonly<Record<string, unknown>>[];
  readonly documentApprovalResponses: readonly Readonly<Record<string, unknown>>[];
}

export interface ClientPortalGateway {
  listWorkspaces(): Promise<readonly ClientPortalWorkspace[]>;
  listInvitations(): Promise<readonly ClientPortalInvitation[]>;
  activateInvitation(workspaceId: string, expectedVersion: number): Promise<void>;
  authority(workspaceId: string): Promise<ClientPortalAuthorityContext>;
  readModel(workspaceId: string): Promise<ClientPortalReadModel>;
  sendMessage(input: Readonly<{workspaceId:string;transactionId:string;requestId?:string|null;body:string;messageId?:string}>): Promise<void>;
  respondAppointment(input: Readonly<{workspaceId:string;requestId:string;decision:'confirmed'|'declined';comment?:string|null;responseId?:string}>): Promise<void>;
  markRequestRead(input: Readonly<{workspaceId:string;requestId:string;receiptId?:string}>): Promise<void>;
  respondDocumentApproval(input: Readonly<{workspaceId:string;requestId:string;decision:'approved'|'rejected';comment?:string|null;responseId?:string}>): Promise<void>;
  uploadRequestedDocument(input: Readonly<{workspaceId:string;requestId:string;title:string;documentType?:string|null;file:File;operationId?:string}>): Promise<void>;
}

type RpcFailure = { readonly message?: string; readonly code?: string };
type RpcResult = { readonly data: unknown; readonly error: RpcFailure | null };
type RpcClient = { rpc(name:string,args?:Record<string,unknown>): PromiseLike<RpcResult> };

const object=(value:unknown):Record<string,unknown>=>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('استجابة بوابة العميل غير صالحة.');
  return value as Record<string,unknown>;
};
const list=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const nullableText=(value:unknown)=>typeof value==='string'?value:null;
const integer=(value:unknown)=>Number.isSafeInteger(Number(value))?Number(value):0;
const uuid=(value:string,label:string)=>{
  const v=value.trim();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))throw new Error(`${label} غير صالح.`);
  return v;
};

function errorMessage(error:RpcFailure):string{
  const raw=(error.message??'').trim();
  const known:Record<string,string>={
    ENJAZ_PORTAL_AUTH_REQUIRED:'يلزم تسجيل الدخول إلى بوابة العميل.',
    ENJAZ_PORTAL_WORKSPACE_FORBIDDEN:'لم تعد لديك صلاحية للوصول إلى مساحة العمل هذه.',
    ENJAZ_PORTAL_INVITATION_NOT_FOUND:'الدعوة غير متاحة لهذا الحساب.',
    ENJAZ_PORTAL_INVITATION_NOT_ACTIVE:'هذه الدعوة لم تعد قابلة للتفعيل.',
    ENJAZ_PORTAL_INVITATION_STALE:'تغيّرت حالة الدعوة. حدّث الصفحة وحاول مجددًا.',
    ENJAZ_PORTAL_STAFF_TRUST_COLLISION:'هذا الحساب مرتبط بعضوية داخلية ولا يمكن استخدامه كحساب عميل في المساحة نفسها.',
    ENJAZ_PORTAL_ACTION_PERMISSION_REQUIRED:'ليس لديك الإذن المطلوب لتنفيذ هذا الإجراء.',
    ENJAZ_PORTAL_ACTION_REQUEST_PERMISSION_REQUIRED:'انتهت أو ألغيت صلاحية هذا الطلب.',
  };
  return known[raw]??(raw.startsWith('ENJAZ_')?'تعذر تنفيذ الإجراء لأن صلاحية البوابة تغيّرت.':raw||'تعذر الاتصال ببوابة العميل.');
}

function parseWorkspace(value:unknown):ClientPortalWorkspace{
  const row=object(value);
  return Object.freeze({
    workspaceId:uuid(text(row.workspaceId),'معرّف مساحة العمل'),
    workspaceName:text(row.workspaceName,'مساحة إنجاز'),
    principalId:uuid(text(row.principalId),'معرّف حساب العميل'),
    status:'active' as const,
  });
}

function parseInvitation(value:unknown):ClientPortalInvitation{
  const row=object(value),version=integer(row.version);
  if(version<1)throw new Error('نسخة الدعوة غير صالحة.');
  return Object.freeze({
    workspaceId:uuid(text(row.workspaceId),'معرّف مساحة العمل'),
    workspaceName:text(row.workspaceName,'مساحة إنجاز'),
    principalId:uuid(text(row.principalId),'معرّف حساب العميل'),
    status:'invited' as const,
    version,
  });
}

function parseAuthority(value:unknown):ClientPortalAuthorityContext{
  const row=object(value);
  const grants=list(row.grants).map((value)=>{
    const grant=object(value),targetType=text(grant.targetType);
    if(targetType!=='company'&&targetType!=='transaction')throw new Error('نطاق صلاحية العميل غير صالح.');
    const permissions=list(grant.permissions).filter((permission):permission is ClientPortalPermission=>typeof permission==='string'&&[
      'view','upload_requested_document','approve_document','message','confirm_appointment','view_finance',
    ].includes(permission));
    return Object.freeze({
      id:uuid(text(grant.id),'معرّف الصلاحية'),
      targetType,
      targetId:uuid(text(grant.targetId),'معرّف نطاق الصلاحية'),
      permissions:Object.freeze(permissions),
      validFrom:nullableText(grant.validFrom),
      validUntil:nullableText(grant.validUntil),
      version:integer(grant.version),
    });
  });
  return Object.freeze({
    workspaceId:uuid(text(row.workspaceId),'معرّف مساحة العمل'),
    principalId:uuid(text(row.principalId),'معرّف حساب العميل'),
    grants:Object.freeze(grants),
  });
}

function parseReadModel(value:unknown):ClientPortalReadModel{
  const row=object(value);
  const companies=list(row.companies).map((value)=>{const v=object(value);return Object.freeze({id:text(v.id),legalName:text(v.legalName),displayName:nullableText(v.displayName),status:text(v.status)});});
  const transactions=list(row.transactions).map((value)=>{const v=object(value);return Object.freeze({id:text(v.id),companyId:text(v.companyId),type:text(v.type),status:text(v.status),createdAt:text(v.createdAt),updatedAt:text(v.updatedAt),completedAt:nullableText(v.completedAt)});});
  const documents=list(row.documents).map((value)=>{const v=object(value);return Object.freeze({id:text(v.id),transactionId:text(v.transactionId),companyId:text(v.companyId),title:text(v.title),documentType:nullableText(v.documentType),mimeType:text(v.mimeType),sizeBytes:Number(v.sizeBytes)||0,status:text(v.status),capturedAt:nullableText(v.capturedAt),createdAt:text(v.createdAt),updatedAt:text(v.updatedAt)});});
  const receipts=list(row.receipts).map((value)=>{const v=object(value);return Object.freeze({paymentId:text(v.paymentId),transactionId:text(v.transactionId),companyId:text(v.companyId),receiptRef:nullableText(v.receiptRef),amount:text(v.amount),method:text(v.method),paidAt:text(v.paidAt),status:text(v.status),receiptVersion:integer(v.receiptVersion)});});
  const requests=list(row.requests).map((value)=>{const v=object(value),requestType=text(v.requestType);if(!['document','approval','information','appointment','payment'].includes(requestType))throw new Error('نوع طلب العميل غير صالح.');return Object.freeze({id:text(v.id),transactionId:text(v.transactionId),requestType:requestType as ClientPortalRequestView['requestType'],title:text(v.title),instructions:nullableText(v.instructions),dueAt:nullableText(v.dueAt),status:text(v.status),resourceShareId:nullableText(v.resourceShareId),createdAt:text(v.createdAt),updatedAt:text(v.updatedAt)});});
  const safeRecords=(name:string)=>Object.freeze(list(row[name]).map((value)=>Object.freeze({...object(value)})));
  return Object.freeze({
    companies:Object.freeze(companies),transactions:Object.freeze(transactions),timeline:safeRecords('timeline'),
    documents:Object.freeze(documents),receipts:Object.freeze(receipts),requests:Object.freeze(requests),
    messages:safeRecords('messages'),appointmentResponses:safeRecords('appointmentResponses'),readReceipts:safeRecords('readReceipts'),
    documentUploads:safeRecords('documentUploads'),documentApprovalResponses:safeRecords('documentApprovalResponses'),
  });
}

export function createClientPortalGateway(client:EnjazSupabaseClient,timeoutMs=20_000):ClientPortalGateway{
  const rpc=client as unknown as RpcClient;
  const wait=async<T>(promise:Promise<T>):Promise<T>=>{
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{return await Promise.race([promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('انتهت مهلة الاتصال ببوابة العميل.')),timeoutMs);})]);}
    finally{if(timer)clearTimeout(timer);}
  };
  const call=async(name:string,args:Record<string,unknown>={}):Promise<unknown>=>{
    const result=await wait(Promise.resolve(rpc.rpc(name,args)));
    if(result.error)throw new Error(errorMessage(result.error));
    return result.data;
  };
  const edge=async(body:Record<string,unknown>)=>{
    const response=await wait(client.edge('enjaz-document-vault',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
    const payload=object(await response.json().catch(()=>null));
    if(!response.ok||payload.ok!==true)throw new Error(errorMessage({message:text(payload.error,'Document Vault request failed')}));
    return payload;
  };

  return Object.freeze({
    async listWorkspaces(){return Object.freeze(list(await call('list_client_portal_workspaces_v1')).map(parseWorkspace));},
    async listInvitations(){return Object.freeze(list(await call('list_client_portal_invitations_v1')).map(parseInvitation));},
    async activateInvitation(workspaceId:string,expectedVersion:number){uuid(workspaceId,'معرّف مساحة العمل');if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1)throw new Error('نسخة الدعوة غير صالحة.');await call('activate_client_portal_invitation_v1',{p_workspace_id:workspaceId,p_expected_version:expectedVersion});},
    async authority(workspaceId:string){uuid(workspaceId,'معرّف مساحة العمل');return parseAuthority(await call('get_client_portal_authority_v1',{p_workspace_id:workspaceId}));},
    async readModel(workspaceId:string){uuid(workspaceId,'معرّف مساحة العمل');return parseReadModel(await call('get_client_portal_read_model_v1',{p_workspace_id:workspaceId}));},
    async sendMessage(input:Parameters<ClientPortalGateway['sendMessage']>[0]){
      const messageId=input.messageId??crypto.randomUUID();
      await call('send_client_portal_message_v1',{p_workspace_id:uuid(input.workspaceId,'معرّف مساحة العمل'),p_transaction_id:uuid(input.transactionId,'معرّف المعاملة'),p_request_id:input.requestId?uuid(input.requestId,'معرّف الطلب'):null,p_message_id:messageId,p_body:assertClientPortalMessageBody(input.body)});
    },
    async respondAppointment(input:Parameters<ClientPortalGateway['respondAppointment']>[0]){
      await call('respond_client_portal_appointment_v1',{p_workspace_id:uuid(input.workspaceId,'معرّف مساحة العمل'),p_request_id:uuid(input.requestId,'معرّف الطلب'),p_response_id:input.responseId??crypto.randomUUID(),p_decision:assertClientPortalAppointmentDecision(input.decision),p_comment:input.comment?.trim()||null});
    },
    async markRequestRead(input:Parameters<ClientPortalGateway['markRequestRead']>[0]){
      await call('mark_client_portal_request_read_v1',{p_workspace_id:uuid(input.workspaceId,'معرّف مساحة العمل'),p_request_id:uuid(input.requestId,'معرّف الطلب'),p_receipt_id:input.receiptId??crypto.randomUUID()});
    },
    async respondDocumentApproval(input:Parameters<ClientPortalGateway['respondDocumentApproval']>[0]){
      await call('respond_client_portal_document_approval_v1',{p_workspace_id:uuid(input.workspaceId,'معرّف مساحة العمل'),p_request_id:uuid(input.requestId,'معرّف الطلب'),p_response_id:input.responseId??crypto.randomUUID(),p_decision:assertClientPortalDocumentApprovalDecision(input.decision),p_comment:assertClientPortalApprovalComment(input.comment)});
    },
    async uploadRequestedDocument(input:Parameters<ClientPortalGateway['uploadRequestedDocument']>[0]){
      const inspected=await inspectDocumentBinary(input.file),operationId=input.operationId??crypto.randomUUID();
      const validated=assertClientPortalRequestedDocumentUpload({title:input.title,fileName:input.file.name,mimeType:inspected.mimeType,byteSize:inspected.byteSize,checksum:inspected.sha256});
      const acknowledge=()=>edge({action:'portal-acknowledge',workspaceId:uuid(input.workspaceId,'معرّف مساحة العمل'),operationId});
      let prepared:Record<string,unknown>;
      try{
        prepared=await edge({action:'portal-prepare',workspaceId:input.workspaceId,requestId:uuid(input.requestId,'معرّف الطلب'),operationId,title:validated.title,documentType:input.documentType?.trim()||null,fileName:validated.fileName,mimeType:validated.mimeType,byteSize:validated.byteSize,checksum:validated.checksum});
      }catch(error){
        if(input.operationId){try{await acknowledge();return;}catch{/* preserve prepare failure */}}
        throw error;
      }
      if(typeof prepared.signedUrl!=='string'||!prepared.signedUrl.startsWith('https://'))throw new Error('تعذر تجهيز قناة رفع الوثيقة.');
      let sent:Response;
      try{sent=await wait(fetch(prepared.signedUrl,{method:'PUT',headers:{'Content-Type':validated.mimeType,'x-upsert':'false'},body:input.file}));}
      catch(error){try{await acknowledge();return;}catch{throw error;}}
      if(!sent.ok){try{await acknowledge();return;}catch{throw new Error(`تعذر رفع الوثيقة (${sent.status}).`);}}
      await acknowledge();
    },
  });
}