import {
  TRANSACTION_SAVED_VIEW_SCHEMA,
  createTransactionSavedViewDefinition,
  parseTransactionSavedViewDefinition,
  type TransactionSavedViewDefinition,
} from '../transactions/transactionListModel.ts';

export const ENJAZ_SAVED_VIEW_SCHEMA = 'enjaz.saved-view.v1' as const;
export const ENJAZ_GLOBAL_SEARCH_RESULT_SCHEMA = 'enjaz.global-search-result.v1' as const;
export const SAVED_VIEW_NAME_MAX_LENGTH = 80;
export const SAVED_VIEW_QUERY_MAX_LENGTH = 120;

export type SavedViewDomain = 'transactions' | 'companies' | 'people' | 'procedures' | 'documents';
export type SavedViewVisibility = 'personal' | 'team' | 'workspace';
export type GlobalSearchDomain = SavedViewDomain;

export interface EnjazSavedViewDefinition {
  readonly schema: typeof ENJAZ_SAVED_VIEW_SCHEMA;
  readonly domain: SavedViewDomain;
  readonly query: string;
  readonly filters: Readonly<Record<string, string | number | boolean | null>>;
  readonly sort: string | null;
  readonly dateRange: Readonly<{ from: string | null; to: string | null }>;
  readonly pageSize: number | null;
  readonly sourceSchema: string | null;
}

export interface EnjazSavedViewDraft {
  readonly name: string;
  readonly visibility: SavedViewVisibility;
  readonly definition: EnjazSavedViewDefinition;
}

export interface GlobalSearchResultReference {
  readonly schema: typeof ENJAZ_GLOBAL_SEARCH_RESULT_SCHEMA;
  readonly domain: GlobalSearchDomain;
  readonly entityId: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly destination: string;
}

const DOMAINS: readonly SavedViewDomain[] = ['transactions', 'companies', 'people', 'procedures', 'documents'];
const VISIBILITIES: readonly SavedViewVisibility[] = ['personal', 'team', 'workspace'];
const FILTER_VALUE_TYPES = new Set(['string', 'number', 'boolean']);

function normalizeText(value: string, max: number): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z)?$/.test(normalized)) return null;
  return Number.isFinite(Date.parse(normalized)) ? normalized : null;
}

function normalizeFilters(value: unknown): Readonly<Record<string, string | number | boolean | null>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: Record<string, string | number | boolean | null> = {};
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 24) return null;
  for (const [rawKey, rawValue] of entries) {
    const key = rawKey.trim();
    if (!/^[a-z][a-z0-9_.-]{0,63}$/i.test(key)) return null;
    if (rawValue === null) out[key] = null;
    else if (FILTER_VALUE_TYPES.has(typeof rawValue)) {
      if (typeof rawValue === 'number' && !Number.isFinite(rawValue)) return null;
      out[key] = typeof rawValue === 'string' ? normalizeText(rawValue, 120) : rawValue as number | boolean;
    } else return null;
  }
  return Object.freeze(out);
}

export function createEnjazSavedViewDefinition(input: {
  domain: SavedViewDomain;
  query?: string;
  filters?: Readonly<Record<string, string | number | boolean | null>>;
  sort?: string | null;
  dateRange?: Readonly<{ from?: string | null; to?: string | null }>;
  pageSize?: number | null;
  sourceSchema?: string | null;
}): EnjazSavedViewDefinition {
  const filters = normalizeFilters(input.filters ?? {});
  if (!filters) throw new TypeError('Invalid saved-view filters');
  const from = normalizeIsoDate(input.dateRange?.from ?? null);
  const to = normalizeIsoDate(input.dateRange?.to ?? null);
  if (input.dateRange?.from && !from) throw new TypeError('Invalid saved-view from date');
  if (input.dateRange?.to && !to) throw new TypeError('Invalid saved-view to date');
  if (from && to && Date.parse(from) > Date.parse(to)) throw new TypeError('Invalid saved-view date range');
  const requestedPageSize = input.pageSize ?? null;
  if (requestedPageSize !== null && (!Number.isSafeInteger(requestedPageSize) || requestedPageSize < 1 || requestedPageSize > 100)) {
    throw new TypeError('Invalid saved-view page size');
  }
  return Object.freeze({
    schema: ENJAZ_SAVED_VIEW_SCHEMA,
    domain: input.domain,
    query: normalizeText(input.query ?? '', SAVED_VIEW_QUERY_MAX_LENGTH),
    filters,
    sort: input.sort ? normalizeText(input.sort, 64) || null : null,
    dateRange: Object.freeze({ from, to }),
    pageSize: requestedPageSize,
    sourceSchema: input.sourceSchema ? normalizeText(input.sourceSchema, 96) || null : null,
  });
}

export function parseEnjazSavedViewDefinition(value: unknown): EnjazSavedViewDefinition | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schema !== ENJAZ_SAVED_VIEW_SCHEMA || !DOMAINS.includes(record.domain as SavedViewDomain)) return null;
  if (typeof record.query !== 'string' || record.query.length > SAVED_VIEW_QUERY_MAX_LENGTH) return null;
  if (record.sort !== null && typeof record.sort !== 'string') return null;
  if (record.sourceSchema !== null && typeof record.sourceSchema !== 'string') return null;
  if (record.pageSize !== null && (!Number.isSafeInteger(record.pageSize) || Number(record.pageSize) < 1 || Number(record.pageSize) > 100)) return null;
  if (!record.dateRange || typeof record.dateRange !== 'object' || Array.isArray(record.dateRange)) return null;
  try {
    return createEnjazSavedViewDefinition({
      domain: record.domain as SavedViewDomain,
      query: record.query,
      filters: record.filters as Record<string, string | number | boolean | null>,
      sort: record.sort as string | null,
      dateRange: record.dateRange as { from?: string | null; to?: string | null },
      pageSize: record.pageSize as number | null,
      sourceSchema: record.sourceSchema as string | null,
    });
  } catch {
    return null;
  }
}

export function createSavedViewDraft(input: {
  name: string;
  visibility?: SavedViewVisibility;
  definition: EnjazSavedViewDefinition;
}): EnjazSavedViewDraft {
  const name = normalizeText(input.name, SAVED_VIEW_NAME_MAX_LENGTH);
  if (!name) throw new TypeError('Saved-view name is required');
  const visibility = input.visibility ?? 'personal';
  if (!VISIBILITIES.includes(visibility)) throw new TypeError('Invalid saved-view visibility');
  return Object.freeze({ name, visibility, definition: input.definition });
}

export function fromTransactionSavedView(value: TransactionSavedViewDefinition): EnjazSavedViewDefinition {
  const canonical = parseTransactionSavedViewDefinition(value);
  if (!canonical) throw new TypeError('Invalid transaction saved view');
  return createEnjazSavedViewDefinition({
    domain: 'transactions',
    query: canonical.search,
    filters: { view: canonical.view },
    sort: canonical.sort,
    pageSize: canonical.pageSize,
    sourceSchema: TRANSACTION_SAVED_VIEW_SCHEMA,
  });
}

export function toTransactionSavedView(value: EnjazSavedViewDefinition): TransactionSavedViewDefinition | null {
  const canonical = parseEnjazSavedViewDefinition(value);
  if (!canonical || canonical.domain !== 'transactions' || canonical.sourceSchema !== TRANSACTION_SAVED_VIEW_SCHEMA) return null;
  const view = canonical.filters.view;
  if (view !== 'current' && view !== 'stalled' && view !== 'archived') return null;
  return parseTransactionSavedViewDefinition(createTransactionSavedViewDefinition({
    view,
    search: canonical.query,
    sort: canonical.sort as TransactionSavedViewDefinition['sort'],
    pageSize: canonical.pageSize ?? undefined,
  }));
}

export function parseGlobalSearchResultReference(value: unknown): GlobalSearchResultReference | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schema !== ENJAZ_GLOBAL_SEARCH_RESULT_SCHEMA || !DOMAINS.includes(record.domain as GlobalSearchDomain)) return null;
  if (typeof record.entityId !== 'string' || !record.entityId.trim()) return null;
  if (typeof record.title !== 'string' || !record.title.trim()) return null;
  if (record.subtitle !== null && typeof record.subtitle !== 'string') return null;
  if (typeof record.destination !== 'string' || !record.destination.startsWith('/app/')) return null;
  return Object.freeze({
    schema: ENJAZ_GLOBAL_SEARCH_RESULT_SCHEMA,
    domain: record.domain as GlobalSearchDomain,
    entityId: normalizeText(record.entityId, 128),
    title: normalizeText(record.title, 180),
    subtitle: record.subtitle === null ? null : normalizeText(record.subtitle as string, 220) || null,
    destination: normalizeText(record.destination, 320),
  });
}
