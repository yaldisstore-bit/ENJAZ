import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { R2_DESTINATIONS } from './ui-r2/architecture/navigation-contract.ts';
import { UiR2ProductionRoot } from './ui-r2/runtime/UiR2ProductionRoot.tsx';

const ClientPortalProductionRoot=lazy(()=>import('./ui-r2/client-portal/ClientPortalProductionRoot.tsx').then((module)=>({default:module.ClientPortalProductionRoot})));

function isClientPortalPath():boolean{
  const parts=window.location.pathname.split('/').filter(Boolean);
  return parts.includes('portal');
}

function normalizeCanonicalAppDeepLink(): void {
  if(isClientPortalPath())return;
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
if (!rootElement) throw new Error('ENJAZ root element was not found.');

createRoot(rootElement).render(
  <StrictMode>
    {isClientPortalPath()
      ? <Suspense fallback={<main dir="rtl" style={{minHeight:'100dvh',display:'grid',placeItems:'center'}}>جارٍ فتح بوابة إنجاز…</main>}><ClientPortalProductionRoot /></Suspense>
      : <UiR2ProductionRoot />}
  </StrictMode>,
);
