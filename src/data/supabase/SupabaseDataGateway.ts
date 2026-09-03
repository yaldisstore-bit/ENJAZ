import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike, type DataOperationKind } from '../contracts/DataAccessError.ts';
import {
  assertSafeColumn, normalizeListWindow, type DataFilter, type DataOrder, type DataPage, type IdWorkspaceTableName,
  type InsertableWorkspaceTableName, type InsertOf, type ListRequest, type RowOf, type UpdateOf,
  type UpdatableWorkspaceTableName, type WorkspaceScope, type WorkspaceTableName,
} from '../contracts/dataTypes.ts';
import type { WorkspaceDataGateway } from '../ports/WorkspaceDataGateway.ts';

interface QueryResponse {
  readonly data: unknown;
  readonly error: DataFailureLike | null;
  readonly count?: number | null;
}

interface QueryBuilder extends PromiseLike<QueryResponse> {
  select(columns?: string, options?: Readonly<{ count?: 'exact' | 'planned' | 'estimated' }>): QueryBuilder;
  insert(values: unknown): QueryBuilder;
  update(values: unknown): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
  neq(column: string, value: unknown): QueryBuilder;
  gt(column: string, value: unknown): QueryBuilder;
  gte(column: string, value: unknown): QueryBuilder;
  lt(column: string, value: unknown): QueryBuilder;
  lte(column: string, value: unknown): QueryBuilder;
  is(column: string, value: unknown): QueryBuilder;
  in(column: string, values: readonly unknown[]): QueryBuilder;
  order(column: string, options?: Readonly<{ ascending?: boolean; nullsFirst?: boolean }>): QueryBuilder;
  range(from: number, to: number): QueryBuilder;
  maybeSingle(): Promise<QueryResponse>;
  single(): Promise<QueryResponse>;
}

interface DataClientLike {
  from(table: string): QueryBuilder;
}

export interface DataGatewayOptions {
  readonly timeoutMs?: number;
}

const DEFAULT_DATA_TIMEOUT_MS = 15_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeTimeout(timeoutMs = DEFAULT_DATA_TIMEOUT_MS): number {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new Error('Invalid data timeout');
  return timeoutMs;
}

function requireUuid(value: string, label: string): string {
  const normalized = value.trim();
  if (!UUID_PATTERN.test(normalized)) throw new Error(`Invalid ${label}`);
  return normalized;
}

async function settleDataOperation<T>(operation: PromiseLike<T>, kind: DataOperationKind, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DataAccessError(
      kind === 'write' ? 'Write deadline elapsed before outcome confirmation' : 'Read deadline elapsed',
      kind === 'write' ? 'DATA_OUTCOME_UNKNOWN' : 'DATA_UNAVAILABLE',
    )), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve(operation), deadline]);
  } catch (error) {
    throw normalizeThrownDataFailure(error, kind);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function requireRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw normalizeDataFailure({ message: 'Unexpected data row shape' });
  return value as Readonly<Record<string, unknown>>;
}

function requireRows(value: unknown): readonly Readonly<Record<string, unknown>>[] {
  if (!Array.isArray(value)) throw normalizeDataFailure({ message: 'Unexpected data list shape' });
  return value.map(requireRecord);
}

function validateFilter<T extends WorkspaceTableName>(filter: DataFilter<T>): void {
  const column = String(filter.column);
  assertSafeColumn(column);
  if (filter.operator === 'in' && (!Array.isArray(filter.value) || filter.value.length === 0 || filter.value.length > 100)) {
    throw new Error('Invalid in-filter values');
  }
}

function applyFilter<T extends WorkspaceTableName>(builder: QueryBuilder, filter: DataFilter<T>): QueryBuilder {
  const column = String(filter.column);
  switch (filter.operator) {
    case 'eq': return builder.eq(column, filter.value);
    case 'neq': return builder.neq(column, filter.value);
    case 'gt': return builder.gt(column, filter.value);
    case 'gte': return builder.gte(column, filter.value);
    case 'lt': return builder.lt(column, filter.value);
    case 'lte': return builder.lte(column, filter.value);
    case 'is': return builder.is(column, filter.value);
    case 'in': return builder.in(column, filter.value as readonly unknown[]);
  }
}

function validateOrder<T extends WorkspaceTableName>(order: DataOrder<T>): void {
  assertSafeColumn(String(order.column));
}

function applyOrder<T extends WorkspaceTableName>(builder: QueryBuilder, order: DataOrder<T>): QueryBuilder {
  const column = String(order.column);
  return builder.order(column, { ascending: order.ascending ?? true, nullsFirst: order.nullsFirst ?? false });
}

function createPayload(scope: WorkspaceScope, values: object): Readonly<Record<string, unknown>> {
  const record = values as Readonly<Record<string, unknown>>;
  if ('workspace_id' in record) throw new Error('workspace_id cannot be supplied by callers');
  return Object.freeze({ ...record, workspace_id: scope.workspaceId });
}

function createPatch(values: object): Readonly<Record<string, unknown>> {
  const record = values as Readonly<Record<string, unknown>>;
  if ('workspace_id' in record || 'id' in record) throw new Error('Immutable identity fields cannot be patched');
  return Object.freeze({ ...record });
}

export function createSupabaseDataGateway(client: EnjazSupabaseClient, options: DataGatewayOptions = {}): WorkspaceDataGateway {
  const dataClient = client as unknown as DataClientLike;
  const timeoutMs = normalizeTimeout(options.timeoutMs);

  return Object.freeze({
    async resolveWorkspaceIdForUser(userId: string): Promise<string | null> {
      const safeUserId = requireUuid(userId, 'user id');
      const response = await settleDataOperation(
        dataClient
          .from('workspace_memberships')
          .select('workspace_id')
          .eq('user_id', safeUserId)
          .order('created_at', { ascending: true })
          .range(0, 0)
          .maybeSingle(),
        'read',
        timeoutMs,
      );
      if (response.error) throw normalizeDataFailure(response.error);
      if (response.data === null) return null;
      const record = requireRecord(response.data);
      if (typeof record.workspace_id !== 'string') throw normalizeDataFailure({ message: 'Workspace membership is missing workspace_id' });
      return requireUuid(record.workspace_id, 'workspace id');
    },

    async list<T extends WorkspaceTableName>(table: T, scope: WorkspaceScope, request: ListRequest<T> = {}): Promise<DataPage<RowOf<T>>> {
      const window = normalizeListWindow(request.offset, request.limit);
      for (const filter of request.filters ?? []) validateFilter(filter);
      for (const order of request.orderBy ?? []) validateOrder(order);
      let query = dataClient.from(table).select('*', { count: 'exact' }).eq('workspace_id', scope.workspaceId);
      for (const filter of request.filters ?? []) query = applyFilter(query, filter);
      for (const order of request.orderBy ?? []) query = applyOrder(query, order);
      const response = await settleDataOperation(query.range(window.offset, window.offset + window.limit - 1), 'read', timeoutMs);
      if (response.error) throw normalizeDataFailure(response.error);
      const rows = requireRows(response.data) as readonly RowOf<T>[];
      const total = response.count ?? null;
      return Object.freeze({
        items: Object.freeze([...rows]),
        offset: window.offset,
        limit: window.limit,
        total,
        hasMore: total === null ? rows.length === window.limit : window.offset + rows.length < total,
      });
    },

    async getById<T extends IdWorkspaceTableName>(table: T, scope: WorkspaceScope, id: string): Promise<RowOf<T> | null> {
      if (!id.trim()) throw new Error('Record id is required');
      const response = await settleDataOperation(dataClient.from(table).select('*').eq('workspace_id', scope.workspaceId).eq('id', id).maybeSingle(), 'read', timeoutMs);
      if (response.error) throw normalizeDataFailure(response.error);
      return response.data === null ? null : requireRecord(response.data) as RowOf<T>;
    },

    async insert<T extends InsertableWorkspaceTableName>(table: T, scope: WorkspaceScope, values: Omit<InsertOf<T>, 'workspace_id'>): Promise<RowOf<T>> {
      const payload = createPayload(scope, values);
      const response = await settleDataOperation(dataClient.from(table).insert(payload).select('*').single(), 'write', timeoutMs);
      if (response.error) throw normalizeDataFailure(response.error);
      return requireRecord(response.data) as RowOf<T>;
    },

    async updateById<T extends UpdatableWorkspaceTableName & IdWorkspaceTableName>(table: T, scope: WorkspaceScope, id: string, patch: Omit<UpdateOf<T>, 'workspace_id' | 'id'>): Promise<RowOf<T>> {
      if (!id.trim()) throw new Error('Record id is required');
      const safePatch = createPatch(patch);
      const response = await settleDataOperation(dataClient.from(table).update(safePatch).eq('workspace_id', scope.workspaceId).eq('id', id).select('*').single(), 'write', timeoutMs);
      if (response.error) throw normalizeDataFailure(response.error);
      return requireRecord(response.data) as RowOf<T>;
    },
  });
}
