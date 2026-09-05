import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  R2_DESTINATIONS,
  R2_LAUNCHER_GROUPS,
  R2_PRIMARY_NAVIGATION,
  R2_SEARCH_ALIASES,
  getR2Destination,
  type R2DestinationId,
} from '../architecture/navigation-contract.ts';

const SHELL_STAGE = 'R2.0-3' as const;

type OverlayId = 'search' | 'account' | null;
type IconName =
  | 'home'
  | 'transactions'
  | 'plus'
  | 'today'
  | 'more'
  | 'search'
  | 'user'
  | 'arrow'
  | 'spark'
  | 'building'
  | 'people'
  | 'documents'
  | 'operations'
  | 'workflow'
  | 'automation'
  | 'bell'
  | 'finance'
  | 'command'
  | 'risk'
  | 'copilot';

const DESTINATION_ICON: Partial<Record<R2DestinationId, IconName>> = {
  home: 'home',
  transactions: 'transactions',
  create: 'plus',
  today: 'today',
  more: 'more',
  search: 'search',
  account: 'user',
  companies: 'building',
  people: 'people',
  documents: 'documents',
  operations: 'operations',
  workflow: 'workflow',
  automation: 'automation',
  followups: 'bell',
  finance: 'finance',
  command: 'command',
  risk: 'risk',
  copilot: 'copilot',
};

const SHELL_DESTINATIONS = new Set<R2DestinationId>(R2_DESTINATIONS.map((item) => item.id));

function readUrlState(): { destinationId: R2DestinationId; overlay: OverlayId } {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('dest') as R2DestinationId | null;
  const requestedOverlay = params.get('overlay');

  return {
    destinationId: requested && SHELL_DESTINATIONS.has(requested) ? requested : 'home',
    overlay: requestedOverlay === 'search' || requestedOverlay === 'account' ? requestedOverlay : null,
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

function activeDoor(destinationId: R2DestinationId): (typeof R2_PRIMARY_NAVIGATION)[number] {
  if (destinationId === 'home') return 'home';
  if (destinationId === 'transactions' || destinationId.startsWith('transactions.')) return 'transactions';
  if (destinationId === 'create') return 'create';
  if (destinationId === 'today' || destinationId === 'today.notifications') return 'today';
  return 'more';
}

function locationTrail(destinationId: R2DestinationId): string[] {
  if (destinationId === 'home') return ['الرئيسية'];
  if (destinationId === 'transactions') return ['الرئيسية', 'المعاملات'];
  if (destinationId.startsWith('transactions.')) return ['الرئيسية', 'المعاملات', getR2Destination(destinationId).label];
  if (destinationId === 'create') return ['الرئيسية', 'جديد'];
  if (destinationId === 'today' || destinationId === 'today.notifications') return ['الرئيسية', 'اليوم'];
  if (destinationId === 'more') return ['الرئيسية', 'المزيد'];
  return ['الرئيسية', 'المزيد', getR2Destination(destinationId).label];
}

function Icon({ name }: { name: IconName }) {
  const common = { className: 'ez-r2-icon', viewBox: '0 0 24 24', 'aria-hidden': true } as const;

  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" /><path d="M9 21v-6h6v6" /></svg>;
    case 'transactions':
      return <svg {...common}><path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'today':
      return <svg {...common}><path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" /><path d="M7 2v4M17 2v4M3 9h18M8 13h3M8 17h7" /></svg>;
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
    case 'building':
      return <svg {...common}><path d="M5 21V5l7-3v19M12 8h7v13M8 7h1M8 11h1M8 15h1M15 11h1M15 15h1" /></svg>;
    case 'people':
      return <svg {...common}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3 21a6 6 0 0 1 12 0M14 17a5 5 0 0 1 7 4" /></svg>;
    case 'documents':
      return <svg {...common}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></svg>;
    case 'operations':
      return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="10" cy="18" r="2" /></svg>;
    case 'workflow':
      return <svg {...common}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M8.5 6h7M7.5 8l3.5 7.5M16.5 8 13 15.5" /></svg>;
    case 'automation':
      return <svg {...common}><path d="M8 4h8M12 4v4M5 9h14v10H5z" /><circle cx="9" cy="14" r="1" /><circle cx="15" cy="14" r="1" /><path d="M9 17h6" /></svg>;
    case 'bell':
      return <svg {...common}><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 20h4" /></svg>;
    case 'finance':
      return <svg {...common}><path d="M4 7h16v12H4zM7 4h10v3M7 12h10M7 16h6" /></svg>;
    case 'command':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /></svg>;
    case 'risk':
      return <svg {...common}><path d="M12 3 21 20H3z" /><path d="M12 9v5M12 17h.01" /></svg>;
    case 'copilot':
      return <svg {...common}><path d="M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2z" /><path d="m18 3 .8 2.2L21 6l-2.2.8L18 9l-.8-2.2L15 6l2.2-.8z" /></svg>;
  }
}

function ShellButton({
  children,
  onClick,
  className = '',
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button type="button" className={`r2-shell-button ${className}`.trim()} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

function DoorButton({
  id,
  current,
  onNavigate,
  mode,
}: {
  id: (typeof R2_PRIMARY_NAVIGATION)[number];
  current: boolean;
  onNavigate: (id: R2DestinationId) => void;
  mode: 'rail' | 'dock';
}) {
  const destination = getR2Destination(id);
  const icon = DESTINATION_ICON[id] ?? 'more';
  const isCreate = id === 'create';

  return (
    <button
      type="button"
      className={`r2-door r2-door--${mode}${isCreate ? ' r2-door--create' : ''}`}
      aria-current={current ? 'page' : undefined}
      onClick={() => onNavigate(id)}
      data-door={id}
    >
      <span className="r2-door__icon"><Icon name={icon} /></span>
      <span className="r2-door__label">{destination.label}</span>
    </button>
  );
}

function HomeSurface({ onNavigate }: { onNavigate: (id: R2DestinationId) => void }) {
  return (
    <div className="r2-screen r2-home-screen" data-screen="home">
      <section className="r2-hero" aria-labelledby="r2-hero-title">
        <div className="r2-hero__graphic" aria-hidden="true"><span /><span /><span /></div>
        <div className="r2-hero__copy">
          <p className="r2-eyebrow"><Icon name="spark" /> مساحة العمل الجديدة</p>
          <h1 id="r2-hero-title">ما الذي يحتاج انتباهك الآن؟</h1>
          <p>واجهة إنجاز الجديدة تبدأ من القرار والعمل، لا من جدار أرقام وبطاقات.</p>
          <div className="r2-hero__actions">
            <ShellButton className="r2-action r2-action--light" onClick={() => onNavigate('transactions')}>
              فتح المعاملات <Icon name="arrow" />
            </ShellButton>
            <ShellButton className="r2-action r2-action--ghost" onClick={() => onNavigate('today')}>
              عمل اليوم
            </ShellButton>
          </div>
        </div>
        <div className="r2-hero__signal" aria-label="إشارة أولوية تجريبية">
          <span>الأولوية الآن</span>
          <strong>3 عناصر تحتاج قرارًا</strong>
          <small>هذه عينة Shell وليست بيانات إنتاج.</small>
        </div>
      </section>

      <section className="r2-home-flow" aria-label="تدفق العمل">
        <div className="r2-section-heading">
          <div>
            <p className="r2-eyebrow">تدفق واضح</p>
            <h2>أكمل من حيث توقفت</h2>
          </div>
          <ShellButton className="r2-link-button" onClick={() => onNavigate('today')}>عرض اليوم <Icon name="arrow" /></ShellButton>
        </div>

        <div className="r2-focus-list">
          <button type="button" onClick={() => onNavigate('transactions')} className="r2-focus-row">
            <span className="r2-focus-row__marker">01</span>
            <span className="r2-focus-row__content"><strong>معاملة بانتظار متابعة</strong><small>المعاملات ← متابعة السياق دون مغادرة المسار</small></span>
            <Icon name="arrow" />
          </button>
          <button type="button" onClick={() => onNavigate('today')} className="r2-focus-row">
            <span className="r2-focus-row__marker">02</span>
            <span className="r2-focus-row__content"><strong>جدول اليوم</strong><small>مكان واحد للعمل الحالي والمتابعات</small></span>
            <Icon name="arrow" />
          </button>
          <button type="button" onClick={() => onNavigate('more')} className="r2-focus-row">
            <span className="r2-focus-row__marker">03</span>
            <span className="r2-focus-row__content"><strong>كل أدوات إنجاز</strong><small>خريطة صريحة بدل الأبواب المخفية</small></span>
            <Icon name="arrow" />
          </button>
        </div>
      </section>
    </div>
  );
}

function TransactionsSurface({ onNavigate }: { onNavigate: (id: R2DestinationId) => void }) {
  return (
    <div className="r2-screen" data-screen="transactions">
      <div className="r2-section-heading r2-section-heading--hero">
        <div>
          <p className="r2-eyebrow">المجال التشغيلي الأساسي</p>
          <h1>المعاملات</h1>
          <p className="r2-supporting">قائمة واضحة، هوية قوية لكل سجل، وإجراء واحد ظاهر في كل سياق.</p>
        </div>
        <ShellButton className="r2-action r2-action--primary" onClick={() => onNavigate('create')}><Icon name="plus" /> معاملة جديدة</ShellButton>
      </div>

      <div className="r2-segment" aria-label="تقسيم المعاملات">
        <button type="button" aria-pressed="true">جارية</button>
        <button type="button" aria-pressed="false">متلكئة</button>
        <button type="button" aria-pressed="false">مغلقة</button>
      </div>

      <section className="r2-record-list" aria-label="عينة هيكل المعاملات">
        {[
          ['#1042', 'تعديل عقد تأسيس', 'شركة الرافدين', 'آخر نشاط قبل 18 دقيقة'],
          ['#1038', 'زيادة رأس المال', 'شركة أفق بغداد', 'متابعة مستحقة اليوم'],
          ['#1029', 'تغيير مدير مفوض', 'شركة نقطة الأعمال', 'بانتظار مستند'],
        ].map(([id, title, company, meta], index) => (
          <button type="button" className="r2-record-row" key={id} onClick={() => onNavigate('transactions.detail')}>
            <span className="r2-record-row__number">{id}</span>
            <span className="r2-record-row__identity"><strong>{title}</strong><small>{company}</small></span>
            <span className="r2-record-row__meta">{meta}</span>
            <span className="r2-record-row__index">0{index + 1}</span>
            <Icon name="arrow" />
          </button>
        ))}
      </section>

      <p className="r2-preview-note">المحتوى هنا عينة تركيبية لاختبار الـShell. ربط رحلة المعاملة الكاملة يبدأ في Golden Experience.</p>
    </div>
  );
}

function TodaySurface({ onNavigate }: { onNavigate: (id: R2DestinationId) => void }) {
  return (
    <div className="r2-screen" data-screen="today">
      <div className="r2-section-heading r2-section-heading--hero">
        <div>
          <p className="r2-eyebrow">الآن</p>
          <h1>اليوم</h1>
          <p className="r2-supporting">العمل الذي يحتاجك اليوم، بترتيب زمني واضح بدل تشتيت المهام في أنحاء التطبيق.</p>
        </div>
      </div>

      <section className="r2-timeline" aria-label="عينة جدول اليوم">
        {[
          ['09:30', 'متابعة معاملة #1038', 'المعاملات', 'transactions'],
          ['12:00', 'مراجعة وثيقة واردة', 'الوثائق', 'documents'],
          ['14:30', 'قرار مالي يحتاج مراجعة', 'المالية', 'finance'],
        ].map(([time, title, context, destination]) => (
          <button type="button" key={time} className="r2-timeline-row" onClick={() => onNavigate(destination as R2DestinationId)}>
            <time>{time}</time>
            <span className="r2-timeline-row__track"><i /></span>
            <span className="r2-timeline-row__copy"><strong>{title}</strong><small>{context}</small></span>
            <Icon name="arrow" />
          </button>
        ))}
      </section>
    </div>
  );
}

function CreateSurface({ onNavigate }: { onNavigate: (id: R2DestinationId) => void }) {
  return (
    <div className="r2-screen" data-screen="create">
      <div className="r2-section-heading r2-section-heading--hero">
        <div>
          <p className="r2-eyebrow">إجراء عالمي</p>
          <h1>ماذا تريد أن تنشئ؟</h1>
          <p className="r2-supporting">نقطة إنشاء واحدة. الخيارات تظهر حسب ما هو حقيقي ومتاح، لا كوعود وظيفية وهمية.</p>
        </div>
      </div>

      <button type="button" className="r2-create-primary" onClick={() => onNavigate('transactions.editor')}>
        <span className="r2-create-primary__icon"><Icon name="transactions" /></span>
        <span><strong>معاملة جديدة</strong><small>المسار المعتمد حاليًا للإنشاء</small></span>
        <Icon name="arrow" />
      </button>

      <div className="r2-create-later">
        <span>خيارات أخرى</span>
        <p>لن نظهر أنواع إنشاء إضافية كأنها حقيقية قبل ربطها ببياناتها وصلاحياتها في مراحل الترحيل.</p>
      </div>
    </div>
  );
}

function MoreSurface({ onNavigate }: { onNavigate: (id: R2DestinationId) => void }) {
  return (
    <div className="r2-screen" data-screen="more">
      <div className="r2-section-heading r2-section-heading--hero">
        <div>
          <p className="r2-eyebrow">خريطة النظام</p>
          <h1>المزيد</h1>
          <p className="r2-supporting">كل قدرة لها منزل واحد واضح. لا شعار يعمل كباب، ولا 12 مجالًا يلاحقك داخل كل شاشة.</p>
        </div>
      </div>

      <div className="r2-launcher-groups">
        {R2_LAUNCHER_GROUPS.map((group) => (
          <section className="r2-launcher-group" key={group.id} aria-labelledby={`group-${group.id}`}>
            <h2 id={`group-${group.id}`}>{group.label}</h2>
            <div className="r2-launcher-list">
              {group.destinations.map((destinationId) => {
                const destination = getR2Destination(destinationId);
                return (
                  <button type="button" key={destinationId} className="r2-launcher-row" onClick={() => onNavigate(destinationId)}>
                    <span className="r2-launcher-row__icon"><Icon name={DESTINATION_ICON[destinationId] ?? 'more'} /></span>
                    <span className="r2-launcher-row__copy"><strong>{destination.label}</strong><small>منزل قانوني واحد</small></span>
                    <Icon name="arrow" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function LauncherPlaceholder({ destinationId, onNavigate }: { destinationId: R2DestinationId; onNavigate: (id: R2DestinationId) => void }) {
  const destination = getR2Destination(destinationId);
  return (
    <div className="r2-screen r2-destination-placeholder" data-screen="launcher-destination">
      <div className="r2-destination-mark"><Icon name={DESTINATION_ICON[destinationId] ?? 'more'} /></div>
      <p className="r2-eyebrow">وجهة مثبتة في بنية إنجاز الجديدة</p>
      <h1>{destination.label}</h1>
      <p>الـShell يعرف مكان هذه الميزة وطريق الوصول إليها. محتوى المجال نفسه سيُبنى في مرحلة الترحيل المخصصة له، لذلك لن نعرض واجهة وهمية هنا.</p>
      <div className="r2-placeholder-actions">
        <ShellButton className="r2-action r2-action--primary" onClick={() => onNavigate('more')}>العودة إلى المزيد</ShellButton>
        <ShellButton className="r2-action r2-action--secondary" onClick={() => onNavigate('home')}>الرئيسية</ShellButton>
      </div>
    </div>
  );
}

function TransactionContextPlaceholder({ destinationId, onNavigate }: { destinationId: R2DestinationId; onNavigate: (id: R2DestinationId) => void }) {
  const destination = getR2Destination(destinationId);
  return (
    <div className="r2-screen r2-context-preview" data-screen="transaction-context">
      <p className="r2-eyebrow">سياق المعاملة</p>
      <div className="r2-context-preview__identity">
        <span>#1042</span>
        <div><h1>{destination.label}</h1><p>تعديل عقد تأسيس · شركة الرافدين</p></div>
      </div>
      <div className="r2-context-ribbon">
        <span>نظرة عامة</span><span>النشاط</span><span>المتابعات</span><span>الوثائق</span><span>المالية</span>
      </div>
      <p className="r2-preview-note">هذه معاينة لسلوك السياق والموقع فقط. تجربة المعاملة الكاملة و360° تُبنى وتُعرض للاعتماد في R2.0-4.</p>
      <ShellButton className="r2-action r2-action--secondary" onClick={() => onNavigate('transactions')}>العودة للمعاملات</ShellButton>
    </div>
  );
}

function SearchOverlay({
  query,
  setQuery,
  onClose,
  onNavigate,
}: {
  query: string;
  setQuery: (value: string) => void;
  onClose: () => void;
  onNavigate: (id: R2DestinationId) => void;
}) {
  const normalized = query.trim();
  const results = useMemo(() => {
    if (!normalized) return R2_DESTINATIONS.filter((item) => ['transactions', 'today', 'companies', 'finance', 'automation', 'documents'].includes(item.id)).slice(0, 6);

    const matched = new Map<R2DestinationId, (typeof R2_DESTINATIONS)[number]>();
    for (const item of R2_DESTINATIONS) {
      if (item.label.includes(normalized) || item.id.includes(normalized.toLowerCase())) matched.set(item.id, item);
    }
    for (const [alias, destinationId] of Object.entries(R2_SEARCH_ALIASES)) {
      if (alias.includes(normalized) || normalized.includes(alias)) matched.set(destinationId, getR2Destination(destinationId));
    }
    return Array.from(matched.values()).slice(0, 8);
  }, [normalized]);

  return (
    <div className="r2-overlay" role="dialog" aria-modal="true" aria-labelledby="r2-search-title" data-overlay="search">
      <button className="r2-overlay__backdrop" type="button" aria-label="إغلاق البحث" onClick={onClose} />
      <section className="r2-search-panel">
        <div className="r2-search-panel__head">
          <div><p className="r2-eyebrow">Find Anything</p><h2 id="r2-search-title">ابحث عن أي شيء</h2></div>
          <button type="button" className="r2-close-button" onClick={onClose} aria-label="إغلاق">×</button>
        </div>
        <label className="r2-search-input-wrap">
          <Icon name="search" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثال: خزنة، أتمتة، معاملات، مالية…" />
        </label>
        <div className="r2-search-results" aria-live="polite">
          {results.length ? results.map((item) => (
            <button type="button" key={item.id} onClick={() => onNavigate(item.id)} className="r2-search-result">
              <span className="r2-search-result__icon"><Icon name={DESTINATION_ICON[item.id] ?? 'more'} /></span>
              <span><strong>{item.label}</strong><small>{item.kind === 'launcher_destination' ? 'ميزة' : 'وجهة'}</small></span>
              <Icon name="arrow" />
            </button>
          )) : <p className="r2-search-empty">لا توجد نتيجة ضمن خريطة الـShell الحالية.</p>}
        </div>
        <p className="r2-search-footnote">في R2.0-3 البحث يثبت اكتشاف الميزات والتنقل إليها. البحث في السجلات الحقيقية يكتمل في R2.0-8.</p>
      </section>
    </div>
  );
}

function AccountOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="r2-overlay" role="dialog" aria-modal="true" aria-labelledby="r2-account-title" data-overlay="account">
      <button className="r2-overlay__backdrop" type="button" aria-label="إغلاق الحساب" onClick={onClose} />
      <section className="r2-account-sheet">
        <div className="r2-account-sheet__handle" aria-hidden="true" />
        <div className="r2-account-sheet__profile">
          <span className="r2-avatar"><Icon name="user" /></span>
          <div><p className="r2-eyebrow">مساحة العمل</p><h2 id="r2-account-title">حساب إنجاز</h2><small>واجهة Shell تجريبية — لا تغيّر بيانات الحساب.</small></div>
        </div>
        <button type="button" className="r2-account-row" onClick={onClose}><span>إعدادات مساحة العمل</span><Icon name="arrow" /></button>
        <button type="button" className="r2-account-row" onClick={onClose}><span>تفضيلات الواجهة</span><Icon name="arrow" /></button>
        <button type="button" className="r2-action r2-action--secondary r2-account-close" onClick={onClose}>إغلاق</button>
      </section>
    </div>
  );
}

export function UiR2Root() {
  const initial = readUrlState();
  const [destinationId, setDestinationId] = useState<R2DestinationId>(initial.destinationId);
  const [overlay, setOverlay] = useState<OverlayId>(initial.overlay);
  const [searchQuery, setSearchQuery] = useState('');
  const ownedOverlayRef = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      const next = readUrlState();
      setDestinationId(next.destinationId);
      setOverlay(next.overlay);
      ownedOverlayRef.current = false;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && overlay) {
        event.preventDefault();
        closeOverlay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const navigate = (nextId: R2DestinationId) => {
    writeUrlState(nextId, null);
    setDestinationId(nextId);
    setOverlay(null);
    ownedOverlayRef.current = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const openOverlay = (nextOverlay: Exclude<OverlayId, null>) => {
    writeUrlState(destinationId, nextOverlay);
    setOverlay(nextOverlay);
    ownedOverlayRef.current = true;
  };

  const closeOverlay = () => {
    if (ownedOverlayRef.current) {
      ownedOverlayRef.current = false;
      window.history.back();
      return;
    }
    writeUrlState(destinationId, null, 'replace');
    setOverlay(null);
  };

  const currentDoor = activeDoor(destinationId);
  const trail = locationTrail(destinationId);
  const currentDestination = getR2Destination(destinationId);

  let content: ReactNode;
  if (destinationId === 'home') content = <HomeSurface onNavigate={navigate} />;
  else if (destinationId === 'transactions') content = <TransactionsSurface onNavigate={navigate} />;
  else if (destinationId === 'today' || destinationId === 'today.notifications') content = <TodaySurface onNavigate={navigate} />;
  else if (destinationId === 'create') content = <CreateSurface onNavigate={navigate} />;
  else if (destinationId === 'more') content = <MoreSurface onNavigate={navigate} />;
  else if (destinationId.startsWith('transactions.')) content = <TransactionContextPlaceholder destinationId={destinationId} onNavigate={navigate} />;
  else content = <LauncherPlaceholder destinationId={destinationId} onNavigate={navigate} />;

  return (
    <div className="ez-r2-root r2-shell" data-r2-shell={SHELL_STAGE} data-destination={destinationId}>
      <aside className="r2-shell__rail" aria-label="التنقل الرئيسي">
        <button type="button" className="r2-brand" onClick={() => navigate('home')} aria-label="إنجاز — الرئيسية">
          <span className="r2-brand__mark">إ</span>
          <span><strong>إنجاز</strong><small>Workspace</small></span>
        </button>
        <nav className="r2-rail-nav">
          {R2_PRIMARY_NAVIGATION.map((id) => <DoorButton key={id} id={id} current={currentDoor === id} onNavigate={navigate} mode="rail" />)}
        </nav>
        <div className="r2-rail-foot">
          <button type="button" onClick={() => openOverlay('search')}><Icon name="search" /><span>ابحث عن أي شيء</span></button>
          <span className="r2-stage-pill">R2.0-3 Preview</span>
        </div>
      </aside>

      <div className="r2-shell__workspace">
        <header className="r2-topbar">
          <div className="r2-mobile-brand"><span className="r2-brand__mark">إ</span><strong>إنجاز</strong></div>
          <div className="r2-location" aria-label="الموقع الحالي">
            {trail.map((item, index) => <span key={`${item}-${index}`}>{index > 0 && <b>←</b>}{item}</span>)}
          </div>
          <div className="r2-topbar__actions">
            <button type="button" className="r2-icon-button" onClick={() => openOverlay('search')} aria-label="ابحث عن أي شيء"><Icon name="search" /></button>
            <button type="button" className="r2-icon-button r2-icon-button--account" onClick={() => openOverlay('account')} aria-label="الحساب ومساحة العمل"><Icon name="user" /></button>
          </div>
        </header>

        <main className="r2-shell__main" id="r2-main" aria-label={currentDestination.label}>{content}</main>

        <nav className="r2-shell__mobile-nav" aria-label="التنقل الرئيسي للهاتف">
          {R2_PRIMARY_NAVIGATION.map((id) => <DoorButton key={id} id={id} current={currentDoor === id} onNavigate={navigate} mode="dock" />)}
        </nav>
      </div>

      {overlay === 'search' && <SearchOverlay query={searchQuery} setQuery={setSearchQuery} onClose={closeOverlay} onNavigate={navigate} />}
      {overlay === 'account' && <AccountOverlay onClose={closeOverlay} />}
    </div>
  );
}
