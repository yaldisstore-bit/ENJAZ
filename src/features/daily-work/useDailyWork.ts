import { useEffect, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useNotificationCommandGateway } from '../notifications/NotificationCommandContext.tsx';
import { useSchedulingCommandGateway } from '../scheduling/SchedulingCommandContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import type { DailyWorkItem } from './dailyWorkModel.ts';
import {
  completeDailyWorkItem,
  DailyWorkActionUnavailableError,
  DailyWorkWorkspaceUnavailableError,
  snoozeDailyWorkFollowup,
} from './dailyWorkService.ts';
import { loadUniversalInbox, type UniversalInboxSnapshot } from './universalInboxService.ts';

export type DailyWorkLoadState =
  | Readonly<{ status: 'loading'; snapshot: null; errorMessage: null }>
  | Readonly<{ status: 'ready'; snapshot: UniversalInboxSnapshot; errorMessage: null }>
  | Readonly<{ status: 'error'; snapshot: null; errorMessage: string }>;

export type DailyWorkController = DailyWorkLoadState & Readonly<{
  actionItemId: string | null;
  actionError: string | null;
  retry(): void;
  complete(item: DailyWorkItem): Promise<void>;
  snooze(item: DailyWorkItem, hours?: number): Promise<void>;
}>;

const LOADING_STATE: DailyWorkLoadState = Object.freeze({ status: 'loading', snapshot: null, errorMessage: null });

function toDailyWorkErrorMessage(error: unknown): string {
  if (error instanceof DailyWorkWorkspaceUnavailableError) {
    return 'تعذر العثور على مساحة العمل المرتبطة بحسابك. أعد تسجيل الدخول، وإذا استمرت المشكلة فتحقق من إعداد مساحة العمل.';
  }
  if (error instanceof DailyWorkActionUnavailableError) {
    return 'هذا العنصر يحتاج فتح سياقه قبل إغلاقه، لذلك لم تُجرَ أي كتابة تلقائية.';
  }
  if (error instanceof DataAccessError) {
    if (error.dataCode === 'DATA_FORBIDDEN') return 'ليس لديك صلاحية للوصول إلى عناصر العمل الحالية.';
    if (error.dataCode === 'DATA_UNAVAILABLE') return 'تعذر الوصول إلى بيانات العمل الآن. تحقق من الاتصال ثم أعد المحاولة.';
    if (error.dataCode === 'DATA_CONFLICT') return 'تغيرت حالة عنصر العمل قبل تنفيذ الأمر. حدّث القائمة ثم حاول مرة أخرى.';
    if (error.dataCode === 'DATA_VALIDATION_FAILED') return 'تعذر تنفيذ الإجراء لأن حالة المتابعة الحالية لا تسمح به.';
  }
  return 'حدث خطأ غير متوقع أثناء تجهيز العمل اليومي. لم يتم عرض بيانات جزئية أو تخمينية.';
}

export function useDailyWork(): DailyWorkController {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const notificationCommands = useNotificationCommandGateway();
  const schedulingCommands = useSchedulingCommandGateway();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DailyWorkLoadState>(LOADING_STATE);
  const [actionItemId, setActionItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setState(Object.freeze({ status: 'error', snapshot: null, errorMessage: 'انتهت جلسة المستخدم. سجّل الدخول مرة أخرى.' }));
      return () => { active = false; };
    }
    setState(LOADING_STATE);
    setActionError(null);
    void loadUniversalInbox(factory, notificationCommands, userId)
      .then(({ snapshot }) => {
        if (!active) return;
        setState(Object.freeze({ status: 'ready', snapshot, errorMessage: null }));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState(Object.freeze({ status: 'error', snapshot: null, errorMessage: toDailyWorkErrorMessage(error) }));
      });
    return () => { active = false; };
  }, [attempt, factory, notificationCommands, userId]);

  const runAction = async (item: DailyWorkItem, action: () => Promise<void>) => {
    if (actionItemId) return;
    setActionItemId(item.id);
    setActionError(null);
    try {
      await action();
      setAttempt((value) => value + 1);
    } catch (error: unknown) {
      setActionError(toDailyWorkErrorMessage(error));
    } finally {
      setActionItemId(null);
    }
  };

  return {
    ...state,
    actionItemId,
    actionError,
    retry() { setAttempt((value) => value + 1); },
    async complete(item: DailyWorkItem) {
      if (!userId) {
        setActionError('انتهت جلسة المستخدم. سجّل الدخول مرة أخرى.');
        return;
      }
      await runAction(item, () => completeDailyWorkItem(factory, notificationCommands, schedulingCommands, userId, item));
    },
    async snooze(item: DailyWorkItem, hours = 2) {
      if (!userId) {
        setActionError('انتهت جلسة المستخدم. سجّل الدخول مرة أخرى.');
        return;
      }
      const until = new Date(Date.now() + Math.max(1, hours) * 3_600_000);
      await runAction(item, () => snoozeDailyWorkFollowup(factory, notificationCommands, userId, item, until));
    },
  };
}
