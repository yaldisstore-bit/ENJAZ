import { useEffect, useMemo, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { buildTransaction360Snapshot, type Transaction360Snapshot, type Transaction360Source } from './transaction360Model.ts';
import {
  loadTransaction360Source,
  Transaction360CoreLoadError,
  Transaction360DeletedError,
  Transaction360NotFoundError,
  Transaction360WorkspaceUnavailableError,
} from './transaction360Service.ts';

export type Transaction360LoadState = 'loading' | 'ready' | 'error';

export interface Transaction360Controller {
  readonly status: Transaction360LoadState;
  readonly snapshot: Transaction360Snapshot | null;
  readonly errorMessage: string | null;
  readonly retry: () => void;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Transaction360WorkspaceUnavailableError) return 'تعذر العثور على مساحة العمل المرتبطة بحسابك.';
  if (error instanceof Transaction360NotFoundError) return 'لم تعد هذه المعاملة متاحة في مساحة العمل الحالية.';
  if (error instanceof Transaction360DeletedError) return 'المعاملة محذوفة ولا يمكن عرضها في 360° ضمن Phase 5.3.';
  if (error instanceof Transaction360CoreLoadError) return 'تعذر تحميل السياق الأساسي للمعاملة. لم يتم عرض 360° جزئية على أنها كاملة.';
  if (error instanceof DataAccessError) {
    if (error.dataCode === 'DATA_FORBIDDEN') return 'ليس لديك صلاحية لقراءة تفاصيل هذه المعاملة.';
    if (error.dataCode === 'DATA_UNAVAILABLE') return 'تعذر الوصول إلى بيانات المعاملة الآن. تحقق من الاتصال ثم أعد المحاولة.';
  }
  return 'حدث خطأ غير متوقع أثناء تجهيز عرض المعاملة 360°.';
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
      setSource(null);
      setStatus('error');
      setErrorMessage('انتهت جلسة المستخدم. سجّل الدخول مرة أخرى.');
      return () => { active = false; };
    }
    setStatus('loading');
    setErrorMessage(null);
    void loadTransaction360Source(factory, userId, transactionId)
      .then(({ source: nextSource }) => {
        if (!active) return;
        setSource(nextSource);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSource(null);
        setStatus('error');
        setErrorMessage(toErrorMessage(error));
      });
    return () => { active = false; };
  }, [attempt, factory, transactionId, userId]);

  const snapshot = useMemo(() => source ? buildTransaction360Snapshot(source) : null, [source]);
  return Object.freeze({ status, snapshot, errorMessage, retry() { setAttempt((value) => value + 1); } });
}
