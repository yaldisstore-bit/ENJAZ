import { useEffect, useMemo, useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import {
  CommunicationsHubCommandError,
  CommunicationsHubWorkspaceUnavailableError,
  loadCommunicationsHub,
  markCommunicationConversationRead,
  relinkCommunicationToConversation,
  retryCommunicationOutbound,
  type CommunicationConversation,
  type CommunicationReviewItem,
  type CommunicationTimelineItem,
  type CommunicationsHubSnapshot,
} from './communicationsHubService.ts';

export type CommunicationsHubController = Readonly<{
  status: 'loading' | 'ready' | 'error';
  snapshot: CommunicationsHubSnapshot | null;
  errorMessage: string | null;
  actionError: string | null;
  actionKey: string | null;
  query: string;
  selectedConversationId: string | null;
  selectedConversation: CommunicationConversation | null;
  setQuery(value: string): void;
  selectConversation(id: string): void;
  retryLoad(): void;
  retryOutbound(item: CommunicationTimelineItem): Promise<void>;
  relink(item: CommunicationReviewItem): Promise<void>;
}>;

function messageFor(error: unknown): string {
  if (error instanceof CommunicationsHubWorkspaceUnavailableError) return 'تعذر العثور على مساحة العمل المرتبطة بحسابك.';
  if (error instanceof CommunicationsHubCommandError) {
    if (error.code === 'ENJAZ_COMMUNICATION_WORKSPACE_FORBIDDEN') return 'ليس لديك تصريح لعرض مركز الاتصالات في مساحة العمل هذه.';
    if (error.code === 'ENJAZ_COMMUNICATION_RETRY_RECONCILIATION_REQUIRED') return 'حالة الإرسال غير محسومة لدى المزوّد؛ أوقفنا إعادة الإرسال لمنع التكرار.';
    if (error.code === 'ENJAZ_COMMUNICATION_RETRY_STALE' || error.code === 'ENJAZ_COMMUNICATION_RELINK_STALE') return 'تغيرت المحادثة قبل تنفيذ الأمر. حدّث العرض ثم حاول مجددًا.';
    if (error.code === 'ENJAZ_COMMUNICATION_RETRY_TRANSPORT_UNSAFE') return 'لا يمكن إعادة هذا الإرسال بأمان لأن للمزوّد دليلاً قد يعني أنه استلمه.';
    if (error.code === 'ENJAZ_COMMUNICATION_RELINK_CONVERSATION_SCOPE_MISMATCH') return 'المحادثة المستهدفة لا تطابق الشركة أو جهة الاتصال أو المعاملة.';
  }
  return 'تعذر الوصول إلى مركز الاتصالات الآن. لم تُعرض بيانات جزئية أو تخمينية.';
}

export function useCommunicationsHub(): CommunicationsHubController {
  const factory = useDataLayerFactory();
  const userId = useCurrentUserId();
  const [query, setQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<CommunicationsHubSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setStatus('error'); setSnapshot(null); setErrorMessage('انتهت جلسة المستخدم. سجّل الدخول مرة أخرى.');
      return () => { active = false; };
    }
    setStatus('loading'); setErrorMessage(null);
    void loadCommunicationsHub(factory,userId,debouncedQuery,selectedConversationId)
      .then((next) => {
        if (!active) return;
        setSnapshot(next); setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSnapshot(null); setStatus('error'); setErrorMessage(messageFor(error));
      });
    return () => { active = false; };
  }, [attempt,debouncedQuery,factory,selectedConversationId,userId]);

  const selectedConversation = useMemo(() => snapshot?.conversations.find((item) => item.id === selectedConversationId) ?? null,[snapshot,selectedConversationId]);

  const selectConversation = (id: string) => {
    setSelectedConversationId(id);
    setActionError(null);
    if (!userId) return;
    void markCommunicationConversationRead(factory,userId,id)
      .then(() => setAttempt((value) => value + 1))
      .catch((error: unknown) => setActionError(messageFor(error)));
  };

  const run = async (key: string, action: () => Promise<void>) => {
    if (actionKey || !userId) return;
    setActionKey(key); setActionError(null);
    try { await action(); setAttempt((value) => value + 1); }
    catch (error: unknown) { setActionError(messageFor(error)); }
    finally { setActionKey(null); }
  };

  return Object.freeze({
    status,snapshot,errorMessage,actionError,actionKey,query,selectedConversationId,selectedConversation,
    setQuery,
    selectConversation,
    retryLoad() { setAttempt((value) => value + 1); },
    async retryOutbound(item: CommunicationTimelineItem) {
      if (!userId || !item.canRetry || !item.outboundCommandId || item.outboundVersion === null) return;
      await run(`retry:${item.id}`,() => retryCommunicationOutbound(factory,userId,item.outboundCommandId!,item.outboundVersion!));
    },
    async relink(item: CommunicationReviewItem) {
      if (!userId || !selectedConversation) {
        setActionError('اختر محادثة مستهدفة أولًا قبل إعادة الربط.');
        return;
      }
      await run(`relink:${item.communicationId}`,() => relinkCommunicationToConversation(factory,userId,item,selectedConversation,'ربط يدوي من قائمة مراجعة الاتصالات'));
    },
  });
}
