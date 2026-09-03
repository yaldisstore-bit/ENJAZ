import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createRuntimeConfig } from '../core/config/env';
import { createLogger, type Logger } from '../core/logging/logger';
import { createUnhandledErrorReporter } from '../core/errors/unhandled';
import { BootStateMachine } from '../core/runtime/bootState';
import { APP_VERSION } from '../core/version/version';
import { AppErrorBoundary } from '../shared/ui/AppErrorBoundary';
import { createEnjazSupabaseClient } from '../core/supabase/client';
import { createSupabaseAuthGateway } from '../core/auth/SupabaseAuthGateway';
import { createEnjazDataLayerFactory } from '../data/createDataLayer';

export interface BootResult {
  readonly state: BootStateMachine;
  readonly logger: Logger;
}

function requireRootElement(doc: Document): HTMLElement {
  const root = doc.getElementById('root');
  if (!(root instanceof HTMLElement)) {
    throw new Error('ENJAZ root element is missing');
  }
  return root;
}

export function bootApplication(
  env: Readonly<Record<string, unknown>>,
  doc: Document = document,
  win: Window = window,
): BootResult {
  const state = new BootStateMachine();
  state.begin();

  const config = createRuntimeConfig(env);
  const logger = createLogger(config.logLevel);
  const supabaseClient = createEnjazSupabaseClient(config);
  const authGateway = createSupabaseAuthGateway(supabaseClient);
  const dataLayerFactory = createEnjazDataLayerFactory(supabaseClient);
  const reporter = createUnhandledErrorReporter(logger);

  win.addEventListener('error', (event) => reporter.reportError(event.error ?? event.message, 'window.error'));
  win.addEventListener('unhandledrejection', (event) => reporter.reportRejection(event.reason));

  try {
    const rootElement = requireRootElement(doc);
    logger.info('Application boot', { version: APP_VERSION, environment: config.environment });

    createRoot(rootElement).render(
      <StrictMode>
        <AppErrorBoundary logger={logger}>
          <App authGateway={authGateway} dataLayerFactory={dataLayerFactory} />
        </AppErrorBoundary>
      </StrictMode>,
    );

    state.ready();
    rootElement.dataset.enjazBoot = 'ready';
    return Object.freeze({ state, logger });
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error('Unknown bootstrap failure');
    state.fail('BOOT_FAILED');
    reporter.reportError(normalized, 'bootstrap');
    throw normalized;
  }
}
