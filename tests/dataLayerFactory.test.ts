import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazSupabaseClient } from '../src/core/supabase/client.ts';
import { createEnjazDataLayerFactory } from '../src/data/createDataLayer.ts';

const workspaceId = '11111111-1111-4111-8111-111111111111';

test('data layer factory binds repositories to one immutable workspace scope', () => {
  const client = { from: () => { throw new Error('not called during factory creation'); } } as unknown as EnjazSupabaseClient;
  const layer = createEnjazDataLayerFactory(client).forWorkspace(workspaceId);
  assert.equal(layer.scope.workspaceId, workspaceId);
  assert.ok(Object.isFrozen(layer));
  assert.ok(layer.companies);
  assert.ok(layer.transactions);
  assert.ok(layer.documents);
});

test('repository capabilities reflect database mutability instead of exposing generic CRUD', () => {
  const client = { from: () => { throw new Error('not called during factory creation'); } } as unknown as EnjazSupabaseClient;
  const layer = createEnjazDataLayerFactory(client).forWorkspace(workspaceId);

  assert.equal('create' in layer.companies, true);
  assert.equal('update' in layer.companies, true);

  assert.equal('create' in layer.payments, true);
  assert.equal('update' in layer.payments, false);
  assert.equal('delete' in layer.payments, false);

  assert.equal('create' in layer.auditEvents, false);
  assert.equal('update' in layer.auditEvents, false);
  assert.equal('delete' in layer.auditEvents, false);
});

test('invalid workspace id is rejected before a data request can exist', () => {
  const client = {} as EnjazSupabaseClient;
  assert.throws(() => createEnjazDataLayerFactory(client).forWorkspace('bad-workspace'));
});
