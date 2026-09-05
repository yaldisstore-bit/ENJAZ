import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { UiR2Root } from './runtime/UiR2Root.tsx';
import './runtime/shell-base.css';
import './runtime/shell.css';

const rootElement = document.getElementById('r2-root');

if (!rootElement) {
  throw new Error('ENJAZ R2 preview root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <UiR2Root />
  </StrictMode>,
);
