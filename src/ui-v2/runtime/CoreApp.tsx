import { useState } from 'react';
import { AppShell } from '../components/AppShell.tsx';
import { DailyWorkCoreScreen, FinanceCoreScreen, HomeCoreScreen, OperationsCoreScreen } from '../screens/CoreScreens.tsx';

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
  const current = titles[activeTab];

  const screen = activeTab === 'home'
    ? <HomeCoreScreen />
    : activeTab === 'today'
      ? <DailyWorkCoreScreen onNewFollowup={() => window.dispatchEvent(new CustomEvent('enjaz:open-create', { detail: 'followup' }))} />
      : activeTab === 'operations'
        ? <OperationsCoreScreen commandMode={commandMode} onCommandMode={setCommandMode} />
        : <FinanceCoreScreen />;

  return (
    <div data-core-app="true" data-stage="ui-6">
      <AppShell
        title={commandMode && activeTab === 'operations' ? 'القيادة' : current.title}
        subtitle={commandMode && activeTab === 'operations' ? 'المركز التنفيذي' : current.subtitle}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'operations') setCommandMode(false);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
      >
        {screen}
      </AppShell>
    </div>
  );
}
