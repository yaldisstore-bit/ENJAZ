import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazSupabaseClient } from '../src/core/supabase/client.ts';
import { createSupabaseDataGateway } from '../src/data/supabase/SupabaseDataGateway.ts';
import { createWorkspaceScope, normalizeListWindow } from '../src/data/contracts/dataTypes.ts';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';

interface FakeResponse {
  readonly data: unknown;
  readonly error: Readonly<{ code?: string; message?: string }> | null;
  readonly count?: number | null;
}
interface Op { readonly name: string; readonly args: readonly unknown[] }
type Outcome = () => Promise<FakeResponse>;

class ChaosBuilder implements PromiseLike<FakeResponse> {
  readonly operations: Op[] = [];
  private readonly outcome: Outcome;
  constructor(outcome: Outcome) { this.outcome = outcome; }
  private op(name: string, ...args: unknown[]): this { this.operations.push({ name, args }); return this; }
  select(...args: unknown[]): this { return this.op('select', ...args); }
  insert(...args: unknown[]): this { return this.op('insert', ...args); }
  update(...args: unknown[]): this { return this.op('update', ...args); }
  eq(...args: unknown[]): this { return this.op('eq', ...args); }
  neq(...args: unknown[]): this { return this.op('neq', ...args); }
  gt(...args: unknown[]): this { return this.op('gt', ...args); }
  gte(...args: unknown[]): this { return this.op('gte', ...args); }
  lt(...args: unknown[]): this { return this.op('lt', ...args); }
  lte(...args: unknown[]): this { return this.op('lte', ...args); }
  is(...args: unknown[]): this { return this.op('is', ...args); }
  in(...args: unknown[]): this { return this.op('in', ...args); }
  order(...args: unknown[]): this { return this.op('order', ...args); }
  range(...args: unknown[]): this { return this.op('range', ...args); }
  maybeSingle(): Promise<FakeResponse> { this.op('maybeSingle'); return this.outcome(); }
  single(): Promise<FakeResponse> { this.op('single'); return this.outcome(); }
  then<TResult1 = FakeResponse, TResult2 = never>(
    onfulfilled?: ((value: FakeResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.outcome().then(onfulfilled, onrejected);
  }
}

function chaosClient(outcomes: readonly Outcome[]): Readonly<{
  client: EnjazSupabaseClient;
  builders: ChaosBuilder[];
  tables: string[];
  fromCalls: () => number;
}> {
  const queue = [...outcomes];
  const builders: ChaosBuilder[] = [];
  const tables: string[] = [];
  let calls = 0;
  const client = {
    from(table: string) {
      calls += 1;
      tables.push(table);
      const outcome = queue.shift();
      if (!outcome) throw new Error('No fake outcome configured');
      const builder = new ChaosBuilder(outcome);
      builders.push(builder);
      return builder;
    },
  } as unknown as EnjazSupabaseClient;
  return { client, builders, tables, fromCalls: () => calls };
}

const scopeA = createWorkspaceScope('11111111-1111-4111-8111-111111111111');
const scopeB = createWorkspaceScope('22222222-2222-4222-8222-222222222222');
const ok = (data: unknown, count?: number): Outcome => async () => ({ data, error: null, ...(count === undefined ? {} : { count }) });
const reject = (error: unknown): Outcome => async () => { throw error; };
const delayed = (ms: number, response: FakeResponse): Outcome => () => new Promise((resolve) => setTimeout(() => resolve(response), ms));

async function expectDataCode(action: () => Promise<unknown>, code: DataAccessError['dataCode']): Promise<DataAccessError> {
  let caught: unknown;
  try { await action(); } catch (error) { caught = error; }
  assert.ok(caught instanceof DataAccessError, `expected DataAccessError, got ${String(caught)}`);
  assert.equal(caught.dataCode, code);
  return caught;
}

test('chaos: thrown network failure on read is normalized and raw transport text is not user-facing', async () => {
  const fake = chaosClient([reject(new TypeError('Failed to fetch https://internal.example?secret=abc'))]);
  const error = await expectDataCode(() => createSupabaseDataGateway(fake.client).list('companies', scopeA), 'DATA_UNAVAILABLE');
  assert.equal(error.userMessage.includes('secret=abc'), false);
  assert.equal(fake.fromCalls(), 1);
});

test('chaos: ambiguous write network failure is never presented as safe-to-retry', async () => {
  const fake = chaosClient([reject(new TypeError('network connection reset'))]);
  const error = await expectDataCode(
    () => createSupabaseDataGateway(fake.client).insert('companies', scopeA, { legal_name: 'A' }),
    'DATA_OUTCOME_UNKNOWN',
  );
  assert.match(error.userMessage, /حدّث البيانات/);
  assert.equal(fake.fromCalls(), 1, 'write adapter must not auto-retry an ambiguous write');
});

test('chaos: read deadline terminates a hung request with a safe unavailable error', async () => {
  const fake = chaosClient([delayed(100, { data: [], error: null, count: 0 })]);
  await expectDataCode(() => createSupabaseDataGateway(fake.client, { timeoutMs: 5 }).list('companies', scopeA), 'DATA_UNAVAILABLE');
  assert.equal(fake.fromCalls(), 1);
});

test('chaos: write deadline reports unknown outcome and never retries', async () => {
  const fake = chaosClient([delayed(100, { data: { id: 'late', workspace_id: scopeA.workspaceId, legal_name: 'A' }, error: null })]);
  await expectDataCode(
    () => createSupabaseDataGateway(fake.client, { timeoutMs: 5 }).insert('companies', scopeA, { legal_name: 'A' }),
    'DATA_OUTCOME_UNKNOWN',
  );
  assert.equal(fake.fromCalls(), 1);
});

test('chaos: malformed list payload is contained at the adapter boundary', async () => {
  const fake = chaosClient([ok({ injected: true })]);
  const error = await expectDataCode(() => createSupabaseDataGateway(fake.client).list('companies', scopeA), 'DATA_OPERATION_FAILED');
  assert.equal(error.userMessage.includes('injected'), false);
});

test('chaos: malformed row payload is contained at the adapter boundary', async () => {
  const fake = chaosClient([ok(['not-a-row'])]);
  await expectDataCode(() => createSupabaseDataGateway(fake.client).getById('companies', scopeA, 'c1'), 'DATA_OPERATION_FAILED');
});

test('chaos: database security and integrity failures keep stable classifications', async () => {
  const cases = [
    ['42501', 'DATA_FORBIDDEN'],
    ['PGRST301', 'DATA_FORBIDDEN'],
    ['23505', 'DATA_CONFLICT'],
    ['23503', 'DATA_REFERENCE_CONFLICT'],
    ['23514', 'DATA_VALIDATION_FAILED'],
    ['22P02', 'DATA_VALIDATION_FAILED'],
  ] as const;
  for (const [dbCode, expected] of cases) {
    const fake = chaosClient([async () => ({ data: null, error: { code: dbCode, message: 'raw database detail' } })]);
    await expectDataCode(() => createSupabaseDataGateway(fake.client).list('companies', scopeA), expected);
  }
});

test('chaos: concurrent workspace reads cannot cross-contaminate predicates or results', async () => {
  const outcomes: Outcome[] = [];
  for (let i = 0; i < 120; i += 1) {
    const scope = i % 2 === 0 ? scopeA : scopeB;
    outcomes.push(delayed((i % 7) + 1, { data: [{ id: `r${i}`, workspace_id: scope.workspaceId }], error: null, count: 1 }));
  }
  const fake = chaosClient(outcomes);
  const gateway = createSupabaseDataGateway(fake.client, { timeoutMs: 500 });
  const jobs = Array.from({ length: 120 }, (_, i) => {
    const scope = i % 2 === 0 ? scopeA : scopeB;
    return gateway.list('companies', scope).then((page) => ({ i, scope, page }));
  });
  const results = await Promise.all(jobs);
  for (const { i, scope, page } of results) {
    assert.equal(page.items[0]?.id, `r${i}`);
    assert.equal(page.items[0]?.workspace_id, scope.workspaceId);
    const scopeEq = fake.builders[i]?.operations.find((operation) => operation.name === 'eq' && operation.args[0] === 'workspace_id');
    assert.deepEqual(scopeEq?.args, ['workspace_id', scope.workspaceId]);
  }
});

test('chaos: out-of-order responses remain bound to their originating request', async () => {
  const fake = chaosClient([
    delayed(30, { data: [{ id: 'slow', workspace_id: scopeA.workspaceId }], error: null, count: 1 }),
    delayed(1, { data: [{ id: 'fast', workspace_id: scopeB.workspaceId }], error: null, count: 1 }),
  ]);
  const gateway = createSupabaseDataGateway(fake.client, { timeoutMs: 200 });
  const [slow, fast] = await Promise.all([gateway.list('companies', scopeA), gateway.list('companies', scopeB)]);
  assert.equal(slow.items[0]?.id, 'slow');
  assert.equal(fast.items[0]?.id, 'fast');
});

test('fuzz: malformed workspace identifiers are rejected before any query exists', () => {
  const malicious = [
    '', ' ', 'null', 'undefined', '../other', "' OR 1=1 --", '<script>alert(1)</script>',
    '11111111-1111-1111-1111-111111111111', '11111111-1111-6111-8111-111111111111',
  ];
  for (let i = 0; i < 500; i += 1) malicious.push(`workspace-${i}-${'x'.repeat(i % 17)}`);
  for (const value of malicious) assert.throws(() => createWorkspaceScope(value));
});

test('fuzz: pagination rejects negative, fractional, unsafe, zero and oversized windows', () => {
  const invalidOffsets = [-1, -100, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Number.POSITIVE_INFINITY];
  const invalidLimits = [0, -1, 101, 1000, 1.5, Number.NaN, Number.POSITIVE_INFINITY];
  for (const offset of invalidOffsets) assert.throws(() => normalizeListWindow(offset, 10));
  for (const limit of invalidLimits) assert.throws(() => normalizeListWindow(0, limit));
  assert.deepEqual(normalizeListWindow(0, 100), { offset: 0, limit: 100 });
});

test('fuzz: hostile filter column names are rejected before reaching the adapter query builder', async () => {
  const payloads = ['workspace_id', 'status;drop table companies', 'status--', 'status)or(1=1', 'Status', 'a.b', 'a b', '__proto__[x]'];
  for (const column of payloads) {
    const fake = chaosClient([ok([])]);
    const gateway = createSupabaseDataGateway(fake.client);
    await assert.rejects(() => gateway.list('companies', scopeA, { filters: [{ column, operator: 'eq', value: 'x' }] } as never));
    assert.equal(fake.builders.length, 0, 'invalid filter must fail before a query builder is created');
  }
});

test('fuzz: in-filter refuses empty and oversized arrays', async () => {
  for (const value of [[], Array.from({ length: 101 }, (_, i) => i)]) {
    const fake = chaosClient([ok([])]);
    await assert.rejects(() => createSupabaseDataGateway(fake.client).list('companies', scopeA, {
      filters: [{ column: 'status', operator: 'in', value }],
    }));
  }
});

test('chaos: caller cannot forge tenant identity during insert or update', async () => {
  const fake = chaosClient([ok({ id: 'c1', workspace_id: scopeA.workspaceId }), ok({ id: 'c1', workspace_id: scopeA.workspaceId })]);
  const gateway = createSupabaseDataGateway(fake.client);
  await assert.rejects(() => gateway.insert('companies', scopeA, { legal_name: 'A', workspace_id: scopeB.workspaceId } as never));
  await assert.rejects(() => gateway.updateById('companies', scopeA, 'c1', { id: 'evil' } as never));
  assert.equal(fake.builders.length, 0, 'identity forgery should fail before issuing a query');
});

test('chaos: invalid timeout configuration is rejected synchronously', () => {
  const fake = chaosClient([ok([])]);
  for (const timeoutMs of [0, -1, 1.5, 120001, Number.NaN]) {
    assert.throws(() => createSupabaseDataGateway(fake.client, { timeoutMs }));
  }
});
