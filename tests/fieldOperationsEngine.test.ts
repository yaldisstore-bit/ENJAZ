import test from 'node:test';
import assert from 'node:assert/strict';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import { createFieldOperationsCommandGateway } from '../src/features/field-operations/fieldOperationsCommands.ts';
import { createFieldOfflineQueue, syncFieldOfflineQueue, type FieldOfflineOperation } from '../src/features/field-operations/fieldOperationsOfflineQueue.ts';

const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const ASSIGNMENT = '22222222-2222-4222-8222-222222222222';
const TRANSACTION = '33333333-3333-4333-8333-333333333333';
const USER = '44444444-4444-4444-8444-444444444444';
const VISIT = '55555555-5555-4555-8555-555555555555';
const OPERATION = '66666666-6666-4666-8666-666666666666';
const OPERATION_2 = '77777777-7777-4777-8777-777777777777';

function clientWith(handler: (name: string, args: Readonly<Record<string, unknown>>) => unknown) {
  return { rpc(name: string, args: Readonly<Record<string, unknown>>) { return Promise.resolve({ data: handler(name, args), error: null }); } } as never;
}

const context = {
  authority: 'field_assignments_visits_evidence_receipts', transactionWriteAuthority: 'none', workflowWriteAuthority: 'existing_workflow_rpc_only', automationWriteAuthority: 'existing_automation_rpc_only', financeWriteAuthority: 'none', locationPolicy: 'optional',
  metrics: { activeTransactions: 3, stalledTransactions: 1, highCriticalBlockers: 2, pendingAutomationApprovals: 1, queuedAssignments: 4, activeVisits: 1 },
  members: [{ userId: USER, displayName: 'موظف ميداني' }],
  assignments: [{ id: ASSIGNMENT, transactionId: TRANSACTION, transactionType: 'تسجيل شركة', transactionStatus: 'active', companyName: 'شركة اختبار', assignedUserId: USER, assignedUserName: 'موظف ميداني', scheduledFor: '2026-09-08', destinationLabel: 'مسجل الشركات', department: 'الاستعلامات', priority: 'high', status: 'queued', version: 2, openBlockers: 1, nextRequiredAction: 'حل المانع: وثيقة ناقصة' }],
  visits: [{ id: VISIT, assignmentId: ASSIGNMENT, transactionId: TRANSACTION, assignedUserId: USER, status: 'checked_in', version: 1, checkInAt: '2026-09-07T10:00:00Z', checkOutAt: null, counterDepartment: null, officialReference: null, officialFeePaid: null, failureReason: null, outcomeNote: null, checkInLocationRecorded: true, checkOutLocationRecorded: false, evidenceCount: 0 }],
};

test('parses canonical operations context and rejects any finance authority drift', async () => {
  const gateway = createFieldOperationsCommandGateway(clientWith(() => context));
  const parsed = await gateway.loadContext(WORKSPACE);
  assert.equal(parsed.metrics.highCriticalBlockers, 2);
  assert.equal(parsed.assignments[0]?.nextRequiredAction, 'حل المانع: وثيقة ناقصة');
  assert.equal(parsed.financeWriteAuthority, 'none');
  const bad = createFieldOperationsCommandGateway(clientWith(() => ({ ...context, financeWriteAuthority: 'direct' })));
  await assert.rejects(() => bad.loadContext(WORKSPACE), (error: unknown) => error instanceof DataAccessError);
});

test('check-in preserves stable client operation UUID and validates visit-scoped location before network', async () => {
  let captured: Record<string, unknown> = {};
  let calls = 0;
  const gateway = createFieldOperationsCommandGateway(clientWith((name, args) => { calls += 1; assert.equal(name, 'start_field_visit_v1'); captured = { ...args }; return { visitId: OPERATION, visitStatus: 'checked_in', visitVersion: 1, assignmentId: ASSIGNMENT, assignmentStatus: 'in_progress', assignmentVersion: 3, checkedInAt: '2026-09-07T10:00:00Z', wasDuplicate: false }; }));
  await gateway.checkIn(WORKSPACE, ASSIGNMENT, 2, { lat: 33.3, lng: 44.4, accuracyMeters: 15 }, OPERATION);
  assert.equal(captured['p_client_operation_id'], OPERATION);
  assert.deepEqual(captured['p_location'], { lat: 33.3, lng: 44.4, accuracyMeters: 15 });
  await assert.rejects(() => gateway.checkIn(WORKSPACE, ASSIGNMENT, 2, { lat: 100, lng: 44.4 }, OPERATION_2), (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_VALIDATION_FAILED');
  assert.equal(calls, 1);
});

test('official fee is evidence-only decimal input and checkout keeps explicit outcome taxonomy', async () => {
  let captured: Record<string, unknown> = {};
  const gateway = createFieldOperationsCommandGateway(clientWith((name, args) => { assert.equal(name, 'finish_field_visit_v1'); captured = { ...args }; return { visitId: VISIT, visitStatus: 'could_not_complete', visitVersion: 2, assignmentId: ASSIGNMENT, assignmentStatus: 'visit_complete', assignmentVersion: 4, checkedOutAt: '2026-09-07T11:00:00Z', officialFeeEvidenceOnly: true, wasDuplicate: false }; }));
  const result = await gateway.checkOut({ workspaceId: WORKSPACE, visitId: VISIT, expectedVisitVersion: 1, outcome: 'could_not_complete', failureReason: 'missing_requirement', outcomeNote: 'مستمسك ناقص', counterDepartment: 'شباك 4', officialReference: 'REF-22', officialFeePaid: '12500.00', location: null, clientOperationId: OPERATION });
  assert.equal(captured['p_official_fee_paid'], '12500.00');
  assert.equal(captured['p_failure_reason'], 'missing_requirement');
  assert.equal(result['officialFeeEvidenceOnly'], true);
  await assert.rejects(() => gateway.checkOut({ workspaceId: WORKSPACE, visitId: VISIT, expectedVisitVersion: 1, outcome: 'completed', failureReason: 'other', outcomeNote: null, counterDepartment: null, officialReference: null, officialFeePaid: null, location: null, clientOperationId: OPERATION_2 }), (error: unknown) => error instanceof DataAccessError);
});

class MemoryStorage {
  private readonly rows = new Map<string, string>();
  getItem(key: string) { return this.rows.get(key) ?? null; }
  setItem(key: string, value: string) { this.rows.set(key, value); }
  removeItem(key: string) { this.rows.delete(key); }
}

function queuedCheckIn(operationId = OPERATION): FieldOfflineOperation {
  return { kind: 'check_in', operationId, workspaceId: WORKSPACE, assignmentId: ASSIGNMENT, expectedAssignmentVersion: 2, location: null, queuedAt: '2026-09-07T10:00:00Z' };
}

test('offline queue is idempotent by operation UUID and rejects payload drift', () => {
  const queue = createFieldOfflineQueue(new MemoryStorage());
  const operation = queuedCheckIn();
  queue.enqueue(operation);
  queue.enqueue(operation);
  assert.equal(queue.list(WORKSPACE).length, 1);
  assert.throws(() => queue.enqueue({ ...operation, expectedAssignmentVersion: 3 }), /operation id conflict/);
});

test('offline check-in UUID can be referenced as the future canonical visit ID before first sync', () => {
  const queue = createFieldOfflineQueue(new MemoryStorage());
  const checkIn = queuedCheckIn();
  const checkOut: FieldOfflineOperation = { kind: 'check_out', operationId: OPERATION_2, workspaceId: WORKSPACE, visitId: checkIn.operationId, expectedVisitVersion: 1, outcome: 'completed', failureReason: null, outcomeNote: 'تمت الزيارة', counterDepartment: null, officialReference: null, officialFeePaid: null, location: null, queuedAt: '2026-09-07T11:00:00Z' };
  queue.enqueue(checkIn);
  queue.enqueue(checkOut);
  assert.equal(queue.list(WORKSPACE)[1]?.operation.kind, 'check_out');
  if (queue.list(WORKSPACE)[1]?.operation.kind === 'check_out') assert.equal(queue.list(WORKSPACE)[1]?.operation.visitId, OPERATION);
});

test('offline queue never stores new file bytes and requires canonical document identity for file evidence', () => {
  const queue = createFieldOfflineQueue(new MemoryStorage());
  assert.throws(() => queue.enqueue({ kind: 'evidence', operationId: OPERATION, workspaceId: WORKSPACE, visitId: VISIT, expectedVisitVersion: 1, evidenceType: 'receipt', documentId: null, note: null, queuedAt: '2026-09-07T10:00:00Z' }), /canonical document id is required/);
});

test('outcome-unknown replay remains pending so same operation ID can safely retry', async () => {
  const storage = new MemoryStorage();
  const queue = createFieldOfflineQueue(storage);
  queue.enqueue(queuedCheckIn());
  const gateway = { checkIn: async () => { throw new DataAccessError('unknown', 'DATA_OUTCOME_UNKNOWN'); } } as never;
  const result = await syncFieldOfflineQueue(queue, gateway, WORKSPACE);
  assert.equal(result.outcomeUnknown, true);
  assert.equal(result.remaining, 1);
  assert.equal(queue.list(WORKSPACE)[0]?.state, 'pending');
});

test('non-retryable stale/conflict failure blocks later offline operations instead of overwriting server truth', async () => {
  const queue = createFieldOfflineQueue(new MemoryStorage());
  queue.enqueue(queuedCheckIn());
  queue.enqueue({ ...queuedCheckIn(OPERATION_2), assignmentId: '88888888-8888-4888-8888-888888888888' });
  let calls = 0;
  const gateway = { checkIn: async () => { calls += 1; throw new DataAccessError('stale', 'DATA_CONFLICT'); } } as never;
  const result = await syncFieldOfflineQueue(queue, gateway, WORKSPACE);
  assert.equal(calls, 1);
  assert.equal(result.blockedOperationId, OPERATION);
  assert.equal(queue.list(WORKSPACE)[0]?.state, 'blocked');
  assert.equal(queue.list(WORKSPACE).length, 2);
});
