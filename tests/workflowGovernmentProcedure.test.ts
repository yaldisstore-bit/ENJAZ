import test from 'node:test';
import assert from 'node:assert/strict';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import { createGovernmentProcedureCommandGateway } from '../src/features/workflow/governmentProcedureCommands.ts';

const W = '11111111-1111-4111-8111-111111111111';
const TX = '22222222-2222-4222-8222-222222222222';
const P = '33333333-3333-4333-8333-333333333333';
const B = '44444444-4444-4444-8444-444444444444';
const I = '55555555-5555-4555-8555-555555555555';
const K = '66666666-6666-4666-8666-666666666666';
const E = '77777777-7777-4777-8777-777777777777';
const T = '88888888-8888-4888-8888-888888888888';
const IT = '99999999-9999-4999-8999-999999999999';

interface Call { name: string; args: Readonly<Record<string, unknown>> }

function clientWith(handler: (call: Call) => unknown | Promise<unknown>) {
  const calls: Call[] = [];
  const client = {
    rpc(name: string, args: Readonly<Record<string, unknown>>) {
      const call = { name, args };
      calls.push(call);
      return Promise.resolve(handler(call)).then((data) => ({ data, error: null }));
    },
  };
  return { client: client as never, calls };
}

function catalogPayload() {
  return {
    authority: 'workflow_plus_government_catalog',
    moneyAuthority: 'reference_fees_only_no_finance_write',
    entities: [{ id: E, name: 'دائرة تسجيل الشركات', shortName: 'مسجل الشركات', entityType: 'directorate', active: true }],
    branches: [{ id: B, entityId: E, name: 'بغداد', address: 'بغداد', jurisdiction: 'بغداد', active: true }],
    procedures: [{
      id: P,
      code: 'COMPANY-AMENDMENT',
      name: 'تعديل بيانات شركة',
      description: 'إجراء حكومي متعدد المراحل',
      governmentEntityId: E,
      workflowTemplateId: T,
      active: true,
      branchIds: [B],
      prerequisiteProcedureIds: [],
      stages: [{
        position: 1,
        name: 'تدقيق المتطلبات',
        description: null,
        dueOffsetDays: 2,
        governmentEntityId: E,
        governmentBranchId: B,
        officialFee: '1250.50',
        feeCurrency: 'IQD',
        items: [{ key: IT, position: 1, itemType: 'document', title: 'كتاب الطلب', required: true, config: { original: true } }],
      }],
      transitions: [{ key: 'complete', label: 'إكمال الإجراء', kind: 'complete', fromStagePosition: 1, toStagePosition: null, requiresReason: false }],
    }],
  };
}

test('8.1 catalog parses M1 entities, branches, stages, requirements, SLA and exact reference fee without finance authority', async () => {
  const { client, calls } = clientWith(() => catalogPayload());
  const gateway = createGovernmentProcedureCommandGateway(client);
  const catalog = await gateway.loadCatalog(W);
  assert.equal(catalog.authority, 'workflow_plus_government_catalog');
  assert.equal(catalog.moneyAuthority, 'reference_fees_only_no_finance_write');
  assert.equal(catalog.entities[0]?.name, 'دائرة تسجيل الشركات');
  assert.equal(catalog.procedures[0]?.stages[0]?.officialFeeCents, 125050n);
  assert.equal(catalog.procedures[0]?.stages[0]?.dueOffsetDays, 2);
  assert.equal(catalog.procedures[0]?.stages[0]?.items[0]?.required, true);
  assert.equal(calls[0]?.name, 'get_government_procedure_catalog_v1');
});

test('8.1 refuses a catalog response that tries to move official reference fees into finance authority', async () => {
  const payload = { ...catalogPayload(), moneyAuthority: 'shadow_finance_store' };
  const { client } = clientWith(() => payload);
  await assert.rejects(createGovernmentProcedureCommandGateway(client).loadCatalog(W), (error: unknown) => {
    assert.ok(error instanceof DataAccessError);
    assert.equal(error.dataCode, 'DATA_OPERATION_FAILED');
    return true;
  });
});

test('8.1 start procedure sends transaction/procedure/branch/idempotency once and accepts immutable template snapshot', async () => {
  const { client, calls } = clientWith(() => ({
    instanceId: I,
    transactionId: TX,
    procedureId: P,
    branchId: B,
    currentStagePosition: 1,
    status: 'active',
    templateSnapshot: { version: 1, procedureId: P, stages: [{ position: 1, name: 'تدقيق' }] },
    wasDuplicate: false,
  }));
  const result = await createGovernmentProcedureCommandGateway(client).startProcedure({ workspaceId: W, transactionId: TX, procedureId: P, branchId: B, idempotencyKey: K });
  assert.equal(result.instanceId, I);
  assert.equal(result.currentStagePosition, 1);
  assert.deepEqual(calls[0], { name: 'start_government_procedure_v1', args: { p_workspace_id: W, p_transaction_id: TX, p_procedure_id: P, p_branch_id: B, p_idempotency_key: K } });
  assert.equal((result.templateSnapshot.stages as unknown[]).length, 1);
});

test('8.1 transition forwards expected stage for stale-state protection and stable idempotency key', async () => {
  const { client, calls } = clientWith(() => ({
    instanceId: I,
    transitionEventId: E,
    transitionKey: 'advance_review',
    eventKind: 'advance',
    fromStagePosition: 1,
    toStagePosition: 2,
    currentStagePosition: 2,
    status: 'active',
    wasDuplicate: false,
  }));
  const result = await createGovernmentProcedureCommandGateway(client).transition({
    workspaceId: W, instanceId: I, transitionKey: 'advance_review', expectedStagePosition: 1, reason: null, idempotencyKey: K,
  });
  assert.equal(result.currentStagePosition, 2);
  assert.equal(result.eventKind, 'advance');
  assert.deepEqual(calls[0]?.args, {
    p_workspace_id: W,
    p_workflow_instance_id: I,
    p_transition_key: 'advance_review',
    p_expected_stage_position: 1,
    p_reason: null,
    p_idempotency_key: K,
  });
});

test('8.1 invalid transition shape is rejected before any RPC can mutate workflow state', async () => {
  const { client, calls } = clientWith(() => { throw new Error('must not be called'); });
  await assert.rejects(createGovernmentProcedureCommandGateway(client).transition({
    workspaceId: W, instanceId: I, transitionKey: 'INVALID KEY', expectedStagePosition: 0, reason: null, idempotencyKey: K,
  }), (error: unknown) => {
    assert.ok(error instanceof DataAccessError);
    assert.equal(error.dataCode, 'DATA_VALIDATION_FAILED');
    return true;
  });
  assert.equal(calls.length, 0);
});

test('8.1 unknown network outcome on a write remains outcome-unknown so callers retry with the same idempotency key', async () => {
  const client = { rpc() { return new Promise(() => {}); } } as never;
  const gateway = createGovernmentProcedureCommandGateway(client, 5);
  await assert.rejects(gateway.startProcedure({ workspaceId: W, transactionId: TX, procedureId: P, branchId: null, idempotencyKey: K }), (error: unknown) => {
    assert.ok(error instanceof DataAccessError);
    assert.equal(error.dataCode, 'DATA_OUTCOME_UNKNOWN');
    return true;
  });
});

test('8.1 rejects malformed official money precision instead of rounding a government fee silently', async () => {
  const payload = catalogPayload();
  payload.procedures[0]!.stages[0]!.officialFee = '12.345';
  const { client } = clientWith(() => payload);
  await assert.rejects(createGovernmentProcedureCommandGateway(client).loadCatalog(W), (error: unknown) => {
    assert.ok(error instanceof DataAccessError);
    assert.equal(error.dataCode, 'DATA_OPERATION_FAILED');
    return true;
  });
});
