import type { ClientPortalPermission } from './clientPortalAuthority.ts';

export type ClientPortalActionKind =
  | 'message'
  | 'confirm_appointment'
  | 'mark_request_read'
  | 'upload_requested_document'
  | 'approve_document';

export type ClientPortalAppointmentDecision = 'confirmed' | 'declined';

export interface ClientPortalActionTarget {
  readonly workspaceId: string;
  readonly principalId: string;
  readonly transactionId: string;
  readonly requestId: string | null;
}

export const CLIENT_PORTAL_ACTION_PERMISSION = Object.freeze({
  message: 'message',
  confirm_appointment: 'confirm_appointment',
  mark_request_read: 'view',
  upload_requested_document: 'upload_requested_document',
  approve_document: 'approve_document',
} satisfies Readonly<Record<ClientPortalActionKind, ClientPortalPermission>>);

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

export function requiredPermissionForClientPortalAction(kind: ClientPortalActionKind): ClientPortalPermission {
  return CLIENT_PORTAL_ACTION_PERMISSION[kind];
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
