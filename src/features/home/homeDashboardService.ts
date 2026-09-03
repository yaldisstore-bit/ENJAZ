import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { IdWorkspaceTableName, ListRequest, RowOf } from '../../data/contracts/dataTypes.ts';
import type { ReadRepository } from '../../data/repositories/createEntityRepository.ts';
import {
  buildHomeDashboardSnapshot,
  enrichHomePriorityCompanies,
  type HomeDashboardSnapshot,
  type HomeDashboardSource,
} from './homeDashboardModel.ts';

const HOME_PAGE_SIZE = 100;

export class HomeWorkspaceUnavailableError extends Error {
  constructor() {
    super('No ENJAZ workspace is available for the authenticated user');
    this.name = 'HomeWorkspaceUnavailableError';
  }
}

async function collectAll<T extends IdWorkspaceTableName>(
  repository: ReadRepository<T>,
  request: Omit<ListRequest<T>, 'offset' | 'limit'> = {},
): Promise<readonly RowOf<T>[]> {
  const rows: RowOf<T>[] = [];
  let offset = 0;

  for (;;) {
    const page = await repository.list({ ...request, offset, limit: HOME_PAGE_SIZE });
    rows.push(...page.items);
    if (!page.hasMore) return Object.freeze(rows);
    if (page.items.length === 0) throw new Error('Non-progressing dashboard data page');
    offset += page.items.length;
  }
}

async function loadSource(layer: EnjazWorkspaceDataLayer): Promise<HomeDashboardSource> {
  const [transactions, followups, blockers, payments] = await Promise.all([
    collectAll(layer.transactions, {
      filters: [
        { column: 'archived_at', operator: 'is', value: null },
        { column: 'deleted_at', operator: 'is', value: null },
        { column: 'status', operator: 'neq', value: 'completed' },
      ],
      orderBy: [{ column: 'last_activity_at', ascending: false }],
    }),
    collectAll(layer.followups, {
      filters: [{ column: 'status', operator: 'eq', value: 'open' }],
      orderBy: [{ column: 'due_at', ascending: true }],
    }),
    collectAll(layer.blockers, {
      filters: [{ column: 'status', operator: 'eq', value: 'open' }],
      orderBy: [{ column: 'opened_at', ascending: false }],
    }),
    collectAll(layer.payments, {
      filters: [{ column: 'status', operator: 'eq', value: 'posted' }],
      orderBy: [{ column: 'paid_at', ascending: false }],
    }),
  ]);

  return Object.freeze({ transactions, followups, blockers, payments });
}

async function enrichCompanyLabels(
  layer: EnjazWorkspaceDataLayer,
  snapshot: HomeDashboardSnapshot,
): Promise<HomeDashboardSnapshot> {
  const companyIds = [...new Set(snapshot.priorities.map((priority) => priority.companyId))];
  if (!companyIds.length) return snapshot;

  const companies = await Promise.all(companyIds.map((id) => layer.companies.getById(id)));
  const companyNames = new Map<string, string>();
  for (const company of companies) {
    if (!company || company.deleted_at !== null) continue;
    companyNames.set(company.id, company.display_name?.trim() || company.legal_name);
  }
  return enrichHomePriorityCompanies(snapshot, companyNames);
}

export async function loadHomeDashboard(
  factory: EnjazDataLayerFactory,
  userId: string,
  now: Date = new Date(),
): Promise<Readonly<{ workspaceId: string; snapshot: HomeDashboardSnapshot }>> {
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new HomeWorkspaceUnavailableError();

  const layer = factory.forWorkspace(workspaceId);
  const source = await loadSource(layer);
  const snapshot = buildHomeDashboardSnapshot(source, now);
  const enriched = await enrichCompanyLabels(layer, snapshot);
  return Object.freeze({ workspaceId, snapshot: enriched });
}
