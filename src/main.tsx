import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { R2_DESTINATIONS } from './ui-r2/architecture/navigation-contract.ts';
import { UiR2ProductionRoot } from './ui-r2/runtime/UiR2ProductionRoot.tsx';

function normalizeCanonicalAppDeepLink(): void {
  const url = new URL(window.location.href);
  if (url.searchParams.has('dest')) return;

  const appMarker = url.pathname.lastIndexOf('/app');
  if (appMarker < 0) return;

  const canonicalPath = url.pathname.slice(appMarker).replace(/\/$/, '') || '/app';
  const destination = R2_DESTINATIONS.find((item) => !item.route.includes(':') && item.route.split('?')[0] === canonicalPath);
  if (!destination || destination.id === 'home') return;

  url.searchParams.set('dest', destination.id);
  window.history.replaceState(window.history.state, '', url);
}

normalizeCanonicalAppDeepLink();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('ENJAZ root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <UiR2ProductionRoot />
  </StrictMode>,
);
