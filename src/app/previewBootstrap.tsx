import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PreviewApp } from './PreviewApp';

export function bootPreviewApplication(doc: Document = document): void {
  const root = doc.getElementById('root');
  if (!(root instanceof HTMLElement)) {
    throw new Error('ENJAZ preview root element is missing');
  }

  createRoot(root).render(
    <StrictMode>
      <PreviewApp />
    </StrictMode>,
  );

  root.dataset.enjazBoot = 'preview-ready';
}
