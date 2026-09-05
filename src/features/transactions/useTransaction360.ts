import { useEffect, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { buildTransaction360Snapshot, type Transaction360Snapshot, type Transaction360Source } from './transaction360Model.ts';
import { loadTransaction360Source, Transaction360CoreLoadError, Transaction360DeletedError, Transaction360NotFoundError, Transaction360WorkspaceUnavailableError } from './transaction360Service.ts';

export type Transaction360LoadState = 'loading' | 'ready' | 'error';
export interface Transaction360Controller {
  readonly status: Transaction360LoadState;
  readonly snapshot: Transaction360Snapshot | null;
  readonly errorMessage: string | null;
  readonly retry: () => void;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Transaction360WorkspaceUnavailableError) return 'تعذر تحديد مساحة العمل.';
  if (error instanceof Transaction360NotFoundError) return 'المعاملة غير متاحة.';
  if (error instanceof Transaction360DeletedError) return 'المعاملة محذوفة ولا يمكن عرضها.';
  if (error instanceof Transaction360CoreLoadError) return 'تعذر تحميل بيانات المعاملة كاملة.';
  if (error instanceof DataAccessError) {
    if (error.dataCode === 'DATA_FORBIDDEN') return 'لا تملك صلاحية عرض هذه المعاملة.';
    if (error.dataCode === 'DATA_UNAVAILABLE') return 'تعذر الوصول للبيانات. أعد المحاولة.';
  }
  return 'تعذر تجهيز عرض 360°.';
}

export function useTransaction360(transactionId: string): Transaction360Controller {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<Transaction360Source | null>(null);
  const [status, setStatus] = useState<Transaction360LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setSource(null); setStatus('error'); setErrorMessage('انتهت الجلسة. سجّل الدخول مجددًا.');
      return () => { active = false; };
    }
    setStatus('loading'); setErrorMessage(null);
    void loadTransaction360Source(factory, userId, transactionId).then(({ source: nextSource }) => {
      if (!active) return;
      setSource(nextSource); setStatus('ready');
    }).catch((error: unknown) => {
      if (!active) return;
      setSource(null); setStatus('error'); setErrorMessage(toErrorMessage(error));
    });
    return () => { active = false; };
  }, [attempt, factory, transactionId, userId]);

  return { status, snapshot: source ? buildTransaction360Snapshot(source) : null, errorMessage, retry: () => setAttempt((value) => value + 1) };
}
