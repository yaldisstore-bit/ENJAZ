import type {
  DataPage, IdWorkspaceTableName, InsertableWorkspaceTableName, InsertOf, ListRequest, RowOf, UpdateOf,
  UpdatableWorkspaceTableName, WorkspaceScope,
} from '../contracts/dataTypes.ts';
import type { WorkspaceDataGateway } from '../ports/WorkspaceDataGateway.ts';

export interface ReadRepository<T extends IdWorkspaceTableName> {
  list(request?: ListRequest<T>): Promise<DataPage<RowOf<T>>>;
  getById(id: string): Promise<RowOf<T> | null>;
}

export interface AppendOnlyRepository<T extends IdWorkspaceTableName & InsertableWorkspaceTableName> extends ReadRepository<T> {
  create(values: Omit<InsertOf<T>, 'workspace_id'>): Promise<RowOf<T>>;
}

export interface MutableRepository<T extends IdWorkspaceTableName & InsertableWorkspaceTableName & UpdatableWorkspaceTableName>
  extends AppendOnlyRepository<T> {
  update(id: string, patch: Omit<UpdateOf<T>, 'workspace_id' | 'id'>): Promise<RowOf<T>>;
}

export function createReadRepository<T extends IdWorkspaceTableName>(
  gateway: WorkspaceDataGateway,
  scope: WorkspaceScope,
  table: T,
): ReadRepository<T> {
  return Object.freeze({
    list: (request?: ListRequest<T>) => gateway.list(table, scope, request),
    getById: (id: string) => gateway.getById(table, scope, id),
  });
}

export function createAppendOnlyRepository<T extends IdWorkspaceTableName & InsertableWorkspaceTableName>(
  gateway: WorkspaceDataGateway,
  scope: WorkspaceScope,
  table: T,
): AppendOnlyRepository<T> {
  return Object.freeze({
    ...createReadRepository(gateway, scope, table),
    create: (values: Omit<InsertOf<T>, 'workspace_id'>) => gateway.insert(table, scope, values),
  });
}

export function createMutableRepository<T extends IdWorkspaceTableName & InsertableWorkspaceTableName & UpdatableWorkspaceTableName>(
  gateway: WorkspaceDataGateway,
  scope: WorkspaceScope,
  table: T,
): MutableRepository<T> {
  return Object.freeze({
    ...createAppendOnlyRepository(gateway, scope, table),
    update: (id: string, patch: Omit<UpdateOf<T>, 'workspace_id' | 'id'>) => gateway.updateById(table, scope, id, patch),
  });
}
