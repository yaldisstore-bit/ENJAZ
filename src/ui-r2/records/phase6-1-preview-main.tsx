import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DataLayerProvider } from '../../data/react/DataLayerContext.tsx';
import { createPhase61PreviewDataFactory, PHASE61_PREVIEW_USER_ID } from '../../features/companies/companyPreviewDataLayer.ts';
import { CurrentUserIdProvider } from '../../shared/session/CurrentUserIdContext.tsx';
import { ConnectedCompanies } from './ConnectedCompanies.tsx';
import '../runtime/shell-base.css';
import '../runtime/shell.css';
import '../golden/golden.css';
import '../golden/golden-journey.css';
import '../golden/golden-mobile-hardening.css';
import '../core-work/core-work.css';
import './records.css';
import './companies.css';
import '../runtime/accessibility-hardening.css';

const factory = createPhase61PreviewDataFactory();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataLayerProvider factory={factory}>
      <CurrentUserIdProvider userId={PHASE61_PREVIEW_USER_ID}>
        <div className="ez-r2-root r2-shell" data-phase6-1-preview="true">
          <main className="r2-shell__main" aria-label="Phase 6.1 Companies browser preview">
            <ConnectedCompanies />
          </main>
        </div>
      </CurrentUserIdProvider>
    </DataLayerProvider>
  </StrictMode>,
);
