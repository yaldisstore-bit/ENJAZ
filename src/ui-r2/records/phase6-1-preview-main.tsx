import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DataLayerProvider } from '../../data/react/DataLayerContext.tsx';
import { createPhase61PreviewDataFactory, PHASE61_PREVIEW_USER_ID } from '../../features/companies/companyPreviewDataLayer.ts';
import { GovernanceCommandProvider } from '../../features/governance/GovernanceCommandContext.tsx';
import type { GovernanceCommandGateway, GovernanceContext } from '../../features/governance/governanceCommands.ts';
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
const rejectHistoricalMutation = async (): Promise<never> => { throw new Error('Historical Phase 6.1 preview is read-only for governance.'); };
const governanceGateway: GovernanceCommandGateway = Object.freeze({
  async loadContext(_workspaceId: string, companyId: string, asOf?: string | null): Promise<GovernanceContext> {
    return Object.freeze({
      companyId,
      asOf: asOf ?? new Date().toISOString().slice(0, 10),
      canMutate: false,
      versions: Object.freeze({ ownership: 0, beneficialOwners: 0, authority: 0, resolutions: 0, capital: 0 }),
      ownership: Object.freeze({ configured: false, totalPercentage: null, stakes: Object.freeze([]) }),
      beneficialOwners: Object.freeze([]),
      authorities: Object.freeze([]),
      resolutions: Object.freeze([]),
      capital: Object.freeze({ known: false, amount: null, source: 'historical_preview', effectiveOn: null, version: 0 }),
      timeline: Object.freeze([]),
      risks: Object.freeze([]),
    });
  },
  replaceOwnership: rejectHistoricalMutation,
  replaceBeneficialOwners: rejectHistoricalMutation,
  grantAuthority: rejectHistoricalMutation,
  revokeAuthority: rejectHistoricalMutation,
  recordResolution: rejectHistoricalMutation,
  recordCapital: rejectHistoricalMutation,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataLayerProvider factory={factory}>
      <GovernanceCommandProvider gateway={governanceGateway}>
        <CurrentUserIdProvider userId={PHASE61_PREVIEW_USER_ID}>
          <div className="ez-r2-root r2-shell" data-phase6-1-preview="true">
            <main className="r2-shell__main" aria-label="Phase 6.1 Companies browser preview">
              <ConnectedCompanies />
            </main>
          </div>
        </CurrentUserIdProvider>
      </GovernanceCommandProvider>
    </DataLayerProvider>
  </StrictMode>,
);
