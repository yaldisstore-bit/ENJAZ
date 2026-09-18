import { lazy, Suspense, useLayoutEffect, useState } from 'react';
import type { RegulatoryKnowledgeGateway } from '../../features/regulatory/regulatoryKnowledgeCommands.ts';
import type { DocumentFactoryFactory, DocumentIntelligenceFactory, DocumentVaultFactory, EngagementContractFactory } from './UiR2ProductionRoot.tsx';

const CompaniesPortal = lazy(() => import('../records/LiveCompaniesProductionPortal.tsx').then((module) => ({ default: module.LiveCompaniesProductionPortal })));
const PeoplePortal = lazy(() => import('../records/LivePeopleProductionPortal.tsx').then((module) => ({ default: module.LivePeopleProductionPortal })));
const FinancePortal = lazy(() => import('../finance/LiveFinanceProductionPortal.tsx').then((module) => ({ default: module.LiveFinanceProductionPortal })));
const KnowledgePortal = lazy(() => import('../regulatory/LiveRegulatoryKnowledgePortal.tsx').then((module) => ({ default: module.LiveRegulatoryKnowledgePortal })));
const InsightsPortal = lazy(() => import('../intelligence/LiveBusinessIntelligencePortal.tsx').then((module) => ({ default: module.LiveBusinessIntelligencePortal })));
const DocumentsPortal = lazy(() => import('../documents/LiveDocumentVaultPortal.tsx').then((module) => ({ default: module.LiveDocumentVaultPortal })));
const EngagementContractsPortal = lazy(() => import('../documents/LiveEngagementContractsPortal.tsx').then((module) => ({ default: module.LiveEngagementContractsPortal })));
const NotificationsPortal = lazy(() => import('../notifications/LiveNotificationsProductionPortal.tsx').then((module) => ({ default: module.LiveNotificationsProductionPortal })));
const CalendarPortal = lazy(() => import('../calendar/LiveUnifiedCalendarProductionPortal.tsx').then((module) => ({ default: module.LiveUnifiedCalendarProductionPortal })));
const CopilotPortal = lazy(() => import('../copilot/LiveCopilotPortal.tsx').then((module) => ({ default: module.LiveCopilotPortal })));
const SHELL = '.r2-shell[data-r2-runtime-mode="live"][data-destination]';

type LazyDestination = 'companies' | 'people' | 'finance' | 'risk' | 'insights' | 'knowledge' | 'documents' | 'today.notifications' | 'calendar' | 'copilot' | null;
type Props = Readonly<{
  regulatoryKnowledge: RegulatoryKnowledgeGateway;
  regulatoryWorkspace: Promise<string | null>;
  documentVaultFactory: DocumentVaultFactory;
  documentIntelligenceFactory: DocumentIntelligenceFactory | undefined;
  documentFactoryFactory: DocumentFactoryFactory | undefined;
  engagementContractFactory: EngagementContractFactory | undefined;
  documentWorkspace: Promise<string | null>;
  copilotInvoke: (body: Readonly<Record<string, unknown>>) => Promise<Response>;
}>;

export function LazyLiveProductionPortals({ regulatoryKnowledge, regulatoryWorkspace, documentVaultFactory, documentIntelligenceFactory, documentFactoryFactory, engagementContractFactory, documentWorkspace, copilotInvoke }: Props) {
  const [destination, setDestination] = useState<LazyDestination>(null);

  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>(SHELL);
    if (!shell) return;
    const sync = () => {
      const value = shell.dataset.destination;
      setDestination(
        value === 'companies' || value === 'people' || value === 'finance' || value === 'risk' || value === 'insights' || value === 'knowledge' || value === 'documents' || value === 'today.notifications' || value === 'calendar' || value === 'copilot'
          ? value
          : null,
      );
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(shell, { attributes: true, attributeFilter: ['data-destination'] });
    return () => observer.disconnect();
  }, []);

  if (!destination) return null;
  return <Suspense fallback={null}>
    {destination === 'today.notifications' ? <NotificationsPortal />
      : destination === 'calendar' ? <CalendarPortal workspace={documentWorkspace} />
      : destination === 'companies' ? <CompaniesPortal />
      : destination === 'people' ? <PeoplePortal />
      : destination === 'finance' || destination === 'risk' ? <FinancePortal />
      : destination === 'insights' ? <InsightsPortal />
      : destination === 'knowledge' ? <KnowledgePortal gateway={regulatoryKnowledge} workspace={regulatoryWorkspace} />
      : destination === 'copilot' ? <CopilotPortal workspace={documentWorkspace} invoke={copilotInvoke} />
      : destination === 'documents'
        ? <>
          <DocumentsPortal factory={documentVaultFactory} intelligenceFactory={documentIntelligenceFactory} documentFactoryFactory={documentFactoryFactory} workspace={documentWorkspace}/>
          {engagementContractFactory && documentFactoryFactory && <EngagementContractsPortal engagementContractFactory={engagementContractFactory} documentFactoryFactory={documentFactoryFactory} workspace={documentWorkspace}/>}
        </>
        : null}
  </Suspense>;
}
