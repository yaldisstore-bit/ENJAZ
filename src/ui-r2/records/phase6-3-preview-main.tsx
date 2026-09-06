import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DataLayerProvider } from '../../data/react/DataLayerContext.tsx';
import { createPhase63PreviewDataFactory, PHASE63_PREVIEW_USER_ID } from '../../features/entity360/entity360PreviewDataLayer.ts';
import { CurrentUserIdProvider } from '../../shared/session/CurrentUserIdContext.tsx';
import { ConnectedCompanies } from './ConnectedCompanies.tsx';
import { ConnectedPeople } from './ConnectedPeople.tsx';
import '../runtime/shell-base.css';
import '../runtime/shell.css';
import '../golden/golden.css';
import '../golden/golden-journey.css';
import '../golden/golden-mobile-hardening.css';
import '../core-work/core-work.css';
import './records.css';
import './people.css';
import '../runtime/accessibility-hardening.css';

const factory = createPhase63PreviewDataFactory();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataLayerProvider factory={factory}>
      <CurrentUserIdProvider userId={PHASE63_PREVIEW_USER_ID}>
        <div className="ez-r2-root r2-shell" data-phase6-3-preview="true">
          <main className="r2-shell__main" aria-label="Phase 6.3 Company and Lawyer 360 browser preview">
            <ConnectedCompanies />
            <ConnectedPeople />
          </main>
        </div>
      </CurrentUserIdProvider>
    </DataLayerProvider>
  </StrictMode>,
);
