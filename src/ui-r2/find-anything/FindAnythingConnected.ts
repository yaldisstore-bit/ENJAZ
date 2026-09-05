import { useCallback, useEffect, useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import {
  loadR2WorkspaceSearchRecords,
  type R2WorkspaceSearchRecord,
} from './find-anything-connected-model.ts';

export {
  buildR2ConnectedFindAnythingResults,
  loadR2WorkspaceSearchRecords,
  type R2ConnectedFindResult,
  type R2WorkspaceSearchRecord,
} from './find-anything-connected-model.ts';

export type R2ConnectedSearchState = Readonly<{
  status: 'idle' | 'loading' | 'ready' | 'error';
  records: readonly R2WorkspaceSearchRecord[];
  errorMessage: string | null;
  retry: () => void;
}>;

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
