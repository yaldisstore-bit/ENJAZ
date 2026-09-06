import { useEffect, useMemo, useRef, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { buildContactListSnapshot, createContactDraft, normalizeContactListRequest, updateContactDraft, validateContactDraft, type ContactDraft, type ContactDraftErrors, type ContactDraftField, type ContactListFilter, type ContactListRequest, type ContactListSort, type ContactListSource } from './contactModel.ts';
import { ContactDomainError, addCompanyContactRelationship, endCompanyContactRelationship, loadContactListSource, loadContactProfileSource, saveContact, type ContactProfileSource } from './contactService.ts';

function message(error: unknown) {
  if (error instanceof ContactDomainError) return error.message;
  if (error instanceof DataAccessError) return error.dataCode === 'DATA_OUTCOME_UNKNOWN' ? 'نتيجة الكتابة غير مؤكدة؛ أعد المحاولة بنفس العملية.' : error.dataCode === 'DATA_FORBIDDEN' ? 'لا توجد صلاحية لهذه البيانات.' : error.dataCode === 'DATA_UNAVAILABLE' ? 'البيانات غير متاحة الآن.' : 'تعارضت العملية مع البيانات الحالية.';
  return 'تعذر إكمال العملية.';
}

export function useContactDirectory() {
  const userId = useCurrentUserId(), factory = useDataLayerFactory();
  const [attempt, setAttempt] = useState(0), [source, setSource] = useState<ContactListSource | null>(null), [errorMessage, setError] = useState<string | null>(null), [request, setRequest] = useState<ContactListRequest>(normalizeContactListRequest());
  useEffect(() => {
    let live = true;
    if (!userId) { setError('انتهت الجلسة.'); setSource(null); return () => { live = false; }; }
    setError(null);
    void loadContactListSource(factory, userId).then(({ source: value }) => { if (live) setSource(value); }).catch((error) => { if (live) { setSource(null); setError(message(error)); } });
    return () => { live = false; };
  }, [attempt, factory, userId]);
  const snapshot = useMemo(() => source ? buildContactListSnapshot(source, request) : null, [request, source]);
  const set = (patch: Partial<ContactListRequest>) => setRequest((current) => normalizeContactListRequest({ ...current, ...patch }));
  return { status: errorMessage ? 'error' as const : source ? 'ready' as const : 'loading' as const, snapshot, request, errorMessage, retry: () => setAttempt((v) => v + 1), setFilter: (filter: ContactListFilter) => set({ filter, page: 0 }), setSearch: (search: string) => set({ search, page: 0 }), setSort: (sort: ContactListSort) => set({ sort, page: 0 }), setPage: (page: number) => set({ page }) };
}

export function useContactProfile(contactId: string | null) {
  const userId = useCurrentUserId(), factory = useDataLayerFactory();
  const [attempt, setAttempt] = useState(0), [source, setSource] = useState<ContactProfileSource | null>(null), [errorMessage, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!contactId) { setSource(null); setError(null); return () => { live = false; }; }
    if (!userId) { setError('انتهت الجلسة.'); return () => { live = false; }; }
    setSource(null); setError(null);
    void loadContactProfileSource(factory, userId, contactId).then(({ source: value }) => { if (live) setSource(value); }).catch((error) => { if (live) setError(message(error)); });
    return () => { live = false; };
  }, [attempt, contactId, factory, userId]);
  return { status: errorMessage ? 'error' as const : source || !contactId ? 'ready' as const : 'loading' as const, source, errorMessage, retry: () => setAttempt((v) => v + 1) };
}

export function useContactEditor(mode: 'create' | 'edit', contact: RowOf<'contacts'> | null) {
  const userId = useCurrentUserId(), factory = useDataLayerFactory();
  const [draft, setDraft] = useState<ContactDraft>(() => createContactDraft(mode === 'edit' ? contact : null)), [errors, setErrors] = useState<ContactDraftErrors>({}), [errorMessage, setError] = useState<string | null>(null), [savedContact, setSaved] = useState<RowOf<'contacts'> | null>(null), [saving, setSaving] = useState(false);
  const createId = useRef<string | null>(null), inFlight = useRef(false);
  useEffect(() => { setDraft(createContactDraft(mode === 'edit' ? contact : null)); setErrors({}); setError(null); setSaved(null); createId.current = mode === 'create' ? crypto.randomUUID() : null; }, [contact, mode]);
  const save = async () => {
    if (inFlight.current || !userId || mode === 'edit' && !contact) return;
    const valid = validateContactDraft(draft); if (!valid.value) { setErrors(valid.errors); return; }
    if (mode === 'create' && !createId.current) createId.current = crypto.randomUUID();
    inFlight.current = true; setSaving(true); setError(null); setErrors({});
    try { setSaved(await saveContact(factory, userId, mode, draft, { contactId: contact?.id, expectedUpdatedAt: contact?.updated_at, createOperationId: createId.current })); }
    catch (error) { setError(message(error)); }
    finally { inFlight.current = false; setSaving(false); }
  };
  return { state: saving ? 'saving' as const : savedContact ? 'saved' as const : errorMessage ? 'error' as const : 'editing' as const, draft, errors, errorMessage, savedContact, update(field: ContactDraftField, value: string) { if (!inFlight.current) { setDraft((d) => updateContactDraft(d, field, value)); setErrors({}); setError(null); setSaved(null); } }, save };
}

export function useContactRelationshipActions(onChanged: () => void) {
  const userId = useCurrentUserId(), factory = useDataLayerFactory(), inFlight = useRef(false);
  const [errorMessage, setError] = useState<string | null>(null), [saving, setSaving] = useState(false);
  const run = async (action: () => Promise<unknown>) => { if (!userId || inFlight.current) return; inFlight.current = true; setSaving(true); setError(null); try { await action(); onChanged(); } catch (error) { setError(message(error)); } finally { inFlight.current = false; setSaving(false); } };
  return { state: saving ? 'saving' as const : errorMessage ? 'error' as const : 'idle' as const, errorMessage, addCompany: (input: Readonly<{ companyId: string; contactId: string; relationType: string }>) => run(() => addCompanyContactRelationship(factory, userId ?? '', { relationOperationId: crypto.randomUUID(), ...input })), endCompany: (id: string) => run(() => endCompanyContactRelationship(factory, userId ?? '', id, new Date().toISOString())) };
}
