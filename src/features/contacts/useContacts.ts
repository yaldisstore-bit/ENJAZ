import { useEffect, useMemo, useRef, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import {
  buildContactListSnapshot,
  createContactDraft,
  normalizeContactListRequest,
  updateContactDraft,
  validateContactDraft,
  type ContactDraft,
  type ContactDraftErrors,
  type ContactDraftField,
  type ContactListFilter,
  type ContactListRequest,
  type ContactListSnapshot,
  type ContactListSort,
  type ContactListSource,
} from './contactModel.ts';
import {
  ContactCreateReplayConflictError,
  ContactEditConflictError,
  ContactListCapacityError,
  ContactMergedRecordError,
  ContactNotFoundError,
  ContactRelationshipConflictError,
  ContactRelationshipNotFoundError,
  ContactWorkspaceUnavailableError,
  TransactionContactConflictError,
  addCompanyContactRelationship,
  assignTransactionPrimaryContact,
  endCompanyContactRelationship,
  loadContactListSource,
  loadContactProfileSource,
  saveContact,
  type ContactProfileSource,
} from './contactService.ts';

export type ContactLoadState = 'loading' | 'ready' | 'error';

function contactErrorMessage(error: unknown): string {
  if (error instanceof ContactWorkspaceUnavailableError) return 'تعذر العثور على مساحة العمل المرتبطة بحسابك.';
  if (error instanceof ContactListCapacityError) return 'عدد جهات الاتصال أكبر من حد القراءة الآمن. لم يتم عرض قائمة جزئية.';
  if (error instanceof ContactNotFoundError) return 'تعذر العثور على جهة الاتصال داخل مساحة العمل الحالية.';
  if (error instanceof ContactEditConflictError) return 'تم تعديل جهة الاتصال في مكان آخر. أعد تحميلها قبل الحفظ.';
  if (error instanceof ContactMergedRecordError) return 'هذه الجهة مدمجة في سجل آخر ولا يجوز تعديلها.';
  if (error instanceof ContactCreateReplayConflictError) return 'تعذر تأكيد محاولة الإنشاء السابقة لأن معرّف العملية مرتبط ببيانات مختلفة.';
  if (error instanceof ContactRelationshipConflictError || error instanceof ContactRelationshipNotFoundError) return error.message;
  if (error instanceof TransactionContactConflictError) return error.message;
  if (error instanceof DataAccessError) {
    if (error.dataCode === 'DATA_FORBIDDEN') return 'ليس لديك صلاحية للوصول إلى بيانات الأشخاص في مساحة العمل.';
    if (error.dataCode === 'DATA_UNAVAILABLE') return 'تعذر الوصول إلى بيانات الأشخاص الآن. تحقق من الاتصال ثم أعد المحاولة.';
    if (error.dataCode === 'DATA_OUTCOME_UNKNOWN') return 'تعذر تأكيد نتيجة الكتابة. لم نعرض نجاحًا زائفًا؛ أعد المحاولة بنفس العملية.';
    if (error.dataCode === 'DATA_CONFLICT' || error.dataCode === 'DATA_REFERENCE_CONFLICT') return 'تعارضت العملية مع سجل مرتبط. أعد تحميل البيانات.';
    if (error.dataCode === 'DATA_VALIDATION_FAILED') return 'رفضت قاعدة البيانات بعض البيانات. راجع الحقول وحاول مجددًا.';
  }
  return 'حدث خطأ غير متوقع في مساحة المحامين وجهات الاتصال.';
}

const INITIAL_LIST_REQUEST = normalizeContactListRequest();

export function useContactDirectory() {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<ContactListSource | null>(null);
  const [status, setStatus] = useState<ContactLoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [request, setRequest] = useState<ContactListRequest>(INITIAL_LIST_REQUEST);

  useEffect(() => {
    let active = true;
    if (!userId) { setSource(null); setStatus('error'); setErrorMessage('انتهت جلسة المستخدم. سجّل الدخول مرة أخرى.'); return () => { active = false; }; }
    setStatus('loading'); setErrorMessage(null);
    void loadContactListSource(factory, userId).then(({ source: next }) => { if (active) { setSource(next); setStatus('ready'); } }).catch((error: unknown) => { if (active) { setSource(null); setStatus('error'); setErrorMessage(contactErrorMessage(error)); } });
    return () => { active = false; };
  }, [attempt, factory, userId]);

  const snapshot = useMemo<ContactListSnapshot | null>(() => source ? buildContactListSnapshot(source, request) : null, [request, source]);
  return Object.freeze({
    status, snapshot, request, errorMessage,
    retry() { setAttempt((value) => value + 1); },
    setFilter(filter: ContactListFilter) { setRequest((current) => normalizeContactListRequest({ ...current, filter, page: 0 })); },
    setSearch(search: string) { setRequest((current) => normalizeContactListRequest({ ...current, search, page: 0 })); },
    setSort(sort: ContactListSort) { setRequest((current) => normalizeContactListRequest({ ...current, sort, page: 0 })); },
    setPage(page: number) { setRequest((current) => normalizeContactListRequest({ ...current, page })); },
  });
}

export function useContactProfile(contactId: string | null) {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<ContactProfileSource | null>(null);
  const [status, setStatus] = useState<ContactLoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!contactId) { setSource(null); setStatus('ready'); setErrorMessage(null); return () => { active = false; }; }
    if (!userId) { setSource(null); setStatus('error'); setErrorMessage('انتهت جلسة المستخدم. سجّل الدخول مرة أخرى.'); return () => { active = false; }; }
    setStatus('loading'); setErrorMessage(null);
    void loadContactProfileSource(factory, userId, contactId).then(({ source: next }) => { if (active) { setSource(next); setStatus('ready'); } }).catch((error: unknown) => { if (active) { setSource(null); setStatus('error'); setErrorMessage(contactErrorMessage(error)); } });
    return () => { active = false; };
  }, [attempt, contactId, factory, userId]);

  return Object.freeze({ status, source, errorMessage, retry() { setAttempt((value) => value + 1); } });
}

export function useContactEditor(mode: 'create' | 'edit', contact: RowOf<'contacts'> | null) {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const [draft, setDraft] = useState<ContactDraft>(() => createContactDraft(mode === 'edit' ? contact : null));
  const [state, setState] = useState<'editing' | 'saving' | 'saved' | 'error'>('editing');
  const [errors, setErrors] = useState<ContactDraftErrors>(Object.freeze({}));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedContact, setSavedContact] = useState<RowOf<'contacts'> | null>(null);
  const createOperationIdRef = useRef<string | null>(null);
  const mutationInFlightRef = useRef(false);

  useEffect(() => {
    setDraft(createContactDraft(mode === 'edit' ? contact : null)); setState('editing'); setErrors(Object.freeze({})); setErrorMessage(null); setSavedContact(null);
    createOperationIdRef.current = mode === 'create' ? globalThis.crypto.randomUUID() : null;
  }, [contact, mode]);

  const save = async () => {
    if (mutationInFlightRef.current || state === 'saving') return;
    const validation = validateContactDraft(draft);
    if (!validation.value) { setErrors(validation.errors); return; }
    if (!userId || (mode === 'edit' && !contact)) { setState('error'); setErrorMessage('تعذر فتح جلسة أو سجل صالح للحفظ.'); return; }
    if (mode === 'create' && !createOperationIdRef.current) createOperationIdRef.current = globalThis.crypto.randomUUID();
    mutationInFlightRef.current = true; setState('saving'); setErrors(Object.freeze({})); setErrorMessage(null);
    try {
      const saved = await saveContact(factory, userId, mode, draft, { contactId: contact?.id ?? null, expectedUpdatedAt: contact?.updated_at ?? null, createOperationId: createOperationIdRef.current });
      setSavedContact(saved); setState('saved');
    } catch (error: unknown) { setSavedContact(null); setState('error'); setErrorMessage(contactErrorMessage(error)); }
    finally { mutationInFlightRef.current = false; }
  };

  return Object.freeze({
    state, draft, errors, errorMessage, savedContact,
    update(field: ContactDraftField, value: string) { if (mutationInFlightRef.current) return; setDraft((current) => updateContactDraft(current, field, value)); setErrors(Object.freeze({})); setErrorMessage(null); if (state !== 'editing') setState('editing'); },
    save,
    resetError() { if (state === 'error') { setState('editing'); setErrorMessage(null); } },
  });
}

export function useContactRelationshipActions(onChanged: () => void) {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const mutationInFlightRef = useRef(false);
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    if (!userId || mutationInFlightRef.current) return;
    mutationInFlightRef.current = true; setState('saving'); setErrorMessage(null);
    try { await action(); setState('idle'); onChanged(); }
    catch (error: unknown) { setState('error'); setErrorMessage(contactErrorMessage(error)); }
    finally { mutationInFlightRef.current = false; }
  };

  return Object.freeze({
    state, errorMessage,
    addCompany(input: Readonly<{ companyId: string; contactId: string; relationType: string }>) { return run(() => addCompanyContactRelationship(factory, userId ?? '', { relationOperationId: globalThis.crypto.randomUUID(), ...input })); },
    endCompany(relationId: string) { return run(() => endCompanyContactRelationship(factory, userId ?? '', relationId, new Date().toISOString())); },
    assignTransaction(input: Readonly<{ transactionId: string; contactId: string; expectedUpdatedAt?: string | null }>) { return run(() => assignTransactionPrimaryContact(factory, userId ?? '', input)); },
    resetError() { setState('idle'); setErrorMessage(null); },
  });
}
