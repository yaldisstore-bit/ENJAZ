import { Component, type ErrorInfo, type ReactNode } from 'react';
import type { Logger } from '../../core/logging/logger';
import { toAppError } from '../../core/errors/AppError';

interface Props {
  readonly children: ReactNode;
  readonly logger: Logger;
}

interface State {
  readonly hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const appError = toAppError(error);
    this.props.logger.error('Unhandled React error', {
      code: appError.code,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="foundation-page" id="main-content">
        <section className="foundation-card" role="alert">
          <h1>تعذر عرض هذه الشاشة</h1>
          <p>تم تسجيل الخطأ دون حفظ معلومات حساسة. أعد تحميل التطبيق وحاول مرة أخرى.</p>
          <button type="button" onClick={() => globalThis.location.reload()}>إعادة التحميل</button>
        </section>
      </main>
    );
  }
}
