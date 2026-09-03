import './styles/foundation.css';

if (import.meta.env.VITE_ENJAZ_PREVIEW_MODE === 'true') {
  void import('./app/previewBootstrap').then(({ bootPreviewApplication }) => {
    bootPreviewApplication();
  });
} else {
  void import('./app/bootstrap').then(({ bootApplication }) => {
    bootApplication(import.meta.env);
  });
}
