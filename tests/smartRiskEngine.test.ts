import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateRiskSnapshot, type RiskFactSnapshot, type RiskThresholds } from '../src/features/risk/riskEngine.ts';

const NOW = '2026-09-09T12:00:00.000Z';
const T = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const W = '33333333-3333-4333-8333-333333333333';
const C = '44444444-4444-4444-8444-444444444444';
const F = '55555555-5555-4555-8555-555555555555';
const O = '66666666-6666-4666-8666-666666666666';

function base(overrides: Partial<RiskFactSnapshot> = {}): RiskFactSnapshot {
  return { evaluatedAt: NOW, transactions: [], workflows: [], financeAnomalies: [], workloads: [], companies: [], ...overrides };
}

test('empty or missing authoritative facts produce no fabricated risk signal', () => {
  assert.deepEqual(evaluateRiskSnapshot({ evaluatedAt: NOW }), []);
  assert.deepEqual(evaluateRiskSnapshot(base({ transactions: [{ id: T, status: 'active', lastActivityAt: null, dueAt: null }] })), []);
});

test('urgent stalled transaction is explainable, critical and review-only', () => {
  const signals = evaluateRiskSnapshot(base({ transactions: [{ id: T, label: 'معاملة 1042', status: 'stalled', priority: 'urgent', lastActivityAt: NOW }] }));
  assert.equal(signals.length, 1);
  const signal = signals[0]!;
  assert.equal(signal.code, 'transaction_stalled');
  assert.equal(signal.severity, 'critical');
  assert.equal(signal.urgency, 'now');
  assert.deepEqual(signal.components.map((item) => item.code), ['status_stalled', 'priority_urgent']);
  assert.deepEqual(signal.evidence.map((item) => item.field), ['status', 'priority']);
  assert.equal(signal.entity.id, T);
  assert.equal(signal.recommendation.destination, '/app/transactions');
  assert.equal(signal.recommendation.mutates, false);
  assert.ok(signal.explanation.length > 10);
});

test('open high/critical blocker is a separate signal bound to blocker evidence', () => {
  const signals = evaluateRiskSnapshot(base({ transactions: [{ id: T, status: 'active', lastActivityAt: NOW, blockers: [{ id: B, severity: 'critical', status: 'open', openedAt: '2026-09-09T10:00:00.000Z' }] }] }));
  assert.equal(signals.length, 1);
  assert.equal(signals[0]?.code, 'open_critical_blocker');
  assert.equal(signals[0]?.severity, 'critical');
  assert.ok(signals[0]?.evidence.every((item) => item.sourceObjectId === B));
});

test('resolved or low blocker cannot escape into critical-risk output', () => {
  const signals = evaluateRiskSnapshot(base({ transactions: [{ id: T, status: 'active', lastActivityAt: NOW, blockers: [
    { id: B, severity: 'critical', status: 'resolved' },
    { id: `${B}-low`, severity: 'low', status: 'open' },
  ] }] }));
  assert.deepEqual(signals, []);
});

test('inactivity uses the declared threshold and ignores future/invalid timestamps', () => {
  const signals = evaluateRiskSnapshot(base({ transactions: [
    { id: T, status: 'active', lastActivityAt: '2026-09-07T11:59:59.000Z' },
    { id: `${T}-future`, status: 'active', lastActivityAt: '2026-09-10T12:00:00.000Z' },
    { id: `${T}-invalid`, status: 'active', lastActivityAt: 'not-a-date' },
  ] }));
  assert.equal(signals.length, 1);
  assert.equal(signals[0]?.code, 'transaction_inactive');
  assert.equal(signals[0]?.entity.id, T);
});

test('completed/archived/cancelled work does not emit inactivity or deadline risk', () => {
  for (const status of ['completed', 'archived', 'cancelled', 'deleted']) {
    const signals = evaluateRiskSnapshot(base({ transactions: [{ id: `${T}-${status}`, status, lastActivityAt: '2026-01-01T00:00:00.000Z', dueAt: '2026-01-02T00:00:00.000Z' }] }));
    assert.deepEqual(signals, [], status);
  }
});

test('transaction deadline distinguishes overdue, near-now and near-soon deterministically', () => {
  const signals = evaluateRiskSnapshot(base({ transactions: [
    { id: `${T}-overdue`, status: 'active', lastActivityAt: NOW, dueAt: '2026-09-09T10:00:00.000Z' },
    { id: `${T}-now`, status: 'active', lastActivityAt: NOW, dueAt: '2026-09-10T11:00:00.000Z' },
    { id: `${T}-soon`, status: 'active', lastActivityAt: NOW, dueAt: '2026-09-11T12:00:00.000Z' },
    { id: `${T}-far`, status: 'active', lastActivityAt: NOW, dueAt: '2026-09-20T12:00:00.000Z' },
  ] }));
  assert.equal(signals.length, 3);
  const byId = new Map(signals.map((signal) => [signal.entity.id, signal]));
  assert.equal(byId.get(`${T}-overdue`)?.code, 'deadline_overdue');
  assert.equal(byId.get(`${T}-overdue`)?.severity, 'critical');
  assert.equal(byId.get(`${T}-now`)?.code, 'deadline_near');
  assert.equal(byId.get(`${T}-now`)?.severity, 'high');
  assert.equal(byId.get(`${T}-soon`)?.severity, 'medium');
  assert.equal(byId.has(`${T}-far`), false);
});

test('workflow SLA pressure requires a real SLA timestamp and active work', () => {
  const signals = evaluateRiskSnapshot(base({ workflows: [
    { instanceId: W, transactionId: T, status: 'active', slaDueAt: '2026-09-09T11:00:00.000Z' },
    { instanceId: `${W}-missing`, transactionId: T, status: 'active', slaDueAt: null },
    { instanceId: `${W}-done`, transactionId: T, status: 'completed', slaDueAt: '2026-09-01T00:00:00.000Z' },
  ] }));
  assert.equal(signals.length, 1);
  assert.equal(signals[0]?.code, 'workflow_sla_pressure');
  assert.equal(signals[0]?.entity.id, W);
  assert.equal(signals[0]?.recommendation.destination, '/app/workflow');
});

test('finance anomaly is accepted only as an already-authoritative evidence fact', () => {
  const signals = evaluateRiskSnapshot(base({ financeAnomalies: [
    { id: F, kind: 'reversal_spike', severity: 'high', explanation: 'ارتفاع غير معتاد في الانعكاسات مقارنة بالمصدر المالي.', observedAt: NOW },
    { id: `${F}-empty`, kind: '', severity: 'critical', explanation: 'لا يجب أن يظهر' },
  ] }));
  assert.equal(signals.length, 1);
  assert.equal(signals[0]?.code, 'finance_anomaly');
  assert.equal(signals[0]?.evidence[0]?.sourceDomain, 'finance');
  assert.equal(signals[0]?.evidence[0]?.observedValue, 'reversal_spike');
  assert.equal(signals[0]?.recommendation.mutates, false);
});

test('workload concentration requires valid non-negative authoritative counts', () => {
  const signals = evaluateRiskSnapshot(base({ workloads: [
    { ownerId: O, ownerLabel: 'مالك العمل', activeCount: 9, urgentCount: 1, observedAt: NOW },
    { ownerId: `${O}-urgent`, activeCount: 2, urgentCount: 3, observedAt: NOW },
    { ownerId: `${O}-normal`, activeCount: 7, urgentCount: 2, observedAt: NOW },
    { ownerId: `${O}-bad`, activeCount: -1, urgentCount: 99, observedAt: NOW },
  ] }));
  assert.equal(signals.length, 2);
  const byId = new Map(signals.map((signal) => [signal.entity.id, signal]));
  assert.equal(byId.get(O)?.severity, 'medium');
  assert.equal(byId.get(`${O}-urgent`)?.severity, 'high');
  assert.equal(byId.has(`${O}-bad`), false);
});

test('company compliance signal never appears without authoritative status/date evidence', () => {
  assert.deepEqual(evaluateRiskSnapshot(base({ companies: [{ id: C, label: 'شركة' }] })), []);
  const due = evaluateRiskSnapshot(base({ companies: [{ id: C, label: 'شركة', complianceDueAt: '2026-09-10T12:00:00.000Z' }] }));
  assert.equal(due.length, 1);
  assert.equal(due[0]?.code, 'company_compliance_due');
  assert.equal(due[0]?.evidence[0]?.field, 'compliance_due_at');
  const overdue = evaluateRiskSnapshot(base({ companies: [{ id: C, complianceStatus: 'overdue' }] }));
  assert.equal(overdue[0]?.severity, 'critical');
  assert.equal(overdue[0]?.evidence[0]?.field, 'compliance_status');
});

test('signals are sorted by visible severity/urgency rules, not an opaque score', () => {
  const signals = evaluateRiskSnapshot(base({
    transactions: [{ id: T, status: 'active', lastActivityAt: '2026-09-07T11:00:00.000Z' }],
    workloads: [{ ownerId: O, activeCount: 9, urgentCount: 1 }],
    financeAnomalies: [{ id: F, kind: 'critical_fact', severity: 'critical', explanation: 'حقيقة مالية حرجة.' }],
  }));
  assert.deepEqual(signals.map((signal) => signal.severity), ['critical', 'medium', 'medium']);
  assert.equal(signals[0]?.code, 'finance_anomaly');
  for (const item of signals) {
    assert.ok(item.components.length > 0);
    assert.ok(item.evidence.length > 0);
    assert.equal(item.recommendation.mutates, false);
  }
});

test('returned signal graph is frozen against presentation-side mutation', () => {
  const signals = evaluateRiskSnapshot(base({ transactions: [{ id: T, status: 'stalled', priority: 'urgent', lastActivityAt: NOW }] }));
  assert.equal(Object.isFrozen(signals), true);
  assert.equal(Object.isFrozen(signals[0]), true);
  assert.equal(Object.isFrozen(signals[0]?.components), true);
  assert.equal(Object.isFrozen(signals[0]?.evidence), true);
  assert.equal(Object.isFrozen(signals[0]?.recommendation), true);
});

test('invalid evaluation timestamp and unsafe threshold configuration fail closed', () => {
  assert.throws(() => evaluateRiskSnapshot({ evaluatedAt: 'invalid' }), /valid evaluatedAt/);
  const invalids: RiskThresholds[] = [
    { inactiveHours: 0, nearDeadlineHours: 72, workloadActiveCount: 8, workloadUrgentCount: 3 },
    { inactiveHours: 48, nearDeadlineHours: Number.NaN, workloadActiveCount: 8, workloadUrgentCount: 3 },
    { inactiveHours: 48, nearDeadlineHours: 72, workloadActiveCount: 1.5, workloadUrgentCount: 3 },
    { inactiveHours: 48, nearDeadlineHours: 72, workloadActiveCount: 8, workloadUrgentCount: -1 },
  ];
  for (const thresholds of invalids) assert.throws(() => evaluateRiskSnapshot(base(), thresholds), /thresholds/);
});
