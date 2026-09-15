import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIENT_PORTAL_ACTION_AUTHORITY,
  CLIENT_SAFE_APPOINTMENT_RESPONSE_FIELDS,
  CLIENT_SAFE_MESSAGE_FIELDS,
  CLIENT_SAFE_READ_RECEIPT_FIELDS,
  assertClientPortalAppointmentDecision,
  assertClientPortalMessageBody,
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
