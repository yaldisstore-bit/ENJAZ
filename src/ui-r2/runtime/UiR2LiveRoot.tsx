import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GlobalSearchResultReference } from '../../features/searchIntelligence/searchSavedViewContract.ts';
import { useGlobalSearch } from '../../features/searchIntelligence/useSearchIntelligence.ts';
import {
  R2_DESTINATIONS,
  R2_LAUNCHER_GROUPS,
  R2_PRIMARY_NAVIGATION,
  R2_SEARCH_ALIASES,
  getR2Destination,
  type R2DestinationId,
} from '../architecture/navigation-contract.ts';
import { LiveAutomationExperience } from '../automation/LiveAutomationExperience.tsx';
import { LiveCommandCenterExperience } from '../command/LiveCommandCenterExperience.tsx';
import { ConnectedCoreWorkRouter } from '../core-work/CoreWorkConnected.tsx';
import { LiveFieldOperationsExperience } from '../field-operations/LiveFieldOperationsExperience.tsx';
import { buildR2FindAnythingResults } from '../find-anything/find-anything-model.ts';
import { ConnectedR2Home } from '../home/ConnectedHomeExperience.tsx';
import { TransactionSavedViewsDock } from '../search-intelligence/TransactionSavedViewsDock.tsx';
import { useR2OverlayFocusGuard } from './useR2OverlayFocusGuard.ts';

type OverlayId = 'search' | 'account' | null;
type PrimaryDoor = (typeof R2_PRIMARY_NAVIGATION)[number];
type IconName = 'home' | 'transactions' | 'plus' | 'today' | 'more' | 'search' | 'user' | 'arrow' | 'module';

type Props = Readonly<{ accountLabel?: string | undefined; onSignOut?: (() => Promise<void> | void) | undefined }>;

const VALID_DESTINATIONS = new Set<R2DestinationId>(R2_DESTINATIONS.map((item) => item.id));
const SEARCH_ALIAS_COUNT = Object.keys(R2_SEARCH_ALIASES).length;
const RECORDS = new Set<R2DestinationId>(['companies', 'people', 'documents']);
const OPERATIONAL = new Set<R2DestinationId>(['finance', 'operations', 'workflow', 'automation', 'command', 'risk', 'copilot']);
const SEARCH_DOMAIN_LABELS = Object.freeze({ transactions: 'المعاملات', companies: 'الشركات', people: 'الأشخاص', procedures: 'الإجراءات', documents: 'الوثائق' });
const SEARCH_DOMAINS = ['transactions', 'companies', 'people', 'procedures', 'documents'] as const;

function Icon({ name }: { name: IconName }) {
  const common = { className: 'ez-r2-icon', viewBox: '0 0 24 24', 'aria-hidden': true } as const;
  switch (name) {
    case 'home': return <svg {...common}><path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" /><path d="M9 21v-6h6v6" /></svg>;
    case 'transactions': return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>;
    case 'plus': return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'today': return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 18h7" /></svg>;
    case 'more': return <svg {...common}><circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" /></svg>;
    case 'search': return <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;
    case 'user': return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
    case 'arrow': return <svg {...common}><path d="m9 5 7 7-7 7" /></svg>;
    case 'module': return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></svg>;
  }
}

const ICONS: Record<PrimaryDoor, IconName> = { home: 'home', transactions: 'transactions', create: 'plus', today: 'today', more: 'more' };

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('dest') as R2DestinationId | null;
  const rawOverlay = params.get('overlay');
  return {
    destinationId: requested && VALID_DESTINATIONS.has(requested) ? requested : 'home' as R2DestinationId,
    overlay: rawOverlay === 'search' || rawOverlay === 'account' ? rawOverlay : null as OverlayId,
    transactionId: params.get('tx')?.trim() || null,
  };
}

function writeUrlState(destinationId: R2DestinationId, overlay: OverlayId, transactionId: string | null, mode: 'push' | 'replace' = 'push') {
  const url = new URL(window.location.href);
  if (destinationId === 'home') url.searchParams.delete('dest'); else url.searchParams.set('dest', destinationId);
  if (overlay) url.searchParams.set('overlay', overlay); else url.searchParams.delete('overlay');
  if (transactionId && destinationId.startsWith('transactions.')) url.searchParams.set('tx', transactionId); else url.searchParams.delete('tx');
  window.history[mode === 'replace' ? 'replaceState' : 'pushState']({ r2: true, destinationId, overlay, transactionId }, '', url);
}

function doorFor(id: R2DestinationId): PrimaryDoor {
  if (id === 'home') return 'home';
  if (id === 'transactions' || id.startsWith('transactions.')) return 'transactions';
  if (id === 'create') return 'create';
  if (id === 'today' || id === 'today.notifications') return 'today';
  return 'more';
}

function trailFor(id: R2DestinationId) {
  if (id === 'home') return ['الرئيسية'];
  if (id === 'transactions') return ['الرئيسية', 'المعاملات'];
  if (id.startsWith('transactions.')) return ['الرئيسية', 'المعاملات', getR2Destination(id).label];
  if (id === 'create') return ['الرئيسية', 'جديد'];
  if (id === 'today' || id === 'today.notifications') return ['الرئيسية', 'اليوم'];
  if (id === 'more') return ['الرئيسية', 'المزيد'];
  return ['الرئيسية', 'المزيد', getR2Destination(id).label];
}

function Door({ id, active, mode, navigate }: { id: PrimaryDoor; active: boolean; mode: 'rail' | 'dock'; navigate: (id: R2DestinationId) => void }) {
  return <button type="button" data-door={id} aria-current={active ? 'page' : undefined} className={`r2-door r2-door--${mode}${id === 'create' ? ' r2-door--create' : ''}`} onClick={() => navigate(id)}><span className="r2-door__icon"><Icon name={ICONS[id]} /></span><span className="r2-door__label">{getR2Destination(id).label}</span></button>;
}

function More({ navigate }: { navigate: (id: R2DestinationId) => void }) {
  return <div className="r2-screen" data-screen="more"><div className="r2-section-heading r2-section-heading--hero"><div><p className="r2-eyebrow">خريطة النظام · Golden</p><h1>المزيد</h1><p className="r2-supporting">كل قدرة لها منزل واحد واضح، دون أبواب مخفية.</p></div></div><div className="r2-launcher-groups">{R2_LAUNCHER_GROUPS.map((group) => <section className="r2-launcher-group" key={group.id}><h2>{group.label}</h2><div className="r2-launcher-list">{group.destinations.map((id) => <button type="button" key={id} className="r2-launcher-row" onClick={() => navigate(id)}><span className="r2-launcher-row__icon"><Icon name="module" /></span><span className="r2-launcher-row__copy"><strong>{getR2Destination(id).label}</strong><small>{id === 'followups' ? 'متابعات موثوقة' : RECORDS.has(id) ? 'سجل وعلاقات' : OPERATIONAL.has(id) ? 'مساحة عمل متخصصة' : 'منزل قانوني واحد'}</small></span><Icon name="arrow" /></button>)}</div></section>)}</div></div>;
}

function PortalTarget({ id }: { id: 'companies' | 'people' | 'finance' }) {
  if (id === 'finance') return <div className="r2-screen" data-operational-domain="finance" aria-hidden="true" />;
  return <div className="r2-screen" data-records-stage="R2.0-6" data-records-domain={id} data-entity-first="true" aria-hidden="true" />;
}

function DeferredDestination({ id, navigate }: { id: R2DestinationId; navigate: (id: R2DestinationId) => void }) {
  const destination = getR2Destination(id);
  return <div className="r2-screen r2-destination-placeholder" data-screen="launcher-destination" data-live-deferred="true" {...(id === 'documents' ? { 'data-records-stage': 'R2.0-6', 'data-records-domain': 'documents', 'data-entity-first': 'true' } : {})}><div className="r2-destination-mark"><Icon name="module" /></div><p className="r2-eyebrow">وجهة مثبتة في بنية إنجاز</p><h1>{destination.label}</h1><p>المحتوى الإنتاجي لهذه الوجهة يبقى مقفلاً حتى مرحلته بدل عرض بيانات تجريبية داخل runtime الحي.</p><div className="r2-placeholder-actions"><button type="button" className="r2-action r2-action--primary" onClick={() => navigate('more')}>العودة إلى المزيد</button><button type="button" className="r2-action r2-action--secondary" onClick={() => navigate('home')}>الرئيسية</button></div></div>;
}

function SearchOverlay({ query, setQuery, close, navigate, openTransaction }: { query: string; setQuery: (value: string) => void; close: () => void; navigate: (id: R2DestinationId) => void; openTransaction: (id: string) => void }) {
  const localResults = useMemo(() => buildR2FindAnythingResults(query), [query]);
  const authoritative = useGlobalSearch(query);
  const openAuthoritative = (item: GlobalSearchResultReference) => {
    const url = new URL(window.location.href);
    url.searchParams.delete('entity'); url.searchParams.delete('procedure');
    if (item.domain === 'companies' || item.domain === 'people' || item.domain === 'documents') url.searchParams.set('entity', item.entityId);
    if (item.domain === 'procedures') url.searchParams.set('procedure', item.entityId);
    window.history.replaceState(window.history.state, '', url);
    if (item.domain === 'transactions') openTransaction(item.entityId);
    else if (item.domain === 'companies') navigate('companies');
    else if (item.domain === 'people') navigate('people');
    else if (item.domain === 'procedures') navigate('workflow');
    else navigate('documents');
  };
  return <div className="r2-overlay" role="dialog" aria-modal="true" data-overlay="search" data-zero-lost-search="R2.0-8" data-phase9-2-global-search="authoritative" aria-labelledby="r2-search-title"><button type="button" className="r2-overlay__backdrop" aria-label="إغلاق البحث" onClick={close} /><section className="r2-search-panel"><div className="r2-search-panel__head"><div><p className="r2-eyebrow">Find Anything · Phase 9.2</p><h2 id="r2-search-title">ابحث عن أي شيء</h2></div><button type="button" className="r2-close-button" onClick={close} aria-label="إغلاق">×</button></div><label className="r2-search-input-wrap"><Icon name="search" /><input autoFocus value={query} maxLength={120} onChange={(event) => setQuery(event.target.value)} placeholder="معاملة، شركة، شخص، إجراء أو وثيقة…" /></label><div className="r2-search-results" aria-live="polite">
    {authoritative.status === 'loading' ? <p className="r2-search-authority-state">جارٍ البحث في بيانات مساحة العمل المسموح بها…</p> : null}
    {authoritative.status === 'error' ? <p className="r2-search-authority-state is-error">{authoritative.errorMessage}</p> : null}
    {authoritative.status === 'ready' ? SEARCH_DOMAINS.map((domain) => {
      const rows = authoritative.results.filter((item) => item.domain === domain);
      if (!rows.length) return null;
      return <section className="r2-search-live-group" key={domain} data-global-search-domain={domain}><div className="r2-search-live-group__title"><strong>{SEARCH_DOMAIN_LABELS[domain]}</strong><span>{rows.length} نتيجة موثوقة</span></div>{rows.map((item) => <button type="button" key={`${item.domain}:${item.entityId}`} className="r2-search-result" data-search-authority="workspace" data-global-search-destination={item.destination} onClick={() => openAuthoritative(item)}><span className="r2-search-result__icon"><Icon name={item.domain === 'transactions' ? 'transactions' : 'module'} /></span><span><strong>{item.title}<em className="r2-search-result__domain">{SEARCH_DOMAIN_LABELS[item.domain]}</em></strong><small>{item.subtitle ?? 'سجل موثوق ضمن صلاحياتك الحالية'}</small></span><Icon name="arrow" /></button>)}</section>;
    }) : null}
    {query.trim().length >= 2 && authoritative.status === 'ready' && !authoritative.results.length ? <p className="r2-search-authority-state">لا توجد سجلات تشغيلية مطابقة ضمن صلاحياتك الحالية.</p> : null}
    {localResults.length ? <><div className="r2-search-local-divider">اختصارات ومسارات إنجاز</div>{localResults.map((item) => <button type="button" key={item.key} className="r2-search-result" data-find-kind={item.kind} data-find-source={item.source} onClick={() => item.kind === 'transaction' && item.transactionId ? openTransaction(item.transactionId) : navigate(item.destinationId)}><span className="r2-search-result__icon"><Icon name={item.kind === 'transaction' ? 'transactions' : 'module'} /></span><span><strong>{item.label}</strong><small>{item.secondary}</small></span><Icon name="arrow" /></button>)}</> : null}
    {!localResults.length && authoritative.status !== 'loading' && !authoritative.results.length ? <p className="r2-search-empty">لا توجد نتيجة مطابقة. لا يختلق إنجاز سجلات غير موجودة ولا يكشف سجلات خارج صلاحيتك.</p> : null}
  </div><p className="r2-search-footnote" data-alias-count={SEARCH_ALIAS_COUNT}>نتائج Phase 9.2 تأتي من مصادر الحقيقة المصرح بها؛ الاختصارات المحلية تبقى للحفاظ على عقد Zero‑Lost.</p></section></div>;
}

function AccountOverlay({ close, accountLabel, onSignOut }: { close: () => void; accountLabel: string; onSignOut?: (() => Promise<void> | void) | undefined }) {
  const signOut = () => { close(); if (onSignOut) void onSignOut(); };
  return <div className="r2-overlay" role="dialog" aria-modal="true" data-overlay="account" aria-labelledby="r2-account-title"><button type="button" className="r2-overlay__backdrop" aria-label="إغلاق الحساب" onClick={close} /><section className="r2-account-sheet"><div className="r2-account-sheet__handle" aria-hidden="true" /><div className="r2-account-sheet__profile"><span className="r2-avatar"><Icon name="user" /></span><div><p className="r2-eyebrow">مساحة العمل</p><h2 id="r2-account-title">حساب إنجاز</h2><small>{accountLabel}</small></div></div><div className="r2-account-row" data-account-session="protected"><span>جلسة مساحة العمل محمية عبر Auth الحالي</span></div>{onSignOut && <button type="button" className="r2-account-row" onClick={signOut}><span>تسجيل الخروج</span><Icon name="arrow" /></button>}<button type="button" className="r2-action r2-action--secondary r2-account-close" onClick={close}>إغلاق</button></section></div>;
}

export function UiR2LiveRoot({ accountLabel = 'حساب إنجاز', onSignOut }: Props = {}) {
  const initial = readUrlState();
  const [destinationId, setDestinationId] = useState<R2DestinationId>(initial.destinationId);
  const [transactionId, setTransactionId] = useState<string | null>(initial.transactionId);
  const [overlay, setOverlay] = useState<OverlayId>(initial.overlay);
  const [searchQuery, setSearchQuery] = useState('');
  const ownedOverlay = useRef(false);
  useR2OverlayFocusGuard(overlay);

  useEffect(() => {
    const sync = () => { const next = readUrlState(); setDestinationId(next.destinationId); setTransactionId(next.transactionId); setOverlay(next.overlay); ownedOverlay.current = false; };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const closeOverlay = () => {
    if (ownedOverlay.current) { ownedOverlay.current = false; window.history.back(); }
    else { writeUrlState(destinationId, null, transactionId, 'replace'); setOverlay(null); }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && overlay) { event.preventDefault(); closeOverlay(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const navigate = (id: R2DestinationId) => {
    const keepTransaction = id.startsWith('transactions.') ? transactionId : null;
    writeUrlState(id, null, keepTransaction);
    setDestinationId(id); setTransactionId(keepTransaction); setOverlay(null); ownedOverlay.current = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const openTransaction = (id: string) => {
    writeUrlState('transactions.detail', null, id);
    setDestinationId('transactions.detail'); setTransactionId(id); setOverlay(null); ownedOverlay.current = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const openOverlay = (id: Exclude<OverlayId, null>) => { writeUrlState(destinationId, id, transactionId); setOverlay(id); ownedOverlay.current = true; };

  const connectedCore = ConnectedCoreWorkRouter({ destinationId: destinationId === 'today.notifications' ? 'today' : destinationId, transactionId, navigate, openTransaction });
  let content: ReactNode;
  if (destinationId === 'home') content = <ConnectedR2Home navigate={navigate} />;
  else if (connectedCore) content = connectedCore;
  else if (destinationId === 'more') content = <More navigate={navigate} />;
  else if (destinationId === 'companies' || destinationId === 'people' || destinationId === 'finance') content = <PortalTarget id={destinationId} />;
  else if (destinationId === 'automation') content = <LiveAutomationExperience />;
  else if (destinationId === 'operations') content = <LiveFieldOperationsExperience />;
  else if (destinationId === 'command') content = <LiveCommandCenterExperience navigate={navigate} />;
  else content = <DeferredDestination id={destinationId} navigate={navigate} />;

  const currentDoor = doorFor(destinationId);
  const trail = trailFor(destinationId);
  return <div className="ez-r2-root r2-shell" data-r2-shell="R2.0-3" data-r2-runtime-mode="live" data-golden-stage="R2.0-4" data-core-work-stage="R2.0-5" data-records-stage="R2.0-6" data-operational-stage="R2.0-7" data-zero-lost-stage="R2.0-8" data-phase9-2-runtime="search-saved-views" data-destination={destinationId}>
    <aside className="r2-shell__rail" aria-label="التنقل الرئيسي"><button type="button" className="r2-brand" onClick={() => navigate('home')} aria-label="إنجاز — الرئيسية"><span className="r2-brand__mark">إ</span><span><strong>إنجاز</strong><small>Workspace</small></span></button><nav className="r2-rail-nav">{R2_PRIMARY_NAVIGATION.map((id) => <Door key={id} id={id} active={currentDoor === id} mode="rail" navigate={navigate} />)}</nav><div className="r2-rail-foot"><button type="button" onClick={() => openOverlay('search')}><Icon name="search" /><span>ابحث عن أي شيء</span></button><span className="r2-stage-pill">9.2 Search Intelligence</span></div></aside>
    <div className="r2-shell__workspace"><header className="r2-topbar"><div className="r2-mobile-brand"><span className="r2-brand__mark">إ</span><strong>إنجاز</strong></div><div className="r2-location" aria-label="الموقع الحالي">{trail.map((item, index) => <span key={`${item}-${index}`}>{index > 0 && <b>←</b>}{item}</span>)}</div><div className="r2-topbar__actions"><button type="button" className="r2-icon-button" onClick={() => openOverlay('search')} aria-label="ابحث عن أي شيء"><Icon name="search" /></button><button type="button" className="r2-icon-button r2-icon-button--account" onClick={() => openOverlay('account')} aria-label="الحساب ومساحة العمل"><Icon name="user" /></button></div></header>{destinationId === 'transactions' ? <div className="r2-search-intelligence-dock"><TransactionSavedViewsDock /></div> : null}<main className="r2-shell__main" id="r2-main" aria-label={getR2Destination(destinationId).label}>{content}</main><nav className="r2-shell__mobile-nav" aria-label="التنقل الرئيسي للهاتف">{R2_PRIMARY_NAVIGATION.map((id) => <Door key={id} id={id} active={currentDoor === id} mode="dock" navigate={navigate} />)}</nav></div>
    {overlay === 'search' && <SearchOverlay query={searchQuery} setQuery={setSearchQuery} close={closeOverlay} navigate={navigate} openTransaction={openTransaction} />}
    {overlay === 'account' && <AccountOverlay close={closeOverlay} accountLabel={accountLabel} onSignOut={onSignOut} />}
  </div>;
}
