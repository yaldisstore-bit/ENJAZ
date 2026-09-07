import { useCallback, useEffect, useRef, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { useGovernmentProcedureCommandGateway } from './GovernmentProcedureCommandContext.tsx';
import type { GovernmentProcedureCatalog, GovernmentProcedureTransition } from './governmentProcedureCommands.ts';
import type { TransactionWorkflowContext } from './governmentProcedureRuntime.ts';

export type GovernmentProcedureWorkflowStatus = 'loading' | 'ready' | 'error' | 'mutating';

export interface GovernmentProcedureWorkflowController {
  readonly status: GovernmentProcedureWorkflowStatus;
  readonly workspaceId: string | null;
  readonly catalog: GovernmentProcedureCatalog | null;
  readonly context: TransactionWorkflowContext | null;
  readonly errorMessage: string | null;
  readonly actionMessage: string | null;
  readonly retry: () => void;
  readonly startProcedure: (procedureId: string, branchId: string | null) => Promise<boolean>;
  readonly completeRequirement: (itemStateId: string) => Promise<boolean>;
  readonly transition: (transition: GovernmentProcedureTransition, reason: string | null) => Promise<boolean>;
}

type PendingStart = { readonly signature: string; readonly key: string };
type PendingTransition = { readonly signature: string; readonly key: string };

function errorMessage(error: unknown): string {
  if (error instanceof DataAccessError) {
    if (error.dataCode === 'DATA_OUTCOME_UNKNOWN') return 'تعذر تأكيد نتيجة العملية. أعد المحاولة نفسها؛ سيُستخدم مفتاح العملية ذاته ولن تُكرر الحركة.';
    if (error.dataCode === 'DATA_CONFLICT') return 'تغيّرت حالة الإجراء أو استُخدم مفتاح العملية مع بيانات مختلفة. أعد تحميل السياق.';
    if (error.dataCode === 'DATA_FORBIDDEN') return 'لا تملك صلاحية تنفيذ هذا الإجراء.';
    if (error.dataCode === 'DATA_VALIDATION_FAILED') return 'بيانات الإجراء غير صالحة.';
  }
  return 'تعذر تنفيذ الإجراء الحكومي. لم تُفترض نتيجة غير مؤكدة.';
}

export function useGovernmentProcedureWorkflow(transactionId: string): GovernmentProcedureWorkflowController {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const gateway = useGovernmentProcedureCommandGateway();
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<GovernmentProcedureWorkflowStatus>('loading');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<GovernmentProcedureCatalog | null>(null);
  const [context, setContext] = useState<TransactionWorkflowContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const startAttempt = useRef<PendingStart | null>(null);
  const transitionAttempt = useRef<PendingTransition | null>(null);

  const reload = useCallback(async (resolvedWorkspaceId: string) => {
    const [nextCatalog, nextContext] = await Promise.all([
      gateway.loadCatalog(resolvedWorkspaceId),
      gateway.loadTransactionContext(resolvedWorkspaceId, transactionId),
    ]);
    setCatalog(nextCatalog);
    setContext(nextContext);
  }, [gateway, transactionId]);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setStatus('error'); setWorkspaceId(null); setCatalog(null); setContext(null); setError('انتهت الجلسة. سجّل الدخول مجددًا.');
      return () => { active = false; };
    }
    setStatus('loading'); setError(null); setActionMessage(null);
    void factory.resolveWorkspaceId(userId).then(async (resolved) => {
      if (!resolved) throw new Error('workspace unavailable');
      const [nextCatalog, nextContext] = await Promise.all([gateway.loadCatalog(resolved), gateway.loadTransactionContext(resolved, transactionId)]);
      if (!active) return;
      setWorkspaceId(resolved); setCatalog(nextCatalog); setContext(nextContext); setStatus('ready');
    }).catch((loadError: unknown) => {
      if (!active) return;
      setWorkspaceId(null); setCatalog(null); setContext(null); setStatus('error'); setError(errorMessage(loadError));
    });
    return () => { active = false; };
  }, [attempt, factory, gateway, transactionId, userId]);

  const refreshAfterMutation = useCallback(async (resolvedWorkspaceId: string, message: string) => {
    await reload(resolvedWorkspaceId);
    setStatus('ready'); setError(null); setActionMessage(message);
  }, [reload]);

  const startProcedure = useCallback(async (procedureId: string, branchId: string | null) => {
    if (!workspaceId) return false;
    const signature = `${transactionId}:${procedureId}:${branchId ?? '-'}`;
    const previous = startAttempt.current;
    const key = previous?.signature === signature ? previous.key : crypto.randomUUID();
    startAttempt.current = { signature, key };
    setStatus('mutating'); setError(null); setActionMessage(null);
    try {
      await gateway.startProcedure({ workspaceId, transactionId, procedureId, branchId, idempotencyKey: key });
      startAttempt.current = null;
      await refreshAfterMutation(workspaceId, 'تم بدء الإجراء الحكومي وتثبيت Snapshot المراحل والمتطلبات.');
      return true;
    } catch (actionError) {
      if (!(actionError instanceof DataAccessError) || actionError.dataCode !== 'DATA_OUTCOME_UNKNOWN') startAttempt.current = null;
      setStatus('ready'); setError(errorMessage(actionError));
      return false;
    }
  }, [gateway, refreshAfterMutation, transactionId, workspaceId]);

  const completeRequirement = useCallback(async (itemStateId: string) => {
    if (!workspaceId) return false;
    setStatus('mutating'); setError(null); setActionMessage(null);
    try {
      await factory.forWorkspace(workspaceId).workflowItemStates.update(itemStateId, { status: 'done', completed_at: new Date().toISOString() });
      await refreshAfterMutation(workspaceId, 'تم تثبيت إنجاز المتطلب في حالة الـWorkflow الكانونية.');
      return true;
    } catch (actionError) {
      setStatus('ready'); setError(errorMessage(actionError));
      return false;
    }
  }, [factory, refreshAfterMutation, workspaceId]);

  const transition = useCallback(async (transitionValue: GovernmentProcedureTransition, reason: string | null) => {
    const instance = context?.instance;
    if (!workspaceId || !instance) return false;
    const normalizedReason = reason?.trim() || null;
    const signature = `${instance.instanceId}:${instance.currentStagePosition}:${transitionValue.key}:${normalizedReason ?? '-'}`;
    const previous = transitionAttempt.current;
    const key = previous?.signature === signature ? previous.key : crypto.randomUUID();
    transitionAttempt.current = { signature, key };
    setStatus('mutating'); setError(null); setActionMessage(null);
    try {
      await gateway.transition({
        workspaceId,
        instanceId: instance.instanceId,
        transitionKey: transitionValue.key,
        expectedStagePosition: instance.currentStagePosition,
        reason: normalizedReason,
        idempotencyKey: key,
      });
      transitionAttempt.current = null;
      await refreshAfterMutation(workspaceId, transitionValue.kind === 'complete' ? 'تم إكمال الإجراء وتثبيت الحدث في سجل الانتقالات.' : transitionValue.kind === 'reopen' ? 'تمت إعادة فتح المرحلة مع حفظ السبب في السجل.' : 'تم الانتقال إلى المرحلة التالية وتحديث السياق من المصدر الموثوق.');
      return true;
    } catch (actionError) {
      if (!(actionError instanceof DataAccessError) || actionError.dataCode !== 'DATA_OUTCOME_UNKNOWN') transitionAttempt.current = null;
      setStatus('ready'); setError(errorMessage(actionError));
      return false;
    }
  }, [context?.instance, gateway, refreshAfterMutation, workspaceId]);

  return Object.freeze({
    status,
    workspaceId,
    catalog,
    context,
    errorMessage: error,
    actionMessage,
    retry: () => setAttempt((value) => value + 1),
    startProcedure,
    completeRequirement,
    transition,
  });
}
