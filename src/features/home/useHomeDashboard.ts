import { useEffect, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { HomeWorkspaceUnavailableError, loadHomeDashboard } from './homeDashboardService.ts';
import type { HomeDashboardSnapshot } from './homeDashboardModel.ts';

export type HomeDashboardLoadState =
  | Readonly<{ status: 'loading'; snapshot: null; errorMessage: null }>
  | Readonly<{ status: 'ready'; snapshot: HomeDashboardSnapshot; errorMessage: null }>
  | Readonly<{ status: 'error'; snapshot: null; errorMessage: string }>;

const LOADING_STATE: HomeDashboardLoadState = Object.freeze({ status: 'loading', snapshot: null, errorMessage: null });

function toHomeErrorMessage(error: unknown): string {
  if (error instanceof HomeWorkspaceUnavailableError) {
    return 'تعذر العثور على مساحة العمل المرتبطة بحسابك. أعد تسجيل الدخول، وإذا استمرت المشكلة فتحقق من إعداد مساحة العمل.';
  }
  if (error instanceof DataAccessError) {
    if (error.dataCode === 'DATA_FORBIDDEN') return 'ليس لديك صلاحية لقراءة بيانات لوحة العمل الحالية.';
    if (error.dataCode === 'DATA_UNAVAILABLE') return 'تعذر الوصول إلى بيانات إنجاز الآن. تحقق من الاتصال ثم أعد المحاولة.';
  }
  return 'حدث خطأ غير متوقع أثناء تجهيز لوحة العمل. لم يتم عرض أرقام جزئية أو تخمينية.';
}

export function useHomeDashboard(): Readonly<HomeDashboardLoadState & { retry(): void }> {
  const userId = useCurrentUserId();
  const factory = useDataLayerFactory();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<HomeDashboardLoadState>(LOADING_STATE);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setState(Object.freeze({ status: 'error', snapshot: null, errorMessage: 'انتهت جلسة المستخدم. سجّل الدخول مرة أخرى.' }));
      return () => { active = false; };
    }

    setState(LOADING_STATE);
    void loadHomeDashboard(factory, userId)
      .then(({ snapshot }) => {
        if (!active) return;
        setState(Object.freeze({ status: 'ready', snapshot, errorMessage: null }));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState(Object.freeze({ status: 'error', snapshot: null, errorMessage: toHomeErrorMessage(error) }));
      });

    return () => { active = false; };
  }, [attempt, factory, userId]);

  return Object.freeze({
    ...state,
    retry() { setAttempt((value) => value + 1); },
  });
}
