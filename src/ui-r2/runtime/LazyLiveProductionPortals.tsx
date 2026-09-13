import { lazy, Suspense, useLayoutEffect, useState } from 'react';
import type { RegulatoryKnowledgeGateway } from '../../features/regulatory/regulatoryKnowledgeCommands.ts';
import type { DocumentIntelligenceFactory, DocumentVaultFactory } from './UiR2ProductionRoot.tsx';

const CompaniesPortal = lazy(() => import('../records/LiveCompaniesProductionPortal.tsx').then((module) => ({ default: module.LiveCompaniesProductionPortal })));
const PeoplePortal = lazy(() => import('../records/LivePeopleProductionPortal.tsx').then((module) => ({ default: module.LivePeopleProductionPortal })));
const FinancePortal = lazy(() => import('../finance/LiveFinanceProductionPortal.tsx').then((module) => ({ default: module.LiveFinanceProductionPortal })));
const KnowledgePortal = lazy(() => import('../regulatory/LiveRegulatoryKnowledgePortal.tsx').then((module) => ({ default: module.LiveRegulatoryKnowledgePortal })));
const InsightsPortal = lazy(() => import('../intelligence/LiveBusinessIntelligencePortal.tsx').then((module) => ({ default: module.LiveBusinessIntelligencePortal })));
const DocumentsPortal = lazy(() => import('../documents/LiveDocumentVaultPortal.tsx').then((module) => ({ default: module.LiveDocumentVaultPortal })));
const SHELL = '.r2-shell[data-r2-runtime-mode="live"][data-destination]';

type LazyDestination = 'companies' | 'people' | 'finance' | 'risk' | 'insights' | 'knowledge' | 'documents' | null;
type Props = Readonly<{
  regulatoryKnowledge: RegulatoryKnowledgeGateway;
  regulatoryWorkspace: Promise<string | null>;
  documentVaultFactory: DocumentVaultFactory;
  documentIntelligenceFactory: DocumentIntelligenceFactory | undefined;
  documentWorkspace: Promise<string | null>;
}>;

export function LazyLiveProductionPortals({ regulatoryKnowledge, regulatoryWorkspace, documentVaultFactory, documentIntelligenceFactory, documentWorkspace }: Props) {
  const [destination, setDestination] = useState<LazyDestination>(null);

  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>(SHELL);
    if (!shell) return;
    const sync = () => {
      const value = shell.dataset.destination;
      setDestination(
        value === 'companies' || value === 'people' || value === 'finance' || value === 'risk' || value === 'insights' || value === 'knowledge' || value === 'documents'
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
    {destination === 'companies' ? <CompaniesPortal />
      : destination === 'people' ? <PeoplePortal />
      : destination === 'finance' || destination === 'risk' ? <FinancePortal />
      : destination === 'insights' ? <InsightsPortal />
      : destination === 'knowledge' ? <KnowledgePortal gateway={regulatoryKnowledge} workspace={regulatoryWorkspace} />
      : destination === 'documents' ? <DocumentsPortal factory={documentVaultFactory} intelligenceFactory={documentIntelligenceFactory} workspace={documentWorkspace}/>
      : null}
  </Suspense>;
}
