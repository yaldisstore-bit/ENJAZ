import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import type { ListRequest, RowOf } from '../../data/contracts/dataTypes.ts';
import type { ReadRepository } from '../../data/repositories/createEntityRepository.ts';
import { loadDailyWork } from '../daily-work/dailyWorkService.ts';
import { loadHomeDashboard } from '../home/homeDashboardService.ts';
import { buildExecutiveBriefingSnapshot, type ExecutiveBriefingSnapshot } from './executiveBriefingModel.ts';

const EXECUTIVE_PAGE_SIZE = 100;

async function collectAllPayments(
  repository: ReadRepository<'payments'>,
  request: Omit<ListRequest<'payments'>, 'offset' | 'limit'>,
): Promise<readonly RowOf<'payments'>[]> {
  const rows: RowOf<'payments'>[] = [];
  let offset = 0;
  for (;;) {
    const page = await repository.list({ ...request, offset, limit: EXECUTIVE_PAGE_SIZE });
    rows.push(...page.items);
    if (!page.hasMore) return Object.freeze(rows);
    if (page.items.length === 0) throw new Error('Non-progressing executive briefing payment page');
    offset += page.items.length;
  }
}

export class ExecutiveBriefingWorkspaceMismatchError extends Error {
  constructor() {
    super('Executive briefing sources resolved to different workspaces');
    this.name = 'ExecutiveBriefingWorkspaceMismatchError';
  }
}

export async function loadExecutiveBriefing(
  factory: EnjazDataLayerFactory,
  userId: string,
  now: Date = new Date(),
): Promise<Readonly<{ workspaceId: string; snapshot: ExecutiveBriefingSnapshot }>> {
  const [homeResult, dailyResult] = await Promise.all([
    loadHomeDashboard(factory, userId, now),
    loadDailyWork(factory, userId, now),
  ]);

  if (homeResult.workspaceId !== dailyResult.workspaceId) throw new ExecutiveBriefingWorkspaceMismatchError();

  const layer = factory.forWorkspace(homeResult.workspaceId);
  const previousWindowStart = new Date(now.getTime() - (14 * 86_400_000)).toISOString();
  const payments = await collectAllPayments(layer.payments, {
    filters: [
      { column: 'status', operator: 'eq', value: 'posted' },
      { column: 'paid_at', operator: 'gte', value: previousWindowStart },
    ],
    orderBy: [{ column: 'paid_at', ascending: false }],
  });

  return Object.freeze({
    workspaceId: homeResult.workspaceId,
    snapshot: buildExecutiveBriefingSnapshot(homeResult.snapshot, dailyResult.snapshot, payments, now),
  });
}
