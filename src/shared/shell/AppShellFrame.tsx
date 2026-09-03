import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { IconButton } from '../../design-system/components/index.ts';
import {
  getProductNavigationRoute,
  normalizeNavigationPath,
  resolveBackDestination,
  resolvePrimaryNavigation,
} from '../../core/routing/navigationContract.ts';
import { ROUTES } from '../../core/routing/routes.ts';
import { GlobalInteractionSurfaces } from '../interactions/GlobalInteractionSurfaces.tsx';
import {
  getShellUserInitial,
  SHELL_NAV_SLOTS,
  type ShellNavGlyph,
  type ShellNetworkState,
} from './shellContract.ts';

interface ShellGlyphProps {
  name: ShellNavGlyph | 'logout' | 'back';
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
    case 'back':
      return <svg {...common}><path d="m14.5 6-6 6 6 6M9 12h10" /></svg>;
  }
}

export interface AppShellFrameProps {
  children: ReactNode;
  userLabel: string;
  networkState: ShellNetworkState;
  currentPath?: string;
  busy?: boolean;
  errorMessage?: string | null;
  inboxCount?: number;
  onSignOut?: () => void;
}

export function AppShellFrame({
  children,
  userLabel,
  networkState,
  currentPath = ROUTES.appHome,
  busy = false,
  errorMessage = null,
  inboxCount = 0,
  onSignOut,
}: AppShellFrameProps) {
  const normalizedPath = normalizeNavigationPath(currentPath);
  const activeNavigation = resolvePrimaryNavigation(normalizedPath);
  const backDestination = resolveBackDestination(normalizedPath);
  const productRoute = getProductNavigationRoute(normalizedPath);
  const sectionLabel = normalizedPath === ROUTES.appMore
    ? 'المزيد'
    : productRoute?.label ?? 'مساحة العمل';

  return (
    <div
      className="app-shell"
      data-network-state={networkState}
      data-navigation-active={activeNavigation ?? 'none'}
    >
      <a className="app-shell__skip-link" href="#main-content">انتقل إلى المحتوى</a>

      <header className="app-shell__topbar">
        <div className="app-shell__topbar-inner">
          <div className="app-shell__topbar-start">
            {backDestination ? (
              <Link
                className="app-shell__back-link"
                to={backDestination}
                aria-label="العودة إلى المستوى السابق"
              >
                <span className="app-shell__back-icon"><ShellGlyph name="back" /></span>
                <span className="app-shell__back-label">رجوع</span>
              </Link>
            ) : null}

            <div className="app-shell__brand" aria-label="إنجاز">
              <span className="app-shell__brand-mark" aria-hidden="true">إ</span>
              <span className="app-shell__brand-copy">
                <strong>إنجاز</strong>
                <small className="text-long-safe" dir="auto">{sectionLabel}</small>
              </span>
            </div>
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

        <GlobalInteractionSurfaces inboxCount={inboxCount} />
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
              const isActive = activeNavigation === slot.id;
              return (
                <span className="app-shell__nav-slot" key={slot.id}>
                  <Link
                    className={isActive
                      ? 'app-shell__nav-item app-shell__nav-item--active'
                      : 'app-shell__nav-item'}
                    to={slot.destination}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="app-shell__nav-icon"><ShellGlyph name={slot.id} /></span>
                    <span className="app-shell__nav-label">{slot.label}</span>
                  </Link>
                </span>
              );
            })}
          </div>
        </nav>

        <main className="app-shell__main" id="main-content" tabIndex={-1}>
          <div className="app-shell__page-container">
            <div className="app-shell__route-stage" key={normalizedPath}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
