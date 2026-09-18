import { lazy, Suspense, useLayoutEffect, useState } from 'react';
import type { RegulatoryKnowledgeGateway } from '../../features/regulatory/regulatoryKnowledgeCommands.ts';
import type { DocumentFactoryFactory, DocumentIntelligenceFactory, DocumentVaultFactory, EngagementContractFactory } from './UiR2ProductionRoot.tsx';

const named=(load:()=>Promise<any>,key:string)=>lazy(()=>load().then(module=>({default:module[key]})));
const CompaniesPortal=named(()=>import('../records/LiveCompaniesProductionPortal.tsx'),'LiveCompaniesProductionPortal');
const PeoplePortal=named(()=>import('../records/LivePeopleProductionPortal.tsx'),'LivePeopleProductionPortal');
const FinancePortal=named(()=>import('../finance/LiveFinanceProductionPortal.tsx'),'LiveFinanceProductionPortal');
const KnowledgePortal=named(()=>import('../regulatory/LiveRegulatoryKnowledgePortal.tsx'),'LiveRegulatoryKnowledgePortal');
const InsightsPortal=named(()=>import('../intelligence/LiveBusinessIntelligencePortal.tsx'),'LiveBusinessIntelligencePortal');
const DocumentsPortal=named(()=>import('../documents/LiveDocumentVaultPortal.tsx'),'LiveDocumentVaultPortal');
const EngagementContractsPortal=named(()=>import('../documents/LiveEngagementContractsPortal.tsx'),'LiveEngagementContractsPortal');
const NotificationsPortal=named(()=>import('../notifications/LiveNotificationsProductionPortal.tsx'),'LiveNotificationsProductionPortal');
const CalendarPortal=named(()=>import('../calendar/LiveUnifiedCalendarProductionPortal.tsx'),'LiveUnifiedCalendarProductionPortal');
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
