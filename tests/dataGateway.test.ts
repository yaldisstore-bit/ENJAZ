import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazSupabaseClient } from '../src/core/supabase/client.ts';
import { createSupabaseDataGateway } from '../src/data/supabase/SupabaseDataGateway.ts';
import { createWorkspaceScope } from '../src/data/contracts/dataTypes.ts';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';

interface RecordedOp { readonly name: string; readonly args: readonly unknown[] }
interface FakeResponse { readonly data: unknown; readonly error: Readonly<{ code?: string; message?: string }> | null; readonly count?: number | null }

class FakeBuilder implements PromiseLike<FakeResponse> {
  readonly operations: RecordedOp[] = [];
  private readonly response: FakeResponse;
  constructor(response: FakeResponse) { this.response = response; }
  private record(name: string, ...args: unknown[]): this { this.operations.push({ name, args }); return this; }
  select(...args: unknown[]): this { return this.record('select', ...args); }
  insert(...args: unknown[]): this { return this.record('insert', ...args); }
  update(...args: unknown[]): this { return this.record('update', ...args); }
  eq(...args: unknown[]): this { return this.record('eq', ...args); }
  neq(...args: unknown[]): this { return this.record('neq', ...args); }
  gt(...args: unknown[]): this { return this.record('gt', ...args); }
  gte(...args: unknown[]): this { return this.record('gte', ...args); }
  lt(...args: unknown[]): this { return this.record('lt', ...args); }
  lte(...args: unknown[]): this { return this.record('lte', ...args); }
  is(...args: unknown[]): this { return this.record('is', ...args); }
  in(...args: unknown[]): this { return this.record('in', ...args); }
  order(...args: unknown[]): this { return this.record('order', ...args); }
  range(...args: unknown[]): this { return this.record('range', ...args); }
  maybeSingle(): Promise<FakeResponse> { this.record('maybeSingle'); return Promise.resolve(this.response); }
  single(): Promise<FakeResponse> { this.record('single'); return Promise.resolve(this.response); }
  then<TResult1 = FakeResponse, TResult2 = never>(
    onfulfilled?: ((value: FakeResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.response).then(onfulfilled, onrejected);
  }
}

function fakeClient(response: FakeResponse): Readonly<{ client: EnjazSupabaseClient; builders: FakeBuilder[]; tables: string[] }> {
  const builders: FakeBuilder[] = [];
  const tables: string[] = [];
  const client = {
    from(table: string) {
      tables.push(table);
      const builder = new FakeBuilder(response);
      builders.push(builder);
      return builder;
    },
  } as unknown as EnjazSupabaseClient;
  return { client, builders, tables };
}

const scope = createWorkspaceScope('11111111-1111-4111-8111-111111111111');

test('list always scopes workspace before caller filters and applies bounded range', async () => {
  const fake = fakeClient({ data: [{ id: 'c1', workspace_id: scope.workspaceId }], error: null, count: 1 });
  const gateway = createSupabaseDataGateway(fake.client);
  const page = await gateway.list('companies', scope, {
    filters: [{ column: 'status', operator: 'eq', value: 'active' }],
    orderBy: [{ column: 'created_at', ascending: false }],
    offset: 20,
    limit: 10,
  });
  assert.equal(fake.tables[0], 'companies');
  assert.deepEqual(fake.builders[0]?.operations.slice(0, 5).map((op) => op.name), ['select', 'eq', 'eq', 'order', 'range']);
  assert.deepEqual(fake.builders[0]?.operations[1]?.args, ['workspace_id', scope.workspaceId]);
  assert.deepEqual(fake.builders[0]?.operations.at(-1)?.args, [20, 29]);
  assert.equal(page.total, 1);
});

test('getById combines workspace scope and record id', async () => {
  const fake = fakeClient({ data: { id: 'c1', workspace_id: scope.workspaceId }, error: null });
  const gateway = createSupabaseDataGateway(fake.client);
  await gateway.getById('companies', scope, 'c1');
  const eqs = fake.builders[0]?.operations.filter((op) => op.name === 'eq').map((op) => op.args);
  assert.deepEqual(eqs, [['workspace_id', scope.workspaceId], ['id', 'c1']]);
});

test('insert injects workspace_id inside the gateway rather than trusting callers', async () => {
  const fake = fakeClient({ data: { id: 'c1', workspace_id: scope.workspaceId, legal_name: 'A' }, error: null });
  const gateway = createSupabaseDataGateway(fake.client);
  await gateway.insert('companies', scope, { legal_name: 'A' });
  const insert = fake.builders[0]?.operations.find((op) => op.name === 'insert');
  assert.deepEqual(insert?.args[0], { legal_name: 'A', workspace_id: scope.workspaceId });

  await assert.rejects(() => gateway.insert('companies', scope, { legal_name: 'A', workspace_id: 'evil' } as never));
});

test('update never allows identity or workspace reassignment', async () => {
  const fake = fakeClient({ data: { id: 'c1', workspace_id: scope.workspaceId, legal_name: 'B' }, error: null });
  const gateway = createSupabaseDataGateway(fake.client);
  await gateway.updateById('companies', scope, 'c1', { legal_name: 'B' });
  const update = fake.builders[0]?.operations.find((op) => op.name === 'update');
  assert.deepEqual(update?.args[0], { legal_name: 'B' });
  await assert.rejects(() => gateway.updateById('companies', scope, 'c1', { workspace_id: 'evil' } as never));
});

test('gateway exposes no hard-delete primitive', () => {
  const fake = fakeClient({ data: null, error: null });
  const gateway = createSupabaseDataGateway(fake.client);
  assert.equal('delete' in gateway, false);
  assert.equal('deleteById' in gateway, false);
});

test('RLS and Postgres errors are normalized at the adapter boundary', async () => {
  const fake = fakeClient({ data: null, error: { code: '42501', message: 'permission denied' } });
  const gateway = createSupabaseDataGateway(fake.client);
  await assert.rejects(
    () => gateway.list('companies', scope),
    (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_FORBIDDEN',
  );
});
