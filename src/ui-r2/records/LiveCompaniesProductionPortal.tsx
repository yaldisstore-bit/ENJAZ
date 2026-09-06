import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConnectedCompanies } from './ConnectedCompanies.tsx';
import './companies.css';

export function useLiveRecordsPortal(destination: string, shellSelector: string, previewSelector: string) {
  const [target, setTarget] = useState<HTMLElement | null>(null), [active, setActive] = useState(false);
  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>(shellSelector), main = document.getElementById('r2-main');
    if (!shell || !main) return;
    setTarget(main);
    const sync = () => setActive(shell.dataset.destination === destination);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(shell, { attributes: true, attributeFilter: ['data-destination'] });
    return () => observer.disconnect();
  }, [destination, shellSelector]);
  useLayoutEffect(() => {
    if (!target) return;
    const preview = target.querySelector<HTMLElement>(previewSelector);
    if (preview) preview.hidden = active;
    return () => { if (preview) preview.hidden = false; };
  }, [active, previewSelector, target]);
  return { active, target };
}

const COMPANY_SHELL = '.r2-shell[data-r2-runtime-mode="live"][data-destination]';
const COMPANY_PREVIEW = '[data-records-stage="R2.0-6"][data-records-domain="companies"]';
export function LiveCompaniesProductionPortal() {
  const { active, target } = useLiveRecordsPortal('companies', COMPANY_SHELL, COMPANY_PREVIEW);
  if (!active || !target) return null;
  return createPortal(<ConnectedCompanies />, target);
}
