import { useEffect, useMemo, useRef, useState } from 'react';
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
  readonly outcomeUnknown: boolean;
  readonly update: (field: TransactionEditorField, value: string) => void;
  readonly submit: () => Promise<boolean>;
  readonly retry: () => void;
  readonly editAgain: () => void;
}

const PENDING_CREATE_STORAGE_PREFIX = 'enjaz.transaction.create.pending.v1:';
const DRAFT_FIELDS: readonly TransactionEditorField[] = Object.freeze([
  'companyId', 'primaryContactId', 'type', 'department', 'status', 'priority', 'currentFee',
  'completedAt', 'stationName', 'assignedToText', 'stationOccurredAt', 'noteBody', 'feeChangeReason',
]);

interface PendingCreateAttempt {
  readonly operationId: string;
  readonly draft: TransactionEditorDraft;
}

function pendingCreateKey(userId: string): string {
  return `${PENDING_CREATE_STORAGE_PREFIX}${userId}`;
}

function parsePendingCreate(value: unknown): PendingCreateAttempt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Readonly<Record<string, unknown>>;
  if (typeof record.operationId !== 'string' || !record.operationId) return null;
  if (!record.draft || typeof record.draft !== 'object' || Array.isArray(record.draft)) return null;
  const rawDraft = record.draft as Readonly<Record<string, unknown>>;
  if (!DRAFT_FIELDS.every((field) => typeof rawDraft[field] === 'string')) return null;
  return Object.freeze({
    operationId: record.operationId,
    draft: Object.freeze(Object.fromEntries(DRAFT_FIELDS.map((field) => [field, rawDraft[field]])) as unknown as TransactionEditorDraft),
  });
}

function readPendingCreate(userId: string): PendingCreateAttempt | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(pendingCreateKey(userId));
    if (!raw) return null;
    const parsed = parsePendingCreate(JSON.parse(raw));
    if (!parsed) window.sessionStorage.removeItem(pendingCreateKey(userId));
    return parsed;
  } catch {
    return null;
  }
}

function writePendingCreate(userId: string, attempt: PendingCreateAttempt): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.sessionStorage.setItem(pendingCreateKey(userId), JSON.stringify(attempt));
    return true;
  } catch {
    return false;
  }
}

function clearPendingCreate(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(pendingCreateKey(userId));
  } catch {
    // The recovery record is best-effort removable; write protection already happens before mutation.
  }
}

function toEditorErrorMessage(error: unknown): string {
  if (error instanceof TransactionEditorWorkspaceUnavailableError) return 'تعذر العثور على مساحة العمل المرتبطة بحسابك.';
  if (error instanceof TransactionEditorNotFoundError) return 'المعاملة غير موجودة أو لم تعد متاحة في مساحة العمل.';
  if (error instanceof TransactionEditorConflictError) return 'تغيّرت المعاملة أو تعارضت هوية محاولة الإنشاء مع بيانات أخرى. لا تُنشئ نسخة جديدة قبل مراجعة المحاولة الحالية.';
  if (error instanceof TransactionEditorCapacityError) return 'حجم بيانات الشركات أو جهات الاتصال أكبر من حد المحرر الآمن الحالي. لم يتم عرض قائمة جزئية.';
  if (error instanceof DataAccessError) {
    if (error.dataCode === 'DATA_FORBIDDEN') return 'ليس لديك صلاحية لتنفيذ هذا التعديل في مساحة العمل الحالية.';
    if (error.dataCode === 'DATA_OUTCOME_UNKNOWN') return 'انتهت مهلة الحفظ قبل تأكيد النتيجة. بقيت نفس الحقول وهوية العملية مقفلة؛ أعد الحفظ كما هو لتأكيد النتيجة دون إنشاء نسخة ثانية.';
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
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const [createOperationId, setCreateOperationId] = useState<string | null>(
    () => mode === 'create' ? globalThis.crypto.randomUUID() : null,
  );
  const mutationInFlightRef = useRef(false);
  const preservePendingCreateRef = useRef(false);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setErrors({});
    setErrorMessage(null);
    setWarnings([]);
    setSavedTransactionId(null);
    setOutcomeUnknown(false);
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
        if (mode === 'edit') {
          setCreateOperationId(null);
          preservePendingCreateRef.current = false;
          setDraft(createTransactionEditDraft(result.source));
        } else {
          const pending = readPendingCreate(userId);
          if (pending) {
            const message = 'تم استعادة محاولة إنشاء لم تُحسم نتيجتها قبل إعادة تحميل الصفحة. الحقول مقفلة؛ أعد الحفظ نفسه لتأكيد النتيجة دون تكرار المعاملة.';
            setCreateOperationId(pending.operationId);
            setDraft(pending.draft);
            setOutcomeUnknown(true);
            setErrorMessage(message);
            setErrors(Object.freeze({ form: message }));
            preservePendingCreateRef.current = true;
          } else {
            setCreateOperationId((current) => current ?? globalThis.crypto.randomUUID());
            setDraft(createEmptyTransactionDraft());
            preservePendingCreateRef.current = false;
          }
        }
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoaded(null);
        setStatus('error');
        setErrorMessage(toEditorErrorMessage(error));
      });

    return () => {
      active = false;
      if (mode === 'create' && userId && !preservePendingCreateRef.current) clearPendingCreate(userId);
    };
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
    outcomeUnknown,
    update(field: TransactionEditorField, value: string) {
      if (status === 'saving' || mutationInFlightRef.current || outcomeUnknown) return;
      setDraft((current) => {
        const next: Record<TransactionEditorField, string> = { ...current, [field]: value };
        if (field === 'companyId' && source && current.primaryContactId) {
          if (!getRelatedContactIds(source, value).has(current.primaryContactId)) next.primaryContactId = '';
        }
        if (field === 'status' && value !== 'completed') next.completedAt = '';
        return Object.freeze(next as unknown as TransactionEditorDraft);
      });
      setErrors((current) => {
        if (!(field in current) && !('form' in current)) return current;
        const next = { ...current };
        delete next[field];
        delete next.form;
        return Object.freeze(next);
      });
      setErrorMessage(null);
    },
    async submit(): Promise<boolean> {
      if (!loaded || !userId || status === 'saving' || mutationInFlightRef.current) return false;
      const nextErrors = validateTransactionEditorDraft(draft, loaded.source, mode);
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        setStatus('ready');
        return false;
      }
      if (mode === 'create') {
        if (!createOperationId || !writePendingCreate(userId, Object.freeze({ operationId: createOperationId, draft }))) {
          const message = 'تعذر تثبيت هوية محاولة الإنشاء محليًا قبل الإرسال، لذلك تم إيقاف الحفظ لحماية المعاملة من التكرار.';
          setErrors(Object.freeze({ form: message }));
          setErrorMessage(message);
          setStatus('ready');
          return false;
        }
        preservePendingCreateRef.current = true;
      }
      if (mutationInFlightRef.current) return false;
      mutationInFlightRef.current = true;
      setStatus('saving');
      setErrors({});
      setErrorMessage(null);
      setWarnings([]);
      try {
        const result = await saveTransactionEditorDraft(factory, userId, loaded, mode, draft, userId, new Date(), createOperationId);
        const unresolvedCreateCompanion = mode === 'create' && result.warnings.some((warning) => warning.outcomeUnknown);
        setWarnings(result.warnings);
        setSavedTransactionId(result.transaction.id);
        if (unresolvedCreateCompanion) {
          const message = 'تم تأكيد المعاملة الأساسية لكن توجد كتابة مساندة لم تُحسم نتيجتها. بقيت نفس محاولة الإنشاء محفوظة ومقفلة؛ أعد الحفظ نفسه لإجراء المطابقة دون تكرار أي سجل.';
          setOutcomeUnknown(true);
          setErrorMessage(message);
          setErrors(Object.freeze({ form: message }));
          setStatus('ready');
          preservePendingCreateRef.current = true;
          return false;
        }
        if (mode === 'create') {
          clearPendingCreate(userId);
          preservePendingCreateRef.current = false;
        }
        setOutcomeUnknown(false);
        setStatus('saved');
        return true;
      } catch (error: unknown) {
        const message = toEditorErrorMessage(error);
        const preserveCreate = mode === 'create' && (
          (error instanceof DataAccessError && error.dataCode === 'DATA_OUTCOME_UNKNOWN')
          || error instanceof TransactionEditorConflictError
        );
        if (mode === 'create' && !preserveCreate) {
          clearPendingCreate(userId);
          preservePendingCreateRef.current = false;
        }
        setOutcomeUnknown(preserveCreate);
        setStatus(loaded ? 'ready' : 'error');
        setErrorMessage(message);
        if (loaded) setErrors(Object.freeze({ form: message }));
        return false;
      } finally {
        mutationInFlightRef.current = false;
      }
    },
    retry() { setAttempt((value) => value + 1); },
    editAgain() {
      if (!savedTransactionId) return;
      setAttempt((value) => value + 1);
    },
  }), [createOperationId, draft, errorMessage, errors, factory, loaded, mode, outcomeUnknown, savedTransactionId, source, status, transactionId, userId, warnings]);

  return controller;
}
