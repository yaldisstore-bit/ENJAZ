import { useEffect, useMemo, useRef, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import {
  buildCompanyListSnapshot,
  createCompanyDraft,
  normalizeCompanyListRequest,
  updateCompanyDraft,
  validateCompanyDraft,
  type CompanyDraft,
  type CompanyDraftErrors,
  type CompanyDraftField,
  type CompanyListFilter,
  type CompanyListRequest,
  type CompanyListSnapshot,
  type CompanyListSort,
  type CompanyListSource,
} from './companyModel.ts';
import {
  CompanyCreateReplayConflictError,
  CompanyEditConflictError,
  CompanyListCapacityError,
  CompanyMergedRecordError,
  CompanyNotFoundError,
  CompanyWorkspaceUnavailableError,
  loadCompanyDetailSource,
  loadCompanyListSource,
  saveCompany,
  type CompanyDetailSource,
} from './companyService.ts';

export type CompanyLoadState = 'loading' | 'ready' | 'error';

function companyErrorMessage(error: unknown): string {
  if (error instanceof CompanyWorkspaceUnavailableError) return 'مساحة العمل غير متاحة.';
  if (error instanceof CompanyListCapacityError) return 'تجاوزت الشركات حد القراءة.';
  if (error instanceof CompanyNotFoundError) return 'الشركة غير موجودة.';
  if (error instanceof CompanyEditConflictError) return 'تغيرت الشركة؛ أعد التحميل.';
  if (error instanceof CompanyMergedRecordError) return 'السجل المدمج للقراءة فقط.';
  if (error instanceof CompanyCreateReplayConflictError) return 'معرف الإنشاء مستخدم لبيانات مختلفة.';
  if (error instanceof DataAccessError) {
    if (error.dataCode === 'DATA_FORBIDDEN') return 'لا توجد صلاحية.';
    if (error.dataCode === 'DATA_UNAVAILABLE') return 'تعذر تحميل الشركات.';
    if (error.dataCode === 'DATA_OUTCOME_UNKNOWN') return 'نتيجة الحفظ غير مؤكدة؛ أعد المحاولة.';
    if (error.dataCode === 'DATA_CONFLICT' || error.dataCode === 'DATA_REFERENCE_CONFLICT') return 'تعارضت البيانات؛ أعد التحميل.';
    if (error.dataCode === 'DATA_VALIDATION_FAILED') return 'بيانات الشركة مرفوضة.';
  }
  return 'تعذر إكمال العملية.';
}

export interface CompanyDirectoryController {
  readonly status: CompanyLoadState;
  readonly snapshot: CompanyListSnapshot | null;
  readonly request: CompanyListRequest;
  readonly errorMessage: string | null;
  readonly retry: () => void;
  readonly setFilter: (filter: CompanyListFilter) => void;
  readonly setSearch: (search: string) => void;
  readonly setSort: (sort: CompanyListSort) => void;
  readonly setPage: (page: number) => void;
}

const INITIAL_LIST_REQUEST = normalizeCompanyListRequest();

export function useCompanyDirectory(): CompanyDirectoryController {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<CompanyListSource | null>(null);
  const [status, setStatus] = useState<CompanyLoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [request, setRequest] = useState<CompanyListRequest>(INITIAL_LIST_REQUEST);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setSource(null);
      setStatus('error');
      setErrorMessage('انتهت الجلسة.');
      return () => { active = false; };
    }
    setStatus('loading');
    setErrorMessage(null);
    void loadCompanyListSource(factory, userId)
      .then(({ source: nextSource }) => {
        if (!active) return;
        setSource(nextSource);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSource(null);
        setStatus('error');
        setErrorMessage(companyErrorMessage(error));
      });
    return () => { active = false; };
  }, [attempt, factory, userId]);

  const snapshot = useMemo(() => source ? buildCompanyListSnapshot(source, request) : null, [request, source]);
  return Object.freeze({
    status,
    snapshot,
    request,
    errorMessage,
    retry() { setAttempt((value) => value + 1); },
    setFilter(filter: CompanyListFilter) { setRequest((current) => normalizeCompanyListRequest({ ...current, filter, page: 0 })); },
    setSearch(search: string) { setRequest((current) => normalizeCompanyListRequest({ ...current, search, page: 0 })); },
    setSort(sort: CompanyListSort) { setRequest((current) => normalizeCompanyListRequest({ ...current, sort, page: 0 })); },
    setPage(page: number) { setRequest((current) => normalizeCompanyListRequest({ ...current, page })); },
  });
}

export interface CompanyDetailController {
  readonly status: CompanyLoadState;
  readonly source: CompanyDetailSource | null;
  readonly errorMessage: string | null;
  readonly retry: () => void;
}

export function useCompanyDetail(companyId: string | null): CompanyDetailController {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<CompanyDetailSource | null>(null);
  const [status, setStatus] = useState<CompanyLoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!companyId) {
      setSource(null);
      setStatus('ready');
      setErrorMessage(null);
      return () => { active = false; };
    }
    if (!userId) {
      setSource(null);
      setStatus('error');
      setErrorMessage('انتهت الجلسة.');
      return () => { active = false; };
    }
    setStatus('loading');
    setErrorMessage(null);
    void loadCompanyDetailSource(factory, userId, companyId)
      .then(({ source: nextSource }) => {
        if (!active) return;
        setSource(nextSource);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSource(null);
        setStatus('error');
        setErrorMessage(companyErrorMessage(error));
      });
    return () => { active = false; };
  }, [attempt, companyId, factory, userId]);

  return Object.freeze({ status, source, errorMessage, retry() { setAttempt((value) => value + 1); } });
}

export type CompanyEditorState = 'editing' | 'saving' | 'saved' | 'error';

export interface CompanyEditorController {
  readonly state: CompanyEditorState;
  readonly draft: CompanyDraft;
  readonly errors: CompanyDraftErrors;
  readonly errorMessage: string | null;
  readonly savedCompany: RowOf<'companies'> | null;
  readonly update: (field: CompanyDraftField, value: string) => void;
  readonly save: () => Promise<void>;
  readonly resetError: () => void;
}

export function useCompanyEditor(mode: 'create' | 'edit', company: RowOf<'companies'> | null): CompanyEditorController {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const [draft, setDraft] = useState<CompanyDraft>(() => createCompanyDraft(mode === 'edit' ? company : null));
  const [state, setState] = useState<CompanyEditorState>('editing');
  const [errors, setErrors] = useState<CompanyDraftErrors>(Object.freeze({}));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedCompany, setSavedCompany] = useState<RowOf<'companies'> | null>(null);
  const createOperationIdRef = useRef<string | null>(null);
  const mutationInFlightRef = useRef(false);

  useEffect(() => {
    setDraft(createCompanyDraft(mode === 'edit' ? company : null));
    setState('editing');
    setErrors(Object.freeze({}));
    setErrorMessage(null);
    setSavedCompany(null);
    if (mode === 'create') createOperationIdRef.current = globalThis.crypto.randomUUID();
    else createOperationIdRef.current = null;
  }, [company, mode]);

  const save = async () => {
    if (mutationInFlightRef.current || state === 'saving') return;
    const validation = validateCompanyDraft(draft);
    if (!validation.value) {
      setErrors(validation.errors);
      setState('editing');
      return;
    }
    if (!userId) {
      setState('error');
      setErrorMessage('انتهت الجلسة.');
      return;
    }
    if (mode === 'edit' && !company) {
      setState('error');
      setErrorMessage('سجل التعديل غير متاح.');
      return;
    }
    if (mode === 'create' && !createOperationIdRef.current) createOperationIdRef.current = globalThis.crypto.randomUUID();

    mutationInFlightRef.current = true;
    setState('saving');
    setErrors(Object.freeze({}));
    setErrorMessage(null);
    try {
      const saved = await saveCompany(factory, userId, mode, draft, {
        companyId: company?.id ?? null,
        expectedUpdatedAt: company?.updated_at ?? null,
        createOperationId: createOperationIdRef.current,
      });
      setSavedCompany(saved);
      setState('saved');
    } catch (error: unknown) {
      setSavedCompany(null);
      setState('error');
      setErrorMessage(companyErrorMessage(error));
    } finally {
      mutationInFlightRef.current = false;
    }
  };

  return Object.freeze({
    state,
    draft,
    errors,
    errorMessage,
    savedCompany,
    update(field: CompanyDraftField, value: string) {
      if (mutationInFlightRef.current) return;
      setDraft((current) => updateCompanyDraft(current, field, value));
      setErrors(Object.freeze({}));
      setErrorMessage(null);
      if (state !== 'editing') setState('editing');
    },
    save,
    resetError() { if (state === 'error') { setState('editing'); setErrorMessage(null); } },
  });
}
