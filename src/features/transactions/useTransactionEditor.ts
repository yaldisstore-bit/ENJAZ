import { useEffect, useMemo, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import {
  createEmptyTransactionDraft,
  createTransactionEditDraft,
  getRelatedContactIds,
  validateTransactionEditorDraft,
  type TransactionEditorDraft,
  type TransactionEditorErrors,
  type TransactionEditorField,
  type TransactionEditorMode,
  type TransactionEditorSource,
} from './transactionEditorModel.ts';
import {
  loadTransactionEditorSource,
  saveTransactionEditorDraft,
  TransactionEditorCapacityError,
  TransactionEditorConflictError,
  TransactionEditorNotFoundError,
  TransactionEditorWorkspaceUnavailableError,
  type TransactionEditorLoadResult,
  type TransactionEditorWarning,
} from './transactionEditorService.ts';

export type TransactionEditorStatus = 'loading' | 'ready' | 'saving' | 'saved' | 'error';

export interface TransactionEditorController {
  readonly mode: TransactionEditorMode;
  readonly transactionId: string | null;
  readonly status: TransactionEditorStatus;
  readonly source: TransactionEditorSource | null;
  readonly draft: TransactionEditorDraft;
  readonly errors: TransactionEditorErrors;
  readonly errorMessage: string | null;
  readonly warnings: readonly TransactionEditorWarning[];
  readonly savedTransactionId: string | null;
  readonly update: (field: TransactionEditorField, value: string) => void;
  readonly submit: () => Promise<boolean>;
  readonly retry: () => void;
  readonly editAgain: () => void;
}

function toEditorErrorMessage(error: unknown): string {
  if (error instanceof TransactionEditorWorkspaceUnavailableError) return 'تعذر العثور على مساحة العمل المرتبطة بحسابك.';
  if (error instanceof TransactionEditorNotFoundError) return 'المعاملة غير موجودة أو لم تعد متاحة في مساحة العمل.';
  if (error instanceof TransactionEditorConflictError) return 'تغيّرت المعاملة منذ فتح النموذج. أعد تحميل البيانات قبل الحفظ حتى لا تستبدل تعديلًا أحدث.';
  if (error instanceof TransactionEditorCapacityError) return 'حجم بيانات الشركات أو جهات الاتصال أكبر من حد المحرر الآمن الحالي. لم يتم عرض قائمة جزئية.';
  if (error instanceof DataAccessError) {
    if (error.dataCode === 'DATA_FORBIDDEN') return 'ليس لديك صلاحية لتنفيذ هذا التعديل في مساحة العمل الحالية.';
    if (error.dataCode === 'DATA_OUTCOME_UNKNOWN') return 'انتهت مهلة الحفظ قبل تأكيد النتيجة. لا تعِد الإرسال قبل إعادة تحميل المعاملة والتحقق من حالتها.';
    if (error.dataCode === 'DATA_UNAVAILABLE') return 'تعذر الوصول إلى بيانات المعاملة الآن. تحقق من الاتصال ثم أعد المحاولة.';
  }
  return 'حدث خطأ غير متوقع أثناء تجهيز أو حفظ المعاملة.';
}

export function useTransactionEditor(mode: TransactionEditorMode, transactionId: string | null): TransactionEditorController {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<TransactionEditorLoadResult | null>(null);
  const [draft, setDraft] = useState<TransactionEditorDraft>(() => createEmptyTransactionDraft());
  const [status, setStatus] = useState<TransactionEditorStatus>('loading');
  const [errors, setErrors] = useState<TransactionEditorErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<readonly TransactionEditorWarning[]>([]);
  const [savedTransactionId, setSavedTransactionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setErrors({});
    setErrorMessage(null);
    setWarnings([]);
    setSavedTransactionId(null);
    if (!userId) {
      setLoaded(null);
      setStatus('error');
      setErrorMessage('انتهت جلسة المستخدم. سجّل الدخول مرة أخرى.');
      return () => { active = false; };
    }

    void loadTransactionEditorSource(factory, userId, mode === 'edit' ? transactionId : null)
      .then((result) => {
        if (!active) return;
        setLoaded(result);
        setDraft(mode === 'edit' ? createTransactionEditDraft(result.source) : createEmptyTransactionDraft());
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoaded(null);
        setStatus('error');
        setErrorMessage(toEditorErrorMessage(error));
      });

    return () => { active = false; };
  }, [attempt, factory, mode, transactionId, userId]);

  const source = loaded?.source ?? null;

  const controller = useMemo<TransactionEditorController>(() => Object.freeze({
    mode,
    transactionId,
    status,
    source,
    draft,
    errors,
    errorMessage,
    warnings,
    savedTransactionId,
    update(field: TransactionEditorField, value: string) {
      if (status === 'saving') return;
      setDraft((current) => {
        const next = { ...current, [field]: value } as TransactionEditorDraft;
        if (field === 'companyId' && source && current.primaryContactId) {
          if (!getRelatedContactIds(source, value).has(current.primaryContactId)) next.primaryContactId = '';
        }
        if (field === 'status' && value !== 'completed') next.completedAt = '';
        return Object.freeze(next);
      });
      setErrors((current) => {
        if (!(field in current)) return current;
        const next = { ...current };
        delete next[field];
        return Object.freeze(next);
      });
      setErrorMessage(null);
    },
    async submit(): Promise<boolean> {
      if (!loaded || !userId || status === 'saving') return false;
      const nextErrors = validateTransactionEditorDraft(draft, loaded.source, mode);
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        setStatus('ready');
        return false;
      }
      setStatus('saving');
      setErrors({});
      setErrorMessage(null);
      setWarnings([]);
      try {
        const result = await saveTransactionEditorDraft(factory, userId, loaded, mode, draft, userId);
        setWarnings(result.warnings);
        setSavedTransactionId(result.transaction.id);
        setStatus('saved');
        return true;
      } catch (error: unknown) {
        setStatus('error');
        setErrorMessage(toEditorErrorMessage(error));
        return false;
      }
    },
    retry() { setAttempt((value) => value + 1); },
    editAgain() {
      if (!savedTransactionId) return;
      setAttempt((value) => value + 1);
    },
  }), [draft, errorMessage, errors, factory, loaded, mode, savedTransactionId, source, status, transactionId, userId, warnings]);

  return controller;
}
