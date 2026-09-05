import { useCallback, useEffect, useState } from 'react';
import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import {
  buildR2FindAnythingResults,
  type R2FindAnythingResult,
} from './find-anything-model.ts';

export type R2WorkspaceSearchRecord = Readonly<{
  key: string;
  kind: 'transaction';
  label: string;
  secondary: string;
  destinationId: 'transactions.detail';
  transactionId: string;
  terms: readonly string[];
}>;

export type R2ConnectedFindResult = Omit<R2FindAnythingResult, 'source'> & Readonly<{
  source: 'navigation' | 'workspace-record';
}>;

export type R2ConnectedSearchState = Readonly<{
  status: 'idle' | 'loading' | 'ready' | 'error';
  records: readonly R2WorkspaceSearchRecord[];
  errorMessage: string | null;
  retry: () => void;
}>;

function companyLabel(company: Readonly<{ display_name?: string | null; legal_name?: string | null }> | undefined): string {
  return company?.display_name?.trim() || company?.legal_name?.trim() || 'شركة غير متاحة';
}

export async function loadR2WorkspaceSearchRecords(
  factory: EnjazDataLayerFactory,
  userId: string,
): Promise<readonly R2WorkspaceSearchRecord[]> {
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) return Object.freeze([]);

  const data = factory.forWorkspace(workspaceId);
  const [transactionPage, companyPage] = await Promise.all([
    data.transactions.list({
      filters: [{ column: 'deleted_at', operator: 'is', value: null }],
      orderBy: [{ column: 'last_activity_at', ascending: false, nullsFirst: false }],
      offset: 0,
      limit: 80,
    }),
    data.companies.list({
      filters: [{ column: 'deleted_at', operator: 'is', value: null }],
      orderBy: [{ column: 'updated_at', ascending: false, nullsFirst: false }],
      offset: 0,
      limit: 100,
    }),
  ]);

  const companies = new Map(companyPage.items.map((company) => [company.id, company]));
  return Object.freeze(transactionPage.items
    .filter((transaction) => !transaction.deleted_at)
    .slice(0, 80)
    .map((transaction) => {
      const owner = companyLabel(companies.get(transaction.company_id));
      const shortId = transaction.legacy_id || transaction.id.slice(0, 8);
      return Object.freeze({
        key: `transaction:${transaction.id}`,
        kind: 'transaction' as const,
        label: `#${shortId} · ${transaction.type}`,
        secondary: `${owner} · ${transaction.department || 'جهة غير محددة'} · بيانات مساحة العمل`,
        destinationId: 'transactions.detail' as const,
        transactionId: transaction.id,
        terms: Object.freeze([shortId, transaction.id, transaction.type, transaction.department || '', owner]),
      });
    }));
}

export function buildR2ConnectedFindAnythingResults(
  rawQuery: string,
  records: readonly R2WorkspaceSearchRecord[],
  limit = 12,
): readonly R2ConnectedFindResult[] {
  return buildR2FindAnythingResults(rawQuery, { records, limit }).map((result) => Object.freeze({
    ...result,
    source: result.kind === 'transaction' ? 'workspace-record' as const : 'navigation' as const,
  }));
}

export function useR2ConnectedSearchRecords(): R2ConnectedSearchState {
  const factory = useDataLayerFactory();
  const userId = useCurrentUserId();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Readonly<{
    status: 'idle' | 'loading' | 'ready' | 'error';
    records: readonly R2WorkspaceSearchRecord[];
    errorMessage: string | null;
  }>>({ status: userId ? 'loading' : 'idle', records: Object.freeze([]), errorMessage: null });

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setState({ status: 'idle', records: Object.freeze([]), errorMessage: null });
      return () => { cancelled = true; };
    }

    setState((current) => ({ ...current, status: 'loading', errorMessage: null }));
    void loadR2WorkspaceSearchRecords(factory, userId)
      .then((records) => {
        if (!cancelled) setState({ status: 'ready', records, errorMessage: null });
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        const candidate = reason as Readonly<{ userMessage?: unknown; message?: unknown }>;
        const errorMessage = typeof candidate.userMessage === 'string'
          ? candidate.userMessage
          : typeof candidate.message === 'string'
            ? candidate.message
            : 'تعذر تحميل سجلات البحث من مساحة العمل.';
        setState({ status: 'error', records: Object.freeze([]), errorMessage });
      });

    return () => { cancelled = true; };
  }, [factory, userId, attempt]);

  return Object.freeze({ ...state, retry });
}
