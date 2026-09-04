import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BellIcon, BriefcaseIcon, MoreIcon, PlusIcon, SearchIcon, UserIcon, WalletIcon } from './icons.tsx';
import { EzButton, EzField, EzNotice, EzSurface } from './primitives.tsx';
import { EzSheet } from './overlays.tsx';

type ShellTab = 'home' | 'today' | 'operations' | 'finance';
type ShellOverlay = 'search' | 'notifications' | 'create' | null;

type NavItem = Readonly<{
  id: ShellTab;
  label: string;
  icon: ReactNode;
}>;

const navItems: readonly NavItem[] = [
  { id: 'home', label: 'الرئيسية', icon: <span aria-hidden="true">⌂</span> },
  { id: 'today', label: 'اليوم', icon: <BriefcaseIcon /> },
  { id: 'operations', label: 'العمليات', icon: <span aria-hidden="true">▦</span> },
  { id: 'finance', label: 'المالية', icon: <WalletIcon /> },
] as const;

function useVisualViewportContract() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;

    const update = () => {
      const visualHeight = viewport?.height ?? window.innerHeight;
      const keyboardGap = Math.max(0, window.innerHeight - visualHeight);
      root.style.setProperty('--ez-visual-viewport-height', `${Math.round(visualHeight)}px`);
      root.dataset.enjazKeyboard = keyboardGap > 140 ? 'open' : 'closed';
    };

    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      delete root.dataset.enjazKeyboard;
      root.style.removeProperty('--ez-visual-viewport-height');
    };
  }, []);
}

export function AppShell(props: Readonly<{
  title?: string;
  subtitle?: string;
  children: ReactNode;
  activeTab?: ShellTab;
  onTabChange?(tab: ShellTab): void;
}>) {
  useVisualViewportContract();
  const [internalTab, setInternalTab] = useState<ShellTab>('home');
  const [overlay, setOverlay] = useState<ShellOverlay>(null);
  const [searchValue, setSearchValue] = useState('');
  const activeTab = props.activeTab ?? internalTab;

  const setTab = (tab: ShellTab) => {
    setInternalTab(tab);
    props.onTabChange?.(tab);
  };

  const openOverlay = (next: Exclude<ShellOverlay, null>) => {
    if (!overlay) window.history.pushState({ enjazUi4Overlay: true }, document.title);
    setOverlay(next);
  };

  const closeOverlay = () => {
    if (window.history.state?.enjazUi4Overlay) {
      window.history.back();
      return;
    }
    setOverlay(null);
  };

  useEffect(() => {
    const onPopState = () => setOverlay(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && overlay) {
        event.preventDefault();
        closeOverlay();
      }
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [overlay]);

  const title = props.title ?? 'إنجاز';
  const subtitle = props.subtitle ?? 'مساحة العمل';
  const searchResult = useMemo(() => searchValue.trim() ? `نتائج تجريبية لـ «${searchValue.trim()}»` : 'ابدأ بكتابة اسم شركة أو معاملة أو محامٍ.', [searchValue]);

  return (
    <div className="ez-app-shell" data-enjaz-ui="v2" data-stage="ui-4" dir="rtl">
      <header className="ez-app-shell__topbar" data-shell-part="topbar">
        <div className="ez-app-shell__brand">
          <span className="ez-app-shell__brand-mark" aria-hidden="true">إ</span>
          <span className="ez-app-shell__brand-copy"><strong>{title}</strong><small>{subtitle}</small></span>
        </div>
        <div className="ez-app-shell__top-actions">
          <button type="button" className="ez-shell-icon-button" aria-label="بحث" onClick={() => openOverlay('search')}><SearchIcon /></button>
          <button type="button" className="ez-shell-icon-button ez-shell-icon-button--badge" aria-label="الإشعارات" onClick={() => openOverlay('notifications')}><BellIcon /><span>3</span></button>
          <button type="button" className="ez-shell-avatar" aria-label="الحساب"><UserIcon /></button>
        </div>
      </header>

      <main className="ez-app-shell__content" data-shell-part="content">
        {props.children}
      </main>

      <nav className="ez-bottom-dock" aria-label="التنقل الرئيسي" data-shell-part="bottom-dock">
        <div className="ez-bottom-dock__rail">
          {navItems.slice(0, 2).map((item) => (
            <button key={item.id} type="button" className={activeTab === item.id ? 'ez-bottom-dock__item is-active' : 'ez-bottom-dock__item'} aria-label={item.label} aria-current={activeTab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}>
              <span className="ez-bottom-dock__icon">{item.icon}</span><small>{item.label}</small>
            </button>
          ))}

          <div className="ez-bottom-dock__primary-slot">
            <button type="button" className="ez-bottom-dock__primary" aria-label="إجراء جديد" onClick={() => openOverlay('create')}>
              <span className="ez-bottom-dock__primary-icon"><PlusIcon /></span>
              <small>جديد</small>
            </button>
          </div>

          {navItems.slice(2).map((item) => (
            <button key={item.id} type="button" className={activeTab === item.id ? 'ez-bottom-dock__item is-active' : 'ez-bottom-dock__item'} aria-label={item.label} aria-current={activeTab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}>
              <span className="ez-bottom-dock__icon">{item.icon}</span><small>{item.label}</small>
            </button>
          ))}
        </div>
      </nav>

      {overlay === 'search' ? (
        <div className="ez-shell-search" role="dialog" aria-modal="true" aria-label="البحث العام" data-overlay="search">
          <div className="ez-shell-search__panel">
            <div className="ez-shell-search__head"><div><span>GLOBAL SEARCH</span><h2>ابحث داخل إنجاز</h2></div><button type="button" className="ez-shell-close" aria-label="إغلاق البحث" onClick={closeOverlay}>×</button></div>
            <EzField label="عبارة البحث" placeholder="شركة، معاملة، محامٍ..." leading={<SearchIcon />} value={searchValue} onChange={(event) => setSearchValue(event.currentTarget.value)} autoFocus />
            <EzSurface tone="warm" emphasis="quiet" className="ez-shell-search__result"><strong>{searchResult}</strong><small>واجهة بحث تجريبية لا تغيّر أي بيانات.</small></EzSurface>
          </div>
        </div>
      ) : null}

      <EzSheet open={overlay === 'notifications'} title="الإشعارات" eyebrow="Inbox" onClose={closeOverlay}>
        <div className="ez-shell-sheet-list">
          <EzNotice title="معاملة تحتاج انتباه" body="تعديل عقد تأسيس متوقف منذ 48 ساعة." tone="warning" />
          <EzNotice title="تحصيل مكتمل" body="تم تسجيل دفعة جديدة ضمن معاملة نشطة." tone="success" />
          <EzNotice title="متابعة اليوم" body="موعد اتصال مع المحامي الساعة 15:20." tone="info" />
        </div>
      </EzSheet>

      <EzSheet open={overlay === 'create'} title="إجراء جديد" eyebrow="Quick Create" onClose={closeOverlay}>
        <div className="ez-shell-create-grid">
          <button type="button" onClick={closeOverlay}><span><BriefcaseIcon /></span><strong>معاملة</strong><small>إنشاء معاملة جديدة</small></button>
          <button type="button" onClick={closeOverlay}><span><UserIcon /></span><strong>شركة / شخص</strong><small>إضافة سجل جديد</small></button>
          <button type="button" onClick={closeOverlay}><span><WalletIcon /></span><strong>دفعة مالية</strong><small>تسجيل حركة مالية</small></button>
          <button type="button" onClick={closeOverlay}><span><MoreIcon /></span><strong>المزيد</strong><small>كل الإجراءات السريعة</small></button>
        </div>
        <EzButton tone="ghost" onClick={closeOverlay}>إغلاق</EzButton>
      </EzSheet>
    </div>
  );
}
