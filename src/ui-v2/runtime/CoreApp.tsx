import { useState } from 'react';
import type { DailyWorkItem } from '../../features/daily-work/dailyWorkModel.ts';
import type { ExecutiveBriefingDestination } from '../../features/executive-briefing/executiveBriefingModel.ts';
import { domainById, enjazDomains, type EnjazDomainId } from '../architecture/domain-composition.ts';
import { AppShell } from '../components/AppShell.tsx';
import { EzSheet } from '../components/overlays.tsx';
import { FinanceCoreScreen, OperationsCoreScreen } from '../screens/CoreScreens.tsx';
import { ConnectedDailyWorkScreen, FixtureDailyWorkScreen } from '../screens/DailyWorkScreen.tsx';
import { DomainScreen } from '../screens/DomainScreens.tsx';
import { ExecutiveBriefingEntry } from '../screens/ExecutiveBriefingEntry.tsx';
import { ConnectedExecutiveBriefingScreen, FixtureExecutiveBriefingScreen } from '../screens/ExecutiveBriefingScreen.tsx';
import { ConnectedHomeScreen, FixtureHomeScreen } from '../screens/HomeScreen.tsx';

type ShellTab = 'home' | 'today' | 'operations' | 'finance';
type DomainGroup = Readonly<{ label: string; ids: readonly EnjazDomainId[] }>;
export type DailyWorkRuntimeMode = 'preview' | 'live';

const titles: Record<ShellTab, { title: string; subtitle: string }> = {
  home: { title: 'إنجاز', subtitle: 'مساحة العمل' },
  today: { title: 'اليوم', subtitle: 'العمل اليومي' },
  operations: { title: 'العمليات', subtitle: 'مركز العمل' },
  finance: { title: 'المالية', subtitle: 'الحركة المالية' },
};

const domainGroups: readonly DomainGroup[] = [
  { label: 'العمل والسجلات', ids: ['transactions', 'companies', 'people', 'followups'] },
  { label: 'التشغيل والقرار', ids: ['workflow', 'automation', 'operations', 'command'] },
  { label: 'المال والذكاء والملفات', ids: ['finance', 'risk', 'documents', 'copilot'] },
] as const;

export function CoreApp(props: Readonly<{ dailyWorkMode?: DailyWorkRuntimeMode }> = {}) {
  const [activeTab, setActiveTab] = useState<ShellTab>('home');
  const [commandMode, setCommandMode] = useState(false);
  const [briefingMode, setBriefingMode] = useState(false);
  const [activeDomain, setActiveDomain] = useState<EnjazDomainId | null>(null);
  const [domainExplorerOpen, setDomainExplorerOpen] = useState(false);
  const current = titles[activeTab];
  const domain = activeDomain ? domainById[activeDomain] : null;
  const dailyWorkMode = props.dailyWorkMode ?? 'preview';

  const openDomain = (domainId: EnjazDomainId) => {
    setActiveDomain(domainId);
    setDomainExplorerOpen(false);
    setCommandMode(false);
    setBriefingMode(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const returnToCore = () => {
    setActiveDomain(null);
    setBriefingMode(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const openDailyWorkItem = (item: DailyWorkItem) => {
    if (item.transactionId) openDomain('transactions');
    else if (item.companyId) openDomain('companies');
    else openDomain('followups');
  };

  const openExecutiveDestination = (destination: ExecutiveBriefingDestination) => {
    setBriefingMode(false);
    setCommandMode(false);
    if (destination === 'transactions') {
      openDomain('transactions');
      return;
    }
    setActiveDomain(null);
    setActiveTab(destination === 'today' ? 'today' : 'finance');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const openHomePriority = () => openDomain('transactions');
  const newFollowup = () => window.dispatchEvent(new CustomEvent('enjaz:open-create', { detail: 'followup' }));

  const executiveScreen = dailyWorkMode === 'live'
    ? <ConnectedExecutiveBriefingScreen onBack={() => setBriefingMode(false)} onOpenDestination={openExecutiveDestination} />
    : <FixtureExecutiveBriefingScreen onBack={() => setBriefingMode(false)} onOpenDestination={openExecutiveDestination} />;

  const homeScreen = dailyWorkMode === 'live'
    ? <ConnectedHomeScreen onOpenPriority={openHomePriority} />
    : <FixtureHomeScreen onOpenPriority={openHomePriority} />;

  const coreScreen = briefingMode
    ? executiveScreen
    : activeTab === 'home'
      ? <>{homeScreen}<ExecutiveBriefingEntry onOpen={() => { setBriefingMode(true); window.scrollTo({ top: 0, behavior: 'instant' }); }} /></>
      : activeTab === 'today'
        ? dailyWorkMode === 'live'
          ? <ConnectedDailyWorkScreen onNewFollowup={newFollowup} onOpen={openDailyWorkItem} />
          : <FixtureDailyWorkScreen onNewFollowup={newFollowup} onOpen={openDailyWorkItem} />
        : activeTab === 'operations'
          ? <OperationsCoreScreen commandMode={commandMode} onCommandMode={setCommandMode} />
          : <FinanceCoreScreen />;

  const motionKey = domain
    ? `domain-${domain.id}`
    : briefingMode
      ? 'core-executive-briefing'
      : `core-${activeTab}-${commandMode ? 'command' : 'standard'}`;

  return (
    <div data-core-app="true" data-stage="ui-10" data-product-phase="4.4" data-daily-work-mode={dailyWorkMode} data-active-domain={activeDomain ?? 'core'} data-executive-briefing={briefingMode ? 'open' : 'closed'}>
      <AppShell
        title={domain ? domain.label : briefingMode ? 'الملخص التنفيذي' : commandMode && activeTab === 'operations' ? 'القيادة' : current.title}
        subtitle={domain ? domain.eyebrow : briefingMode ? 'نظرة الإدارة' : commandMode && activeTab === 'operations' ? 'المركز التنفيذي' : current.subtitle}
        activeTab={activeTab}
        onBrandAction={() => setDomainExplorerOpen(true)}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setActiveDomain(null);
          setDomainExplorerOpen(false);
          setBriefingMode(false);
          if (tab !== 'operations') setCommandMode(false);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
      >
        {activeDomain ? (
          <nav className="ez-domain-rail" aria-label="التبديل بين مجالات إنجاز" data-domain-rail="true">
            <button type="button" onClick={returnToCore}><span>الأساسية</span><small>مساحة العمل</small></button>
            {enjazDomains.map((item) => (
              <button key={item.id} type="button" className={activeDomain === item.id ? 'is-active' : ''} data-domain-link={item.id} onClick={() => openDomain(item.id)}>
                <span>{item.label}</span><small>{item.eyebrow}</small>
              </button>
            ))}
          </nav>
        ) : null}

        <div className="ez-motion-stage" data-motion-surface={motionKey} key={motionKey}>
          {domain ? (
            <div className="ez-domain-runtime" data-domain-runtime={domain.id}>
              <div className={`ez-domain-runtime__marker is-${domain.accent}`}><span>{domain.eyebrow}</span><strong>{domain.description}</strong><button type="button" onClick={returnToCore}>العودة للأساسية</button></div>
              <DomainScreen key={domain.id} domain={domain.id} />
            </div>
          ) : coreScreen}
        </div>
      </AppShell>

      <EzSheet open={domainExplorerOpen} title="مجالات إنجاز" eyebrow="انتقل إلى مساحة العمل" onClose={() => setDomainExplorerOpen(false)}>
        <div className="ez-domain-explorer" data-domain-explorer="true">
          {domainGroups.map((group) => (
            <section key={group.label} className="ez-domain-explorer__group">
              <header><span>{group.label}</span></header>
              <div>
                {group.ids.map((id) => {
                  const item = domainById[id];
                  return <button key={id} type="button" data-domain-explorer-link={id} onClick={() => openDomain(id)}><span className={`is-${item.accent}`} aria-hidden="true" /><strong>{item.label}</strong><small>{item.eyebrow}</small><b aria-hidden="true">‹</b></button>;
                })}
              </div>
            </section>
          ))}
        </div>
      </EzSheet>
    </div>
  );
}