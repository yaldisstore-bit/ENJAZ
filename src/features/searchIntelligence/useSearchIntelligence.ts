import { useEffect, useMemo, useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import type { EnjazSavedViewDefinition, GlobalSearchResultReference, SavedViewDomain } from './searchSavedViewContract.ts';
import type { SavedViewRecord } from './searchIntelligenceCommands.ts';
import { useSearchIntelligenceGateway } from './SearchIntelligenceContext.tsx';

export type SearchIntelligenceLoadState = 'idle' | 'loading' | 'ready' | 'error';

function message(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function useSavedViews(domain: SavedViewDomain) {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const gateway = useSearchIntelligenceGateway();
  const [attempt, setAttempt] = useState(0);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [items, setItems] = useState<readonly SavedViewRecord[]>([]);
  const [status, setStatus] = useState<SearchIntelligenceLoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setWorkspaceId(null); setItems([]); setStatus('error'); setErrorMessage('انتهت جلسة المستخدم.');
      return () => { active = false; };
    }
    setStatus('loading'); setErrorMessage(null);
    void factory.resolveWorkspaceId(userId).then(async (nextWorkspaceId) => {
      if (!active) return;
      if (!nextWorkspaceId) throw new Error('تعذر تحديد مساحة العمل الحالية.');
      const rows = await gateway.listSavedViews(nextWorkspaceId);
      if (!active) return;
      setWorkspaceId(nextWorkspaceId);
      setItems(Object.freeze(rows.filter((item) => item.domain === domain)));
      setStatus('ready');
    }).catch((error: unknown) => {
      if (!active) return;
      setWorkspaceId(null); setItems([]); setStatus('error'); setErrorMessage(message(error, 'تعذر تحميل المناظر المحفوظة.'));
    });
    return () => { active = false; };
  }, [attempt, domain, factory, gateway, userId]);

  const owned = useMemo(() => new Set(items.filter((item) => item.ownerUserId === userId).map((item) => item.id)), [items, userId]);
  const reload = () => setAttempt((value) => value + 1);
  const createPersonal = async (name: string, definition: EnjazSavedViewDefinition) => {
    if (!workspaceId) throw new Error('مساحة العمل غير جاهزة.');
    setBusyId('new'); setErrorMessage(null);
    try {
      await gateway.saveSavedView({ workspaceId, savedViewId: null, expectedVersion: null, operationId: crypto.randomUUID(), name, visibility: 'personal', teamId: null, definition });
      reload();
    } catch (error) { setErrorMessage(message(error, 'تعذر حفظ المنظر.')); throw error; }
    finally { setBusyId(null); }
  };
  const rename = async (item: SavedViewRecord, name: string) => {
    if (!workspaceId || !owned.has(item.id)) throw new Error('لا تملك صلاحية إعادة تسمية هذا المنظر.');
    setBusyId(item.id); setErrorMessage(null);
    try {
      await gateway.saveSavedView({ workspaceId, savedViewId: item.id, expectedVersion: item.version, operationId: crypto.randomUUID(), name, visibility: item.visibility, teamId: item.teamId, definition: item.definition });
      reload();
    } catch (error) { setErrorMessage(message(error, 'تعذر إعادة تسمية المنظر.')); throw error; }
    finally { setBusyId(null); }
  };
  const remove = async (item: SavedViewRecord) => {
    if (!workspaceId || !owned.has(item.id)) throw new Error('لا تملك صلاحية حذف هذا المنظر.');
    setBusyId(item.id); setErrorMessage(null);
    try {
      await gateway.deleteSavedView(workspaceId, item.id, item.version, crypto.randomUUID());
      reload();
    } catch (error) { setErrorMessage(message(error, 'تعذر حذف المنظر.')); throw error; }
    finally { setBusyId(null); }
  };

  return Object.freeze({ status, items, errorMessage, busyId, userId, retry: reload, createPersonal, rename, remove });
}

export function useGlobalSearch(query: string, limitPerDomain = 8) {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const gateway = useSearchIntelligenceGateway();
  const normalized = query.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 120);
  const [status, setStatus] = useState<SearchIntelligenceLoadState>('idle');
  const [results, setResults] = useState<readonly GlobalSearchResultReference[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!userId || normalized.length < 2) {
      setStatus('idle'); setResults([]); setErrorMessage(null);
      return () => { active = false; };
    }
    setStatus('loading'); setErrorMessage(null);
    timer = setTimeout(() => {
      void factory.resolveWorkspaceId(userId).then(async (workspaceId) => {
        if (!workspaceId) throw new Error('تعذر تحديد مساحة العمل الحالية.');
        const rows = await gateway.globalSearch(workspaceId, normalized, limitPerDomain);
        if (!active) return;
        setResults(rows); setStatus('ready');
      }).catch((error: unknown) => {
        if (!active) return;
        setResults([]); setStatus('error'); setErrorMessage(message(error, 'تعذر تنفيذ البحث الشامل.'));
      });
    }, 160);
    return () => { active = false; if (timer !== undefined) clearTimeout(timer); };
  }, [factory, gateway, limitPerDomain, normalized, userId]);

  return Object.freeze({ status, results, errorMessage, query: normalized });
}
