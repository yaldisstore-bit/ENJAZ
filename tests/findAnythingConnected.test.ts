import test from 'node:test';
import assert from 'node:assert/strict';
import type { EnjazDataLayerFactory } from '../src/data/createDataLayer.ts';
import {
  buildR2ConnectedFindAnythingResults,
  loadR2WorkspaceSearchRecords,
} from '../src/ui-r2/find-anything/FindAnythingConnected.ts';

function makeFactory(options: { workspaceId?: string | null } = {}): EnjazDataLayerFactory {
  const workspaceId = options.workspaceId === undefined ? '11111111-1111-4111-8111-111111111111' : options.workspaceId;
  const companies = [{
    id: '22222222-2222-4222-8222-222222222221',
    display_name: 'قمر السلطان',
    legal_name: 'قمر السلطان للتجارة العامة',
    deleted_at: null,
    updated_at: '2026-09-05T12:00:00.000Z',
  }];
  const transactions = [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      company_id: companies[0]!.id,
      legacy_id: '1042',
      type: 'تعديل عقد تأسيس',
      department: 'مسجل الشركات',
      deleted_at: null,
      last_activity_at: '2026-09-05T12:30:00.000Z',
    },
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      company_id: companies[0]!.id,
      legacy_id: '1043',
      type: 'سجل محذوف',
      department: 'مسجل الشركات',
      deleted_at: '2026-09-05T12:35:00.000Z',
      last_activity_at: '2026-09-05T12:35:00.000Z',
    },
  ];

  return {
    async resolveWorkspaceId() { return workspaceId; },
    forWorkspace() {
      return {
        transactions: {
          async list(request: unknown) {
            assert.deepEqual((request as { limit: number }).limit, 80);
            return { items: transactions, offset: 0, limit: 80, total: transactions.length, hasMore: false };
          },
        },
        companies: {
          async list(request: unknown) {
            assert.deepEqual((request as { limit: number }).limit, 100);
            return { items: companies, offset: 0, limit: 100, total: companies.length, hasMore: false };
          },
        },
      };
    },
  } as unknown as EnjazDataLayerFactory;
}

test('R2.0-8 loads bounded live transaction records only through the workspace Data Layer', async () => {
  const records = await loadR2WorkspaceSearchRecords(makeFactory(), 'user-1');
  assert.equal(records.length, 1);
  assert.equal(records[0]?.transactionId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
  assert.match(records[0]?.secondary ?? '', /بيانات مساحة العمل/);
  assert.doesNotMatch(records[0]?.secondary ?? '', /Preview/);
});

test('R2.0-8 fails closed when the authenticated user has no workspace', async () => {
  let touched = false;
  const factory = {
    async resolveWorkspaceId() { return null; },
    forWorkspace() { touched = true; throw new Error('must not resolve data layer without workspace'); },
  } as unknown as EnjazDataLayerFactory;
  const records = await loadR2WorkspaceSearchRecords(factory, 'user-1');
  assert.deepEqual(records, []);
  assert.equal(touched, false);
});

test('R2.0-8 connected search labels live records as workspace records and features as navigation', async () => {
  const records = await loadR2WorkspaceSearchRecords(makeFactory(), 'user-1');
  const recordResult = buildR2ConnectedFindAnythingResults('1042', records);
  assert.equal(recordResult[0]?.kind, 'transaction');
  assert.equal(recordResult[0]?.source, 'workspace-record');
  assert.equal(recordResult[0]?.destinationId, 'transactions.detail');

  const featureResult = buildR2ConnectedFindAnythingResults('خزنة', records);
  assert.equal(featureResult[0]?.kind, 'feature');
  assert.equal(featureResult[0]?.source, 'navigation');
  assert.equal(featureResult[0]?.destinationId, 'documents');
});
