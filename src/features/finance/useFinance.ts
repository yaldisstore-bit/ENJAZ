import { useEffect, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { buildFinanceLedgerSnapshot, FinanceUnsafeMoneyError, type FinanceLedgerSnapshot } from './financeModel.ts';
import {
  FinanceSourceCapacityError,
  FinanceSourcePageStalledError,
  FinanceWorkspaceUnavailableError,
  loadFinanceSource,
} from './financeService.ts';

export type FinanceLoadState = 'loading' | 'ready' | 'error';

function financeErrorMessage(error: unknown): string {
  if (error instanceof FinanceWorkspaceUnavailableError) return 'مساحة العمل المالية غير متاحة.';
  if (error instanceof FinanceSourceCapacityError) return `تجاوز مصدر ${error.sourceName} حد القراءة الآمن.`;
  if (error instanceof FinanceSourcePageStalledError) return `توقفت قراءة مصدر ${error.sourceName} قبل الاكتمال.`;
  if (error instanceof FinanceUnsafeMoneyError) return 'توجد قيمة مالية لا يمكن تمثيلها بأمان. أوقفنا الملخص بدل عرض مجموع غير موثوق.';
  if (error instanceof DataAccessError) {
    if (error.dataCode === 'DATA_FORBIDDEN') return 'لا توجد صلاحية لقراءة البيانات المالية.';
    if (error.dataCode === 'DATA_UNAVAILABLE') return 'تعذر تحميل المصادر المالية.';
    if (error.dataCode === 'DATA_VALIDATION_FAILED') return 'رفض مصدر البيانات طلب القراءة المالية.';
  }
  return 'تعذر تحميل الدفتر المالي.';
}

export interface FinanceLedgerController {
  readonly status: FinanceLoadState;
  readonly snapshot: FinanceLedgerSnapshot | null;
  readonly errorMessage: string | null;
  readonly retry: () => void;
}

export function useFinanceLedger(): FinanceLedgerController {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<FinanceLoadState>('loading');
  const [snapshot, setSnapshot] = useState<FinanceLedgerSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setStatus('error');
      setSnapshot(null);
      setErrorMessage('انتهت الجلسة.');
      return () => { active = false; };
    }

    setStatus('loading');
    setSnapshot(null);
    setErrorMessage(null);
    void loadFinanceSource(factory, userId)
      .then(({ source }) => buildFinanceLedgerSnapshot(source))
      .then((nextSnapshot) => {
        if (!active) return;
        setSnapshot(nextSnapshot);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSnapshot(null);
        setStatus('error');
        setErrorMessage(financeErrorMessage(error));
      });

    return () => { active = false; };
  }, [attempt, factory, userId]);

  return Object.freeze({
    status,
    snapshot,
    errorMessage,
    retry() { setAttempt((value) => value + 1); },
  });
}
