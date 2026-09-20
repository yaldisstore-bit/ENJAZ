import test from 'node:test';
import assert from 'node:assert/strict';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import { CrossDomainJourneyReadError, loadCrossDomainJourneyReadProof } from '../src/features/journeys/crossDomainJourneyReadProof.ts';

const U = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const W = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const T = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const P = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const R = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

type FixtureOptions = {
  workspace?: string | null;
  company?: Record<string, unknown> | null;
  transaction?: Record<string, unknown> | null;
  collections?: Record<string, readonly Record<string, unknown>[]>;
  truncated?: string;
  mutateOnRecheck?: boolean;
  changeWorkspaceOnRecheck?: boolean;
};

function fixture(options: FixtureOptions = {}) {
  const baselineCompany = { id: C, workspace_id: W, updated_at: '2026-09-20T00:00:00Z', deleted_at: null, merged_into_id: null };
  const baselineTransaction = { id: T, company_id: C, workspace_id: W, updated_at: '2026-09-20T00:00:00Z', deleted_at: null, archived_at: null };
  const company = options.company === undefined ? baselineCompany : options.company;
  const transaction = options.transaction === undefined ? baselineTransaction : options.transaction;
  const collections = options.collections ?? {};
  let workspaceResolutions = 0;
  let transactionReads = 0;
  const calls: string[] = [];

  const get = (kind: string, value: Record<string, unknown> | null) => ({
    async getById(id: string) {
      calls.push('read:' + kind + ':' + id);
      if (kind === 'transaction') transactionReads += 1;
      if (kind === 'transaction' && transactionReads > 1 && options.mutateOnRecheck && value)
        return { ...value, updated_at: '2026-09-20T00:00:01Z' };
      return value;
    },
  });
  const list = (kind: string) => ({
    async list(request: { filters: readonly { column: string; operator: string; value: unknown }[] }) {
      calls.push('list:' + kind);
      assert.equal(request.filters.length, 1);
      const rows = collections[kind] ?? [];
      return { items: rows, hasMore: options.truncated === kind, offset: 0, limit: 100, total: rows.length };
    },
  });
  const layer = {
    scope: { workspaceId: W },
    companies: get('company', company),
    transactions: get('transaction', transaction),
    workflowInstances: list('procedures'),
    followups: list('followups'),
    payments: list('payments'),
    paymentReversals: list('reversals'),
    documents: list('documents'),
  } as unknown as EnjazWorkspaceDataLayer;
  const factory = {
    async resolveWorkspaceId(userId: string) {
      assert.equal(userId, U);
      workspaceResolutions += 1;
      if (options.changeWorkspaceOnRecheck && workspaceResolutions > 1) return '99999999-9999-4999-8999-999999999999';
      return options.workspace === undefined ? W : options.workspace;
    },
    forWorkspace(id: string) {
      assert.equal(id, W);
      return layer;
    },
  } as EnjazDataLayerFactory;
  return { factory, calls };
}

function expectReason(reason: CrossDomainJourneyReadError['reason']) {
  return (error: unknown) => error instanceof CrossDomainJourneyReadError && error.reason === reason;
}

test('A2 linked read proof preserves existing workspace and actual company -> transaction -> child IDs', async () => {
  const data = fixture({ collections: {
    procedures: [{ id: P, workspace_id: W, transaction_id: T }],
    followups: [{ id: P, workspace_id: W, transaction_id: T }],
    payments: [{ id: P, workspace_id: W, company_id: C, transaction_id: T }],
    reversals: [{ id: R, workspace_id: W, payment_id: P }],
    documents: [{ id: P, workspace_id: W, company_id: C, transaction_id: T }],
  } });
  const proof = await loadCrossDomainJourneyReadProof(data.factory, U, C, T);
  assert.equal(proof.workspaceId, W);
  assert.equal(proof.company.id, C);
  assert.equal(proof.transaction.company_id, C);
  assert.equal(proof.procedures.length, 1);
  assert.equal(proof.followups.length, 1);
  assert.equal(proof.payments.length, 1);
  assert.equal(proof.reversals.length, 1);
  assert.equal(proof.documents.length, 1);
  assert.equal(proof.proofKind, 'AUTHENTICATED_INTERNAL_READ_ONLY');
  assert.equal(proof.atomicMultiDomainSnapshotCertified, false);
  assert.equal(proof.clientVisibilityCertified, false);
  assert.ok(Object.isFrozen(proof));
  assert.ok(!data.calls.some(x => /write|create|update|delete/i.test(x)));
});

test('A2 denies invalid identity and missing workspace before reading data', async () => {
  const data = fixture();
  await assert.rejects(loadCrossDomainJourneyReadProof(data.factory, U, 'bad', T), expectReason('INVALID_ID'));
  assert.deepEqual(data.calls, []);
  const missing = fixture({ workspace: null });
  await assert.rejects(loadCrossDomainJourneyReadProof(missing.factory, U, C, T), expectReason('NO_WORKSPACE'));
  assert.deepEqual(missing.calls, []);
});

test('A2 fails closed on absent company, missing transaction and wrong company linkage', async () => {
  await assert.rejects(loadCrossDomainJourneyReadProof(fixture({ company: null }).factory, U, C, T), expectReason('NOT_FOUND'));
  await assert.rejects(loadCrossDomainJourneyReadProof(fixture({ transaction: null }).factory, U, C, T), expectReason('NOT_FOUND'));
  await assert.rejects(loadCrossDomainJourneyReadProof(fixture({ transaction: {
    id: T, company_id: U, workspace_id: W, updated_at: 'now', deleted_at: null,
  } }).factory, U, C, T), expectReason('LINK_DRIFT'));
});

test('A2 rejects workspace contamination and deleted/merged company', async () => {
  await assert.rejects(loadCrossDomainJourneyReadProof(fixture({ company: {
    id: C, workspace_id: U, updated_at: 'now', deleted_at: null, merged_into_id: null,
  } }).factory, U, C, T), expectReason('LINK_DRIFT'));
  await assert.rejects(loadCrossDomainJourneyReadProof(fixture({ company: {
    id: C, workspace_id: W, updated_at: 'now', deleted_at: null, merged_into_id: T,
  } }).factory, U, C, T), expectReason('LINK_DRIFT'));
  await assert.rejects(loadCrossDomainJourneyReadProof(fixture({ transaction: {
    id: T, workspace_id: W, company_id: C, updated_at: 'now', deleted_at: 'now',
  } }).factory, U, C, T), expectReason('LINK_DRIFT'));
});

test('A2 rejects a foreign-workspace child and payment/document lineage drift', async () => {
  const cases = [
    { payments: [{ id: P, workspace_id: U, company_id: C, transaction_id: T }] },
    { payments: [{ id: P, workspace_id: W, company_id: U, transaction_id: T }] },
    { followups: [{ id: P, workspace_id: W, transaction_id: U }] },
    { procedures: [{ id: P, workspace_id: W, transaction_id: U }] },
    { documents: [{ id: P, workspace_id: W, company_id: U, transaction_id: T }] },
    { reversals: [{ id: R, workspace_id: W, payment_id: U }], payments: [{ id: P, workspace_id: W, company_id: C, transaction_id: T }] },
  ];
  for (const collections of cases)
    await assert.rejects(loadCrossDomainJourneyReadProof(fixture({ collections }).factory, U, C, T), expectReason('LINK_DRIFT'));
});

test('A2 never treats a truncated domain page as full journey evidence', async () => {
  for (const kind of ['procedures', 'followups', 'payments', 'documents', 'reversals']) {
    const collections = { payments: [{ id: P, workspace_id: W, company_id: C, transaction_id: T }] };
    await assert.rejects(loadCrossDomainJourneyReadProof(fixture({ collections, truncated: kind }).factory, U, C, T), expectReason('CAPACITY'));
  }
});

test('A2 rechecks actor workspace and root versions after child reads', async () => {
  await assert.rejects(loadCrossDomainJourneyReadProof(fixture({ mutateOnRecheck: true }).factory, U, C, T), expectReason('CHANGED'));
  await assert.rejects(loadCrossDomainJourneyReadProof(fixture({ changeWorkspaceOnRecheck: true }).factory, U, C, T), expectReason('CHANGED'));
});

test('A2 does not fabricate reversal evidence when no payments exist; archive remains internal only', async () => {
  const data = fixture({ transaction: {
    id: T, workspace_id: W, company_id: C, updated_at: '2026-09-20T00:00:00Z', deleted_at: null, archived_at: '2026-09-20T01:00:00Z',
  } });
  const proof = await loadCrossDomainJourneyReadProof(data.factory, U, C, T);
  assert.equal(proof.reversals.length, 0);
  assert.equal(proof.transaction.archived_at, '2026-09-20T01:00:00Z');
  assert.equal(proof.clientVisibilityCertified, false);
  assert.ok(!data.calls.includes('list:reversals'));
});
