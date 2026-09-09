import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { buildR2PreviewSearchRecords } from './find-anything/find-anything-preview.ts';
import { UiR2Root } from './runtime/UiR2PreviewRoot.tsx';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './golden/golden-journey.css';
import './golden/golden-mobile-hardening.css';
import './core-work/core-work.css';
import './records/records.css';
import './operational-intelligence/operational-intelligence.css';
import './runtime/accessibility-hardening.css';

type PreviewGlobal = typeof globalThis & { __ENJAZ_R2_PREVIEW_SEARCH_RECORDS__?: ReturnType<typeof buildR2PreviewSearchRecords> };
(globalThis as PreviewGlobal).__ENJAZ_R2_PREVIEW_SEARCH_RECORDS__ = buildR2PreviewSearchRecords();

const rootElement = document.getElementById('r2-root');

if (!rootElement) {
  throw new Error('ENJAZ R2 preview root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <UiR2Root />
  </StrictMode>,
);
