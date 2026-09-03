import type {
  DataPage, IdWorkspaceTableName, InsertableWorkspaceTableName, InsertOf, ListRequest, RowOf,
  UpdateOf, UpdatableWorkspaceTableName, WorkspaceScope, WorkspaceTableName,
} from '../contracts/dataTypes.ts';

export interface WorkspaceDataGateway {
  resolveWorkspaceIdForUser(userId: string): Promise<string | null>;
  list<T extends WorkspaceTableName>(table: T, scope: WorkspaceScope, request?: ListRequest<T>): Promise<DataPage<RowOf<T>>>;
  getById<T extends IdWorkspaceTableName>(table: T, scope: WorkspaceScope, id: string): Promise<RowOf<T> | null>;
  insert<T extends InsertableWorkspaceTableName>(table: T, scope: WorkspaceScope, values: Omit<InsertOf<T>, 'workspace_id'>): Promise<RowOf<T>>;
  updateById<T extends UpdatableWorkspaceTableName & IdWorkspaceTableName>(table: T, scope: WorkspaceScope, id: string, patch: Omit<UpdateOf<T>, 'workspace_id' | 'id'>): Promise<RowOf<T>>;
}
