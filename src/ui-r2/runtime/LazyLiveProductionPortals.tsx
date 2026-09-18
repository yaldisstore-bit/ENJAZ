import { lazy, Suspense, useLayoutEffect, useState, type ComponentType } from 'react';
import type { RegulatoryKnowledgeGateway } from '../../features/regulatory/regulatoryKnowledgeCommands.ts';
import type { DocumentFactoryFactory, DocumentIntelligenceFactory, DocumentVaultFactory, EngagementContractFactory } from './UiR2ProductionRoot.tsx';

const named=<M,K extends keyof M>(load:()=>Promise<M>,key:K):any=>lazy(()=>load().then(module=>({default:module[key] as Extract<M[K],ComponentType<any>>})));
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
  const [destination, setDestination] = useState<string>();

  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>(SHELL);
    if (!shell) return;
    const sync=()=>setDestination(shell.dataset.destination);
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
