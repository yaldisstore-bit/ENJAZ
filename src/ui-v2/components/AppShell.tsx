import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BellIcon, BriefcaseIcon, MoreIcon, PlusIcon, SearchIcon, UserIcon, WalletIcon } from './icons.tsx';
import { EzBadge, EzButton, EzChip, EzField, EzNotice, EzSurface } from './primitives.tsx';
import { EzSheet } from './overlays.tsx';

type ShellTab = 'home' | 'today' | 'operations' | 'finance';
type ShellOverlay = 'search' | 'notifications' | 'create' | 'account' | null;
type CreateKind = 'transaction' | 'followup' | 'party' | 'payment' | 'more';

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

const searchResults = [
  { kind: 'معاملة', title: 'تعديل عقد تأسيس', detail: 'شركة الرافدين · #1042', tone: 'danger' as const },
  { kind: 'شركة', title: 'شركة الرافدين', detail: '3 معاملات نشطة · آخر نشاط اليوم', tone: 'gold' as const },
  { kind: 'محامٍ', title: 'أحمد هادي', detail: '5 معاملات مرتبطة', tone: 'info' as const },
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
  onBrandAction?(): void;
}>) {
  useVisualViewportContract();
  const [internalTab, setInternalTab] = useState<ShellTab>('home');
  const [overlay, setOverlay] = useState<ShellOverlay>(null);
  const [searchValue, setSearchValue] = useState('');
  const [createKind, setCreateKind] = useState<CreateKind>('transaction');
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

  useEffect(() => {
    const onOpenCreate = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === 'followup') setCreateKind('followup');
      if (!window.history.state?.enjazUi4Overlay) window.history.pushState({ enjazUi4Overlay: true }, document.title);
      setOverlay('create');
    };
    window.addEventListener('enjaz:open-create', onOpenCreate);
    return () => window.removeEventListener('enjaz:open-create', onOpenCreate);
  }, []);

  const title = props.title ?? 'إنجاز';
  const subtitle = props.subtitle ?? 'مساحة العمل';
  const normalizedQuery = searchValue.trim().toLocaleLowerCase('ar');
  const visibleResults = useMemo(() => normalizedQuery
    ? searchResults.filter((result) => `${result.kind} ${result.title} ${result.detail}`.toLocaleLowerCase('ar').includes(normalizedQuery) || normalizedQuery.length >= 2)
    : searchResults.slice(0, 2), [normalizedQuery]);

  const brandContent = <><span className="ez-app-shell__brand-mark" aria-hidden="true">إ</span><span className="ez-app-shell__brand-copy"><strong>{title}</strong><small>{subtitle}</small></span></>;

  return (
    <div className="ez-app-shell" data-enjaz-ui="v2" data-stage="ui-4" dir="rtl">
      <header className="ez-app-shell__topbar" data-shell-part="topbar">
        {props.onBrandAction ? (
          <button type="button" className="ez-app-shell__brand ez-app-shell__brand--interactive" aria-label="مجالات إنجاز" onClick={props.onBrandAction}>{brandContent}</button>
        ) : (
          <div className="ez-app-shell__brand">{brandContent}</div>
        )}
        <div className="ez-app-shell__top-actions">
          <button type="button" className="ez-shell-icon-button" aria-label="بحث" onClick={() => openOverlay('search')}><SearchIcon /></button>
          <button type="button" className="ez-shell-icon-button ez-shell-icon-button--badge" aria-label="الإشعارات" onClick={() => openOverlay('notifications')}><BellIcon /><span>3</span></button>
          <button type="button" className="ez-shell-avatar" aria-label="الحساب" onClick={() => openOverlay('account')}><UserIcon /></button>
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
            <button type="button" className="ez-bottom-dock__primary" aria-label="إجراء جديد" onClick={() => { setCreateKind('transaction'); openOverlay('create'); }}>
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
        <div className="ez-shell-search" role="dialog" aria-modal="true" aria-label="البحث العام" data-overlay="search" data-core-overlay="search">
          <div className="ez-shell-search__panel">
            <div className="ez-shell-search__head"><div><span>البحث العام</span><h2>ابحث داخل إنجاز</h2></div><button type="button" className="ez-shell-close" aria-label="إغلاق البحث" onClick={closeOverlay}>×</button></div>
            <EzField label="عبارة البحث" placeholder="شركة، معاملة، محامٍ..." prefix={<SearchIcon />} value={searchValue} onChange={(event) => setSearchValue(event.currentTarget.value)} autoFocus />
            <div className="ez-core-search-results" aria-live="polite">
              <div className="ez-core-search-results__head"><strong>{normalizedQuery ? 'النتائج' : 'وصول سريع'}</strong><small>{visibleResults.length} عناصر</small></div>
              {visibleResults.map((result) => (
                <button type="button" className="ez-core-search-result" key={`${result.kind}-${result.title}`} onClick={closeOverlay}>
                  <EzChip tone={result.tone}>{result.kind}</EzChip><span><strong>{result.title}</strong><small>{result.detail}</small></span><b aria-hidden="true">‹</b>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <EzSheet open={overlay === 'notifications'} title="الإشعارات" eyebrow="مركز الانتباه" onClose={closeOverlay}>
        <div className="ez-core-notifications" data-core-overlay="notifications">
          <div className="ez-core-notifications__summary"><span><strong>3</strong><small>تحتاج انتباهك</small></span><EzBadge tone="gold">اليوم</EzBadge></div>
          <div className="ez-shell-sheet-list">
            <EzNotice title="معاملة تحتاج انتباه" body="تعديل عقد تأسيس متوقف منذ 48 ساعة." tone="warning" action={<EzChip tone="danger">عاجل</EzChip>} />
            <EzNotice title="تحصيل مكتمل" body="تم تسجيل دفعة جديدة ضمن معاملة نشطة." tone="success" action={<EzChip tone="success">مكتمل</EzChip>} />
            <EzNotice title="متابعة اليوم" body="موعد اتصال مع المحامي الساعة 15:20." tone="info" action={<EzChip tone="info">15:20</EzChip>} />
          </div>
          <EzButton tone="ghost" onClick={closeOverlay}>عرض مركز الانتباه</EzButton>
        </div>
      </EzSheet>

      <EzSheet open={overlay === 'create'} title="إجراء جديد" eyebrow="إضافة سريعة" onClose={closeOverlay}>
        <div className="ez-shell-create-grid" data-core-overlay="create">
          <button type="button" className={createKind === 'transaction' ? 'is-selected' : ''} onClick={() => setCreateKind('transaction')} data-create-type="transaction"><span><BriefcaseIcon /></span><strong>معاملة</strong><small>إنشاء معاملة جديدة</small></button>
          <button type="button" className={createKind === 'followup' ? 'is-selected' : ''} onClick={() => setCreateKind('followup')} data-create-type="followup"><span><BellIcon /></span><strong>متابعة</strong><small>إضافة متابعة أو موعد</small></button>
          <button type="button" className={createKind === 'party' ? 'is-selected' : ''} onClick={() => setCreateKind('party')} data-create-type="party"><span><UserIcon /></span><strong>شركة / شخص</strong><small>إضافة سجل جديد</small></button>
          <button type="button" className={createKind === 'payment' ? 'is-selected' : ''} onClick={() => setCreateKind('payment')} data-create-type="payment"><span><WalletIcon /></span><strong>دفعة مالية</strong><small>تسجيل حركة مالية</small></button>
          <button type="button" className={createKind === 'more' ? 'is-selected' : ''} onClick={() => setCreateKind('more')} data-create-type="more"><span><MoreIcon /></span><strong>المزيد</strong><small>كل الإجراءات المتاحة</small></button>
        </div>
        <EzSurface tone="warm" emphasis="quiet" className="ez-core-create-selection"><span>الإجراء المحدد</span><strong>{createKind === 'transaction' ? 'معاملة جديدة' : createKind === 'followup' ? 'متابعة جديدة' : createKind === 'party' ? 'شركة أو شخص' : createKind === 'payment' ? 'دفعة مالية' : 'المزيد من الإجراءات'}</strong></EzSurface>
        <EzButton tone="dark" onClick={closeOverlay}>متابعة</EzButton>
      </EzSheet>

      <EzSheet open={overlay === 'account'} title="الحساب ومساحة العمل" eyebrow="إنجاز" onClose={closeOverlay}>
        <div className="ez-core-account" data-core-overlay="account">
          <section className="ez-core-account__identity"><span className="ez-core-account__avatar"><UserIcon /></span><div><strong>حساب إنجاز</strong><small>مدير مساحة العمل</small></div><EzBadge tone="success">نشط</EzBadge></section>
          <section className="ez-core-account__workspace"><span>مساحة العمل الحالية</span><strong>مساحة إنجاز الرئيسية</strong><small>بياناتك ومهامك وصلاحياتك ضمن مساحة واحدة.</small></section>
          <div className="ez-core-account__actions"><button type="button">إدارة الملف الشخصي</button><button type="button">إعدادات مساحة العمل</button><button type="button">الصلاحيات والأمان</button></div>
          <EzButton tone="ghost" onClick={closeOverlay}>إغلاق</EzButton>
        </div>
      </EzSheet>
    </div>
  );
}
