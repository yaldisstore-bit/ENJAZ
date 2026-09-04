import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RebirthRoot } from './ui-rebirth/runtime/RebirthRoot.tsx';
import './ui-rebirth/styles/foundation.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('ENJAZ root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <RebirthRoot />
  </StrictMode>,
);
