import { useEffect, useState, type ReactNode } from 'react';
import { Link, Outlet } from 'react-router';
import { IconButton } from '../../design-system/components/index.ts';
import { toAppError } from '../../core/errors/AppError.ts';
import { useAuth } from '../auth/state/AuthContext.tsx';
import {
  getShellUserInitial,
  resolveShellNetworkState,
  SHELL_NAV_SLOTS,
  type ShellNavGlyph,
  type ShellNetworkState,
} from './shellContract.ts';

interface ShellGlyphProps {
  name: ShellNavGlyph | 'logout';
}

function ShellGlyph({ name }: ShellGlyphProps) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    focusable: false,
    'aria-hidden': true,
  };

  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3.8 10.4 12 3.7l8.2 6.7v9.1H7.4v-7h9.2v7" /></svg>;
    case 'work':
      return <svg {...common}><path d="M7 4.5h10M8.5 3v3M15.5 3v3M5 8h14v11.5H5zM8 12h3M8 15.5h6" /></svg>;
    case 'transactions':
      return <svg {...common}><path d="M6 3.8h9l3 3v13.4H6zM15 3.8v3h3M9 11h6M9 14.5h6M9 18h4" /></svg>;
    case 'companies':
      return <svg {...common}><path d="M4.5 20V7.5l7.5-3v15.5M12 9h7.5v11M8 9.5h.01M8 13h.01M8 16.5h.01M15.5 12.5h.01M15.5 16h.01" /></svg>;
    case 'more':
      return <svg {...common}><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></svg>;
    case 'logout':
      return <svg {...common}><path d="M10 5H5v14h5M14.5 8.5 18 12l-3.5 3.5M9 12h9" /></svg>;
  }
}

export interface AppShellFrameProps {
  children: ReactNode;
  userLabel: string;
  networkState: ShellNetworkState;
  busy?: boolean;
  errorMessage?: string | null;
  onSignOut?: () => void;
}

export function AppShellFrame({
  children,
  userLabel,
  networkState,
  busy = false,
  errorMessage = null,
  onSignOut,
}: AppShellFrameProps) {
  return (
    <div className="app-shell" data-network-state={networkState}>
      <a className="app-shell__skip-link" href="#main-content">انتقل إلى المحتوى</a>

      <header className="app-shell__topbar">
        <div className="app-shell__topbar-inner">
          <div className="app-shell__brand" aria-label="إنجاز">
            <span className="app-shell__brand-mark" aria-hidden="true">إ</span>
            <span className="app-shell__brand-copy">
              <strong>إنجاز</strong>
              <small>مساحة العمل</small>
            </span>
          </div>

          <div className="app-shell__account">
            <span className="app-shell__avatar" aria-hidden="true">{getShellUserInitial(userLabel)}</span>
            <span className="app-shell__account-copy">
              <strong>حساب إنجاز</strong>
              <small className="text-long-safe" dir="auto">{userLabel}</small>
            </span>
            {onSignOut ? (
              <IconButton
                label="تسجيل الخروج"
                icon={<ShellGlyph name="logout" />}
                onClick={onSignOut}
                disabled={busy}
              />
            ) : null}
          </div>
        </div>
      </header>

      {networkState === 'offline' ? (
        <div className="app-shell__network-banner" role="status" aria-live="polite">
          <span className="app-shell__status-dot" aria-hidden="true" />
          أنت غير متصل حاليًا. سيبقى الهيكل ثابتًا، وستُستعاد البيانات عند عودة الاتصال.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="app-shell__error-banner" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {busy ? (
        <div className="app-shell__busy" role="status" aria-live="polite">
          جارٍ إتمام العملية…
        </div>
      ) : null}

      <div className="app-shell__workspace">
        <nav className="app-shell__navigation" aria-label="التنقل الرئيسي">
          <div className="app-shell__navigation-inner">
            {SHELL_NAV_SLOTS.map((slot) => {
              const content = (
                <>
                  <span className="app-shell__nav-icon"><ShellGlyph name={slot.id} /></span>
                  <span className="app-shell__nav-label">{slot.label}</span>
                </>
              );

              return slot.destination ? (
                <Link
                  className="app-shell__nav-item app-shell__nav-item--active"
                  to={slot.destination}
                  aria-current="page"
                  key={slot.id}
                >
                  {content}
                </Link>
              ) : (
                <button
                  className="app-shell__nav-item"
                  type="button"
                  disabled
                  aria-label={`${slot.label} — سيتم تفعيلها في Phase 3.2`}
                  key={slot.id}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </nav>

        <main className="app-shell__main" id="main-content" tabIndex={-1}>
          <div className="app-shell__page-container">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AppShell() {
  const { user, service } = useAuth();
  const [networkState, setNetworkState] = useState<ShellNetworkState>(() =>
    resolveShellNetworkState(typeof navigator === 'undefined' ? true : navigator.onLine),
  );
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setNetworkState('online');
    const handleOffline = () => setNetworkState('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const signOut = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await service.signOut();
    } catch (error) {
      setErrorMessage(toAppError(error).userMessage);
      setBusy(false);
    }
  };

  return (
    <AppShellFrame
      userLabel={user?.email ?? user?.id ?? 'حساب إنجاز'}
      networkState={networkState}
      busy={busy}
      errorMessage={errorMessage}
      onSignOut={signOut}
    >
      <Outlet />
    </AppShellFrame>
  );
}
