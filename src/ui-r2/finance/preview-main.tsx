import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FinanceLedgerPreviewExperience } from './FinanceLedgerExperience.tsx';
import '../runtime/shell-base.css';
import '../runtime/shell.css';
import './finance.css';
import '../runtime/accessibility-hardening.css';

const root = document.getElementById('phase7-1-root');
if (!root) throw new Error('Phase 7.1 preview root missing');

createRoot(root).render(
  <StrictMode>
    <div className="r2-shell" data-r2-runtime-mode="preview" data-destination="finance" dir="rtl">
      <main id="r2-main" className="r2-main">
        <FinanceLedgerPreviewExperience />
      </main>
    </div>
  </StrictMode>,
);
