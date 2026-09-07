import test from 'node:test';
import assert from 'node:assert/strict';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import { createGovernmentProcedureRuntimeGateway } from '../src/features/workflow/governmentProcedureRuntime.ts';

const W = '11111111-1111-4111-8111-111111111111';
const TX = '22222222-2222-4222-8222-222222222222';
const OTHER_TX = '22222222-2222-4222-8222-222222222223';
const P = '33333333-3333-4333-8333-333333333333';
const B = '44444444-4444-4444-8444-444444444444';
const I = '55555555-5555-4555-8555-555555555555';
const ITEM = '66666666-6666-4666-8666-666666666666';

interface Call { readonly name: string; readonly args: Readonly<Record<string, unknown>> }

function clientWith(payload: unknown) {
  const calls: Call[] = [];
  const client = {
    rpc(name: string, args: Readonly<Record<string, unknown>>) {
      calls.push({ name, args });
      return Promise.resolve({ data: payload, error: null });
    },
  };
  return { client: client as never, calls };
}

function contextPayload(transactionId = TX, authority = 'canonical_workflow_instance') {
  return {
    authority,
    transactionId,
    instance: {
      instanceId: I,
      procedureId: P,
      branchId: B,
      currentStagePosition: 1,
      status: 'active',
      startedAt: '2026-09-07T09:00:00.000Z',
      completedAt: null,
      templateSnapshot: { version: 1 },
      pendingRequiredCount: 1,
      stageStates: [{ position: 1, status: 'active', startedAt: '2026-09-07T09:00:00.000Z', completedAt: null, overrideUsed: false, overrideReason: null }],
      itemStates: [{ id: ITEM, templateItemKey: 'application_form', stagePosition: 1, status: 'pending', required: true, itemType: 'document', title: 'استمارة الطلب', note: null, completedAt: null }],
      allowedTransitions: [{ key: 'advance_review', label: 'إرسال للتدقيق', kind: 'advance', fromStagePosition: 1, toStagePosition: 2, requiresReason: false }],
    },
  };
}

test('8.1 runtime parses canonical transaction workflow context with requirements and allowed transitions', async () => {
  const { client, calls } = clientWith(contextPayload());
  const context = await createGovernmentProcedureRuntimeGateway(client).loadTransactionContext(W, TX);
  assert.equal(context.authority, 'canonical_workflow_instance');
  assert.equal(context.transactionId, TX);
  assert.equal(context.instance?.pendingRequiredCount, 1);
  assert.equal(context.instance?.itemStates[0]?.required, true);
  assert.equal(context.instance?.allowedTransitions[0]?.key, 'advance_review');
  assert.deepEqual(calls[0], { name: 'get_transaction_workflow_context_v1', args: { p_workspace_id: W, p_transaction_id: TX } });
});

test('8.1 runtime rejects a context authority drift instead of rendering an untrusted state machine', async () => {
  const { client } = clientWith(contextPayload(TX, 'parallel_workflow_store'));
  await assert.rejects(createGovernmentProcedureRuntimeGateway(client).loadTransactionContext(W, TX), (error: unknown) => {
    assert.ok(error instanceof DataAccessError);
    assert.equal(error.dataCode, 'DATA_OPERATION_FAILED');
    return true;
  });
});

test('8.1 runtime rejects transaction drift even when the payload otherwise looks valid', async () => {
  const { client } = clientWith(contextPayload(OTHER_TX));
  await assert.rejects(createGovernmentProcedureRuntimeGateway(client).loadTransactionContext(W, TX), (error: unknown) => {
    assert.ok(error instanceof DataAccessError);
    assert.equal(error.dataCode, 'DATA_OPERATION_FAILED');
    assert.match(error.message, /transaction drifted/i);
    return true;
  });
});

test('8.1 runtime accepts an explicit empty canonical context without fabricating an instance', async () => {
  const { client } = clientWith({ authority: 'canonical_workflow_instance', transactionId: TX, instance: null });
  const context = await createGovernmentProcedureRuntimeGateway(client).loadTransactionContext(W, TX);
  assert.equal(context.instance, null);
});