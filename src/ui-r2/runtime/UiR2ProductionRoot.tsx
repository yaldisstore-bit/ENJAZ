import { useState } from 'react';
import type { AuthGateway } from '../../core/auth/authGateway.ts';
import { createSupabaseAuthGateway } from '../../core/auth/SupabaseAuthGateway.ts';
import { createRuntimeConfig } from '../../core/config/env.ts';
import { createEnjazSupabaseClient } from '../../core/supabase/client.ts';
import { createEnjazDataLayerFactory, type EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import { DataLayerProvider } from '../../data/react/DataLayerContext.tsx';
import { AuthProvider, useAuth } from '../../features/auth/state/AuthContext.tsx';
import { CurrentUserIdProvider } from '../../shared/session/CurrentUserIdContext.tsx';
import { SessionChecking } from '../../shared/session/SessionChecking.tsx';
import { R2AuthScreen } from '../auth/R2AuthScreen.tsx';
import { UiR2Root } from './UiR2Root.tsx';
import './shell-base.css';
import './shell.css';
import '../golden/golden.css';
import '../golden/golden-journey.css';
import '../golden/golden-mobile-hardening.css';
import '../core-work/core-work.css';
import '../records/records.css';
import '../operational-intelligence/operational-intelligence.css';
import '../home/home-connected.css';
import '../auth/auth.css';

export type UiR2ProductionResources = Readonly<{
  authGateway: AuthGateway;
  dataFactory: EnjazDataLayerFactory;
}>;

function createProductionResources(): UiR2ProductionResources {
  const config = createRuntimeConfig(import.meta.env as unknown as Readonly<Record<string, unknown>>);
  const client = createEnjazSupabaseClient(config);
  return Object.freeze({
    authGateway: createSupabaseAuthGateway(client),
    dataFactory: createEnjazDataLayerFactory(client),
  });
}

function RuntimeFailure({ message }: Readonly<{ message: string }>) {
  return (
    <main className="r2-auth" data-r2-runtime-error="true">
      <section className="r2-auth__panel">
        <header><p className="r2-eyebrow">تشغيل إنجاز</p><h1>تعذر تشغيل مساحة العمل</h1><p>{message}</p></header>
      </section>
    </main>
  );
}

function AuthenticatedR2Runtime({ dataFactory }: Readonly<{ dataFactory: EnjazDataLayerFactory }>) {
  const auth = useAuth();
  if (auth.status === 'checking') return <SessionChecking />;
  if (auth.status === 'anonymous' || !auth.user) return <R2AuthScreen service={auth.service} />;

  const signOut = async () => {
    await auth.service.signOut();
  };

  return (
    <DataLayerProvider factory={dataFactory}>
      <CurrentUserIdProvider userId={auth.user.id}>
        <UiR2Root runtimeMode="live" accountLabel={auth.user.email ?? 'حساب إنجاز'} onSignOut={signOut} />
      </CurrentUserIdProvider>
    </DataLayerProvider>
  );
}

export function UiR2ProductionRoot({ resources }: Readonly<{ resources?: UiR2ProductionResources | undefined }> = {}) {
  const [runtime] = useState<Readonly<{ resources: UiR2ProductionResources | null; error: string | null }>>(() => {
    if (resources) return Object.freeze({ resources, error: null });
    try {
      return Object.freeze({ resources: createProductionResources(), error: null });
    } catch {
      return Object.freeze({ resources: null, error: 'إعدادات الاتصال بإنجاز غير مكتملة. لم يتم تشغيل قناة بيانات بديلة أو وضع وهمي.' });
    }
  });

  if (!runtime.resources) return <RuntimeFailure message={runtime.error ?? 'إعدادات التشغيل غير صالحة.'} />;

  return (
    <AuthProvider gateway={runtime.resources.authGateway}>
      <AuthenticatedR2Runtime dataFactory={runtime.resources.dataFactory} />
    </AuthProvider>
  );
}
