import { lazy, Suspense, useLayoutEffect, useState } from 'react';

const CompaniesPortal = lazy(() => import('../records/LiveCompaniesProductionPortal.tsx').then((module) => ({ default: module.LiveCompaniesProductionPortal })));
const PeoplePortal = lazy(() => import('../records/LivePeopleProductionPortal.tsx').then((module) => ({ default: module.LivePeopleProductionPortal })));
const FinancePortal = lazy(() => import('../finance/LiveFinanceProductionPortal.tsx').then((module) => ({ default: module.LiveFinanceProductionPortal })));
const SHELL = '.r2-shell[data-r2-runtime-mode="live"][data-destination]';
type LazyDestination = 'companies' | 'people' | 'finance' | 'risk' | null;

export function LazyLiveProductionPortals() {
  const [destination, setDestination] = useState<LazyDestination>(null);
  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>(SHELL);
    if (!shell) return;
    const sync = () => {
      const value = shell.dataset.destination;
      setDestination(value === 'companies' || value === 'people' || value === 'finance' || value === 'risk' ? value : null);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(shell, { attributes: true, attributeFilter: ['data-destination'] });
    return () => observer.disconnect();
  }, []);

  if (!destination) return null;
  return <Suspense fallback={null}>
    {destination === 'companies' ? <CompaniesPortal /> : destination === 'people' ? <PeoplePortal /> : <FinancePortal />}
  </Suspense>;
}
