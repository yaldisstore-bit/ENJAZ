import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutomationCommandGateway } from '../src/features/automation/automationCommands.ts';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';

const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const RULE = '22222222-2222-4222-8222-222222222222';
const RUN = '33333333-3333-4333-8333-333333333333';
const APPROVAL = '44444444-4444-4444-8444-444444444444';
const DECISION = '55555555-5555-4555-8555-555555555555';

function clientWith(handler: (name: string, args: Readonly<Record<string, unknown>>) => unknown) {
  return { rpc(name: string, args: Readonly<Record<string, unknown>>) { return Promise.resolve({ data: handler(name, args), error: null }); } } as never;
}

const baseRule = {
  id: RULE, ruleKey: 'follow_up_active', name: 'متابعة المعاملة النشطة', description: null, enabled: true, version: 1,
  triggerConfig: { type: 'domain_event', event: 'transaction.updated' }, conditions: [{ field: 'status', operator: 'eq', value: 'active' }],
  actions: [{ type: 'create_followup', title: 'مراجعة المعاملة', dueInDays: 2 }], throttlePolicy: {},
  createdAt: '2026-09-07T12:00:00Z', updatedAt: '2026-09-07T12:00:00Z',
};

test('parses canonical context and rejects finance authority drift', async () => {
  const ok = createAutomationCommandGateway(clientWith(() => ({ authority: 'automation_rules_and_runs', workflowWriteAuthority: 'existing_workflow_rpc_only_after_human_approval', financeWriteAuthority: 'none', rules: [baseRule], recentRuns: [], pendingApprovals: [] })));
  const context = await ok.loadContext(WORKSPACE);
  assert.equal(context.rules[0]?.ruleKey, 'follow_up_active');
  assert.equal(context.financeWriteAuthority, 'none');

  const bad = createAutomationCommandGateway(clientWith(() => ({ authority: 'automation_rules_and_runs', workflowWriteAuthority: 'existing_workflow_rpc_only_after_human_approval', financeWriteAuthority: 'direct', rules: [], recentRuns: [], pendingApprovals: [] })));
  await assert.rejects(() => bad.loadContext(WORKSPACE), (error: unknown) => error instanceof DataAccessError);
});

test('upsert rule uses expected-version boundary and human-readable rule contract', async () => {
  let captured: Readonly<Record<string, unknown>> | null = null;
  const gateway = createAutomationCommandGateway(clientWith((name, args) => { assert.equal(name, 'upsert_automation_rule_v1'); captured = args; return baseRule; }));
  const rule = await gateway.upsertRule({ workspaceId: WORKSPACE, ruleId: null, expectedVersion: null, ruleKey: 'follow_up_active', name: 'متابعة المعاملة النشطة', description: null, triggerConfig: { type: 'domain_event', event: 'transaction.updated' }, conditions: [{ field: 'status', operator: 'eq', value: 'active' }], actions: [{ type: 'create_followup', title: 'مراجعة المعاملة', dueInDays: 2 }], throttlePolicy: {}, enabled: true });
  assert.equal(rule.version, 1);
  assert.equal(captured?.p_rule_key, 'follow_up_active');
  assert.equal(captured?.p_expected_version, null);
});

test('rejects stale/upsert shape before network for invalid version boundary', async () => {
  let calls = 0;
  const gateway = createAutomationCommandGateway(clientWith(() => { calls += 1; return baseRule; }));
  await assert.rejects(() => gateway.upsertRule({ workspaceId: WORKSPACE, ruleId: RULE, expectedVersion: null, ruleKey: 'follow_up_active', name: 'Rule', description: null, triggerConfig: { type: 'manual' }, conditions: [], actions: [{ type: 'create_followup', title: 'Follow', dueInDays: 1 }], throttlePolicy: {}, enabled: false }), (error: unknown) => error instanceof DataAccessError);
  assert.equal(calls, 0);
});

test('workflow transition action remains a sensitive typed action', async () => {
  const responseRule = { ...baseRule, actions: [{ type: 'workflow_transition', instanceIdField: 'workflow.instanceId', expectedStageField: 'workflow.stage', transitionKey: 'advance', reason: 'Approved automation' }] };
  const gateway = createAutomationCommandGateway(clientWith(() => responseRule));
  const rule = await gateway.upsertRule({ workspaceId: WORKSPACE, ruleId: RULE, expectedVersion: 1, ruleKey: 'workflow_guarded', name: 'Workflow guarded', description: null, triggerConfig: { type: 'domain_event', event: 'workflow.ready' }, conditions: [], actions: [{ type: 'workflow_transition', instanceIdField: 'workflow.instanceId', expectedStageField: 'workflow.stage', transitionKey: 'advance', reason: 'Approved automation' }], throttlePolicy: {}, enabled: true });
  assert.equal(rule.actions[0]?.type, 'workflow_transition');
});

test('dispatch preserves receipt key for replay-safe execution', async () => {
  let captured: Readonly<Record<string, unknown>> | null = null;
  const gateway = createAutomationCommandGateway(clientWith((name, args) => { assert.equal(name, 'dispatch_automation_v1'); captured = args; return { runId: RUN, status: 'succeeded', result: { approvalRequired: false }, wasDuplicate: false }; }));
  const result = await gateway.dispatch(WORKSPACE, RULE, 'transaction.updated', { transactionId: RULE, status: 'active' }, 'receipt-transaction-001');
  assert.equal(result.status, 'succeeded');
  assert.equal(captured?.p_receipt_key, 'receipt-transaction-001');
});

test('parses awaiting approval and exposes pending human approval evidence', async () => {
  const gateway = createAutomationCommandGateway(clientWith(() => ({ authority: 'automation_rules_and_runs', workflowWriteAuthority: 'existing_workflow_rpc_only_after_human_approval', financeWriteAuthority: 'none', rules: [], recentRuns: [{ id: RUN, ruleId: RULE, status: 'awaiting_approval', receiptKey: 'receipt-123', eventKey: 'workflow.ready', result: { approvalRequired: true }, startedAt: '2026-09-07T12:00:00Z', finishedAt: null }], pendingApprovals: [{ id: APPROVAL, runId: RUN, ruleId: RULE, requestedAt: '2026-09-07T12:01:00Z', actionSnapshot: { type: 'workflow_transition' } }] })));
  const context = await gateway.loadContext(WORKSPACE);
  assert.equal(context.recentRuns[0]?.status, 'awaiting_approval');
  assert.equal(context.pendingApprovals.length, 1);
});

test('approval decision uses explicit decision idempotency key', async () => {
  let captured: Readonly<Record<string, unknown>> | null = null;
  const gateway = createAutomationCommandGateway(clientWith((name, args) => { assert.equal(name, 'decide_automation_approval_v1'); captured = args; return { approvalId: APPROVAL, decision: 'approved', runId: RUN, runStatus: 'succeeded', wasDuplicate: false }; }));
  const result = await gateway.decideApproval(WORKSPACE, APPROVAL, 'approved', 'موافقة بشرية صريحة', DECISION);
  assert.equal(result.runStatus, 'succeeded');
  assert.equal(captured?.p_decision_key, DECISION);
});

test('write timeout is outcome-unknown instead of a false failure/retry signal', async () => {
  const client = { rpc() { return new Promise(() => undefined); } } as never;
  const gateway = createAutomationCommandGateway(client, 5);
  await assert.rejects(() => gateway.dispatch(WORKSPACE, RULE, 'manual', {}, 'receipt-timeout-001'), (error: unknown) => error instanceof DataAccessError && error.code === 'DATA_OUTCOME_UNKNOWN');
});
