import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { IdWorkspaceTableName, ListRequest, RowOf } from '../../data/contracts/dataTypes.ts';
import type { ReadRepository } from '../../data/repositories/createEntityRepository.ts';
import { buildDailyWorkSnapshot, type DailyWorkItem, type DailyWorkSnapshot, type DailyWorkSource } from './dailyWorkModel.ts';

const DAILY_WORK_PAGE_SIZE = 100;

export class DailyWorkWorkspaceUnavailableError extends Error {
  constructor() {
    super('No ENJAZ workspace is available for the authenticated user');
    this.name = 'DailyWorkWorkspaceUnavailableError';
  }
}

export class DailyWorkActionUnavailableError extends Error {
  constructor(source: DailyWorkItem['source']) {
    super(`Daily work item source cannot be completed directly: ${source}`);
    this.name = 'DailyWorkActionUnavailableError';
  }
}

async function collectAll<T extends IdWorkspaceTableName>(
  repository: ReadRepository<T>,
  request: Omit<ListRequest<T>, 'offset' | 'limit'> = {},
): Promise<readonly RowOf<T>[]> {
  const rows: RowOf<T>[] = [];
  let offset = 0;
  for (;;) {
    const page = await repository.list({ ...request, offset, limit: DAILY_WORK_PAGE_SIZE });
    rows.push(...page.items);
    if (!page.hasMore) return Object.freeze(rows);
    if (page.items.length === 0) throw new Error('Non-progressing daily work data page');
    offset += page.items.length;
  }
}

async function resolveLayer(factory: EnjazDataLayerFactory, userId: string): Promise<Readonly<{ workspaceId: string; layer: EnjazWorkspaceDataLayer }>> {
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new DailyWorkWorkspaceUnavailableError();
  return Object.freeze({ workspaceId, layer: factory.forWorkspace(workspaceId) });
}

async function loadSource(layer: EnjazWorkspaceDataLayer): Promise<DailyWorkSource> {
  const [transactions, companies, routes, followups, blockers, calendar, renewals, workflowInstances, workflowItemStates] = await Promise.all([
    collectAll(layer.transactions, {
      filters: [
        { column: 'archived_at', operator: 'is', value: null },
        { column: 'deleted_at', operator: 'is', value: null },
        { column: 'status', operator: 'neq', value: 'completed' },
      ],
      orderBy: [{ column: 'last_activity_at', ascending: false }],
    }),
    collectAll(layer.companies, {
      filters: [
        { column: 'deleted_at', operator: 'is', value: null },
        { column: 'status', operator: 'eq', value: 'active' },
      ],
      orderBy: [{ column: 'updated_at', ascending: false }],
    }),
    collectAll(layer.transactionRoutes, {
      orderBy: [{ column: 'occurred_at', ascending: false }],
    }),
    collectAll(layer.followups, {
      filters: [{ column: 'status', operator: 'eq', value: 'open' }],
      orderBy: [{ column: 'due_at', ascending: true }],
    }),
    collectAll(layer.blockers, {
      filters: [{ column: 'status', operator: 'eq', value: 'open' }],
      orderBy: [{ column: 'opened_at', ascending: false }],
    }),
    collectAll(layer.calendar, {
      filters: [{ column: 'status', operator: 'eq', value: 'scheduled' }],
      orderBy: [{ column: 'starts_at', ascending: true }],
    }),
    collectAll(layer.renewals, {
      filters: [{ column: 'status', operator: 'eq', value: 'active' }],
      orderBy: [{ column: 'due_date', ascending: true }],
    }),
    collectAll(layer.workflowInstances, {
      filters: [{ column: 'status', operator: 'eq', value: 'active' }],
      orderBy: [{ column: 'started_at', ascending: true }],
    }),
    collectAll(layer.workflowItemStates, {
      filters: [{ column: 'status', operator: 'eq', value: 'pending' }],
    }),
  ]);

  return Object.freeze({
    transactions,
    companies,
    routes,
    followups,
    blockers,
    calendar,
    renewals,
    workflowInstances,
    workflowItemStates,
  });
}

export async function loadDailyWork(
  factory: EnjazDataLayerFactory,
  userId: string,
  now: Date = new Date(),
): Promise<Readonly<{ workspaceId: string; snapshot: DailyWorkSnapshot }>> {
  const { workspaceId, layer } = await resolveLayer(factory, userId);
  const source = await loadSource(layer);
  return Object.freeze({ workspaceId, snapshot: buildDailyWorkSnapshot(source, now) });
}

export async function completeDailyWorkItem(
  factory: EnjazDataLayerFactory,
  userId: string,
  item: DailyWorkItem,
  now: Date = new Date(),
): Promise<void> {
  const { layer } = await resolveLayer(factory, userId);
  const timestamp = now.toISOString();
  if (item.source === 'followup') {
    await layer.followups.update(item.sourceId, { status: 'completed', completed_at: timestamp, completed_by: userId, snoozed_until: null });
    return;
  }
  if (item.source === 'calendar') {
    await layer.calendar.update(item.sourceId, { status: 'completed' });
    return;
  }
  if (item.source === 'renewal') {
    await layer.renewals.update(item.sourceId, { status: 'completed', last_completed_at: timestamp });
    return;
  }
  if (item.source === 'workflow') {
    await layer.workflowItemStates.update(item.sourceId, { status: 'done', completed_at: timestamp });
    return;
  }
  throw new DailyWorkActionUnavailableError(item.source);
}

export async function snoozeDailyWorkFollowup(
  factory: EnjazDataLayerFactory,
  userId: string,
  item: DailyWorkItem,
  until: Date,
): Promise<void> {
  if (item.source !== 'followup' || !item.snoozable) throw new DailyWorkActionUnavailableError(item.source);
  if (!Number.isFinite(until.getTime()) || until.getTime() <= Date.now()) throw new Error('Daily work snooze must be in the future');
  const { layer } = await resolveLayer(factory, userId);
  await layer.followups.update(item.sourceId, { snoozed_until: until.toISOString() });
}
