import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { UiR2ProductionRoot } from './ui-r2/runtime/UiR2ProductionRoot.tsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('ENJAZ root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <UiR2ProductionRoot />
  </StrictMode>,
);
