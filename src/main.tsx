import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { UiV2Root } from './ui-v2/runtime/UiV2Root.tsx';
import './ui-v2/styles/foundation.css';
import './ui-v2/styles/components.css';
import './ui-v2/styles/shell.css';
import './ui-v2/styles/composition.css';
import './ui-v2/styles/core.css';
import './ui-v2/styles/domains.css';
import './ui-v2/styles/domain-explorer.css';
import './ui-v2/styles/states-forms.css';
import './ui-v2/styles/touch-contract.css';
import './ui-v2/styles/motion-touch.css';
import './ui-v2/styles/resilience.css';
import './ui-v2/styles/home-dashboard.css';
import './ui-v2/styles/daily-work.css';
import './ui-v2/styles/executive-briefing.css';
import './ui-v2/styles/transaction-list.css';
import './ui-v2/styles/transaction-editor.css';
import './ui-v2/styles/auth-runtime.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('ENJAZ root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <UiV2Root />
  </StrictMode>,
);