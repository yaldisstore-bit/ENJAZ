import { lazy, Suspense, useLayoutEffect, useState } from 'react';
import type { RegulatoryKnowledgeGateway } from '../../features/regulatory/regulatoryKnowledgeCommands.ts';

const CompaniesPortal = lazy(() => import('../records/LiveCompaniesProductionPortal.tsx').then((module) => ({ default: module.LiveCompaniesProductionPortal })));
const PeoplePortal = lazy(() => import('../records/LivePeopleProductionPortal.tsx').then((module) => ({ default: module.LivePeopleProductionPortal })));
const FinancePortal = lazy(() => import('../finance/LiveFinanceProductionPortal.tsx').then((module) => ({ default: module.LiveFinanceProductionPortal })));
const KnowledgePortal = lazy(() => import('../regulatory/LiveRegulatoryKnowledgePortal.tsx').then((module) => ({ default: module.LiveRegulatoryKnowledgePortal })));
const SHELL = '.r2-shell[data-r2-runtime-mode="live"][data-destination]';
type LazyDestination = 'companies' | 'people' | 'finance' | 'risk' | 'knowledge' | null;

export function LazyLiveProductionPortals({ regulatoryKnowledge, regulatoryWorkspace }: Readonly<{ regulatoryKnowledge: RegulatoryKnowledgeGateway; regulatoryWorkspace: Promise<string | null> }>) {
  const [destination, setDestination] = useState<LazyDestination>(null);
  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>(SHELL);
    if (!shell) return;
    const sync = () => {
      const value = shell.dataset.destination;
      setDestination(value === 'companies' || value === 'people' || value === 'finance' || value === 'risk' || value === 'knowledge' ? value : null);
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
      : destination === 'knowledge' ? <KnowledgePortal gateway={regulatoryKnowledge} workspace={regulatoryWorkspace} />
      : null}
  </Suspense>;
}
