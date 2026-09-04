import { useEffect, useMemo, useRef, useState } from 'react';
import { ROUTES, type AppRoute } from '../../core/routing/routes.ts';
import type { HomeDashboardLoadState } from '../../features/home/useHomeDashboard.ts';
import { RebirthHomeDashboard } from './RebirthHomeDashboard.tsx';
import './rebirth-app-shell.css';

type NavItem = {
  label: string;
  route: AppRoute;
  icon: 'home' | 'today' | 'transactions' | 'more';
};

export interface RebirthAppShellProps {
  readonly homeState: HomeDashboardLoadState;
  readonly onHomeRetry?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'الرئيسية', route: ROUTES.appHome, icon: 'home' },
  { label: 'اليوم', route: ROUTES.appToday, icon: 'today' },
  { label: 'المعاملات', route: ROUTES.appTransactions, icon: 'transactions' },
  { label: 'المزيد', route: ROUTES.appMore, icon: 'more' },
];

const QUICK_ACTIONS = [
  { label: 'معاملة جديدة', description: 'إنشاء معاملة وربطها بجهاتها', glyph: 'م' },
  { label: 'متابعة جديدة', description: 'إضافة متابعة بموعد وأولوية', glyph: 'ت' },
  { label: 'شركة جديدة', description: 'إضافة شركة إلى مساحة العمل', glyph: 'ش' },
  { label: 'مستند جديد', description: 'إضافة مستند وربطه بسجله', glyph: 'و' },
] as const;

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function Icon({ name }: { name: NavItem['icon'] | 'search' | 'bell' | 'close' }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'home') return <svg {...common}><path d="M3.8 10.7 12 4l8.2 6.7v8.1a1.7 1.7 0 0 1-1.7 1.7h-13a1.7 1.7 0 0 1-1.7-1.7z"/><path d="M9.2 20.5v-6.2h5.6v6.2"/></svg>;
  if (name === 'today') return <svg {...common}><rect x="3.5" y="5.2" width="17" height="15" rx="3"/><path d="M7.4 3.5v3.4M16.6 3.5v3.4M3.5 9.4h17"/><path d="M8 13h3M8 16.4h7"/></svg>;
  if (name === 'transactions') return <svg {...common}><path d="M6 4.2h9.7L19 7.5v12.3H6z"/><path d="M15.7 4.2v3.3H19M9 11.5h7M9 15h7"/></svg>;
  if (name === 'more') return <svg {...common}><circle cx="5" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.35" fill="currentColor" stroke="none"/></svg>;
  if (name === 'search') return <svg {...common}><circle cx="10.7" cy="10.7" r="6.4"/><path d="m15.4 15.4 4.3 4.3"/></svg>;
  if (name === 'bell') return <svg {...common}><path d="M18 9.8a6 6 0 0 0-12 0c0 7-2.5 7-2.5 8.5h17C20.5 16.8 18 16.8 18 9.8Z"/><path d="M9.5 20a2.8 2.8 0 0 0 5 0"/></svg>;
  return <svg {...common}><path d="m6 6 12 12M18 6 6 18"/></svg>;
}

export function RebirthAppShell(props: RebirthAppShellProps) {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(ROUTES.appHome);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const quickSheetRef = useRef<HTMLElement>(null);

  const activeLabel = useMemo(
    () => NAV_ITEMS.find((item) => item.route === activeRoute)?.label ?? 'إنجاز',
    [activeRoute],
  );

  const closeQuickActions = () => {
    setQuickActionsOpen(false);
    requestAnimationFrame(() => primaryActionRef.current?.focus());
  };

  useEffect(() => {
    if (!quickActionsOpen) return;
    const sheet = quickSheetRef.current;
    const initialFocus = sheet?.querySelector<HTMLElement>('[data-autofocus]');
    requestAnimationFrame(() => initialFocus?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeQuickActions();
        return;
      }
      if (event.key !== 'Tab' || !sheet) return;

      const focusables = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
        .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
      const first = focusables.at(0);
      const last = focusables.at(-1);
      if (!first || !last) return;

      const active = document.activeElement;
      if (event.shiftKey && (active === first || !sheet.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !sheet.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [quickActionsOpen]);

  const mainContent = activeRoute === ROUTES.appHome ? (
    <RebirthHomeDashboard state={props.homeState} onNavigate={setActiveRoute} onRetry={props.onHomeRetry} />
  ) : (
    <section className="rebirth-shell__content-stage" aria-label="مساحة العمل">
      <div className="rebirth-shell__stage-kicker"><span className="rebirth-shell__stage-dot" aria-hidden="true" />مساحة العمل</div>
      <h1>{activeLabel}</h1>
      <p>مساحة جاهزة لمحتوى الصفحة مع بقاء الهيكل العام ثابتًا وواضحًا.</p>
      <div className="rebirth-shell__stage-lines" aria-hidden="true"><span /><span /><span /></div>
    </section>
  );

  return (
    <div className="rebirth-shell" data-enjaz-ui="rebirth" dir="rtl">
      <div className="rebirth-shell__ambient rebirth-shell__ambient--gold" aria-hidden="true" />
      <div className="rebirth-shell__ambient rebirth-shell__ambient--ink" aria-hidden="true" />

      <header className="rebirth-shell__header" aria-label="رأس التطبيق" inert={quickActionsOpen ? true : undefined}>
        <div className="rebirth-shell__brand" aria-label="إنجاز">
          <span className="rebirth-shell__brand-mark" aria-hidden="true">إ</span>
          <span className="rebirth-shell__brand-copy"><strong>إنجاز</strong><small>{activeLabel}</small></span>
        </div>
        <div className="rebirth-shell__header-actions">
          <button className="rebirth-shell__icon-button ui-pressable" type="button" aria-label="بحث"><Icon name="search" /></button>
          <button className="rebirth-shell__icon-button ui-pressable rebirth-shell__notification" type="button" aria-label="الإشعارات"><Icon name="bell" /><span aria-hidden="true" /></button>
          <button className="rebirth-shell__avatar ui-pressable" type="button" aria-label="الحساب الشخصي">ي</button>
        </div>
      </header>

      <main className="rebirth-shell__viewport" id="main-content" inert={quickActionsOpen ? true : undefined}>
        {mainContent}
      </main>

      <nav className="rebirth-shell__dock" aria-label="التنقل الرئيسي" inert={quickActionsOpen ? true : undefined}>
        <div className="rebirth-shell__dock-surface">
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <button className="rebirth-shell__nav-item ui-pressable" data-active={activeRoute === item.route ? 'true' : 'false'} data-route={item.route} key={item.route} type="button" aria-current={activeRoute === item.route ? 'page' : undefined} onClick={() => setActiveRoute(item.route)}>
              <span className="rebirth-shell__nav-icon"><Icon name={item.icon} /></span><span>{item.label}</span>
            </button>
          ))}
          <div className="rebirth-shell__cta-slot" aria-hidden="true" />
          {NAV_ITEMS.slice(2).map((item) => (
            <button className="rebirth-shell__nav-item ui-pressable" data-active={activeRoute === item.route ? 'true' : 'false'} data-route={item.route} key={item.route} type="button" aria-current={activeRoute === item.route ? 'page' : undefined} onClick={() => setActiveRoute(item.route)}>
              <span className="rebirth-shell__nav-icon"><Icon name={item.icon} /></span><span>{item.label}</span>
            </button>
          ))}
        </div>
        <button ref={primaryActionRef} className="rebirth-shell__primary-action ui-pressable" type="button" aria-label="إجراء جديد" aria-haspopup="dialog" aria-expanded={quickActionsOpen} aria-controls="rebirth-quick-actions" onClick={() => setQuickActionsOpen((open) => !open)}>
          <span aria-hidden="true" className="rebirth-shell__plus">+</span>
        </button>
      </nav>

      {quickActionsOpen && (
        <div className="rebirth-shell__overlay" role="presentation" onMouseDown={closeQuickActions}>
          <section ref={quickSheetRef} className="rebirth-shell__quick-sheet" id="rebirth-quick-actions" role="dialog" aria-modal="true" aria-labelledby="rebirth-quick-actions-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="rebirth-shell__sheet-handle" aria-hidden="true" />
            <header className="rebirth-shell__sheet-header">
              <div><small>إجراء سريع</small><h2 id="rebirth-quick-actions-title">ماذا تريد أن تنجز؟</h2></div>
              <button data-autofocus className="rebirth-shell__icon-button ui-pressable" type="button" aria-label="إغلاق" onClick={closeQuickActions}><Icon name="close" /></button>
            </header>
            <div className="rebirth-shell__quick-grid">
              {QUICK_ACTIONS.map((action) => (
                <button className="rebirth-shell__quick-action ui-pressable" type="button" key={action.label} onClick={closeQuickActions}>
                  <span className="rebirth-shell__quick-glyph" aria-hidden="true">{action.glyph}</span>
                  <span><strong>{action.label}</strong><small>{action.description}</small></span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
