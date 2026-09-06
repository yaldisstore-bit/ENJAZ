import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { UiR2ProductionRoot } from './ui-r2/runtime/UiR2ProductionRoot.tsx';
import { UiR2Root } from './ui-r2/runtime/UiR2Root.tsx';

const rootElement = document.getElementById('root');
const safePreviewMode = import.meta.env.VITE_ENJAZ_PREVIEW_MODE === 'true';

if (!rootElement) {
  throw new Error('ENJAZ root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    {safePreviewMode ? <UiR2Root runtimeMode="preview" /> : <UiR2ProductionRoot />}
  </StrictMode>,
);
