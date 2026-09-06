import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DataLayerProvider } from '../../data/react/DataLayerContext.tsx';
import { createPhase62PreviewDataFactory, PHASE62_PREVIEW_USER_ID } from '../../features/contacts/contactPreviewDataLayer.ts';
import { CurrentUserIdProvider } from '../../shared/session/CurrentUserIdContext.tsx';
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

const factory = createPhase62PreviewDataFactory();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataLayerProvider factory={factory}>
      <CurrentUserIdProvider userId={PHASE62_PREVIEW_USER_ID}>
        <div className="ez-r2-root r2-shell" data-phase6-2-preview="true">
          <main className="r2-shell__main" aria-label="Phase 6.2 Lawyers and Contacts browser preview">
            <ConnectedPeople />
          </main>
        </div>
      </CurrentUserIdProvider>
    </DataLayerProvider>
  </StrictMode>,
);
