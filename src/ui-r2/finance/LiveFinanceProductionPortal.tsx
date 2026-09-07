import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useLiveRecordsPortal } from '../records/LiveCompaniesProductionPortal.tsx';
import './finance.css';
import './phase72-mobile-hardening.css';

const ConnectedPhase72FinanceExperience = lazy(async () => {
  const module = await import('./Phase72FinanceExperience.tsx');
  return { default: module.ConnectedPhase72FinanceExperience };
});
const ConnectedPhase73FinancialIntelligenceExperience = lazy(async () => {
  const module = await import('./Phase73FinancialIntelligenceExperience.tsx');
  return { default: module.ConnectedPhase73FinancialIntelligenceExperience };
});
const ConnectedPhase74FinancialReportsExperience = lazy(async () => {
  const module = await import('./Phase74FinancialReportsExperience.tsx');
  return { default: module.ConnectedPhase74FinancialReportsExperience };
});

const FINANCE_SHELL = '.r2-shell[data-r2-runtime-mode="live"][data-destination]';
const FINANCE_PREVIEW = '[data-operational-domain="finance"]';

function FinanceStageLoading() {
  return <div className="r2-screen r2-finance-workspace" data-finance-lazy-loading="true"><h1>المالية</h1><p>جارٍ تحميل وحدات المالية الموثوقة…</p></div>;
}

export function LiveFinanceProductionPortal() {
  const { active, target } = useLiveRecordsPortal('finance', FINANCE_SHELL, FINANCE_PREVIEW);
  if (!active || !target) return null;
  return createPortal(
    <Suspense fallback={<FinanceStageLoading />}>
      <div className="r2-finance-phase74-stack"><ConnectedPhase74FinancialReportsExperience /><ConnectedPhase73FinancialIntelligenceExperience /><ConnectedPhase72FinanceExperience /></div>
    </Suspense>,
    target,
  );
}
