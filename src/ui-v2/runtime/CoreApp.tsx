import { useState } from 'react';
import { domainById, enjazDomains, type EnjazDomainId } from '../architecture/domain-composition.ts';
import { AppShell } from '../components/AppShell.tsx';
import { DailyWorkCoreScreen, FinanceCoreScreen, HomeCoreScreen, OperationsCoreScreen } from '../screens/CoreScreens.tsx';
import { DomainScreen } from '../screens/DomainScreens.tsx';

type ShellTab = 'home' | 'today' | 'operations' | 'finance';

const titles: Record<ShellTab, { title: string; subtitle: string }> = {
  home: { title: 'إنجاز', subtitle: 'مساحة العمل' },
  today: { title: 'اليوم', subtitle: 'العمل اليومي' },
  operations: { title: 'العمليات', subtitle: 'مركز العمل' },
  finance: { title: 'المالية', subtitle: 'الحركة المالية' },
};

export function CoreApp() {
  const [activeTab, setActiveTab] = useState<ShellTab>('home');
  const [commandMode, setCommandMode] = useState(false);
  const [activeDomain, setActiveDomain] = useState<EnjazDomainId | null>(null);
  const current = titles[activeTab];
  const domain = activeDomain ? domainById[activeDomain] : null;

  const coreScreen = activeTab === 'home'
    ? <HomeCoreScreen />
    : activeTab === 'today'
      ? <DailyWorkCoreScreen onNewFollowup={() => window.dispatchEvent(new CustomEvent('enjaz:open-create', { detail: 'followup' }))} />
      : activeTab === 'operations'
        ? <OperationsCoreScreen commandMode={commandMode} onCommandMode={setCommandMode} />
        : <FinanceCoreScreen />;

  const openDomain = (domainId: EnjazDomainId) => {
    setActiveDomain(domainId);
    setCommandMode(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div data-core-app="true" data-stage="ui-7" data-active-domain={activeDomain ?? 'core'}>
      <AppShell
        title={domain ? domain.label : commandMode && activeTab === 'operations' ? 'القيادة' : current.title}
        subtitle={domain ? domain.eyebrow : commandMode && activeTab === 'operations' ? 'المركز التنفيذي' : current.subtitle}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setActiveDomain(null);
          if (tab !== 'operations') setCommandMode(false);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
      >
        <nav className="ez-domain-rail" aria-label="مجالات إنجاز" data-domain-rail="true">
          <button type="button" className={!activeDomain ? 'is-active' : ''} onClick={() => setActiveDomain(null)}><span>الأساسية</span><small>Core</small></button>
          {enjazDomains.map((item) => (
            <button key={item.id} type="button" className={activeDomain === item.id ? 'is-active' : ''} data-domain-link={item.id} onClick={() => openDomain(item.id)}>
              <span>{item.label}</span><small>{item.eyebrow}</small>
            </button>
          ))}
        </nav>

        {domain ? (
          <div className="ez-domain-runtime" data-domain-runtime={domain.id}>
            <div className={`ez-domain-runtime__marker is-${domain.accent}`}><span>{domain.eyebrow}</span><strong>{domain.signature}</strong><button type="button" onClick={() => setActiveDomain(null)}>العودة للأساسية</button></div>
            <DomainScreen domain={domain.id} />
          </div>
        ) : coreScreen}
      </AppShell>
    </div>
  );
}
