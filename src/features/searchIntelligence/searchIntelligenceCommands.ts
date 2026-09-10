import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';
import {
  createSavedViewDraft,
  parseEnjazSavedViewDefinition,
  parseGlobalSearchResultReference,
  type EnjazSavedViewDefinition,
  type GlobalSearchResultReference,
  type SavedViewDomain,
  type SavedViewVisibility,
} from './searchSavedViewContract.ts';

export interface SavedViewRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly ownerUserId: string;
  readonly name: string;
  readonly domain: SavedViewDomain;
  readonly visibility: SavedViewVisibility;
  readonly teamId: string | null;
  readonly definition: EnjazSavedViewDefinition;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SaveSavedViewInput {
  readonly workspaceId: string;
  readonly savedViewId: string | null;
  readonly expectedVersion: number | null;
  readonly operationId: string;
  readonly name: string;
  readonly visibility?: SavedViewVisibility;
  readonly teamId?: string | null;
  readonly definition: EnjazSavedViewDefinition;
}

export interface SavedViewWriteResult {
  readonly savedViewId: string;
  readonly version: number;
  readonly replayed: boolean;
  readonly wasCreated?: boolean;
  readonly deleted?: boolean;
}

export interface SearchIntelligenceGateway {
  listSavedViews(workspaceId: string): Promise<readonly SavedViewRecord[]>;
  saveSavedView(input: SaveSavedViewInput): Promise<SavedViewWriteResult>;
  deleteSavedView(workspaceId: string, savedViewId: string, expectedVersion: number, operationId: string): Promise<SavedViewWriteResult>;
  globalSearch(workspaceId: string, query: string, limitPerDomain?: number): Promise<readonly GlobalSearchResultReference[]>;
}

interface RpcResponse { readonly data: unknown; readonly error: DataFailureLike | null }
interface RpcClientLike { rpc(name: string, args: Readonly<Record<string, unknown>>): PromiseLike<RpcResponse> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_TIMEOUT_MS = 15_000;

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value as Readonly<Record<string, unknown>>;
}
function uuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  return value;
}
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value.trim();
}
function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return Number(value);
}
function nullableUuid(value: unknown, label: string): string | null {
  if (value === null) return null;
  return uuid(value, label);
}
function domain(value: unknown): SavedViewDomain {
  if (value === 'transactions' || value === 'companies' || value === 'people' || value === 'procedures' || value === 'documents') return value;
  throw new DataAccessError('Invalid saved-view domain', 'DATA_OPERATION_FAILED');
}
function visibility(value: unknown): SavedViewVisibility {
  if (value === 'personal' || value === 'team' || value === 'workspace') return value;
  throw new DataAccessError('Invalid saved-view visibility', 'DATA_OPERATION_FAILED');
}
function timestamp(value: unknown, label: string): string {
  const output = text(value, label, 64);
  if (!Number.isFinite(Date.parse(output))) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return output;
}
function parseSavedView(value: unknown): SavedViewRecord {
  const row = record(value, 'saved view');
  const definition = parseEnjazSavedViewDefinition(row.definition);
  if (!definition) throw new DataAccessError('Invalid saved-view definition from server', 'DATA_OPERATION_FAILED');
  const parsedDomain = domain(row.domain);
  if (definition.domain !== parsedDomain) throw new DataAccessError('Saved-view domain drifted', 'DATA_OPERATION_FAILED');
  return Object.freeze({
    id: uuid(row.id, 'saved-view id'),
    workspaceId: uuid(row.workspaceId, 'saved-view workspace id'),
    ownerUserId: uuid(row.ownerUserId, 'saved-view owner id'),
    name: text(row.name, 'saved-view name', 80),
    domain: parsedDomain,
    visibility: visibility(row.visibility),
    teamId: nullableUuid(row.teamId, 'saved-view team id'),
    definition,
    version: integer(row.version, 'saved-view version'),
    createdAt: timestamp(row.createdAt, 'saved-view createdAt'),
    updatedAt: timestamp(row.updatedAt, 'saved-view updatedAt'),
  });
}
function parseWriteResult(value: unknown): SavedViewWriteResult {
  const row = record(value, 'saved-view write result');
  return Object.freeze({
    savedViewId: uuid(row.savedViewId, 'saved-view result id'),
    version: integer(row.version, 'saved-view result version'),
    replayed: row.replayed === true,
    ...(typeof row.wasCreated === 'boolean' ? { wasCreated: row.wasCreated } : {}),
    ...(typeof row.deleted === 'boolean' ? { deleted: row.deleted } : {}),
  });
}
async function settle<T>(operation: PromiseLike<T>, write: boolean, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DataAccessError(write ? 'Saved-view write outcome could not be confirmed' : 'Search intelligence read deadline elapsed', write ? 'DATA_OUTCOME_UNKNOWN' : 'DATA_UNAVAILABLE')), timeoutMs);
  });
  try { return await Promise.race([Promise.resolve(operation), deadline]); }
  catch (error) { throw normalizeThrownDataFailure(error, write ? 'write' : 'read'); }
  finally { if (timer !== undefined) clearTimeout(timer); }
}
async function runRpc(client: RpcClientLike, name: string, args: Readonly<Record<string, unknown>>, write: boolean, timeoutMs: number): Promise<unknown> {
  const response = await settle(client.rpc(name, args), write, timeoutMs);
  if (response.error) throw normalizeDataFailure(response.error);
  return response.data;
}

export function createSearchIntelligenceGateway(client: EnjazSupabaseClient, timeoutMs = DEFAULT_TIMEOUT_MS): SearchIntelligenceGateway {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new Error('Invalid search-intelligence RPC timeout');
  const rpcClient = client as unknown as RpcClientLike;
  return Object.freeze({
    async listSavedViews(workspaceId: string) {
      const data = await runRpc(rpcClient, 'list_saved_views_v1', { p_workspace_id: uuid(workspaceId, 'workspace id') }, false, timeoutMs);
      if (!Array.isArray(data)) throw new DataAccessError('Invalid saved-view list', 'DATA_OPERATION_FAILED');
      return Object.freeze(data.map(parseSavedView));
    },
    async saveSavedView(input: SaveSavedViewInput) {
      const draft = createSavedViewDraft({ name: input.name, visibility: input.visibility ?? 'personal', definition: input.definition });
      const teamId = input.teamId ?? null;
      if (draft.visibility === 'team' ? teamId === null : teamId !== null) throw new DataAccessError('Invalid saved-view sharing target', 'DATA_VALIDATION_FAILED');
      if (input.savedViewId === null ? input.expectedVersion !== null : !Number.isSafeInteger(input.expectedVersion) || (input.expectedVersion ?? 0) < 1) throw new DataAccessError('Invalid saved-view version boundary', 'DATA_VALIDATION_FAILED');
      return parseWriteResult(await runRpc(rpcClient, 'save_saved_view_v1', {
        p_workspace_id: uuid(input.workspaceId, 'workspace id'),
        p_saved_view_id: input.savedViewId === null ? null : uuid(input.savedViewId, 'saved-view id'),
        p_expected_version: input.expectedVersion,
        p_operation_id: uuid(input.operationId, 'operation id'),
        p_name: draft.name,
        p_visibility: draft.visibility,
        p_team_id: teamId === null ? null : uuid(teamId, 'team id'),
        p_definition: draft.definition,
      }, true, timeoutMs));
    },
    async deleteSavedView(workspaceId: string, savedViewId: string, expectedVersion: number, operationId: string) {
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new DataAccessError('Invalid saved-view delete version', 'DATA_VALIDATION_FAILED');
      return parseWriteResult(await runRpc(rpcClient, 'delete_saved_view_v1', {
        p_workspace_id: uuid(workspaceId, 'workspace id'),
        p_saved_view_id: uuid(savedViewId, 'saved-view id'),
        p_expected_version: expectedVersion,
        p_operation_id: uuid(operationId, 'operation id'),
      }, true, timeoutMs));
    },
    async globalSearch(workspaceId: string, query: string, limitPerDomain = 8) {
      const normalized = query.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (normalized.length < 2) return Object.freeze([]);
      if (!Number.isSafeInteger(limitPerDomain) || limitPerDomain < 1 || limitPerDomain > 10) throw new DataAccessError('Invalid global-search limit', 'DATA_VALIDATION_FAILED');
      const data = await runRpc(rpcClient, 'global_search_v1', { p_workspace_id: uuid(workspaceId, 'workspace id'), p_query: normalized, p_limit_per_domain: limitPerDomain }, false, timeoutMs);
      if (!Array.isArray(data)) throw new DataAccessError('Invalid global-search result list', 'DATA_OPERATION_FAILED');
      const parsed = data.map(parseGlobalSearchResultReference);
      if (parsed.some((item) => item === null)) throw new DataAccessError('Global-search result contract drifted', 'DATA_OPERATION_FAILED');
      return Object.freeze(parsed as GlobalSearchResultReference[]);
    },
  });
}
