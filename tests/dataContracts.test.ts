import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertSafeColumn, createWorkspaceScope, normalizeListWindow, WORKSPACE_TABLES,
  INSERTABLE_WORKSPACE_TABLES, UPDATABLE_WORKSPACE_TABLES,
} from '../src/data/contracts/dataTypes.ts';
import { normalizeDataFailure, DataAccessError } from '../src/data/contracts/DataAccessError.ts';

test('workspace scope accepts UUIDs and rejects arbitrary identifiers', () => {
  const scope = createWorkspaceScope('11111111-1111-4111-8111-111111111111');
  assert.equal(scope.workspaceId, '11111111-1111-4111-8111-111111111111');
  assert.throws(() => createWorkspaceScope('workspace-one'));
});

test('list windows are bounded to a maximum of 100 rows', () => {
  assert.deepEqual(normalizeListWindow(), { offset: 0, limit: 50 });
  assert.deepEqual(normalizeListWindow(100, 100), { offset: 100, limit: 100 });
  assert.throws(() => normalizeListWindow(-1, 20));
  assert.throws(() => normalizeListWindow(0, 101));
});

test('workspace_id is reserved and caller filters cannot override tenant scope', () => {
  assert.throws(() => assertSafeColumn('workspace_id'));
  assert.throws(() => assertSafeColumn('name;drop table'));
  assert.doesNotThrow(() => assertSafeColumn('created_at'));
});

test('table capability sets are explicit and delete is intentionally absent', () => {
  assert.equal(WORKSPACE_TABLES.length, 43);
  const insertable = new Set<string>(INSERTABLE_WORKSPACE_TABLES);
  const updatable = new Set<string>(UPDATABLE_WORKSPACE_TABLES);
  assert.ok(insertable.has('payments'));
  assert.ok(!updatable.has('payments'));
  assert.ok(!insertable.has('audit_events'));
});

test('database error codes are normalized without exposing raw messages as user messages', () => {
  const forbidden = normalizeDataFailure({ code: '42501', message: 'raw postgres detail' });
  assert.ok(forbidden instanceof DataAccessError);
  assert.equal(forbidden.dataCode, 'DATA_FORBIDDEN');
  assert.ok(!forbidden.userMessage.includes('raw postgres detail'));

  assert.equal(normalizeDataFailure({ code: '23505' }).dataCode, 'DATA_CONFLICT');
  assert.equal(normalizeDataFailure({ code: '23503' }).dataCode, 'DATA_REFERENCE_CONFLICT');
  assert.equal(normalizeDataFailure({ message: 'Failed to fetch' }).dataCode, 'DATA_UNAVAILABLE');
});
