import type { ClientPortalPermission } from './clientPortalAuthority.ts';

export type ClientPortalActionKind =
  | 'message'
  | 'confirm_appointment'
  | 'mark_request_read'
  | 'upload_requested_document'
  | 'approve_document';

export type ClientPortalAppointmentDecision = 'confirmed' | 'declined';
export type ClientPortalDocumentApprovalDecision = 'approved' | 'rejected';
export type ClientPortalUploadMimeType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export type ClientPortalActionAuthority = ClientPortalPermission | 'request_required_permission';

export interface ClientPortalActionTarget {
  readonly workspaceId: string;
  readonly principalId: string;
  readonly transactionId: string;
  readonly requestId: string | null;
}

export const CLIENT_PORTAL_ACTION_AUTHORITY = Object.freeze({
  message: 'message',
  confirm_appointment: 'confirm_appointment',
  mark_request_read: 'request_required_permission',
  upload_requested_document: 'upload_requested_document',
  approve_document: 'approve_document',
} satisfies Readonly<Record<ClientPortalActionKind, ClientPortalActionAuthority>>);

export const CLIENT_PORTAL_UPLOAD_MIME_TYPES = Object.freeze([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const satisfies readonly ClientPortalUploadMimeType[]);

export const CLIENT_SAFE_MESSAGE_FIELDS = Object.freeze([
  'id',
  'transactionId',
  'requestId',
  'body',
  'createdAt',
] as const);

export const CLIENT_SAFE_APPOINTMENT_RESPONSE_FIELDS = Object.freeze([
  'id',
  'requestId',
  'transactionId',
  'decision',
  'comment',
  'respondedAt',
] as const);

export const CLIENT_SAFE_READ_RECEIPT_FIELDS = Object.freeze([
  'id',
  'requestId',
  'transactionId',
  'firstReadAt',
  'lastReadAt',
] as const);

// Upload projection deliberately omits operation id, storage path, checksum,
// uploader identity and raw vault-session metadata.
export const CLIENT_SAFE_DOCUMENT_UPLOAD_FIELDS = Object.freeze([
  'requestId',
  'transactionId',
  'documentId',
  'status',
  'createdAt',
  'acknowledgedAt',
] as const);

// Draft id/binding and actor identity stay internal even when Document Factory
// applies the decision. The client only needs to know whether it was applied.
export const CLIENT_SAFE_DOCUMENT_APPROVAL_RESPONSE_FIELDS = Object.freeze([
  'id',
  'requestId',
  'transactionId',
  'documentId',
  'decision',
  'comment',
  'documentFactoryApplied',
  'respondedAt',
] as const);

export function requiredAuthorityForClientPortalAction(kind: ClientPortalActionKind): ClientPortalActionAuthority {
  return CLIENT_PORTAL_ACTION_AUTHORITY[kind];
}

export function assertClientPortalMessageBody(body: string): string {
  const normalized = body.trim();
  if (normalized.length < 1 || normalized.length > 4000) {
    throw new Error('Client portal message body must be 1..4000 characters');
  }
  return normalized;
}

export function assertClientPortalAppointmentDecision(value: string): ClientPortalAppointmentDecision {
  if (value !== 'confirmed' && value !== 'declined') {
    throw new Error('Client portal appointment decision is invalid');
  }
  return value;
}

export function assertClientPortalDocumentApprovalDecision(value: string): ClientPortalDocumentApprovalDecision {
  if (value !== 'approved' && value !== 'rejected') {
    throw new Error('Client portal document approval decision is invalid');
  }
  return value;
}

export function assertClientPortalApprovalComment(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  if (!normalized) return null;
  if (normalized.length > 1000) throw new Error('Client portal approval comment must be at most 1000 characters');
  return normalized;
}

export function assertClientPortalRequestedDocumentUpload(input: Readonly<{
  title: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  checksum?: string | null;
}>): Readonly<{title:string;fileName:string;mimeType:ClientPortalUploadMimeType;byteSize:number;checksum:string|null}> {
  const title=input.title.trim(),fileName=input.fileName.trim(),mimeType=input.mimeType.trim().toLowerCase();
  const checksum=input.checksum?.trim().toLowerCase()||null;
  if(title.length<1||title.length>320)throw new Error('Client portal upload title is invalid');
  if(fileName.length<1||fileName.length>240||/[\\/]/.test(fileName)||/[\u0000-\u001f\u007f]/.test(fileName))throw new Error('Client portal upload file name is invalid');
  if(!Number.isSafeInteger(input.byteSize)||input.byteSize<1||input.byteSize>52_428_800)throw new Error('Client portal upload size is invalid');
  if(!(CLIENT_PORTAL_UPLOAD_MIME_TYPES as readonly string[]).includes(mimeType))throw new Error('Client portal upload MIME type is invalid');
  if(checksum!==null&&!/^[0-9a-f]{64}$/.test(checksum))throw new Error('Client portal upload checksum is invalid');
  return Object.freeze({title,fileName,mimeType:mimeType as ClientPortalUploadMimeType,byteSize:input.byteSize,checksum});
}
