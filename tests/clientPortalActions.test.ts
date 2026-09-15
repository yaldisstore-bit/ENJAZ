import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIENT_PORTAL_ACTION_AUTHORITY,
  CLIENT_SAFE_APPOINTMENT_RESPONSE_FIELDS,
  CLIENT_SAFE_DOCUMENT_APPROVAL_RESPONSE_FIELDS,
  CLIENT_SAFE_DOCUMENT_UPLOAD_FIELDS,
  CLIENT_SAFE_MESSAGE_FIELDS,
  CLIENT_SAFE_READ_RECEIPT_FIELDS,
  assertClientPortalApprovalComment,
  assertClientPortalAppointmentDecision,
  assertClientPortalDocumentApprovalDecision,
  assertClientPortalMessageBody,
  assertClientPortalRequestedDocumentUpload,
  requiredAuthorityForClientPortalAction,
} from '../src/features/client-portal/clientPortalActions.ts';
import { assertClientSafeProjection } from '../src/features/client-portal/clientPortalAuthority.ts';

test('client actions map to exact authority and read receipts inherit request authority',()=>{
  assert.equal(requiredAuthorityForClientPortalAction('message'),'message');
  assert.equal(requiredAuthorityForClientPortalAction('confirm_appointment'),'confirm_appointment');
  assert.equal(requiredAuthorityForClientPortalAction('upload_requested_document'),'upload_requested_document');
  assert.equal(requiredAuthorityForClientPortalAction('approve_document'),'approve_document');
  assert.equal(requiredAuthorityForClientPortalAction('mark_request_read'),'request_required_permission');
  assert.equal(CLIENT_PORTAL_ACTION_AUTHORITY.mark_request_read,'request_required_permission');
});

test('portal message body normalizes whitespace and rejects empty or oversized payloads',()=>{
  assert.equal(assertClientPortalMessageBody('  سؤال العميل  '),'سؤال العميل');
  assert.throws(()=>assertClientPortalMessageBody('   '),/1\.\.4000/);
  assert.throws(()=>assertClientPortalMessageBody('x'.repeat(4001)),/1\.\.4000/);
});

test('appointment decision vocabulary is closed',()=>{
  assert.equal(assertClientPortalAppointmentDecision('confirmed'),'confirmed');
  assert.equal(assertClientPortalAppointmentDecision('declined'),'declined');
  assert.throws(()=>assertClientPortalAppointmentDecision('rescheduled'),/invalid/);
});

test('document approval decision and comment vocabularies are closed',()=>{
  assert.equal(assertClientPortalDocumentApprovalDecision('approved'),'approved');
  assert.equal(assertClientPortalDocumentApprovalDecision('rejected'),'rejected');
  assert.throws(()=>assertClientPortalDocumentApprovalDecision('maybe'),/invalid/);
  assert.equal(assertClientPortalApprovalComment('  موافق مع الملاحظة  '),'موافق مع الملاحظة');
  assert.equal(assertClientPortalApprovalComment('   '),null);
  assert.throws(()=>assertClientPortalApprovalComment('x'.repeat(1001)),/1000/);
});

test('requested-document upload accepts only the hardened vault envelope',()=>{
  const valid=assertClientPortalRequestedDocumentUpload({title:'المستمسك المطلوب',fileName:'identity.pdf',mimeType:'APPLICATION/PDF',byteSize:4096,checksum:'a'.repeat(64)});
  assert.equal(valid.mimeType,'application/pdf');
  assert.equal(valid.checksum,'a'.repeat(64));
  assert.throws(()=>assertClientPortalRequestedDocumentUpload({...valid,fileName:'../identity.pdf'}),/file name/);
  assert.throws(()=>assertClientPortalRequestedDocumentUpload({...valid,mimeType:'text/html'}),/MIME/);
  assert.throws(()=>assertClientPortalRequestedDocumentUpload({...valid,byteSize:52_428_801}),/size/);
  assert.throws(()=>assertClientPortalRequestedDocumentUpload({...valid,checksum:'abc'}),/checksum/);
});

test('client message projection excludes staff and authority metadata',()=>{
  assert.doesNotThrow(()=>assertClientSafeProjection(['id','transactionId','requestId','body','createdAt'],CLIENT_SAFE_MESSAGE_FIELDS));
  for(const field of ['principalId','actorUserId','workspaceId','staffNote','riskScore']){
    assert.throws(()=>assertClientSafeProjection(['id',field],CLIENT_SAFE_MESSAGE_FIELDS),/forbidden field/);
  }
});

test('appointment response projection excludes actor and internal scheduling state',()=>{
  assert.doesNotThrow(()=>assertClientSafeProjection(['id','requestId','transactionId','decision','comment','respondedAt'],CLIENT_SAFE_APPOINTMENT_RESPONSE_FIELDS));
  for(const field of ['principalId','actorUserId','calendarEventId','assignedStaffId','internalNote']){
    assert.throws(()=>assertClientSafeProjection(['id',field],CLIENT_SAFE_APPOINTMENT_RESPONSE_FIELDS),/forbidden field/);
  }
});

test('read receipt projection exposes timestamps only, not authority provenance',()=>{
  assert.doesNotThrow(()=>assertClientSafeProjection(['id','requestId','transactionId','firstReadAt','lastReadAt'],CLIENT_SAFE_READ_RECEIPT_FIELDS));
  for(const field of ['principalId','actorUserId','requiredPermission','ipAddress','userAgent']){
    assert.throws(()=>assertClientSafeProjection(['id',field],CLIENT_SAFE_READ_RECEIPT_FIELDS),/forbidden field/);
  }
});

test('document upload projection never exposes storage or checksum authority',()=>{
  assert.doesNotThrow(()=>assertClientSafeProjection(['requestId','transactionId','documentId','status','createdAt','acknowledgedAt'],CLIENT_SAFE_DOCUMENT_UPLOAD_FIELDS));
  for(const field of ['operationId','storagePath','checksum','actorUserId','principalId','bucket']){
    assert.throws(()=>assertClientSafeProjection(['requestId',field],CLIENT_SAFE_DOCUMENT_UPLOAD_FIELDS),/forbidden field/);
  }
});

test('document approval projection hides draft binding and actor identity',()=>{
  assert.doesNotThrow(()=>assertClientSafeProjection(['id','requestId','transactionId','documentId','decision','comment','documentFactoryApplied','respondedAt'],CLIENT_SAFE_DOCUMENT_APPROVAL_RESPONSE_FIELDS));
  for(const field of ['draftId','resourceShareId','actorUserId','principalId','approvedBy','staffNote']){
    assert.throws(()=>assertClientSafeProjection(['id',field],CLIENT_SAFE_DOCUMENT_APPROVAL_RESPONSE_FIELDS),/forbidden field/);
  }
});
