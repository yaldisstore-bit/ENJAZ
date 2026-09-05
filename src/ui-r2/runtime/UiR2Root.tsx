import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  R2_DESTINATIONS,
  R2_LAUNCHER_GROUPS,
  R2_PRIMARY_NAVIGATION,
  R2_SEARCH_ALIASES,
  getR2Destination,
  type R2DestinationId,
} from '../architecture/navigation-contract.ts';
import { GoldenTransactionExperience } from '../golden/GoldenTransactionExperience.tsx';

const SHELL_STAGE = 'R2.0-3' as const;
type OverlayId = 'search' | 'account' | null;
type PrimaryDoor = (typeof R2_PRIMARY_NAVIGATION)[number];
type IconName = 'home' | 'transactions' | 'plus' | 'today' | 'more' | 'search' | 'user' | 'arrow' | 'spark' | 'module';

const VALID_DESTINATIONS = new Set<R2DestinationId>(R2_DESTINATIONS.map((item) => item.id));

function Icon({ name }: { name: IconName }) {
  const common = { className: 'ez-r2-icon', viewBox: '0 0 24 24', 'aria-hidden': true } as const;
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" /><path d="M9 21v-6h6v6" /></svg>;
    case 'transactions':
      return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'today':
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 18h7" /></svg>;
    case 'more':
      return <svg {...common}><circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" /></svg>;
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;
    case 'user':
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
    case 'arrow':
      return <svg {...common}><path d="m9 5 7 7-7 7" /></svg>;
    case 'spark':
      return <svg {...common}><path d="M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5-6.5-2L10 9z" /></svg>;
    case 'module':
      return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></svg>;
  }
}

const ICONS: Record<PrimaryDoor, IconName> = {
  home: 'home',
  transactions: 'transactions',
  create: 'plus',
  today: 'today',
  more: 'more',
};

function readUrlState(): { destinationId: R2DestinationId; overlay: OverlayId } {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('dest') as R2DestinationId | null;
  const rawOverlay = params.get('overlay');
  return {
    destinationId: requested && VALID_DESTINATIONS.has(requested) ? requested : 'home',
    overlay: rawOverlay === 'search' || rawOverlay === 'account' ? rawOverlay : null,
  };
}

function writeUrlState(destinationId: R2DestinationId, overlay: OverlayId, mode: 'push' | 'replace' = 'push') {
  const url = new URL(window.location.href);
  if (destinationId === 'home') url.searchParams.delete('dest');
  else url.searchParams.set('dest', destinationId);
  if (overlay) url.searchParams.set('overlay', overlay);
  else url.searchParams.delete('overlay');
  const method = mode === 'replace' ? 'replaceState' : 'pushState';
  window.history[method]({ r2: true, destinationId, overlay }, '', url);
}

function doorFor(destinationId: R2DestinationId): PrimaryDoor {
  if (destinationId === 'home') return 'home';
  if (destinationId === 'transactions' || destinationId.startsWith('transactions.')) return 'transactions';
  if (destinationId === 'create') return 'create';
  if (destinationId === 'today' || destinationId === 'today.notifications') return 'today';
  return 'more';
}

function trailFor(destinationId: R2DestinationId) {
  if (destinationId === 'home') return ['الرئيسية'];
  if (destinationId === 'transactions') return ['الرئيسية', 'المعاملات'];
  if (destinationId.startsWith('transactions.')) return ['الرئيسية', 'المعاملات', getR2Destination(destinationId).label];
  if (destinationId === 'create') return ['الرئيسية', 'جديد'];
  if (destinationId === 'today' || destinationId === 'today.notifications') return ['الرئيسية', 'اليوم'];
  if (destinationId === 'more') return ['الرئيسية', 'المزيد'];
  return ['الرئيسية', 'المزيد', getR2Destination(destinationId).label];
}

function ActionButton({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
  return <button type="button" className={`r2-shell-button ${className}`.trim()} onClick={onClick}>{children}</button>;
}

function Door({ id, active, mode, navigate }: { id: PrimaryDoor; active: boolean; mode: 'rail' | 'dock'; navigate: (id: R2DestinationId) => void }) {
  return (
    <button
      type="button"
      data-door={id}
      aria-current={active ? 'page' : undefined}
      className={`r2-door r2-door--${mode}${id === 'create' ? ' r2-door--create' : ''}`}
      onClick={() => navigate(id)}
    >
      <span className="r2-door__icon"><Icon name={ICONS[id]} /></span>
      <span className="r2-door__label">{getR2Destination(id).label}</span>
    </button>
  );
}

function Home({ navigate }: { navigate: (id: R2DestinationId) => void }) {
  return (
    <div className="r2-screen r2-home-screen" data-screen="home">
      <section className="r2-hero" aria-labelledby="r2-hero-title">
        <div className="r2-hero__graphic" aria-hidden="true"><span /><span /><span /></div>
        <div className="r2-hero__copy">
          <p className="r2-eyebrow"><Icon name="spark" /> مساحة العمل الجديدة</p>
          <h1 id="r2-hero-title">ما الذي يحتاج انتباهك الآن؟</h1>
          <p>إنجاز يبدأ من القرار والعمل، لا من جدار أرقام وبطاقات متساوية.</p>
          <div className="r2-hero__actions">
            <ActionButton className="r2-action r2-action--light" onClick={() => navigate('transactions')}>فتح المعاملات <Icon name="arrow" /></ActionButton>
            <ActionButton className="r2-action r2-action--ghost" onClick={() => navigate('today')}>عمل اليوم</ActionButton>
          </div>
        </div>
        <div className="r2-hero__signal">
          <span>الأولوية الآن</span>
          <strong>3 عناصر تحتاج قرارًا</strong>
          <small>Golden specimen · ليست بيانات إنتاج.</small>
        </div>
      </section>

      <section className="r2-home-flow">
        <div className="r2-section-heading">
          <div><p className="r2-eyebrow">تدفق واضح</p><h2>أكمل من حيث توقفت</h2></div>
          <ActionButton className="r2-link-button" onClick={() => navigate('today')}>عرض اليوم <Icon name="arrow" /></ActionButton>
        </div>
        <div className="r2-focus-list">
          {[
            ['01', 'معاملة بانتظار متابعة', 'المعاملات ← متابعة السياق دون مغادرة المسار', 'transactions'],
            ['02', 'جدول اليوم', 'مكان واحد للعمل الحالي والمتابعات', 'today'],
            ['03', 'كل أدوات إنجاز', 'خريطة صريحة بدل الأبواب المخفية', 'more'],
          ].map(([index, title, subtitle, id]) => (
            <button key={index} type="button" className="r2-focus-row" onClick={() => navigate(id as R2DestinationId)}>
              <span className="r2-focus-row__marker">{index}</span>
              <span className="r2-focus-row__content"><strong>{title}</strong><small>{subtitle}</small></span>
              <Icon name="arrow" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

type TransactionSegment = 'جارية' | 'متلكئة' | 'مغلقة';

function Transactions({ navigate }: { navigate: (id: R2DestinationId) => void }) {
  const [segment, setSegment] = useState<TransactionSegment>('جارية');
  const [query, setQuery] = useState('');
  const rows = [
    { id: '1042', title: 'تعديل عقد تأسيس', company: 'شركة الرافدين', meta: 'آخر نشاط قبل 18 دقيقة', status: 'جارية' as const, goldenJourney: true },
    { id: '1038', title: 'زيادة رأس المال', company: 'شركة أفق بغداد', meta: 'متابعة مستحقة اليوم', status: 'جارية' as const, goldenJourney: false },
    { id: '1029', title: 'تغيير مدير مفوض', company: 'شركة نقطة الأعمال', meta: 'بانتظار مستند', status: 'متلكئة' as const, goldenJourney: false },
    { id: '1016', title: 'تحديث عنوان شركة', company: 'شركة جسور', meta: 'أغلقت أمس', status: 'مغلقة' as const, goldenJourney: false },
  ];
  const normalized = query.trim();
  const visibleRows = rows.filter((row) => row.status === segment && (!normalized || `${row.id} ${row.title} ${row.company}`.includes(normalized)));

  return (
    <div className="r2-screen" data-screen="transactions">
      <div className="r2-section-heading r2-section-heading--hero">
        <div><p className="r2-eyebrow">Golden Experience · المجال التشغيلي الأساسي</p><h1>المعاملات</h1><p className="r2-supporting">قائمة واضحة، بحث داخل السياق، وهوية قوية لكل سجل. الرحلة الذهبية الكاملة مثبتة على المعاملة #1042.</p></div>
        <ActionButton className="r2-action r2-action--primary" onClick={() => navigate('create')}><Icon name="plus" /> معاملة جديدة</ActionButton>
      </div>
      <div className="r2-transaction-tools">
        <label className="r2-transaction-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالرقم أو العنوان أو الشركة" aria-label="بحث المعاملات" /></label>
        <div className="r2-segment" aria-label="تقسيم المعاملات">
          {(['جارية', 'متلكئة', 'مغلقة'] as const).map((item) => <button key={item} type="button" aria-pressed={segment === item} onClick={() => setSegment(item)}>{item}</button>)}
        </div>
      </div>
      <section className="r2-record-list" aria-label="عينة Golden للمعاملات">
        {visibleRows.length ? visibleRows.map((row, index) => row.goldenJourney ? (
          <button type="button" className="r2-record-row r2-record-row--golden" key={row.id} onClick={() => navigate('transactions.detail')} aria-label={`فتح المعاملة ${row.id} ${row.title}`}>
            <span className="r2-record-row__number">#{row.id}</span>
            <span className="r2-record-row__identity"><strong>{row.title}</strong><small>{row.company}</small></span>
            <span className="r2-record-row__meta">{row.meta}</span>
            <span className="r2-record-row__index">Golden</span>
            <Icon name="arrow" />
          </button>
        ) : (
          <article className="r2-record-row r2-record-row--static" key={row.id}>
            <span className="r2-record-row__number">#{row.id}</span>
            <span className="r2-record-row__identity"><strong>{row.title}</strong><small>{row.company}</small></span>
            <span className="r2-record-row__meta">{row.meta}</span>
            <span className="r2-record-row__index">0{index + 1}</span>
            <span className="r2-record-row__sample">عينة قائمة</span>
          </article>
        )) : <p className="r2-golden-empty">لا توجد نتيجة ضمن عينة Golden الحالية.</p>}
      </section>
      <p className="r2-preview-note">R2.0-4 يثبت تجربة واحدة كاملة قابلة للاختبار (#1042) قبل تعميم النمط على جميع السجلات في R2.0-5.</p>
    </div>
  );
}

function Today({ navigate }: { navigate: (id: R2DestinationId) => void }) {
  const items = [
    ['09:30', 'متابعة معاملة 1038', 'المعاملات', 'transactions'],
    ['12:00', 'مراجعة وثيقة واردة', 'الوثائق', 'documents'],
    ['14:30', 'قرار مالي يحتاج مراجعة', 'المالية', 'finance'],
  ];
  return (
    <div className="r2-screen" data-screen="today">
      <div className="r2-section-heading r2-section-heading--hero"><div><p className="r2-eyebrow">الآن</p><h1>اليوم</h1><p className="r2-supporting">العمل الذي يحتاجك اليوم بترتيب واضح، بدل تشتيت المهام في أنحاء التطبيق.</p></div></div>
      <section className="r2-timeline">
        {items.map(([time, title, context, id]) => (
          <button type="button" key={time} className="r2-timeline-row" onClick={() => navigate(id as R2DestinationId)}>
            <time>{time}</time><span className="r2-timeline-row__track"><i /></span><span className="r2-timeline-row__copy"><strong>{title}</strong><small>{context}</small></span><Icon name="arrow" />
          </button>
        ))}
      </section>
    </div>
  );
}

function Create({ navigate }: { navigate: (id: R2DestinationId) => void }) {
  return (
    <div className="r2-screen" data-screen="create">
      <div className="r2-section-heading r2-section-heading--hero"><div><p className="r2-eyebrow">إجراء عالمي</p><h1>ماذا تريد أن تنشئ؟</h1><p className="r2-supporting">نقطة إنشاء واحدة. الخيارات لا تظهر كوظائف حقيقية قبل ربطها ببياناتها وصلاحياتها.</p></div></div>
      <button type="button" className="r2-create-primary" onClick={() => navigate('transactions.editor')}>
        <span className="r2-create-primary__icon"><Icon name="transactions" /></span><span><strong>معاملة جديدة</strong><small>يفتح محرر Golden التفاعلي دون كتابة في بيانات الإنتاج</small></span><Icon name="arrow" />
      </button>
      <div className="r2-create-later"><span>خيارات أخرى</span><p>ستظهر هنا فقط عندما تصبح مدعومة ببيانات حقيقية وعقد صلاحيات واضح.</p></div>
    </div>
  );
}

function More({ navigate }: { navigate: (id: R2DestinationId) => void }) {
  return (
    <div className="r2-screen" data-screen="more">
      <div className="r2-section-heading r2-section-heading--hero"><div><p className="r2-eyebrow">خريطة النظام · Golden</p><h1>المزيد</h1><p className="r2-supporting">كل قدرة لها منزل واحد واضح. المجموعات منفصلة بصريًا لكن تبقى صفحة واحدة متماسكة، دون جدار بطاقات.</p></div></div>
      <div className="r2-launcher-groups">
        {R2_LAUNCHER_GROUPS.map((group) => (
          <section className="r2-launcher-group" key={group.id}>
            <h2>{group.label}</h2>
            <div className="r2-launcher-list">
              {group.destinations.map((id) => (
                <button type="button" key={id} className="r2-launcher-row" onClick={() => navigate(id)}>
                  <span className="r2-launcher-row__icon"><Icon name="module" /></span><span className="r2-launcher-row__copy"><strong>{getR2Destination(id).label}</strong><small>منزل قانوني واحد</small></span><Icon name="arrow" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Destination({ id, navigate }: { id: R2DestinationId; navigate: (id: R2DestinationId) => void }) {
  const destination = getR2Destination(id);
  const transactionContext = id.startsWith('transactions.');
  if (transactionContext) {
    return <GoldenTransactionExperience id={id as Extract<R2DestinationId, `transactions.${string}`>} navigate={navigate} />;
  }
  return (
    <div className="r2-screen r2-destination-placeholder" data-screen="launcher-destination">
      <div className="r2-destination-mark"><Icon name="module" /></div><p className="r2-eyebrow">وجهة مثبتة في بنية إنجاز الجديدة</p><h1>{destination.label}</h1>
      <p>الـShell يعرف مكان هذه الميزة وطريق الوصول إليها. محتوى المجال نفسه سيُبنى في مرحلة الترحيل المخصصة له؛ R2.0-4 يصقل طبقات الهوية والعنوان والوصف والأفعال دون ادعاء بيانات غير موجودة.</p>
      <div className="r2-placeholder-actions"><ActionButton className="r2-action r2-action--primary" onClick={() => navigate('more')}>العودة إلى المزيد</ActionButton><ActionButton className="r2-action r2-action--secondary" onClick={() => navigate('home')}>الرئيسية</ActionButton></div>
    </div>
  );
}

function SearchOverlay({ query, setQuery, close, navigate }: { query: string; setQuery: (value: string) => void; close: () => void; navigate: (id: R2DestinationId) => void }) {
  const normalized = query.trim();
  const results = useMemo(() => {
    const selected = new Map<R2DestinationId, (typeof R2_DESTINATIONS)[number]>();
    if (!normalized) {
      for (const id of ['transactions', 'today', 'companies', 'finance', 'automation', 'documents'] as R2DestinationId[]) selected.set(id, getR2Destination(id));
    } else {
      for (const item of R2_DESTINATIONS) if (item.label.includes(normalized) || item.id.includes(normalized.toLowerCase())) selected.set(item.id, item);
      for (const [alias, id] of Object.entries(R2_SEARCH_ALIASES)) if (alias.includes(normalized) || normalized.includes(alias)) selected.set(id, getR2Destination(id));
    }
    return Array.from(selected.values()).slice(0, 8);
  }, [normalized]);

  return (
    <div className="r2-overlay" role="dialog" aria-modal="true" data-overlay="search" aria-labelledby="r2-search-title">
      <button type="button" className="r2-overlay__backdrop" aria-label="إغلاق البحث" onClick={close} />
      <section className="r2-search-panel">
        <div className="r2-search-panel__head"><div><p className="r2-eyebrow">Find Anything</p><h2 id="r2-search-title">ابحث عن أي شيء</h2></div><button type="button" className="r2-close-button" onClick={close} aria-label="إغلاق">×</button></div>
        <label className="r2-search-input-wrap"><Icon name="search" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثال: خزنة، أتمتة، معاملات، مالية…" /></label>
        <div className="r2-search-results" aria-live="polite">
          {results.length ? results.map((item) => (
            <button type="button" key={item.id} className="r2-search-result" onClick={() => navigate(item.id)}><span className="r2-search-result__icon"><Icon name="module" /></span><span><strong>{item.label}</strong><small>{item.kind === 'launcher_destination' ? 'ميزة' : 'وجهة'}</small></span><Icon name="arrow" /></button>
          )) : <p className="r2-search-empty">لا توجد نتيجة ضمن خريطة الـShell الحالية.</p>}
        </div>
        <p className="r2-search-footnote">البحث عن الميزات والتنقل القانوني مثبتان في الـShell؛ البحث في السجلات الحقيقية يكتمل في R2.0-8.</p>
      </section>
    </div>
  );
}

function AccountOverlay({ close }: { close: () => void }) {
  return (
    <div className="r2-overlay" role="dialog" aria-modal="true" data-overlay="account" aria-labelledby="r2-account-title">
      <button type="button" className="r2-overlay__backdrop" aria-label="إغلاق الحساب" onClick={close} />
      <section className="r2-account-sheet">
        <div className="r2-account-sheet__handle" aria-hidden="true" /><div className="r2-account-sheet__profile"><span className="r2-avatar"><Icon name="user" /></span><div><p className="r2-eyebrow">مساحة العمل</p><h2 id="r2-account-title">حساب إنجاز</h2><small>واجهة Golden متوازية — لا تغيّر بيانات الحساب.</small></div></div>
        <button type="button" className="r2-account-row" onClick={close}><span>إعدادات مساحة العمل</span><Icon name="arrow" /></button><button type="button" className="r2-account-row" onClick={close}><span>تفضيلات الواجهة</span><Icon name="arrow" /></button><button type="button" className="r2-action r2-action--secondary r2-account-close" onClick={close}>إغلاق</button>
      </section>
    </div>
  );
}

export function UiR2Root() {
  const initial = readUrlState();
  const [destinationId, setDestinationId] = useState<R2DestinationId>(initial.destinationId);
  const [overlay, setOverlay] = useState<OverlayId>(initial.overlay);
  const [searchQuery, setSearchQuery] = useState('');
  const ownedOverlay = useRef(false);

  useEffect(() => {
    const syncFromHistory = () => {
      const next = readUrlState();
      setDestinationId(next.destinationId);
      setOverlay(next.overlay);
      ownedOverlay.current = false;
    };
    window.addEventListener('popstate', syncFromHistory);
    return () => window.removeEventListener('popstate', syncFromHistory);
  }, []);

  const closeOverlay = () => {
    if (ownedOverlay.current) {
      ownedOverlay.current = false;
      window.history.back();
    } else {
      writeUrlState(destinationId, null, 'replace');
      setOverlay(null);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && overlay) {
        event.preventDefault();
        closeOverlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const navigate = (id: R2DestinationId) => {
    writeUrlState(id, null);
    setDestinationId(id);
    setOverlay(null);
    ownedOverlay.current = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const openOverlay = (id: Exclude<OverlayId, null>) => {
    writeUrlState(destinationId, id);
    setOverlay(id);
    ownedOverlay.current = true;
  };

  const currentDoor = doorFor(destinationId);
  const trail = trailFor(destinationId);
  let content: ReactNode;
  if (destinationId === 'home') content = <Home navigate={navigate} />;
  else if (destinationId === 'transactions') content = <Transactions navigate={navigate} />;
  else if (destinationId === 'today' || destinationId === 'today.notifications') content = <Today navigate={navigate} />;
  else if (destinationId === 'create') content = <Create navigate={navigate} />;
  else if (destinationId === 'more') content = <More navigate={navigate} />;
  else content = <Destination id={destinationId} navigate={navigate} />;

  return (
    <div className="ez-r2-root r2-shell" data-r2-shell={SHELL_STAGE} data-golden-stage="R2.0-4" data-destination={destinationId}>
      <aside className="r2-shell__rail" aria-label="التنقل الرئيسي">
        <button type="button" className="r2-brand" onClick={() => navigate('home')} aria-label="إنجاز — الرئيسية"><span className="r2-brand__mark">إ</span><span><strong>إنجاز</strong><small>Workspace</small></span></button>
        <nav className="r2-rail-nav">{R2_PRIMARY_NAVIGATION.map((id) => <Door key={id} id={id} active={currentDoor === id} mode="rail" navigate={navigate} />)}</nav>
        <div className="r2-rail-foot"><button type="button" onClick={() => openOverlay('search')}><Icon name="search" /><span>ابحث عن أي شيء</span></button><span className="r2-stage-pill">R2.0-4 Golden</span></div>
      </aside>

      <div className="r2-shell__workspace">
        <header className="r2-topbar">
          <div className="r2-mobile-brand"><span className="r2-brand__mark">إ</span><strong>إنجاز</strong></div>
          <div className="r2-location" aria-label="الموقع الحالي">{trail.map((item, index) => <span key={`${item}-${index}`}>{index > 0 && <b>←</b>}{item}</span>)}</div>
          <div className="r2-topbar__actions"><button type="button" className="r2-icon-button" onClick={() => openOverlay('search')} aria-label="ابحث عن أي شيء"><Icon name="search" /></button><button type="button" className="r2-icon-button r2-icon-button--account" onClick={() => openOverlay('account')} aria-label="الحساب ومساحة العمل"><Icon name="user" /></button></div>
        </header>
        <main className="r2-shell__main" id="r2-main" aria-label={getR2Destination(destinationId).label}>{content}</main>
        <nav className="r2-shell__mobile-nav" aria-label="التنقل الرئيسي للهاتف">{R2_PRIMARY_NAVIGATION.map((id) => <Door key={id} id={id} active={currentDoor === id} mode="dock" navigate={navigate} />)}</nav>
      </div>

      {overlay === 'search' && <SearchOverlay query={searchQuery} setQuery={setSearchQuery} close={closeOverlay} navigate={navigate} />}
      {overlay === 'account' && <AccountOverlay close={closeOverlay} />}
    </div>
  );
}
