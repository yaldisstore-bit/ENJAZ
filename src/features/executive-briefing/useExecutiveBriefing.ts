import { useEffect, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { loadExecutiveBriefing } from './executiveBriefingService.ts';
import type { ExecutiveBriefingSnapshot } from './executiveBriefingModel.ts';

export type ExecutiveBriefingLoadState =
  | Readonly<{ status: 'loading'; snapshot: null; errorMessage: null }>
  | Readonly<{ status: 'ready'; snapshot: ExecutiveBriefingSnapshot; errorMessage: null }>
  | Readonly<{ status: 'error'; snapshot: null; errorMessage: string }>;

const LOADING: ExecutiveBriefingLoadState = Object.freeze({ status: 'loading', snapshot: null, errorMessage: null });

function toMessage(error: unknown): string {
  if (error instanceof DataAccessError) {
    if (error.dataCode === 'DATA_FORBIDDEN') return 'ليس لديك صلاحية لقراءة بيانات الملخص التنفيذي.';
    if (error.dataCode === 'DATA_UNAVAILABLE') return 'تعذر الوصول إلى بيانات إنجاز الآن. تحقق من الاتصال ثم أعد المحاولة.';
  }
  return 'تعذر تجهيز الملخص التنفيذي من المصادر الموثوقة. لم يتم عرض قيم جزئية أو تخمينية.';
}

export function useExecutiveBriefing(): Readonly<ExecutiveBriefingLoadState & { retry(): void }> {
  const factory = useDataLayerFactory();
  const userId = useCurrentUserId();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ExecutiveBriefingLoadState>(LOADING);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setState(Object.freeze({ status: 'error', snapshot: null, errorMessage: 'انتهت جلسة المستخدم. سجّل الدخول مرة أخرى.' }));
      return () => { active = false; };
    }

    setState(LOADING);
    void loadExecutiveBriefing(factory, userId)
      .then(({ snapshot }) => {
        if (active) setState(Object.freeze({ status: 'ready', snapshot, errorMessage: null }));
      })
      .catch((error: unknown) => {
        if (active) setState(Object.freeze({ status: 'error', snapshot: null, errorMessage: toMessage(error) }));
      });

    return () => { active = false; };
  }, [attempt, factory, userId]);

  return Object.freeze({
    ...state,
    retry() { setAttempt((value) => value + 1); },
  });
}
