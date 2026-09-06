import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConnectedCompanies } from './ConnectedCompanies.tsx';
import './companies.css';

const LIVE_COMPANIES_DESTINATION = 'companies';

export function LiveCompaniesProductionPortal() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState(false);

  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>('.r2-shell[data-r2-runtime-mode="live"]');
    const main = document.getElementById('r2-main');
    if (!shell || !main) return;

    setTarget(main);
    const syncDestination = () => setActive(shell.dataset.destination === LIVE_COMPANIES_DESTINATION);
    syncDestination();

    const observer = new MutationObserver(syncDestination);
    observer.observe(shell, { attributes: true, attributeFilter: ['data-destination'] });
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!target) return;
    const frozenPreview = target.querySelector<HTMLElement>('[data-records-stage="R2.0-6"][data-records-domain="companies"]');
    if (frozenPreview) frozenPreview.hidden = active;
    return () => {
      if (frozenPreview) frozenPreview.hidden = false;
    };
  }, [active, target]);

  if (!active || !target) return null;
  return createPortal(<ConnectedCompanies />, target);
}
