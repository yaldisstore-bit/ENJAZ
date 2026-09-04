import { useState } from 'react';
import { domainById, enjazDomains, type EnjazDomainId } from '../architecture/domain-composition.ts';
import { AppShell } from '../components/AppShell.tsx';
import { EzSheet } from '../components/overlays.tsx';
import { DailyWorkCoreScreen, FinanceCoreScreen, HomeCoreScreen, OperationsCoreScreen } from '../screens/CoreScreens.tsx';
import { DomainScreen } from '../screens/DomainScreens.tsx';

type ShellTab = 'home' | 'today' | 'operations' | 'finance';
type DomainGroup = Readonly<{ label: string; ids: readonly EnjazDomainId[] }>;

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

export function CoreApp() {
  const [activeTab, setActiveTab] = useState<ShellTab>('home');
  const [commandMode, setCommandMode] = useState(false);
  const [activeDomain, setActiveDomain] = useState<EnjazDomainId | null>(null);
  const [domainExplorerOpen, setDomainExplorerOpen] = useState(false);
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
    setDomainExplorerOpen(false);
    setCommandMode(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const returnToCore = () => {
    setActiveDomain(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const motionKey = domain ? `domain-${domain.id}` : `core-${activeTab}-${commandMode ? 'command' : 'standard'}`;

  return (
    <div data-core-app="true" data-stage="ui-9" data-active-domain={activeDomain ?? 'core'}>
      <AppShell
        title={domain ? domain.label : commandMode && activeTab === 'operations' ? 'القيادة' : current.title}
        subtitle={domain ? domain.eyebrow : commandMode && activeTab === 'operations' ? 'المركز التنفيذي' : current.subtitle}
        activeTab={activeTab}
        onBrandAction={() => setDomainExplorerOpen(true)}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setActiveDomain(null);
          setDomainExplorerOpen(false);
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
