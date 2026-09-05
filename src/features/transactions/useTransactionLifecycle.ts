import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import {
  transactionLifecycleCapabilities,
  type TransactionLifecycleAction,
  type TransactionLifecycleCapabilities,
} from './transactionLifecycleModel.ts';
import {
  applyTransactionLifecycleAction,
  loadTransactionLifecycleContext,
  TransactionLifecycleCapacityError,
  TransactionLifecycleConflictError,
  TransactionLifecycleNotFoundError,
  TransactionLifecycleWorkspaceUnavailableError,
  type TransactionLifecycleLoadResult,
  type TransactionLifecycleWarning,
} from './transactionLifecycleService.ts';

export type TransactionLifecycleControllerState = 'loading' | 'ready' | 'mutating' | 'error';

export interface TransactionLifecycleController {
  readonly status: TransactionLifecycleControllerState;
  readonly context: TransactionLifecycleLoadResult | null;
  readonly capabilities: TransactionLifecycleCapabilities | null;
  readonly errorMessage: string | null;
  readonly warnings: readonly TransactionLifecycleWarning[];
  readonly retry: () => void;
  readonly execute: (action: TransactionLifecycleAction, note?: string | null) => Promise<boolean>;
}

function lifecycleErrorMessage(error: unknown): string {
  if (error instanceof TransactionLifecycleWorkspaceUnavailableError) return 'تعذر تحديد مساحة العمل.';
  if (error instanceof TransactionLifecycleNotFoundError) return 'المعاملة غير متاحة أو حُذفت.';
  if (error instanceof TransactionLifecycleConflictError) return 'تغيّرت المعاملة منذ فتح إدارة الحالة. أعد التحميل قبل تنفيذ الإجراء.';
  if (error instanceof TransactionLifecycleCapacityError) return 'تعذر التحقق من سياق المتابعات بأمان بسبب حجم غير متوقع.';
  if (error instanceof DataAccessError) {
    if (error.dataCode === 'DATA_FORBIDDEN') return 'لا تملك صلاحية تنفيذ هذا الإجراء.';
    if (error.dataCode === 'DATA_OUTCOME_UNKNOWN') return 'نتيجة الإجراء غير مؤكدة. أعد تحميل المعاملة قبل التكرار.';
    return 'تعذر الوصول إلى بيانات المعاملة.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'تعذر تنفيذ تغيير دورة حياة المعاملة.';
}

export function useTransactionLifecycle(transactionId: string): TransactionLifecycleController {
  const factory = useDataLayerFactory();
  const userId = useCurrentUserId();
  const [attempt, setAttempt] = useState(0);
  const [context, setContext] = useState<TransactionLifecycleLoadResult | null>(null);
  const [status, setStatus] = useState<TransactionLifecycleControllerState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<readonly TransactionLifecycleWarning[]>(Object.freeze([]));

  useEffect(() => {
    let active = true;
    setWarnings(Object.freeze([]));
    if (!userId) {
      setContext(null);
      setStatus('error');
      setErrorMessage('انتهت الجلسة. سجّل الدخول مجددًا.');
      return () => { active = false; };
    }

    setStatus('loading');
    setErrorMessage(null);
    void loadTransactionLifecycleContext(factory, userId, transactionId).then((next) => {
      if (!active) return;
      setContext(next);
      setStatus('ready');
    }).catch((error: unknown) => {
      if (!active) return;
      setContext(null);
      setStatus('error');
      setErrorMessage(lifecycleErrorMessage(error));
    });

    return () => { active = false; };
  }, [attempt, factory, transactionId, userId]);

  const execute = useCallback(async (action: TransactionLifecycleAction, note?: string | null): Promise<boolean> => {
    if (!userId || !context || status === 'mutating') return false;
    setStatus('mutating');
    setErrorMessage(null);
    setWarnings(Object.freeze([]));
    try {
      const result = await applyTransactionLifecycleAction(factory, userId, context, action, userId, note);
      setContext(Object.freeze({
        workspaceId: context.workspaceId,
        transaction: result.transaction,
        openFollowupCount: result.preservedOpenFollowupCount,
      }));
      setWarnings(result.warnings);
      setStatus('ready');
      return true;
    } catch (error: unknown) {
      setStatus('error');
      setErrorMessage(lifecycleErrorMessage(error));
      return false;
    }
  }, [context, factory, status, userId]);

  const capabilities = useMemo(
    () => context ? transactionLifecycleCapabilities(context.transaction) : null,
    [context],
  );

  return Object.freeze({
    status,
    context,
    capabilities,
    errorMessage,
    warnings,
    retry: () => setAttempt((value) => value + 1),
    execute,
  });
}
